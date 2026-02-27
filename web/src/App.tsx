import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Hash,
  MessageCircle,
  LogOut,
  Send,
  Plus,
  MessageSquare,
  UserPlus,
  LogIn,
  Loader2,
  WifiOff,
  CheckCircle2,
} from 'lucide-react'
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

function Avatar({ name, isSelf }: { name: string; isSelf?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const hue = isSelf ? 250 : (name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360)
  return (
    <div
      className="avatar"
      style={{ background: `hsl(${hue}, 55%, 45%)` }}
      title={name}
    >
      {initials || '?'}
    </div>
  )
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
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
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
    } catch (err: unknown) {
      setRoomsError(err instanceof Error ? err.message : 'Failed to create room')
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
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0f0f12]">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a24] via-[#15151d] to-[#0d0d12]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(88,101,242,0.25),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(124,58,237,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_10%_80%,rgba(88,101,242,0.12),transparent)]" />

        {/* Background illustration: floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <svg className="absolute top-[12%] left-[8%] w-64 h-64 text-brand/20 animate-float" viewBox="0 0 120 120" fill="currentColor">
            <path d="M60 10a50 50 0 1 1 0 100 50 50 0 0 1 0-100zm0 8a42 42 0 1 0 0 84 42 42 0 0 0 0-84z" />
          </svg>
          <svg className="absolute top-[60%] right-[12%] w-40 h-40 text-brand/10 animate-float" style={{ animationDelay: '2s' }} viewBox="0 0 80 80" fill="currentColor">
            <ellipse cx="40" cy="40" rx="35" ry="35" />
          </svg>
          <svg className="absolute bottom-[15%] left-[15%] w-32 h-32 text-brand-light/10" viewBox="0 0 80 80" fill="currentColor">
            <path d="M20 25c0-5 8-10 20-10s20 5 20 10v20c0 5-5 10-20 10H30l-8 6v-6c-2 0-2-5-2-10V25z" />
          </svg>
          <svg className="absolute top-[35%] right-[25%] w-24 h-24 text-brand/15 animate-float" style={{ animationDelay: '1s' }} viewBox="0 0 60 60" fill="currentColor">
            <path d="M30 8c-8 0-15 6-15 14v14c0 8 7 14 15 14h5l5 4v-4h5c8 0 15-6 15-14V22c0-8-7-14-15-14z" />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-brand/5 to-transparent" />
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-[420px] mx-4">
          <div className="auth-card-enter rounded-2xl border border-white/10 bg-[#1c1c24]/90 backdrop-blur-xl shadow-2xl shadow-black/40 p-8 md:p-10">
            {/* Logo & brand */}
            <div className="auth-logo-wrap text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-brand to-[#7c3aed] text-white shadow-lg shadow-brand/30 mb-4 transition-transform duration-300 ease-out hover:scale-[1.02]">
                <MessageCircle size={40} strokeWidth={1.8} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Axum Chat</h1>
              <p className="mt-1.5 text-sm text-gray-400">Register or log in to start chatting.</p>
            </div>

            {/* Illustration accent */}
            <div className="auth-illustration-wrap flex justify-center mb-6" aria-hidden>
              <svg className="w-28 h-28 text-brand/30 transition-opacity duration-300 hover:opacity-60" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
                <path d="M42 48c0-5 8-10 18-10s18 5 18 10v18c0 5-4 10-18 10H48l-6 5v-5c-4 0-6-5-6-10V48z" fill="currentColor" fillOpacity="0.4" />
              </svg>
            </div>

            {/* Toggle with sliding pill */}
            <div className="auth-toggle-wrap relative flex gap-2 p-1 rounded-lg bg-white/5 border border-white/5 mb-6">
              <div
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-brand shadow-md transition-[transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: mode === 'login' ? 'translateX(100%)' : 'translateX(0)' }}
                aria-hidden
              />
              <button
                type="button"
                className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-gray-400 transition-colors duration-300 ease-out hover:text-white"
                style={{ color: mode === 'register' ? 'white' : undefined }}
                onClick={() => { setMode('register'); setAuthError(null) }}
              >
                <UserPlus size={18} className="shrink-0" />
                Register
              </button>
              <button
                type="button"
                className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-gray-400 transition-colors duration-300 ease-out hover:text-white"
                style={{ color: mode === 'login' ? 'white' : undefined }}
                onClick={() => { setMode('login'); setAuthError(null) }}
              >
                <LogIn size={18} className="shrink-0" />
                Login
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form-wrap space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="Enter username"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand hover:bg-white/[0.07] hover:border-white/15"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Enter password"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand hover:bg-white/[0.07] hover:border-white/15"
                />
              </label>
              {authError && (
                <div className="auth-error-enter rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300" role="alert">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold shadow-lg shadow-brand/25 transition-[background-color,transform,box-shadow] duration-200 ease-out hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#1c1c24]"
              >
                {mode === 'register' ? 'Create account & join' : 'Log in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <div className="app-logo">
            <MessageSquare size={22} strokeWidth={2} />
          </div>
          <span className="app-name">Axum Chat</span>
        </div>
        <div className="app-user">
          <div className="user-badge">
            <Avatar name={auth.username} isSelf />
            <span className="username">@{auth.username}</span>
          </div>
          <button type="button" className="icon-btn ghost" onClick={handleLogout} title="Log out">
            <LogOut size={18} />
            <span className="btn-label">Log out</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h2>
              <Hash size={18} />
              Channels
            </h2>
            {roomsLoading && (
              <p className="sidebar-loading">
                <Loader2 size={16} className="spin" />
                Loading…
              </p>
            )}
            {roomsError && <p className="error small">{roomsError}</p>}
            <ul className="room-list">
              {rooms.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    className={room.id === selectedRoomId ? 'room-button selected' : 'room-button'}
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    <Hash size={18} className="room-icon" />
                    <span>{room.name}</span>
                  </button>
                </li>
              ))}
              {rooms.length === 0 && !roomsLoading && (
                <li className="room-empty">
                  <MessageCircle size={20} />
                  <span>No channels yet</span>
                </li>
              )}
            </ul>
          </div>
          <div className="sidebar-section create-room">
            <form onSubmit={handleCreateRoom} className="create-room-form">
              <input
                placeholder="New channel name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                aria-label="New channel name"
              />
              <button type="submit" className="icon-btn primary" title="Create channel">
                <Plus size={18} />
                <span className="btn-label">Create</span>
              </button>
            </form>
          </div>
        </aside>

        <section className="chat">
          <div className="chat-header">
            <div className="chat-header-left">
              <Hash size={22} className="chat-channel-icon" />
              <h2>{selectedRoom ? selectedRoom.name : 'Select a channel'}</h2>
            </div>
            <div className="chat-status" title={`WebSocket: ${wsStatus}`}>
              {wsStatus === 'connected' && (
                <>
                  <CheckCircle2 size={16} className="status-ok" />
                  <span>Connected</span>
                </>
              )}
              {wsStatus === 'connecting' && (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Connecting…</span>
                </>
              )}
              {wsStatus === 'disconnected' && (
                <>
                  <WifiOff size={16} className="status-off" />
                  <span>Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && wsStatus === 'connected' && (
              <div className="messages-empty">
                <div className="messages-empty-icon">
                  <MessageCircle size={48} strokeWidth={1.2} />
                </div>
                <p>This is the start of <strong>#{selectedRoom?.name ?? 'channel'}</strong>.</p>
                <p className="muted">Send a message to get the conversation going.</p>
              </div>
            )}
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
                    <Avatar
                      name={m.user_id === auth.userId ? auth.username : m.username}
                      isSelf={m.user_id === auth.userId}
                    />
                    <div className="message-body">
                      <div className="message-top">
                        <span className="message-username">
                          {m.user_id === auth.userId ? 'You' : m.username}
                        </span>
                        <span className="message-time">
                          {new Date(m.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="message-content">{m.content}</div>
                    </div>
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
                  ? `Message #${selectedRoom?.name ?? 'channel'}`
                  : 'Connecting…'
              }
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={wsStatus !== 'connected'}
              aria-label="Message"
            />
            <button
              type="submit"
              className="icon-btn primary"
              disabled={wsStatus !== 'connected' || !messageInput.trim()}
              title="Send message"
            >
              <Send size={18} />
              <span className="btn-label">Send</span>
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default App
