import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8080'
const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://127.0.0.1:8080'

type LoginResponse = {
  token: string
  user_id: string
  username: string
}

type Room = {
  id: string
  name: string
  created_at: string
}

type WsMessageKind = 'history' | 'message' | 'system'

type ChatMessage = {
  id: string
  room_id: string
  user_id: string
  username: string
  content: string
  created_at: string
  kind: WsMessageKind
}

type AuthState = {
  token: string
  userId: string
  username: string
}

function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = localStorage.getItem('chat_auth')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as AuthState
      return parsed.token ? parsed : null
    } catch {
      return null
    }
  })
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [roomsError, setRoomsError] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    'disconnected',
  )
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!auth) return
    setRoomsLoading(true)
    setRoomsError(null)
    fetch(`${API_BASE}/api/rooms`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load rooms: ${res.status}`)
        }
        const data = (await res.json()) as Room[]
        setRooms(data)
        if (!selectedRoomId && data.length > 0) {
          setSelectedRoomId(data[0].id)
        }
      })
      .catch((err) => {
        setRoomsError(err.message ?? 'Failed to load rooms')
      })
      .finally(() => setRoomsLoading(false))
  }, [auth, selectedRoomId])

  useEffect(() => {
    if (!auth || !selectedRoomId) {
      wsRef.current?.close()
      wsRef.current = null
      setWsStatus('disconnected')
      setMessages([])
      return
    }

    const url = `${WS_BASE}/ws/rooms/${selectedRoomId}?token=${encodeURIComponent(auth.token)}`
    setWsStatus('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setWsStatus('connected')
      setMessages([])
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ChatMessage
        setMessages((prev) => [...prev, msg])
      } catch {
        console.warn('Failed to parse WS message', event.data)
      }
    }

    ws.onclose = () => {
      setWsStatus('disconnected')
    }

    ws.onerror = () => {
      setWsStatus('disconnected')
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [auth, selectedRoomId])

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed with ${res.status}`)
      }
      const data = (await res.json()) as LoginResponse
      const next: AuthState = {
        token: data.token,
        userId: data.user_id,
        username: data.username,
      }
      setAuth(next)
      localStorage.setItem('chat_auth', JSON.stringify(next))
      setPassword('')
    } catch (err: any) {
      setAuthError(err.message ?? 'Authentication failed')
    }
  }

  const handleLogout = () => {
    setAuth(null)
    setRooms([])
    setSelectedRoomId(null)
    setMessages([])
    wsRef.current?.close()
    wsRef.current = null
    localStorage.removeItem('chat_auth')
  }

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault()
    if (!auth || !newRoomName.trim()) return
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ name: newRoomName }),
      })
      if (!res.ok) {
        throw new Error(`Failed to create room: ${res.status}`)
      }
      const room = (await res.json()) as Room
      setRooms((prev) => [...prev, room])
      setNewRoomName('')
      setSelectedRoomId(room.id)
    } catch (err: any) {
      setRoomsError(err.message ?? 'Failed to create room')
    }
  }

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const payload = JSON.stringify({ content: messageInput.trim() })
    ws.send(payload)
    setMessageInput('')
  }

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )

  if (!auth) {
    return (
      <div className="app auth-screen">
        <div className="auth-card">
          <h1>Axum Chat</h1>
          <p className="muted">Register or log in to start chatting.</p>
          <div className="auth-toggle">
            <button
              className={mode === 'register' ? 'primary' : 'ghost'}
              onClick={() => setMode('register')}
            >
              Register
            </button>
            <button
              className={mode === 'login' ? 'primary' : 'ghost'}
              onClick={() => setMode('login')}
            >
              Login
            </button>
          </div>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {authError && <div className="error">{authError}</div>}
            <button type="submit" className="primary wide">
              {mode === 'register' ? 'Register & Join' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="dot" />
          <h1>Axum Chat</h1>
        </div>
        <div className="app-user">
          <span className="username">@{auth.username}</span>
          <button className="ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h2>Rooms</h2>
            {roomsLoading && <p className="muted">Loading rooms…</p>}
            {roomsError && <p className="error small">{roomsError}</p>}
            <ul className="room-list">
              {rooms.map((room) => (
                <li key={room.id}>
                  <button
                    className={
                      room.id === selectedRoomId ? 'room-button selected' : 'room-button'
                    }
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    <span>{room.name}</span>
                  </button>
                </li>
              ))}
              {rooms.length === 0 && !roomsLoading && (
                <li className="muted small">No rooms yet. Create one below.</li>
              )}
            </ul>
          </div>
          <div className="sidebar-section">
            <h3>Create room</h3>
            <form onSubmit={handleCreateRoom} className="vertical">
              <input
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <button type="submit" className="primary">
                Create
              </button>
            </form>
          </div>
        </aside>

        <section className="chat">
          <div className="chat-header">
            <div>
              <h2>{selectedRoom ? selectedRoom.name : 'Select a room'}</h2>
              <p className="muted small">
                WebSocket: <strong>{wsStatus}</strong>
              </p>
            </div>
          </div>
          <div className="chat-messages">
            {messages.map((m) => (
              <div
                key={m.id + m.created_at + m.kind}
                className={
                  m.kind === 'system'
                    ? 'message system'
                    : m.user_id === auth.userId
                    ? 'message self'
                    : 'message'
                }
              >
                {m.kind === 'system' ? (
                  <span className="message-system">
                    <span className="message-meta">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </span>{' '}
                    <strong>{m.username}</strong> {m.content}
                  </span>
                ) : (
                  <>
                    <div className="message-top">
                      <span className="message-username">
                        {m.user_id === auth.userId ? 'You' : m.username}
                      </span>
                      <span className="message-time">
                        {new Date(m.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">{m.content}</div>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              placeholder={
                wsStatus === 'connected'
                  ? 'Type a message and hit Enter…'
                  : 'Connecting…'
              }
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={wsStatus !== 'connected'}
            />
            <button type="submit" className="primary" disabled={wsStatus !== 'connected'}>
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default App
