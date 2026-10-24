# AGENTS.md

## Project

Real-time multiplayer party game over WebSockets: players join a 4-letter room code, sit around a virtual table, and hide cards (text and/or image) in front of other players. Vanilla JS, no framework, no persistence.

npm workspaces monorepo:

- `client/` — Vite vanilla-JS app. All rendering is imperative DOM in `client/src/main.js`; styles in `client/src/style.css`.
- `server/` — single-file Node server (`server/index.js`): static serving of `client/dist` + all game logic. In-memory state only.
- `scripts/dev.mjs` — runs both processes together for development.

## Commands (use npm — the tooling spawns `npm`, not pnpm)

- `npm run dev` — start server (port 3001, `node --watch`) **and** Vite dev server (port 5173, proxies `/ws` to the server). This is the dev workflow.
- `npm run build` — build the client to `client/dist`. Required before `npm start`: the server serves that folder and 404s with "Client not built" otherwise.
- `npm start` — production server on port 3001 (`PORT` env overrides).

There is **no** test, lint, format, typecheck, or CI tooling. Do not invent verification steps. `pnpm-lock.yaml` in the repo root is an untracked local stray; `package-lock.json` is the committed lockfile.

## Architecture gotchas

- **Protocol**: JSON messages with a string `t` discriminator in both directions.
  - client → server: `create`, `join` (both carry `username`), then `addCard`, `removeCard`, `clearCards`, `avatar`
  - server → client: `welcome` (room code + avatar palette), `state` (full snapshot incl. `admin` flag per player), `error`
- **One card per player, everyone sees every card**: the server sends all cards to all players (`publicCards()` — no per-viewer filtering). The client renders the viewer's *own* card face-down until they tap Watch; everyone else's cards render face-up (click → zoom modal). Assigning a card to a player who already holds one **replaces** it (server enforces — there is no card limit constant anymore).
- **Host role**: the room creator is the host (`room.adminId`, auto-transferred to the next-oldest player when the host leaves). Only the host can remove other players' cards or send `clearCards`; holders can always remove their own card. Enforced in `removeCard`/`clearCards` in `server/index.js`.
- **Server is authoritative** for limits; the client only mirrors some of them: `MAX_TEXT` 200, `MAX_IMAGE_CHARS` 1_500_000, images must match `IMAGE_PATTERN` (base64 `data:image/(png|jpeg|webp|gif)`). The client downscales uploads to 640 px via canvas before sending.
- **Rooms live in a `Map`** — no persistence, no auth, no expiry beyond deletion when the last player leaves. A server restart kicks everyone; broadcasts are full state snapshots on every change.
- The avatar palette (`AVATARS`, `GRADIENTS`) lives server-side, is sent in `welcome`, and incoming `avatar` messages are validated against it — adding an avatar means editing the server array.

## Client conventions

- User-controlled strings (usernames, card text) are assigned via `textContent`, never interpolated into `innerHTML` — keep it that way to avoid XSS.
- **The page must never scroll.** The UI is locked to the viewport height (`html, body { overflow: hidden }`, and `.table-wrap` is sized with a `100dvh` calc so the square table plus header/footer always fit). Preserve this when changing layout.
