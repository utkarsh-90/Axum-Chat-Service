# Web frontend (Axum Chat)

React + TypeScript + Vite UI for the chat backend. Login/register, room list, create room, real-time chat over WebSocket.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (default: http://localhost:5173) |
| `npm run build` | Type-check and build for production → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Config

The app talks to the backend at `http://127.0.0.1:8080` by default. To override, add a `.env` or `.env.local` in this directory:

```
VITE_API_BASE=http://your-backend:8080
VITE_WS_BASE=ws://your-backend:8080
```

Restart `npm run dev` after changing env. For the main project setup and API details, see the [root README](../README.md).
