import { useMemo } from 'react'
import { LogOut, MessageSquare } from 'lucide-react'
import { useAuth, useRooms, useRoomWebSocket } from './hooks'
import { AuthScreen, Avatar, ChatArea, Sidebar } from './components'
import './App.css'

export default function App() {
  const auth = useAuth()
  const rooms = useRooms(auth.auth)
  const ws = useRoomWebSocket(auth.auth, rooms.selectedRoomId)

  const selectedRoom = useMemo(
    () => rooms.rooms.find((r) => r.id === rooms.selectedRoomId) ?? null,
    [rooms.rooms, rooms.selectedRoomId],
  )

  const handleLogout = () => {
    auth.logout()
    // Hooks reset when auth becomes null; no need to clear rooms/ws manually
  }

  if (!auth.auth) {
    return (
      <AuthScreen
        mode={auth.mode}
        setMode={auth.setMode}
        username={auth.username}
        setUsername={auth.setUsername}
        password={auth.password}
        setPassword={auth.setPassword}
        error={auth.error}
        setError={auth.setError}
        onSubmit={auth.handleSubmit}
      />
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
            <Avatar name={auth.auth.username} isSelf />
            <span className="username">@{auth.auth.username}</span>
          </div>
          <button type="button" className="icon-btn ghost" onClick={handleLogout} title="Log out">
            <LogOut size={18} />
            <span className="btn-label">Log out</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <Sidebar
          rooms={rooms.rooms}
          loading={rooms.loading}
          error={rooms.error}
          selectedRoomId={rooms.selectedRoomId}
          onSelectRoom={rooms.setSelectedRoomId}
          newRoomName={rooms.newRoomName}
          onNewRoomNameChange={rooms.setNewRoomName}
          onCreateRoom={rooms.createRoomHandler}
        />
        <ChatArea
          auth={auth.auth}
          selectedRoom={selectedRoom}
          messages={ws.messages}
          status={ws.status}
          wsError={ws.error}
          onSendMessage={(content) => ws.sendMessage(content)}
        />
      </main>
    </div>
  )
}
