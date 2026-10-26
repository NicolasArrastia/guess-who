const $ = (id) => document.getElementById(id)

const login = $('login')
const room = $('room')
const seats = $('seats')
const picker = $('picker')
const deck = $('deck')
const error = $('error')
const status = $('status')
const composer = $('composer')

const MAX_IMAGE_CHARS = 1_500_000
const MAX_IMAGE_EDGE = 640

let ws = null
let me = null
/* remembered create/join payload, so a dropped socket can rejoin the same room */
let pending = null
let session = null
let attempts = 0
let retryTimer = null
let leftByUser = false
let players = []
let cards = []
let palette = { avatars: [], colors: [] }
let composerTarget = null
let pendingImage = ''
let flipped = new Set()
let seated = new Set()
let dealt = new Set()

/* Same-origin by default: that is what the Render deployment (server + client together)
   and `npm run dev` use. When the client is hosted somewhere else — e.g. Vercel — set
   VITE_SERVER_URL to the game server and it connects there instead. */
const server = import.meta.env.VITE_SERVER_URL || location.origin
const url = (() => {
  const target = new URL('/ws', server)
  target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:'
  return target.href
})()

function show(node) {
  login.hidden = node !== login
  room.hidden = node !== room
}

function showError(message) {
  error.textContent = message
  error.hidden = !message
}

function toast(message) {
  const node = $('toast')
  node.textContent = message
  node.hidden = false
  clearTimeout(node.timer)
  node.timer = setTimeout(() => (node.hidden = true), 3000)
}

function connect(resume) {
  const socket = new WebSocket(url)
  ws = socket
  socket.addEventListener('open', () => {
    attempts = 0
    resume?.()
  })
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.t === 'ping') return socket.send(JSON.stringify({ t: 'pong' }))
    if (msg.t === 'welcome') {
      me = msg.you
      palette = msg.palette
      if (pending) {
        session = pending
        pending = null
      }
      clearTimeout(retryTimer)
      $('room-code-value').textContent = msg.code
      showError('')
      show(room)
    } else if (msg.t === 'state') {
      players = msg.players
      cards = msg.cards
      const self = players.find((player) => player.id === me.id)
      if (self) me = self
      /* forget flips for cards that were removed or replaced */
      flipped = new Set([...flipped].filter((id) => cards.some((card) => card.id === id)))
      renderSeats()
      renderDeck()
      syncChrome()
    } else if (msg.t === 'error') {
      if (me) toast(msg.message)
      else {
        pending = null /* a rejected create/join must not be retried on reconnect */
        session = null
        showError(msg.message)
      }
    }
  })
  socket.addEventListener('close', () => {
    if (ws !== socket) return /* an old socket closing must not disturb a newer one */
    ws = null
    me = null
    cards = []
    players = []
    flipped = new Set()
    seated = new Set()
    dealt = new Set()
    seats.replaceChildren()
    deck.replaceChildren()
    closeComposer()
    closePicker()
    closeZoom()
    show(login)
    if (session) return reconnect('Reconnecting…')
    /* not in a room and not a deliberate leave: keep trying (Render cold starts sleep) */
    if (!leftByUser) return reconnect('Connecting…')
    showError('')
  })
}

/* Reopen the socket (and re-send the create/join that got us into the room, if any). */
function reconnect(message) {
  const delay = Math.min(8000, 1000 * 2 ** attempts++)
  showError(message)
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    if (session) connect(() => ws.send(JSON.stringify(session)))
    else if (!leftByUser) connect()
  }, delay)
}

/* Cards sit on the table in front of their player's seat (24% radius vs the seat's 42%). */
const CARD_RADIUS = 24

function sizeCards() {
  const width = seats.clientWidth || 600
  const count = players.length
  const byCount = count <= 4 ? 158 : count <= 6 ? 138 : count <= 8 ? 118 : 100
  const w = Math.max(84, Math.min(byCount, Math.floor(width * 0.2)))
  seats.style.setProperty('--card-w', `${w}px`)
  seats.style.setProperty('--card-fs', `${Math.max(10, Math.round(w * 0.105))}px`)
}

function renderSeats() {
  const count = Math.max(players.length, 1)
  sizeCards()
  let fresh = 0
  let dealN = 0
  const nodes = []

  players.forEach((player, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    const isMe = player.id === me.id
    const card = cards.find((entry) => entry.toId === player.id)
    const held = isMe && Boolean(card)

    const seat = document.createElement('div')
    seat.className = 'seat' + (isMe ? ' me' : '')
    seat.dataset.id = player.id
    seat.style.left = `${50 + Math.cos(angle) * 42}%`
    seat.style.top = `${50 + Math.sin(angle) * 42}%`
    seat.style.setProperty('--seat-bg', player.avatar.color)
    if (!seated.has(player.id)) {
      seat.classList.add('seat-in')
      seat.style.animationDelay = `${fresh++ * 60}ms`
    }

    seat.innerHTML = `
      <span class="emoji">${player.avatar.emoji}</span>
      <span class="name"></span>
      ${held ? '<span class="badge" title="You have a card face down — tap Watch to peek">🃏</span>' : ''}
      ${isMe ? '<span class="caret">▾</span>' : ''}
    `
    const nameNode = seat.querySelector('.name')
    nameNode.textContent = player.admin ? `👑 ${player.username}` : player.username
    if (player.admin) nameNode.classList.add('host')
    seat.title = isMe
      ? `Click to change your avatar${held ? ' · your card is face down — tap Watch to peek' : ''}`
      : card
        ? `Click to give ${player.username} a new card (replaces theirs)`
        : `Click to give ${player.username} a card`
    nodes.push(seat)

    if (card) {
      const node = buildCard(player, card, angle)
      if (!dealt.has(card.id)) {
        node.classList.add('deal')
        node.style.animationDelay = `${dealN++ * 70}ms`
      }
      nodes.push(node)
    }
  })

  seats.replaceChildren(...nodes)
  status.textContent =
    players.length === 1 ? 'Share the room code to invite players.' : `${players.length} players at the table.`
  seated = new Set(players.map((player) => player.id))
  dealt = new Set(cards.map((card) => card.id))
}

const nameOf = (id) => players.find((player) => player.id === id)?.username ?? 'a player who left'

function cardBody(card) {
  const body = document.createElement('div')
  body.className = 'card-body'
  if (card.image) {
    const img = document.createElement('img')
    img.src = card.image
    img.alt = ''
    body.append(img)
  }
  if (card.text) {
    const text = document.createElement('p')
    text.className = 'card-text'
    text.textContent = card.text
    body.append(text)
  }
  return body
}

function caption(text) {
  const node = document.createElement('span')
  node.className = 'card-caption'
  node.textContent = text
  return node
}

const cardButton = (label, title, className = 'card-btn') => {
  const button = document.createElement('button')
  button.className = className
  button.type = 'button'
  button.textContent = label
  button.title = title
  return button
}

function removeButton(card) {
  const del = cardButton('✕', 'Remove this card', 'card-x')
  del.addEventListener('click', (event) => {
    event.stopPropagation()
    ws.send(JSON.stringify({ t: 'removeCard', id: card.id }))
  })
  return del
}

/*
 * One card per player, lying on the table in front of their seat:
 * face down for its own holder (tap Watch to peek), face up for everyone else (click to zoom).
 */

function buildCard(player, card, angle) {
  const isMine = player.id === me.id
  const isUp = !isMine || flipped.has(card.id)
  const entry = document.createElement('div')
  entry.className = `card table-card ${isUp ? (isMine ? 'open' : 'shown') : 'closed'}`
  entry.dataset.id = player.id
  entry.dataset.card = card.id
  entry.style.left = `${50 + Math.cos(angle) * CARD_RADIUS}%`
  entry.style.top = `${50 + Math.sin(angle) * CARD_RADIUS}%`

  const toggle = () => {
    flipped.has(card.id) ? flipped.delete(card.id) : flipped.add(card.id)
    const next = buildCard(player, card, angle)
    next.classList.add('flip')
    entry.replaceWith(next)
  }

  if (isUp) {
    entry.append(
      cardBody(card),
      caption(
        isMine ? `your card · from ${nameOf(card.fromId)}` : `${player.username}’s card · from ${nameOf(card.fromId)}`,
      ),
    )
    entry.addEventListener('click', () => openZoom(card))
    if (isMine) {
      const hide = cardButton('🙈 Hide', 'Hide your card again')
      hide.addEventListener('click', (event) => {
        event.stopPropagation()
        toggle()
      })
      entry.append(hide)
    }
    if (isMine || me.admin) entry.append(removeButton(card))
  } else {
    const glyph = document.createElement('span')
    glyph.className = 'back-glyph'
    glyph.textContent = '🂠'
    const watch = cardButton('👁 Watch', 'Reveal your card')
    watch.addEventListener('click', (event) => {
      event.stopPropagation()
      toggle()
    })
    entry.append(glyph, watch)
    entry.addEventListener('click', toggle)
    entry.append(removeButton(card))
  }

  return entry
}

/* zoom modal — click any face-up card to see it big */

function openZoom(card) {
  const img = $('zoom-img')
  if (card.image) img.src = card.image
  else img.removeAttribute('src')
  img.hidden = !card.image
  const text = $('zoom-text')
  text.textContent = card.text || ''
  text.hidden = !card.text
  $('zoom-caption').textContent =
    card.toId === me.id ? `your card · from ${nameOf(card.fromId)}` : `${nameOf(card.toId)}’s card · from ${nameOf(card.fromId)}`
  $('zoom').hidden = false
}

function closeZoom() {
  $('zoom').hidden = true
}

function renderDeck() {
  const empty = document.createElement('div')
  empty.className = 'table-center'
  empty.innerHTML = 'Guess<br />Who'
  deck.replaceChildren(empty)
}

function syncChrome() {
  $('clear').hidden = !(me?.admin && cards.length > 0)
}

/* avatar picker */

function togglePicker(seat) {
  if (!picker.hidden) return closePicker()
  renderPicker()
  picker.hidden = false
  anchorPicker(seat)
}

function closePicker() {
  picker.hidden = true
  picker.replaceChildren()
}

function renderPicker() {
  picker.replaceChildren()
  const emojiRow = document.createElement('div')
  emojiRow.className = 'picker-row'
  for (const emoji of palette.avatars) {
    const button = document.createElement('button')
    button.className = 'emoji-pick' + (emoji === me.avatar.emoji ? ' on' : '')
    button.textContent = emoji
    button.addEventListener('click', () => chooseAvatar(emoji, me.avatar.color))
    emojiRow.append(button)
  }

  const colorRow = document.createElement('div')
  colorRow.className = 'picker-row'
  for (const color of palette.colors) {
    const button = document.createElement('button')
    button.className = 'color-pick' + (color === me.avatar.color ? ' on' : '')
    button.style.background = color
    button.addEventListener('click', () => chooseAvatar(me.avatar.emoji, color))
    colorRow.append(button)
  }

  picker.append(emojiRow, colorRow)
}

function chooseAvatar(emoji, color) {
  ws.send(JSON.stringify({ t: 'avatar', emoji, color }))
  closePicker()
}

function anchorPicker(seat) {
  const wrap = seats.parentElement
  const wrapBox = wrap.getBoundingClientRect()
  const seatBox = seat.getBoundingClientRect()
  const popBox = picker.getBoundingClientRect()
  const left = Math.max(8, Math.min(seatBox.left - wrapBox.left + seatBox.width / 2 - popBox.width / 2, wrapBox.width - popBox.width - 8))
  const top = Math.max(8, Math.min(seatBox.bottom - wrapBox.top + 10, wrapBox.height - popBox.height - 8))
  picker.style.left = `${left}px`
  picker.style.top = `${top}px`
}

/* card composer */

function openComposer(playerId, image = '') {
  const target = players.find((player) => player.id === playerId)
  if (!target || playerId === me.id) return
  closePicker()
  composerTarget = playerId
  $('composer-name').textContent = target.username
  $('card-text').value = ''
  setImage(image)
  composer.hidden = false
  if (!image) $('card-text').focus()
}

function closeComposer() {
  composer.hidden = true
  composerTarget = null
  pendingImage = ''
  $('file').value = ''
}

function setImage(dataUrl) {
  pendingImage = dataUrl
  const preview = $('preview')
  preview.src = dataUrl
  preview.hidden = !dataUrl
  $('drop').classList.toggle('has-image', Boolean(dataUrl))
  $('drop-hint').hidden = Boolean(dataUrl)
  $('clear-image').hidden = !dataUrl
}

async function toDataUrl(blob) {
  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    toast('Could not read that image.')
    return ''
  }
}

async function attachBlob(blob, playerId) {
  const dataUrl = await toDataUrl(blob)
  if (!dataUrl) return
  if (dataUrl.length > MAX_IMAGE_CHARS) return toast('Image is too large.')
  if (composer.hidden) openComposer(playerId ?? composerTarget ?? firstOtherId(), dataUrl)
  else setImage(dataUrl)
}

function urlFromTransfer(dt) {
  const moz = dt.getData('text/x-moz-url')
  if (moz) {
    const [, image] = moz.split('\n')
    if (image) return image.trim()
  }
  const list = dt.getData('text/uri-list')
  if (list) return list.split('\n')[0].trim()
  const html = dt.getData('text/html')
  const img = html?.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (img) return img[1]
  const text = dt.getData('text/plain')?.trim() ?? ''
  return /^https?:\/\/\S+$|^data:image\//i.test(text) ? text : ''
}

function safeUrl(raw) {
  try {
    const url = new URL(raw, location.href)
    return ['http:', 'https:', 'data:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

async function attachDrop(event, playerId) {
  const dt = event.dataTransfer
  if (!dt) return

  const item = [...(dt.items ?? [])].find((entry) => entry.kind === 'file')
  const file = item?.getAsFile() ?? dt.files?.[0] ?? null
  if (file) {
    if (!file.type.startsWith('image/')) return toast('That file is not an image.')
    return attachBlob(file, playerId)
  }

  const url = safeUrl(urlFromTransfer(dt))
  if (!url) return toast('Drop an image file, or an image from another browser tab.')

  let blob
  try {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok) return toast('That image could not be downloaded.')
    blob = await res.blob()
  } catch {
    return toast('That site blocks reading its images — use the browse button instead.')
  }
  if (!blob.type.startsWith('image/')) return toast('That link is not an image.')
  await attachBlob(blob, playerId)
}

async function acceptFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) return toast('That file is not an image.')
  await attachBlob(file)
}

const firstOtherId = () => players.find((player) => player.id !== me.id)?.id

/* seat interaction */

seats.addEventListener('click', (event) => {
  const seat = event.target.closest('.seat')
  if (!seat) return
  if (seat.dataset.id === me.id) togglePicker(seat)
  else openComposer(seat.dataset.id)
})

const targetAt = (event) => event.target.closest('.seat, .table-card')
const clearOver = () => seats.querySelectorAll('.over').forEach((n) => n.classList.remove('over'))

seats.addEventListener('dragover', (event) => {
  const target = targetAt(event)
  if (!target) return
  event.preventDefault()
  event.dataTransfer.dropEffect = target.dataset.id === me.id ? 'none' : 'copy'
  clearOver()
  if (target.dataset.id !== me.id) target.classList.add('over')
})

seats.addEventListener('dragleave', clearOver)

seats.addEventListener('drop', async (event) => {
  event.preventDefault()
  clearOver()
  const target = targetAt(event)
  if (!target || target.dataset.id === me.id) return
  await attachDrop(event, target.dataset.id)
})

seats.addEventListener('dragend', clearOver)

$('drop').addEventListener('dragover', (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
})
$('drop').addEventListener('drop', (event) => {
  event.preventDefault()
  attachDrop(event, null)
})
$('pick').addEventListener('click', () => $('file').click())
$('file').addEventListener('change', (event) => acceptFile(event.target.files?.[0]))
$('clear-image').addEventListener('click', () => setImage(''))

$('send').addEventListener('click', () => {
  const text = $('card-text').value.trim()
  if (!text && !pendingImage) return toast('Add some text or an image.')
  const name = players.find((player) => player.id === composerTarget)?.username ?? 'player'
  ws.send(JSON.stringify({ t: 'addCard', toId: composerTarget, text, image: pendingImage }))
  closeComposer()
  toast(`Gave a card to ${name}.`)
})

$('cancel').addEventListener('click', closeComposer)
composer.addEventListener('click', (event) => {
  if (event.target === composer) closeComposer()
})

/* login + room chrome */

function send(payload) {
  const username = $('username').value.trim()
  if (!username) return showError('Username is required.')
  if (!ws || ws.readyState !== WebSocket.OPEN) return showError('Not connected.')
  showError('')
  if (payload.t === 'create' || payload.t === 'join') {
    pending = { ...payload, username }
    leftByUser = false
  }
  ws.send(JSON.stringify({ ...payload, username }))
}

$('create').addEventListener('click', () => send({ t: 'create' }))
$('join').addEventListener('click', () => send({ t: 'join', code: $('code').value.trim().toUpperCase() }))
$('username').addEventListener('keydown', (e) => e.key === 'Enter' && $('create').click())
$('code').addEventListener('keydown', (e) => e.key === 'Enter' && $('join').click())

$('copy').addEventListener('click', () => {
  navigator.clipboard?.writeText($('room-code-value').textContent)
  $('copy').textContent = 'Copied'
  setTimeout(() => ($('copy').textContent = 'Copy'), 1200)
})

$('leave').addEventListener('click', () => {
  leftByUser = true
  session = null
  pending = null
  clearTimeout(retryTimer)
  ws?.close()
})

$('clear').addEventListener('click', () => {
  ws.send(JSON.stringify({ t: 'clearCards' }))
  toast('Cleared every card at the table.')
})

$('zoom-close').addEventListener('click', closeZoom)
$('zoom').addEventListener('click', (event) => {
  if (event.target === $('zoom')) closeZoom()
})

window.addEventListener('resize', () => {
  if (me) sizeCards()
})

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  closeComposer()
  closePicker()
  closeZoom()
})

for (const type of ['dragover', 'drop']) {
  document.addEventListener(type, (event) => {
    if (event.target.closest('#seats, #drop')) return
    event.preventDefault()
  })
}

connect()