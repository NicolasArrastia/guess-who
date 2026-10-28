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

const MODES = ['guess', 'impostor', 'spy']
const MIN_ROUND_PLAYERS = 3

/* Shared secrets for the impostor / spy rounds: shown to the honest players in
   their own UI language (the secret is private screen info, never broadcast). */
const WORDS = [
  { en: 'cat', es: 'gato' }, { en: 'dog', es: 'perro' }, { en: 'elephant', es: 'elefante' },
  { en: 'tiger', es: 'tigre' }, { en: 'rabbit', es: 'conejo' }, { en: 'dolphin', es: 'delfín' },
  { en: 'eagle', es: 'águila' }, { en: 'frog', es: 'rana' }, { en: 'horse', es: 'caballo' },
  { en: 'lion', es: 'león' }, { en: 'monkey', es: 'mono' }, { en: 'owl', es: 'búho' },
  { en: 'pizza', es: 'pizza' }, { en: 'bread', es: 'pan' }, { en: 'milk', es: 'leche' },
  { en: 'cheese', es: 'queso' }, { en: 'apple', es: 'manzana' }, { en: 'banana', es: 'plátano' },
  { en: 'water', es: 'agua' }, { en: 'fire', es: 'fuego' }, { en: 'snow', es: 'nieve' },
  { en: 'rain', es: 'lluvia' }, { en: 'sun', es: 'sol' }, { en: 'moon', es: 'luna' },
  { en: 'star', es: 'estrella' }, { en: 'tree', es: 'árbol' }, { en: 'flower', es: 'flor' },
  { en: 'rock', es: 'roca' }, { en: 'river', es: 'río' }, { en: 'ocean', es: 'océano' },
  { en: 'island', es: 'isla' }, { en: 'mountain', es: 'montaña' }, { en: 'desert', es: 'desierto' },
  { en: 'house', es: 'casa' }, { en: 'school', es: 'escuela' }, { en: 'hospital', es: 'hospital' },
  { en: 'office', es: 'oficina' }, { en: 'library', es: 'biblioteca' }, { en: 'factory', es: 'fábrica' },
  { en: 'key', es: 'llave' }, { en: 'phone', es: 'teléfono' }, { en: 'book', es: 'libro' },
  { en: 'chair', es: 'silla' }, { en: 'table', es: 'mesa' }, { en: 'window', es: 'ventana' },
  { en: 'door', es: 'puerta' }, { en: 'clock', es: 'reloj' }, { en: 'shoe', es: 'zapato' },
  { en: 'hat', es: 'sombrero' }, { en: 'ball', es: 'pelota' }, { en: 'guitar', es: 'guitarra' },
  { en: 'camera', es: 'cámara' }, { en: 'computer', es: 'computadora' }, { en: 'money', es: 'dinero' },
  { en: 'train', es: 'tren' }, { en: 'airplane', es: 'avión' }, { en: 'bicycle', es: 'bicicleta' },
  { en: 'car', es: 'coche' }, { en: 'boat', es: 'barco' }, { en: 'candle', es: 'vela' },
  { en: 'mirror', es: 'espejo' }, { en: 'pencil', es: 'lápiz' }, { en: 'umbrella', es: 'paraguas' },
]

const PLACES = [
  { en: 'beach', es: 'playa' }, { en: 'airport', es: 'aeropuerto' }, { en: 'hospital', es: 'hospital' },
  { en: 'school', es: 'escuela' }, { en: 'restaurant', es: 'restaurante' }, { en: 'supermarket', es: 'supermercado' },
  { en: 'cinema', es: 'cine' }, { en: 'library', es: 'biblioteca' }, { en: 'park', es: 'parque' },
  { en: 'zoo', es: 'zoológico' }, { en: 'museum', es: 'museo' }, { en: 'hotel', es: 'hotel' },
  { en: 'bank', es: 'banco' }, { en: 'farm', es: 'granja' }, { en: 'campsite', es: 'camping' },
  { en: 'mountain', es: 'montaña' }, { en: 'island', es: 'isla' }, { en: 'ship', es: 'barco' },
  { en: 'train station', es: 'estación de tren' }, { en: 'stadium', es: 'estadio' }, { en: 'circus', es: 'circo' },
  { en: 'amusement park', es: 'parque de atracciones' }, { en: 'space station', es: 'estación espacial' },
  { en: 'submarine', es: 'submarino' }, { en: 'desert', es: 'desierto' }, { en: 'forest', es: 'bosque' },
  { en: 'city', es: 'ciudad' }, { en: 'police station', es: 'comisaría' }, { en: 'church', es: 'iglesia' },
  { en: 'wedding', es: 'boda' }, { en: 'concert', es: 'concierto' }, { en: 'haunted house', es: 'casa embrujada' },
  { en: 'arctic', es: 'ártico' }, { en: 'jungle', es: 'selva' }, { en: 'castle', es: 'castillo' },
  { en: 'theater', es: 'teatro' }, { en: 'casino', es: 'casino' }, { en: 'barber shop', es: 'peluquería' },
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
  const state = JSON.stringify({
    t: 'state',
    code: room.code,
    mode: room.mode,
    round: publicRound(room),
    players: snapshot(room),
    cards: publicCards(room),
  })
  for (const viewer of room.players.values()) {
    if (viewer.ws.readyState !== 1) continue
    viewer.ws.send(state)
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

  const round = room.round
  if (round) {
    round.votes.delete(goneId)
    round.seen.delete(goneId)
    if (round.status === 'active' && round.impostorId === goneId) {
      finishRound(room, { winner: 'honest', reason: 'left' })
    } else {
      checkEjection(room)
    }
  }
  broadcast(room)
}

/* The `code` lets the client translate the message in the player's language. */
function fail(ws, message, code) {
  ws.send(JSON.stringify({ t: 'error', message, code }))
}

/* Public (never leaks the secret or who the hidden role belongs to mid-round). */
function publicRound(room) {
  const round = room.round
  if (!round) return null
  return {
    id: round.id,
    kind: round.kind,
    status: round.status,
    votes: Object.fromEntries(round.votes),
    ejectedId: round.ejectedId,
    winner: round.winner,
    reason: round.reason,
    ...(round.status === 'ended' ? { impostorId: round.impostorId } : {}),
  }
}

/* Private, one-per-player: the honest players get the shared secret. */
function sendRole(player, room) {
  const round = room.round
  if (!round || !round.seen.has(player.id)) return
  const honest = player.id !== round.impostorId
  player.ws.send(
    JSON.stringify({
      t: 'role',
      role: honest ? 'honest' : round.kind,
      kind: round.kind,
      secret: honest ? round.secret : null,
    }),
  )
}

function finishRound(room, { ejectedId = null, winner, reason }) {
  Object.assign(room.round, { status: 'ended', ejectedId, winner, reason })
}

/* More than half of the players still in the round → someone is ejected. */
function checkEjection(room) {
  const round = room.round
  if (!round || round.status !== 'active') return
  const present = [...round.seen].filter((id) => room.players.has(id))
  const tally = new Map()
  for (const target of round.votes.values()) tally.set(target, (tally.get(target) ?? 0) + 1)
  const majority = Math.floor(present.length / 2) + 1
  for (const [targetId, count] of tally) {
    if (count >= majority) {
      const winner = targetId === round.impostorId ? 'honest' : 'impostor'
      return finishRound(room, { ejectedId: targetId, winner, reason: 'ejected' })
    }
  }
}

function setMode(ws, msg) {
  const room = ws.room
  const mode = String(msg?.mode ?? '')
  if (!MODES.includes(mode)) return fail(ws, 'Unknown game mode.', 'modeUnknown')
  if (room.adminId !== ws.player.id) return fail(ws, 'Only the host can change the game mode.', 'hostMode')
  if (room.mode === mode) return
  room.mode = mode
  room.round = null
  room.cards = [] /* cards belong to the Guess Who game only */
  broadcast(room)
}

function startRound(ws) {
  const room = ws.room
  if (room.adminId !== ws.player.id) return fail(ws, 'Only the host can start a round.', 'hostStart')
  if (room.mode === 'guess') return fail(ws, 'Start a round in Impostor or Spy mode.', 'roundMode')
  if (room.round?.status === 'active') return fail(ws, 'A round is already in progress.', 'roundActive')
  if (room.players.size < MIN_ROUND_PLAYERS) {
    return fail(ws, `You need at least ${MIN_ROUND_PLAYERS} players to start.`, 'roundPlayers')
  }
  const pool = room.mode === 'impostor' ? WORDS : PLACES
  const secret = pool[Math.floor(Math.random() * pool.length)]
  const ids = [...room.players.keys()]
  room.round = {
    id: crypto.randomUUID(),
    kind: room.mode,
    secret,
    impostorId: ids[Math.floor(Math.random() * ids.length)],
    seen: new Set(ids),
    votes: new Map(),
    status: 'active',
    ejectedId: null,
    winner: null,
    reason: null,
  }
  for (const player of room.players.values()) sendRole(player, room)
  broadcast(room)
}

function endRound(ws) {
  const room = ws.room
  if (room.adminId !== ws.player.id) return fail(ws, 'Only the host can end the round.', 'hostEnd')
  if (room.round?.status !== 'active') return fail(ws, 'No round in progress.', 'roundNone')
  finishRound(room, { winner: 'impostor', reason: 'forfeit' })
  broadcast(room)
}

function castVote(ws, msg) {
  const room = ws.room
  const round = room.round
  if (!round || round.status !== 'active') return fail(ws, 'No round in progress.', 'roundNone')
  if (!round.seen.has(ws.player.id)) {
    return fail(ws, 'The round already started — wait for the next one.', 'roundStarted')
  }
  const targetId = msg?.targetId ? sanitize(msg.targetId, 64) : null
  if (!targetId) round.votes.delete(ws.player.id)
  else {
    const target = room.players.get(targetId)
    if (!target || target.id === ws.player.id || !round.seen.has(target.id)) {
      return fail(ws, 'Vote for another player.', 'voteTarget')
    }
    round.votes.set(ws.player.id, target.id)
  }
  checkEjection(room)
  broadcast(room)
}

function addCard(ws, msg) {
  const text = sanitizeText(msg?.text, MAX_TEXT)
  const image =
    typeof msg?.image === 'string' && msg.image.length <= MAX_IMAGE_CHARS && IMAGE_PATTERN.test(msg.image)
      ? msg.image
      : ''
  if (!text && !image) return fail(ws, 'Add some text or an image.', 'cardEmpty')

  const target = ws.room.players.get(sanitize(msg?.toId, 64))
  if (!target) return fail(ws, 'That player is no longer at the table.', 'cardTarget')
  if (target.id === ws.player.id) return fail(ws, 'Cards go to another player.', 'cardSelf')

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
  if (card.toId !== ws.player.id && !isHost) {
    return fail(ws, 'Only the host can remove someone else’s card.', 'hostRemove')
  }
  ws.room.cards = ws.room.cards.filter((entry) => entry.id !== id)
  broadcast(ws.room)
}

function clearCards(ws) {
  if (ws.room.adminId !== ws.player.id) return fail(ws, 'Only the host can clear every card.', 'hostClear')
  ws.room.cards = []
  broadcast(ws.room)
}

function changeAvatar(ws, msg) {
  const emoji = sanitize(msg?.emoji, 8)
  const color = sanitize(msg?.color, 64)
  if (!AVATARS.includes(emoji) || !GRADIENTS.includes(color)) return fail(ws, 'Unknown avatar.', 'avatarUnknown')
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

/* Render's front proxy closes WebSockets after ~100s without traffic.
   A beat every 25s keeps the connection (and the room) alive. */
setInterval(() => {
  const beat = JSON.stringify({ t: 'ping' })
  for (const client of wss.clients) if (client.readyState === 1) client.send(beat)
}, 25_000)

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return fail(ws, 'Invalid message.', 'invalid')
    }

    if (msg?.t === 'pong') return
    if (msg?.t === 'addCard') return ws.room ? addCard(ws, msg) : fail(ws, 'Join a room first.', 'joinFirst')
    if (msg?.t === 'removeCard') return ws.room ? removeCard(ws, msg) : fail(ws, 'Join a room first.', 'joinFirst')
    if (msg?.t === 'clearCards') return ws.room ? clearCards(ws) : fail(ws, 'Join a room first.', 'joinFirst')
    if (msg?.t === 'avatar') return ws.room ? changeAvatar(ws, msg) : fail(ws, 'Join a room first.', 'joinFirst')
    if (msg?.t === 'setMode') return ws.room ? setMode(ws, msg) : fail(ws, 'Join a room first.', 'joinFirst')
    if (msg?.t === 'startRound') return ws.room ? startRound(ws) : fail(ws, 'Join a room first.', 'joinFirst')
    if (msg?.t === 'endRound') return ws.room ? endRound(ws) : fail(ws, 'Join a room first.', 'joinFirst')
    if (msg?.t === 'vote') return ws.room ? castVote(ws, msg) : fail(ws, 'Join a room first.', 'joinFirst')

    const username = sanitize(msg?.username, 20)
    if (!username) return fail(ws, 'Username is required.', 'username')
    if (ws.room) return fail(ws, 'Already in a room.', 'alreadyIn')

    if (msg?.t === 'create') {
      const room = { code: makeCode(), players: new Map(), cards: [], mode: 'guess', round: null }
      rooms.set(room.code, room)
      return join(ws, username, room)
    }

    if (msg?.t === 'join') {
      const room = rooms.get(sanitize(msg?.code, 4).toUpperCase())
      if (!room) return fail(ws, 'Room not found.', 'roomNotFound')
      return join(ws, username, room)
    }

    fail(ws, 'Unknown action.', 'unknownAction')
  })

  ws.on('close', () => leave(ws))
})

server.listen(PORT, () => {
  console.log(`[server] ws://localhost:${PORT}/ws  (serving ${DIST})`)
})