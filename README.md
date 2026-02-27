# Axum Chat Service

Rust backend (Axum + Postgres + WebSockets) and a React web app. Auth (register/login), rooms, and real-time chat. Messages are stored in Postgres and delivered over WebSockets.

---

## Table of contents

- [What you need](#what-you-need)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Project layout](#project-layout)
- [API reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Production](#production)

---

## What you need

- **Rust** (stable) and Cargo
- **Node.js** (for the web frontend)
- **PostgreSQL** (running and reachable)

---

## Quick start

**1. Backend env**

From the project root:

```bash
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` (your Postgres connection string) and `JWT_SECRET` (any long random string). See [Configuration](#configuration) for all options.

**2. Database**

Create the database and user if needed. The backend runs migrations on startup. To run them manually:

```bash
sqlx migrate run
```

Requires [sqlx-cli](https://github.com/launchbadge/sqlx): `cargo install sqlx-cli`.

**3. Start the backend**

```bash
cargo run
```

Listens on `SERVER_HOST:SERVER_PORT` (default `127.0.0.1:8080`).

**4. Start the web frontend**

In another terminal:

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The app talks to `http://127.0.0.1:8080` by default; see [Configuration](#configuration) to change that.

---

## Configuration

### Backend (project root `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string, e.g. `postgres://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Yes | Secret used to sign JWTs; use a long random value in production |
| `JWT_ISSUER` | No | JWT issuer claim (default: `axum-chat-service`) |
| `JWT_EXP_HOURS` | No | Token expiry in hours (default: `24`) |
| `SERVER_HOST` | No | Bind address (default: `127.0.0.1`) |
| `SERVER_PORT` | No | Port (default: `8080`) |
| `DATABASE_MAX_CONNECTIONS` | No | Pool size (default: `10`) |
| `RUST_LOG` | No | Log level, e.g. `info` or `info,axum_chat_service=debug` |

### Frontend (`web/.env` or `web/.env.local`)

Only needed if the backend is not at `http://127.0.0.1:8080`:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | Backend base URL for HTTP, e.g. `http://localhost:8080` |
| `VITE_WS_BASE` | Backend base URL for WebSockets, e.g. `ws://localhost:8080` |

---

## Project layout

```
.
├── src/                 # Backend (Rust)
│   ├── main.rs          # Entry, env, DB pool, router
│   ├── state.rs         # AppState (pool, JWT config)
│   ├── error.rs         # AppError and HTTP mapping
│   ├── auth/            # JWT, Argon2, extractors
│   ├── db/              # SQLx queries (users, rooms, messages)
│   ├── handlers/        # Auth and room HTTP handlers
│   ├── models/          # Request/response and DB types
│   ├── routes.rs        # Router and middleware
│   └── websocket/       # Room WebSocket handler
├── migrations/          # SQLx migrations
├── web/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx      # Auth, rooms, chat UI
│   │   └── ...
│   └── package.json
├── .env.example
└── Cargo.toml
```

- **Backend:** Axum, Tokio, SQLx, Tower, tracing, Argon2, JWT. REST + WebSocket.
- **Frontend:** React, TypeScript, Vite. Auth (token, user id, username) is stored in `localStorage`.

---

## API reference

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/register` | `{ "username": string, "password": string }` | `{ "token", "user_id", "username" }` |
| POST | `/api/auth/login` | Same | Same |

No auth header for these.

### Rooms

All require header: `Authorization: Bearer <token>`.

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/rooms` | — | List all rooms |
| POST | `/api/rooms` | `{ "name": string }` | Create a room |
| POST | `/api/rooms/:room_id/join` | — | Join a room (validates access) |

### WebSocket

- **Endpoint:** `GET /ws/rooms/:room_id`
- **Auth:** `Authorization: Bearer <token>` header, or query `?token=<token>`.
- **On connect:** Server sends the last 50 messages for that room (history).
- **Client → server:** Send JSON `{ "content": "message text" }`. Server broadcasts to everyone in the room and persists the message.
- **Server → client:** JSON messages with `id`, `room_id`, `user_id`, `username`, `content`, `created_at`, `kind` (`"message"` or `"system"` for joins/leaves).

---

## Troubleshooting

**Backend won’t start: “DATABASE_URL must be set”**  
Ensure `.env` exists in the project root and contains `DATABASE_URL`. Run from the repo root so `dotenvy` can load it.

**Backend: “connection refused” or migration errors**  
Postgres must be running and `DATABASE_URL` must be correct (host, port, user, password, database name). Create the database and user if you haven’t.

**Frontend: “Failed to load rooms” or CORS**  
Backend must be running on the URL the frontend uses. Default is `http://127.0.0.1:8080`. If you use another host/port, set `VITE_API_BASE` and `VITE_WS_BASE` in `web/.env` (or `.env.local`). Restart `npm run dev` after changing env.

**WebSocket stays “connecting” or disconnects**  
Check that `VITE_WS_BASE` matches your backend (e.g. `ws://127.0.0.1:8080`). If the backend is HTTPS, use `wss://`. Ensure the JWT is valid (re-login if needed).

**“Invalid token” or 401**  
Token may be expired. Log out and log in again in the web app to get a new token.

---

## Production

- Set a strong `JWT_SECRET` and rotate it periodically.
- Serve over HTTPS; put the backend behind a reverse proxy (e.g. Nginx, Traefik) and terminate TLS there.
- Tune `DATABASE_MAX_CONNECTIONS` and Postgres settings for your load.
- Logging uses `tracing`; integrate with your log aggregation.
- **Frontend:** Run `npm run build` in `web/`, then serve the `web/dist` directory with your static host or reverse proxy.
