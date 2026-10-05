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
let players = []
let cards = []
let palette = { avatars: [], colors: [] }
let composerTarget = null
let pendingImage = ''
let flipped = new Set()

const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

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

function connect() {
  ws = new WebSocket(url)
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.t === 'welcome') {
      me = msg.you
      palette = msg.palette
      $('room-code-value').textContent = msg.code
      showError('')
      show(room)
    } else if (msg.t === 'state') {
      players = msg.players
      cards = msg.cards
      const self = players.find((player) => player.id === me.id)
      if (self) me = self
      renderSeats()
      renderDeck()
    } else if (msg.t === 'error') {
      if (me) toast(msg.message)
      else showError(msg.message)
    }
  })
  ws.addEventListener('close', () => {
    ws = null
    me = null
    cards = []
    players = []
    flipped = new Set()
    seats.replaceChildren()
    deck.replaceChildren()
    closeComposer()
    closePicker()
    show(login)
    showError('Disconnected from the server.')
  })
}

function renderSeats() {
  const count = Math.max(players.length, 1)
  seats.replaceChildren(
    ...players.map((player, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2
      const isMe = player.id === me.id
      const held = isMe ? cards.filter((card) => card.toId === me.id).length : 0

      const seat = document.createElement('div')
      seat.className = 'seat' + (isMe ? ' me' : '')
      seat.dataset.id = player.id
      seat.style.left = `${50 + Math.cos(angle) * 42}%`
      seat.style.top = `${50 + Math.sin(angle) * 42}%`
      seat.style.background = player.avatar.color

      seat.innerHTML = `
        <span class="emoji">${player.avatar.emoji}</span>
        <span class="name"></span>
        ${held ? `<span class="badge" title="You have ${held} card${held > 1 ? 's' : ''} face down on the table">🃏 ${held}</span>` : ''}
        ${isMe ? '<span class="caret">▾</span>' : ''}
      `
      seat.querySelector('.name').textContent = player.username
      seat.title = isMe
        ? `Click to change your avatar${held ? ` · ${held} card${held > 1 ? 's' : ''} face down on the table` : ''}`
        : `Click to hide a card in front of ${player.username}`
      return seat
    }),
  )
  status.textContent =
    players.length === 1 ? 'Share the room code to invite players.' : `${players.length} players at the table.`
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

/* A card sits face down for the player it was assigned to, and face up for everyone else. */

function myCard(card) {
  const isUp = flipped.has(card.id)
  const entry = document.createElement('div')
  entry.className = 'card ' + (isUp ? 'open' : 'closed')
  entry.dataset.id = card.id

  if (isUp) {
    entry.append(cardBody(card), caption(`your card · from ${nameOf(card.fromId)}`))
  } else {
    const glyph = document.createElement('span')
    glyph.className = 'back-glyph'
    glyph.textContent = '🂠'
    entry.append(glyph, caption('tap to flip'))
  }

  entry.addEventListener('click', () => {
    flipped.has(card.id) ? flipped.delete(card.id) : flipped.add(card.id)
    const swapped = myCard(card)
    swapped.classList.add('swap')
    entry.replaceWith(swapped)
  })

  const del = document.createElement('button')
  del.className = 'card-x'
  del.type = 'button'
  del.textContent = '✕'
  del.title = 'Delete this card'
  del.addEventListener('click', (event) => {
    event.stopPropagation()
    ws.send(JSON.stringify({ t: 'removeCard', id: card.id }))
  })
  entry.append(del)

  return entry
}

function theirCard(card) {
  const entry = document.createElement('div')
  entry.className = 'card shown'
  entry.append(cardBody(card), caption(`for ${nameOf(card.toId)} · from ${nameOf(card.fromId)}`))
  return entry
}

function renderDeck() {
  const live = new Set(cards.map((card) => card.id))
  flipped = new Set([...flipped].filter((id) => live.has(id)))

  if (!cards.length) {
    const empty = document.createElement('div')
    empty.className = 'table-center'
    empty.innerHTML = 'Guess<br />Who'
    deck.replaceChildren(empty)
    return
  }

  const mine = cards.filter((card) => card.toId === me.id)
  const theirs = cards.filter((card) => card.toId !== me.id)
  deck.replaceChildren(...mine.map(myCard), ...theirs.map(theirCard))
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

const seatAt = (event) => event.target.closest('.seat')
const clearOver = () => seats.querySelectorAll('.seat.over').forEach((n) => n.classList.remove('over'))

seats.addEventListener('dragover', (event) => {
  const seat = seatAt(event)
  if (!seat) return
  event.preventDefault()
  event.dataTransfer.dropEffect = seat.dataset.id === me.id ? 'none' : 'copy'
  clearOver()
  if (seat.dataset.id !== me.id) seat.classList.add('over')
})

seats.addEventListener('dragleave', clearOver)

seats.addEventListener('drop', async (event) => {
  event.preventDefault()
  clearOver()
  const seat = seatAt(event)
  if (!seat || seat.dataset.id === me.id) return
  await attachDrop(event, seat.dataset.id)
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
  toast(`Hidden card set in front of ${name}.`)
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

$('leave').addEventListener('click', () => ws?.close())

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  closeComposer()
  closePicker()
})

for (const type of ['dragover', 'drop']) {
  document.addEventListener(type, (event) => {
    if (event.target.closest('#seats, #drop')) return
    event.preventDefault()
  })
}

connect()