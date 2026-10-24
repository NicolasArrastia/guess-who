import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join as joinPath, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT) || 3001
const DIST = fileURLToPath(new URL('../client/dist/', import.meta.url))
const MAX_TEXT = 200
const MAX_IMAGE_CHARS = 1_500_000
const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/

const AVATARS = ['🐸', '🦊', '🐼', '🐯', '🦁', '🐨', '🐵', '🦉', '🐙', '🦄', '🐝', '🐬']
const GRADIENTS = [
  'linear-gradient(135deg,#f87171,#ef4444)',
  'linear-gradient(135deg,#fb923c,#f97316)',
  'linear-gradient(135deg,#fbbf24,#f59e0b)',
  'linear-gradient(135deg,#a3e635,#84cc16)',
  'linear-gradient(135deg,#34d399,#10b981)',
  'linear-gradient(135deg,#22d3ee,#06b6d4)',
  'linear-gradient(135deg,#60a5fa,#3b82f6)',
  'linear-gradient(135deg,#a78bfa,#8b5cf6)',
  'linear-gradient(135deg,#f472b6,#ec4899)',
]

const rooms = new Map()

const sanitize = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max)

const sanitizeText = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do {
    code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  } while (rooms.has(code))
  return code
}

function avatarFor(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return { emoji: AVATARS[hash % AVATARS.length], color: GRADIENTS[hash % GRADIENTS.length] }
}

const publicView = (player) => ({ id: player.id, username: player.username, avatar: player.avatar })

const publicCard = (card) => ({ id: card.id, fromId: card.fromId, toId: card.toId, text: card.text, image: card.image })

function snapshot(room) {
  return [...room.players.values()].map((player) => ({
    ...publicView(player),
    admin: player.id === room.adminId,
  }))
}

/* Everyone at the table sees every card: the holder gets it face-down client-side. */
const publicCards = (room) => room.cards.map(publicCard)

function broadcast(room) {
  for (const viewer of room.players.values()) {
    if (viewer.ws.readyState !== 1) continue
    viewer.ws.send(
      JSON.stringify({
        t: 'state',
        code: room.code,
        players: snapshot(room),
        cards: publicCards(room),
      }),
    )
  }
}

function join(ws, username, room) {
  const id = crypto.randomUUID()
  const player = { id, username, avatar: avatarFor(id), ws }
  room.players.set(player.id, player)
  if (!room.adminId) room.adminId = id
  ws.player = player
  ws.room = room
  ws.send(
    JSON.stringify({
      t: 'welcome',
      you: publicView(player),
      code: room.code,
      palette: { avatars: AVATARS, colors: GRADIENTS },
    }),
  )
  broadcast(room)
}

function leave(ws) {
  const room = ws.room
  if (!room) return
  const goneId = ws.player.id
  room.players.delete(goneId)
  room.cards = room.cards.filter((card) => card.fromId !== goneId && card.toId !== goneId)
  ws.room = null
  if (room.players.size === 0) return void rooms.delete(room.code)
  /* Map preserves join order, so the next oldest player becomes the new host. */
  if (room.adminId === goneId) room.adminId = room.players.keys().next().value
  broadcast(room)
}

function fail(ws, message) {
  ws.send(JSON.stringify({ t: 'error', message }))
}

function addCard(ws, msg) {
  const text = sanitizeText(msg?.text, MAX_TEXT)
  const image =
    typeof msg?.image === 'string' && msg.image.length <= MAX_IMAGE_CHARS && IMAGE_PATTERN.test(msg.image)
      ? msg.image
      : ''
  if (!text && !image) return fail(ws, 'Add some text or an image.')

  const target = ws.room.players.get(sanitize(msg?.toId, 64))
  if (!target) return fail(ws, 'That player is no longer at the table.')
  if (target.id === ws.player.id) return fail(ws, 'Cards go to another player.')

  /* One card per player, like a card on your forehead: a new assignment replaces the old. */
  ws.room.cards = ws.room.cards.filter((card) => card.toId !== target.id)
  ws.room.cards.push({ id: crypto.randomUUID(), fromId: ws.player.id, toId: target.id, text, image })
  broadcast(ws.room)
}

function removeCard(ws, msg) {
  const id = sanitize(msg?.id, 64)
  const card = ws.room.cards.find((entry) => entry.id === id)
  if (!card) return
  const isHost = ws.room.adminId === ws.player.id
  if (card.toId !== ws.player.id && !isHost) return fail(ws, 'Only the host can remove someone else’s card.')
  ws.room.cards = ws.room.cards.filter((entry) => entry.id !== id)
  broadcast(ws.room)
}

function clearCards(ws) {
  if (ws.room.adminId !== ws.player.id) return fail(ws, 'Only the host can clear every card.')
  ws.room.cards = []
  broadcast(ws.room)
}

function changeAvatar(ws, msg) {
  const emoji = sanitize(msg?.emoji, 8)
  const color = sanitize(msg?.color, 64)
  if (!AVATARS.includes(emoji) || !GRADIENTS.includes(color)) return fail(ws, 'Unknown avatar.')
  ws.player.avatar = { emoji, color }
  broadcast(ws.room)
}

const server = createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  const file = joinPath(DIST, normalize(path).replace(/^(\.\.[/\\])+/, ''))
  try {
    const body = await readFile(file)
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Client not built. Run `npm run build`, or use `npm run dev`.')
  }
})

const onListenError = (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Port ${PORT} is already in use.` : err.message)
  process.exit(1)
}

server.on('error', onListenError)

const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('error', onListenError)

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return fail(ws, 'Invalid message.')
    }

    if (msg?.t === 'addCard') return ws.room ? addCard(ws, msg) : fail(ws, 'Join a room first.')
    if (msg?.t === 'removeCard') return ws.room ? removeCard(ws, msg) : fail(ws, 'Join a room first.')
    if (msg?.t === 'clearCards') return ws.room ? clearCards(ws) : fail(ws, 'Join a room first.')
    if (msg?.t === 'avatar') return ws.room ? changeAvatar(ws, msg) : fail(ws, 'Join a room first.')

    const username = sanitize(msg?.username, 20)
    if (!username) return fail(ws, 'Username is required.')
    if (ws.room) return fail(ws, 'Already in a room.')

    if (msg?.t === 'create') {
      const room = { code: makeCode(), players: new Map(), cards: [] }
      rooms.set(room.code, room)
      return join(ws, username, room)
    }

    if (msg?.t === 'join') {
      const room = rooms.get(sanitize(msg?.code, 4).toUpperCase())
      if (!room) return fail(ws, 'Room not found.')
      return join(ws, username, room)
    }

    fail(ws, 'Unknown action.')
  })

  ws.on('close', () => leave(ws))
})

server.listen(PORT, () => {
  console.log(`[server] ws://localhost:${PORT}/ws  (serving ${DIST})`)
})