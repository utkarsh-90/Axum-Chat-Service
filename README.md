# Axum-Chat-Service

Rust backend (Axum + Postgres + WebSockets) plus a React web app. You get auth (register/login), rooms, and real-time chat. Messages are stored in Postgres and sent over WebSockets.

---

## What you need

- **Rust** (stable) and **Cargo**
- **Node.js** (for the web frontend)
- **PostgreSQL** (running somewhere you can connect to)

---

## Quick start

**1. Backend env**

From the project root:

```bash
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` to your Postgres connection string, and set `JWT_SECRET` to something secret (e.g. a long random string). The rest can stay as-is for local dev.

**2. Database**

Create a DB and user if you haven’t. The app runs SQLx migrations on startup, or you can run them yourself:

```bash
sqlx migrate run
```

(Requires `sqlx-cli`: `cargo install sqlx-cli`.)

**3. Start the backend**

```bash
cargo run
```

Backend listens on `SERVER_HOST:SERVER_PORT` from `.env` (default `127.0.0.1:8080`).

**4. Start the web frontend**

In another terminal:

```bash
cd web
npm install
npm run dev
```

Vite will print a URL (usually `http://localhost:5173`). Open it in a browser.

The frontend talks to `http://127.0.0.1:8080` by default. To point it at another host/port, create a `web/.env` (or `web/.env.local`) with:

- `VITE_API_BASE` — e.g. `http://localhost:8080`
- `VITE_WS_BASE` — e.g. `ws://localhost:8080`

---

## Project layout


| Part    | Where                            | What it does                                                               |
| ------- | -------------------------------- | -------------------------------------------------------------------------- |
| Backend | repo root, `src/`, `migrations/` | REST API + WebSocket server, Postgres, JWT auth                            |
| Web UI  | `web/`                           | React + Vite app: login/register, room list, create room, chat (WebSocket) |


Backend = Rust (Axum, Tokio, SQLx, Tower, tracing, Argon2, JWT).  
Frontend = React, TypeScript, Vite. Auth is stored in `localStorage` (token + user id + username).

---

## API (backend)

- **Auth**  
  - `POST /api/auth/register` — body: `{ "username", "password" }` → returns `{ token, user_id, username }`  
  - `POST /api/auth/login` — same body → same response
- **Rooms** (header: `Authorization: Bearer <token>`)  
  - `GET /api/rooms` — list rooms  
  - `POST /api/rooms` — body: `{ "name" }` → create room  
  - `POST /api/rooms/:room_id/join` — join room (validates access)
- **WebSocket**  
  - `GET /ws/rooms/:room_id` — pass token in `Authorization: Bearer <token>` or query `?token=...`. On connect you get the last 50 messages; sending a JSON `{ "content": "..." }` broadcasts to the room and persists.

---

## Production

- Use a strong `JWT_SECRET` and rotate it periodically.
- Put the app behind HTTPS (e.g. Nginx or Traefik).
- Tune `DATABASE_MAX_CONNECTIONS` and Postgres for your load.
- Logs use `tracing`; plug that into your logging stack.
- For the web app: run `npm run build` in `web/` and serve the `web/dist` output with your preferred static host or reverse proxy.

