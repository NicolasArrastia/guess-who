const $ = (id) => document.getElementById(id)

const login = $('login')
const room = $('room')
const seats = $('seats')
const picker = $('picker')
const deck = $('deck')
const error = $('error')
const status = $('status')
const hint = $('hint')
const composer = $('composer')
const menu = $('menu')

const MAX_IMAGE_CHARS = 1_500_000
const MAX_IMAGE_EDGE = 640

/* ————————————————————————————————————————————
   i18n — the whole UI switches between English and Spanish
   ————————————————————————————————————————————————— */

const LANG_NAME = { en: 'English', es: 'Español' }

const STRINGS = {
  en: {
    'lang.switch': 'Change language',
    'login.sub': 'Jump into a room and gather around the table.',
    'login.username': 'Username',
    'login.create': 'Create room',
    'login.or': 'or',
    'login.join': 'Join',
    'room.label': 'Room',
    'room.copy': 'Copy',
    'room.copied': 'Copied',
    'room.copyTitle': 'Copy code',
    'room.clear': 'Clear all cards',
    'menu.title': 'Menu',
    'menu.mode': 'Game mode',
    'menu.leave': 'Leave',
    'menu.hostOnly': 'Only the host can change the game mode.',
    'mode.guess': 'Who am I',
    'mode.impostor': 'Impostor',
    'mode.spy': 'Spy',
    'mode.changed': 'Game mode: {name}',
    'status.waiting': 'Waiting for players…',
    'status.one': 'Share the room code to invite players.',
    'status.players': '{n} players at the table.',
    'hint.guess': 'Click a player to give them a card · tap Watch to see yours · click any card to zoom',
    'hint.round': 'Discuss out loud, then click a player to vote them out.',
    'badge.held': 'You have a card face down — tap Watch to peek',
    'votes.by': 'Voted by: {names}',
    'seat.self': 'Click to change your avatar',
    'seat.selfCard': 'your card is face down — tap Watch to peek',
    'seat.give': 'Click to give {name} a card',
    'seat.replace': 'Click to give {name} a new card (replaces theirs)',
    'seat.vote': 'Click to vote to eject {name}',
    'card.watch': '👁 Watch',
    'card.hide': '🙈 Hide',
    'card.watchTitle': 'Reveal your card',
    'card.hideTitle': 'Hide your card again',
    'card.removeTitle': 'Remove this card',
    'card.mine': 'your card · from {name}',
    'card.theirs': '{name}’s card · from {from}',
    'card.titlePrefix': 'Assign a card to',
    'card.hint': 'Everyone sees it face up — they see it face down until they tap Watch. Replaces any card they already hold.',
    'card.placeholder': 'Write something secret…',
    'card.drop': 'Drop an image here',
    'card.browse': 'or browse',
    'card.removeImage': 'Remove image',
    'card.cancel': 'Cancel',
    'card.send': 'Assign card',
    'card.given': 'Gave a card to {name}.',
    'card.cleared': 'Cleared every card at the table.',
    'card.needContent': 'Add some text or an image.',
    'zoom.close': '✕ Close',
    'copy.done': 'Copied',
    'name.left': 'a player who left',
    'img.read': 'Could not read that image.',
    'img.large': 'Image is too large.',
    'img.notImage': 'That file is not an image.',
    'img.drop': 'Drop an image file, or an image from another browser tab.',
    'img.download': 'That image could not be downloaded.',
    'img.blocked': 'That site blocks reading its images — use the browse button instead.',
    'img.link': 'That link is not an image.',
    'net.connect': 'Connecting…',
    'net.reconnect': 'Reconnecting…',
    'center.start': 'Start round',
    'center.end': 'End round',
    'center.waitHost': 'Waiting for the host to start…',
    'center.inProgress': 'Round in progress',
    'center.over': 'Round over',
    'role.secretLabel': 'Your secret',
    'role.impostor': 'Impostor',
    'role.impostorNote': 'You don’t know the word — blend in.',
    'role.spy': 'Spy',
    'role.spyNote': 'The others share a location — find out which.',
    'vote.none': 'No round is in progress.',
    'vote.spectator': 'The round already started — wait for the next one.',
    'vote.voted': 'Voted to eject {name}.',
    'vote.cleared': 'Vote removed.',
    'result.close': 'Close',
    'result.ejected': '{name} was ejected.',
    'result.roundOver': 'Round over',
    'result.catch.impostor': '{name} was the impostor — honest players win!',
    'result.catch.spy': '{name} was the spy — everyone else wins!',
    'result.innocent.impostor': '{name} was innocent — the impostor wins!',
    'result.innocent.spy': '{name} was innocent — the spy wins!',
    'result.forfeit.impostor': 'The round ended — the impostor was not caught. {name} was the impostor!',
    'result.forfeit.spy': 'The round ended — the spy was not caught. {name} was the spy!',
    'result.left.impostor': 'The impostor left the game — honest players win!',
    'result.left.spy': 'The spy left the game — everyone else wins!',
    'err.username': 'Username is required.',
    'err.notConnected': 'Not connected.',
    'err.invalid': 'Invalid message.',
    'err.joinFirst': 'Join a room first.',
    'err.alreadyIn': 'Already in a room.',
    'err.roomNotFound': 'Room not found.',
    'err.unknownAction': 'Unknown action.',
    'err.cardEmpty': 'Add some text or an image.',
    'err.cardTarget': 'That player is no longer at the table.',
    'err.cardSelf': 'Cards go to another player.',
    'err.hostRemove': 'Only the host can remove someone else’s card.',
    'err.hostClear': 'Only the host can clear every card.',
    'err.avatarUnknown': 'Unknown avatar.',
    'err.modeUnknown': 'Unknown game mode.',
    'err.hostMode': 'Only the host can change the game mode.',
    'err.hostStart': 'Only the host can start a round.',
    'err.hostEnd': 'Only the host can end the round.',
    'err.roundMode': 'Start a round in Impostor or Spy mode.',
    'err.roundActive': 'A round is already in progress.',
    'err.roundPlayers': 'You need at least 3 players to start.',
    'err.roundNone': 'No round in progress.',
    'err.roundStarted': 'The round already started — wait for the next one.',
    'err.voteTarget': 'Vote for another player.',
  },
  es: {
    'lang.switch': 'Cambiar idioma',
    'login.sub': 'Entra a una sala y reúnanse alrededor de la mesa.',
    'login.username': 'Usuario',
    'login.create': 'Crear sala',
    'login.or': 'o',
    'login.join': 'Entrar',
    'room.label': 'Sala',
    'room.copy': 'Copiar',
    'room.copied': '¡Copiado!',
    'room.copyTitle': 'Copiar código',
    'room.clear': 'Borrar todas las cartas',
    'menu.title': 'Menú',
    'menu.mode': 'Modo de juego',
    'menu.leave': 'Salir',
    'menu.hostOnly': 'Solo el anfitrión puede cambiar el modo de juego.',
    'mode.guess': 'Quién soy',
    'mode.impostor': 'Impostor',
    'mode.spy': 'Espía',
    'mode.changed': 'Modo de juego: {name}',
    'status.waiting': 'Esperando jugadores…',
    'status.one': 'Comparte el código de la sala para invitar jugadores.',
    'status.players': '{n} jugadores en la mesa.',
    'hint.guess': 'Haz clic en un jugador para darle una carta · toca Ver para ver la tuya · haz clic en cualquier carta para ampliar',
    'hint.round': 'Hablen entre todos y haz clic en un jugador para expulsarlo.',
    'badge.held': 'Tienes una carta boca abajo — toca Ver para mirar',
    'votes.by': 'Votado por: {names}',
    'seat.self': 'Haz clic para cambiar tu avatar',
    'seat.selfCard': 'tu carta está boca abajo — toca Ver para mirar',
    'seat.give': 'Haz clic para darle una carta a {name}',
    'seat.replace': 'Haz clic para darle una carta nueva a {name} (reemplaza la suya)',
    'seat.vote': 'Haz clic para votar por expulsar a {name}',
    'card.watch': '👁 Ver',
    'card.hide': '🙈 Ocultar',
    'card.watchTitle': 'Mostrar tu carta',
    'card.hideTitle': 'Ocultar tu carta de nuevo',
    'card.removeTitle': 'Quitar esta carta',
    'card.mine': 'tu carta · de {name}',
    'card.theirs': 'carta de {name} · de {from}',
    'card.titlePrefix': 'Asignar una carta a',
    'card.hint': 'Todos la ven boca arriba — él la ve boca abajo hasta que toca Ver. Reemplaza cualquier carta que tenga.',
    'card.placeholder': 'Escribe algo secreto…',
    'card.drop': 'Suelta una imagen aquí',
    'card.browse': 'o examinar',
    'card.removeImage': 'Quitar imagen',
    'card.cancel': 'Cancelar',
    'card.send': 'Asignar carta',
    'card.given': 'Le diste una carta a {name}.',
    'card.cleared': 'Se borraron todas las cartas de la mesa.',
    'card.needContent': 'Agrega un texto o una imagen.',
    'zoom.close': '✕ Cerrar',
    'copy.done': '¡Copiado!',
    'name.left': 'un jugador que se fue',
    'img.read': 'No se pudo leer esa imagen.',
    'img.large': 'La imagen es demasiado grande.',
    'img.notImage': 'Ese archivo no es una imagen.',
    'img.drop': 'Suelta un archivo de imagen o una imagen de otra pestaña.',
    'img.download': 'No se pudo descargar esa imagen.',
    'img.blocked': 'Ese sitio bloquea la lectura de sus imágenes — usa el botón de examinar.',
    'img.link': 'Ese enlace no es una imagen.',
    'net.connect': 'Conectando…',
    'net.reconnect': 'Reconectando…',
    'center.start': 'Empezar ronda',
    'center.end': 'Terminar ronda',
    'center.waitHost': 'Esperando a que el anfitrión empiece…',
    'center.inProgress': 'Ronda en curso',
    'center.over': 'Ronda terminada',
    'role.secretLabel': 'Tu secreto',
    'role.impostor': 'Impostor',
    'role.impostorNote': 'No conoces la palabra — fúndete con los demás.',
    'role.spy': 'Espía',
    'role.spyNote': 'Los demás comparten un lugar — descubre cuál.',
    'vote.none': 'No hay ninguna ronda en curso.',
    'vote.spectator': 'La ronda ya empezó — espera a la siguiente.',
    'vote.voted': 'Votaste por expulsar a {name}.',
    'vote.cleared': 'Voto retirado.',
    'result.close': 'Cerrar',
    'result.ejected': '{name} fue expulsado.',
    'result.roundOver': 'Ronda terminada',
    'result.catch.impostor': '{name} era el impostor — ¡ganan los jugadores honestos!',
    'result.catch.spy': '{name} era el espía — ¡ganan los demás!',
    'result.innocent.impostor': '{name} era inocente — ¡gana el impostor!',
    'result.innocent.spy': '{name} era inocente — ¡gana el espía!',
    'result.forfeit.impostor': 'La ronda terminó — no atraparon al impostor. ¡{name} era el impostor!',
    'result.forfeit.spy': 'La ronda terminó — no atraparon al espía. ¡{name} era el espía!',
    'result.left.impostor': 'El impostor salió del juego — ¡ganan los jugadores honestos!',
    'result.left.spy': 'El espía salió del juego — ¡ganan los demás!',
    'err.username': 'Se requiere un usuario.',
    'err.notConnected': 'Sin conexión.',
    'err.invalid': 'Mensaje no válido.',
    'err.joinFirst': 'Únete primero a una sala.',
    'err.alreadyIn': 'Ya estás en una sala.',
    'err.roomNotFound': 'Sala no encontrada.',
    'err.unknownAction': 'Acción desconocida.',
    'err.cardEmpty': 'Agrega un texto o una imagen.',
    'err.cardTarget': 'Ese jugador ya no está en la mesa.',
    'err.cardSelf': 'Las cartas van para otro jugador.',
    'err.hostRemove': 'Solo el anfitrión puede quitar la carta de otro.',
    'err.hostClear': 'Solo el anfitrión puede borrar todas las cartas.',
    'err.avatarUnknown': 'Avatar desconocido.',
    'err.modeUnknown': 'Modo de juego desconocido.',
    'err.hostMode': 'Solo el anfitrión puede cambiar el modo de juego.',
    'err.hostStart': 'Solo el anfitrión puede empezar una ronda.',
    'err.hostEnd': 'Solo el anfitrión puede terminar la ronda.',
    'err.roundMode': 'Empieza una ronda en los modos Impostor o Espía.',
    'err.roundActive': 'Ya hay una ronda en curso.',
    'err.roundPlayers': 'Necesitas al menos 3 jugadores para empezar.',
    'err.roundNone': 'No hay ninguna ronda en curso.',
    'err.roundStarted': 'La ronda ya empezó — espera a la siguiente.',
    'err.voteTarget': 'Vota por otro jugador.',
  },
}

/* Small inline flags so the language is obvious (emoji flags don't render on Windows). */
const FLAGS = {
  en: '<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M0 0h60v30H0z" fill="#012169"/><path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  es: '<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M0 0h60v30H0z" fill="#aa151b"/><path d="M0 7.5h60v15H0z" fill="#f1bf00"/></svg>',
}

let lang = (() => {
  try {
    const saved = localStorage.getItem('gw.lang')
    if (saved === 'en' || saved === 'es') return saved
  } catch {}
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
})()

const has = (key) => key in STRINGS[lang] || key in STRINGS.en

function t(key, vars) {
  let text = STRINGS[lang][key] ?? STRINGS.en[key] ?? key
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value))
  return text
}

/* Text baked into index.html, re-translated on every language switch. */
function applyStatic() {
  document.documentElement.lang = lang
  document.querySelectorAll('[data-i18n]').forEach((node) => (node.textContent = t(node.dataset.i18n)))
  document.querySelectorAll('[data-i18n-ph]').forEach((node) => (node.placeholder = t(node.dataset.i18nPh)))
  document.querySelectorAll('[data-i18n-title]').forEach((node) => (node.title = t(node.dataset.i18nTitle)))
  document.querySelectorAll('[data-i18n-label]').forEach((node) => node.setAttribute('aria-label', t(node.dataset.i18nLabel)))
}

function paintFlags() {
  document.querySelectorAll('[data-flag]').forEach((node) => (node.innerHTML = FLAGS[lang]))
}

function updateLangNames() {
  document.querySelectorAll('.lang-name').forEach((node) => (node.textContent = LANG_NAME[lang]))
}

function refreshText() {
  applyStatic()
  paintFlags()
  updateLangNames()
  paintError()
  if (me) {
    renderSeats()
    renderDeck()
    syncChrome()
  }
  if (zoomCard && !$('zoom').hidden) paintZoom()
  if (lastResult && !$('result').hidden) paintResult(lastResult)
}

function setLang(next) {
  if (next === lang) return
  lang = next
  try {
    localStorage.setItem('gw.lang', lang)
  } catch {}
  refreshText()
}

/* ————————————————————————————————————————————
   state
   ————————————————————————————————————————————————— */

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
/* game mode + round (impostor / spy), plus this player's private role */
let mode = 'guess'
let round = null
let myRole = null
let seenState = false
let shownResult = null
let lastResult = null
let zoomCard = null

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

/* The error line keeps its key so a language switch re-translates it. */
let errorKey = null
let errorVars = null
let errorRaw = ''

function paintError() {
  const text = errorRaw || (errorKey ? t(errorKey, errorVars) : '')
  error.textContent = text
  error.hidden = !text
}

function showError(key, vars = {}, raw = '') {
  errorKey = key || null
  errorVars = vars
  errorRaw = raw || ''
  paintError()
}

const serverText = (msg) => (msg.code && has(`err.${msg.code}`) ? t(`err.${msg.code}`) : msg.message)

function toast(key, vars) {
  const node = $('toast')
  node.textContent = has(key) ? t(key, vars) : key
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
      showError(null)
      show(room)
    } else if (msg.t === 'state') {
      const previousMode = mode
      players = msg.players
      cards = msg.cards
      mode = msg.mode || 'guess'
      round = msg.round || null
      if (!round) myRole = null
      const self = players.find((player) => player.id === me.id)
      if (self) me = self
      /* forget flips for cards that were removed or replaced */
      flipped = new Set([...flipped].filter((id) => cards.some((card) => card.id === id)))
      if (mode !== 'guess' && !composer.hidden) closeComposer()
      renderSeats()
      renderDeck()
      syncChrome()
      if (seenState && previousMode !== mode) toast('mode.changed', { name: t(`mode.${mode}`) })
      seenState = true
      if (round?.status === 'ended' && round.id !== shownResult) {
        shownResult = round.id
        openResult(round)
      } else if (!round || round.status === 'active') closeResult()
    } else if (msg.t === 'role') {
      myRole = msg
      renderSeats()
    } else if (msg.t === 'error') {
      if (me) toast(serverText(msg))
      else {
        pending = null /* a rejected create/join must not be retried on reconnect */
        session = null
        const key = msg.code && has(`err.${msg.code}`) ? `err.${msg.code}` : null
        showError(key, {}, key ? '' : msg.message)
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
    mode = 'guess'
    round = null
    myRole = null
    seenState = false
    shownResult = null
    lastResult = null
    zoomCard = null
    seats.replaceChildren()
    deck.replaceChildren()
    closeComposer()
    closePicker()
    closeZoom()
    closeResult()
    closeMenu()
    show(login)
    if (session) return reconnect('net.reconnect')
    /* not in a room and not a deliberate leave: keep trying (Render cold starts sleep) */
    if (!leftByUser) return reconnect('net.connect')
    showError(null)
  })
}

/* Reopen the socket (and re-send the create/join that got us into the room, if any). */
function reconnect(key) {
  const delay = Math.min(8000, 1000 * 2 ** attempts++)
  showError(key)
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
  const votes = round?.votes ?? {}

  players.forEach((player, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    const isMe = player.id === me.id
    const card = cards.find((entry) => entry.toId === player.id)
    const held = isMe && Boolean(card)
    const voters = Object.keys(votes).filter((voterId) => votes[voterId] === player.id)

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
    if (votes[me.id] === player.id) seat.classList.add('my-vote')

    seat.innerHTML = `
      <span class="emoji">${player.avatar.emoji}</span>
      <span class="name"></span>
      ${isMe ? '<span class="caret">▾</span>' : ''}
    `
    const nameNode = seat.querySelector('.name')
    nameNode.textContent = player.admin ? `👑 ${player.username}` : player.username
    if (player.admin) nameNode.classList.add('host')

    if (held) {
      const badge = document.createElement('span')
      badge.className = 'badge'
      badge.textContent = '🃏'
      badge.title = t('badge.held')
      seat.append(badge)
    }
    if (voters.length) {
      const pill = document.createElement('span')
      pill.className = 'votes'
      pill.textContent = String(voters.length)
      pill.title = t('votes.by', { names: voters.map(nameOf).join(', ') })
      seat.append(pill)
    }

    seat.title = isMe
      ? `${t('seat.self')}${held ? ` · ${t('seat.selfCard')}` : ''}`
      : mode !== 'guess'
        ? t('seat.vote', { name: player.username })
        : card
          ? t('seat.replace', { name: player.username })
          : t('seat.give', { name: player.username })
    nodes.push(seat)

    if (card) {
      const node = buildCard(player, card, angle)
      if (!dealt.has(card.id)) {
        node.classList.add('deal')
        node.style.animationDelay = `${dealN++ * 70}ms`
      }
      nodes.push(node)
    }

    if (isMe && myRole && round) nodes.push(buildRoleCard(angle))
  })

  seats.replaceChildren(...nodes)
  status.textContent =
    players.length === 1 ? t('status.one') : t('status.players', { n: players.length })
  seated = new Set(players.map((player) => player.id))
  dealt = new Set(cards.map((card) => card.id))
}

const nameOf = (id) => players.find((player) => player.id === id)?.username ?? t('name.left')

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
  const del = cardButton('✕', t('card.removeTitle'), 'card-x')
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
        isMine
          ? t('card.mine', { name: nameOf(card.fromId) })
          : t('card.theirs', { name: player.username, from: nameOf(card.fromId) }),
      ),
    )
    entry.addEventListener('click', () => openZoom(card))
    if (isMine) {
      const hide = cardButton(t('card.hide'), t('card.hideTitle'))
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
    const watch = cardButton(t('card.watch'), t('card.watchTitle'))
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

/* the player's own secret in an impostor / spy round — private to their screen */
function buildRoleCard(angle) {
  const entry = document.createElement('div')
  entry.className = 'card table-card role-card shown'
  entry.style.left = `${50 + Math.cos(angle) * CARD_RADIUS}%`
  entry.style.top = `${50 + Math.sin(angle) * CARD_RADIUS}%`
  entry.style.zIndex = '3'

  const bad = myRole.role !== 'honest'
  const tag = document.createElement('span')
  tag.className = 'role-tag' + (bad ? ' bad' : '')
  tag.textContent = bad ? t(`role.${myRole.role}`) : t('role.secretLabel')
  entry.append(tag)

  if (bad) {
    const note = document.createElement('p')
    note.className = 'role-note'
    note.textContent = t(`role.${myRole.role}Note`)
    entry.append(note)
  } else {
    const secret = document.createElement('span')
    secret.className = 'role-secret'
    secret.textContent = myRole.secret?.[lang] ?? myRole.secret?.en ?? ''
    entry.append(secret)
  }
  return entry
}

/* zoom modal — click any face-up card to see it big */

function openZoom(card) {
  zoomCard = card
  paintZoom()
  $('zoom').hidden = false
}

function paintZoom() {
  const card = zoomCard
  if (!card) return
  const img = $('zoom-img')
  if (card.image) img.src = card.image
  else img.removeAttribute('src')
  img.hidden = !card.image
  const text = $('zoom-text')
  text.textContent = card.text || ''
  text.hidden = !card.text
  $('zoom-caption').textContent =
    card.toId === me.id
      ? t('card.mine', { name: nameOf(card.fromId) })
      : t('card.theirs', { name: nameOf(card.toId), from: nameOf(card.fromId) })
}

function closeZoom() {
  $('zoom').hidden = true
  zoomCard = null
}

/* table center — "Guess Who" in the card game, round controls in the others */

const centerNote = (key) => {
  const note = document.createElement('p')
  note.className = 'center-note'
  note.textContent = t(key)
  return note
}

function centerButton(action, key, variant) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${variant} center-btn`
  button.textContent = t(key)
  button.addEventListener('click', () => ws?.send(JSON.stringify({ t: action })))
  return button
}

function renderDeck() {
  const center = document.createElement('div')
  center.className = 'table-center'
  if (mode === 'guess') {
    center.innerHTML = 'Guess<br />Who'
    deck.replaceChildren(center)
    return
  }

  const label = document.createElement('div')
  label.textContent = t(`mode.${mode}`)
  center.append(label)

  if (!round) {
    center.append(me?.admin ? centerButton('startRound', 'center.start', 'primary') : centerNote('center.waitHost'))
  } else if (round.status === 'active') {
    center.append(centerNote('center.inProgress'))
    if (me?.admin) center.append(centerButton('endRound', 'center.end', 'ghost'))
  } else {
    center.append(centerNote('center.over'))
    if (me?.admin) center.append(centerButton('startRound', 'center.start', 'primary'))
  }
  deck.replaceChildren(center)
}

function syncChrome() {
  $('clear').hidden = !(mode === 'guess' && me?.admin && cards.length > 0)
  for (const option of document.querySelectorAll('.mode-option')) {
    const active = option.dataset.mode === mode
    option.classList.toggle('on', active)
    option.setAttribute('aria-checked', String(active))
    option.disabled = !me?.admin
    option.title = me?.admin ? '' : t('menu.hostOnly')
  }
  hint.textContent = t(mode === 'guess' ? 'hint.guess' : 'hint.round')
}

/* ——— round results ——— */

function openResult(finished) {
  lastResult = finished
  paintResult(finished)
  $('result').hidden = false
}

function closeResult() {
  $('result').hidden = true
}

function paintResult(finished) {
  const kind = finished.kind
  let title
  let body
  if (finished.reason === 'ejected') {
    const name = nameOf(finished.ejectedId)
    title = t('result.ejected', { name })
    body =
      finished.winner === 'honest' ? t(`result.catch.${kind}`, { name }) : t(`result.innocent.${kind}`, { name })
  } else if (finished.reason === 'left') {
    title = t('result.roundOver')
    body = t(`result.left.${kind}`)
  } else {
    title = t('result.roundOver')
    body = t(`result.forfeit.${kind}`, { name: nameOf(finished.impostorId) })
  }
  $('result-title').textContent = title
  $('result-body').textContent = body
}

/* ——— voting (impostor / spy rounds) ——— */

function castVote(targetId) {
  if (!round || round.status !== 'active') return toast('vote.none')
  if (!myRole) return toast('vote.spectator')
  const mine = round.votes?.[me.id]
  const next = mine === targetId ? null : targetId
  ws.send(JSON.stringify({ t: 'vote', targetId: next }))
  if (next) toast('vote.voted', { name: nameOf(targetId) })
  else toast('vote.cleared')
}

/* ——— hamburger menu ——— */

function openMenu() {
  menu.hidden = false
  $('menu-btn').setAttribute('aria-expanded', 'true')
}

function closeMenu() {
  menu.hidden = true
  $('menu-btn').setAttribute('aria-expanded', 'false')
}

$('menu-btn').addEventListener('click', (event) => {
  event.stopPropagation()
  if (menu.hidden) openMenu()
  else closeMenu()
})

document.addEventListener('click', (event) => {
  if (!menu.hidden && !event.target.closest('.menu-wrap')) closeMenu()
})

for (const option of document.querySelectorAll('.mode-option')) {
  option.addEventListener('click', () => {
    closeMenu()
    if (option.dataset.mode === mode) return
    ws?.send(JSON.stringify({ t: 'setMode', mode: option.dataset.mode }))
  })
}

const toggleLang = () => setLang(lang === 'en' ? 'es' : 'en')
$('menu-lang').addEventListener('click', toggleLang)
$('lang').addEventListener('click', toggleLang)

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
  if (mode !== 'guess') return
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
    toast('img.read')
    return ''
  }
}

async function attachBlob(blob, playerId) {
  const dataUrl = await toDataUrl(blob)
  if (!dataUrl) return
  if (dataUrl.length > MAX_IMAGE_CHARS) return toast('img.large')
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
    if (!file.type.startsWith('image/')) return toast('img.notImage')
    return attachBlob(file, playerId)
  }

  const url = safeUrl(urlFromTransfer(dt))
  if (!url) return toast('img.drop')

  let blob
  try {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok) return toast('img.download')
    blob = await res.blob()
  } catch {
    return toast('img.blocked')
  }
  if (!blob.type.startsWith('image/')) return toast('img.link')
  await attachBlob(blob, playerId)
}

async function acceptFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) return toast('img.notImage')
  await attachBlob(file)
}

const firstOtherId = () => players.find((player) => player.id !== me.id)?.id

/* seat interaction */

seats.addEventListener('click', (event) => {
  const seat = event.target.closest('.seat')
  if (!seat) return
  if (seat.dataset.id === me.id) return togglePicker(seat)
  if (mode !== 'guess') return castVote(seat.dataset.id)
  openComposer(seat.dataset.id)
})

const targetAt = (event) => event.target.closest('.seat, .table-card')
const clearOver = () => seats.querySelectorAll('.over').forEach((n) => n.classList.remove('over'))

seats.addEventListener('dragover', (event) => {
  if (mode !== 'guess') return
  const target = targetAt(event)
  if (!target) return
  event.preventDefault()
  event.dataTransfer.dropEffect = target.dataset.id === me.id ? 'none' : 'copy'
  clearOver()
  if (target.dataset.id !== me.id) target.classList.add('over')
})

seats.addEventListener('dragleave', clearOver)

seats.addEventListener('drop', async (event) => {
  if (mode !== 'guess') return
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
  if (!text && !pendingImage) return toast('card.needContent')
  const name = players.find((player) => player.id === composerTarget)?.username ?? 'player'
  ws.send(JSON.stringify({ t: 'addCard', toId: composerTarget, text, image: pendingImage }))
  closeComposer()
  toast('card.given', { name })
})

$('cancel').addEventListener('click', closeComposer)
composer.addEventListener('click', (event) => {
  if (event.target === composer) closeComposer()
})

/* login + room chrome */

function send(payload) {
  const username = $('username').value.trim()
  if (!username) return showError('err.username')
  if (!ws || ws.readyState !== WebSocket.OPEN) return showError('err.notConnected')
  showError(null)
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
  $('copy').textContent = t('room.copied')
  setTimeout(() => ($('copy').textContent = t('room.copy')), 1200)
})

$('leave').addEventListener('click', () => {
  closeMenu()
  leftByUser = true
  session = null
  pending = null
  clearTimeout(retryTimer)
  ws?.close()
})

$('clear').addEventListener('click', () => {
  ws.send(JSON.stringify({ t: 'clearCards' }))
  toast('card.cleared')
})

$('zoom-close').addEventListener('click', closeZoom)
$('zoom').addEventListener('click', (event) => {
  if (event.target === $('zoom')) closeZoom()
})

$('result-close').addEventListener('click', closeResult)

window.addEventListener('resize', () => {
  if (me) sizeCards()
})

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  closeComposer()
  closePicker()
  closeZoom()
  closeMenu()
  closeResult()
})

for (const type of ['dragover', 'drop']) {
  document.addEventListener(type, (event) => {
    if (event.target.closest('#seats, #drop')) return
    event.preventDefault()
  })
}

applyStatic()
paintFlags()
updateLangNames()
connect()
