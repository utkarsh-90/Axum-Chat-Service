import { Hash, Loader2, MessageCircle, Plus } from 'lucide-react'
import type { Room } from '../types'

type Props = {
  rooms: Room[]
  loading: boolean
  error: string | null
  selectedRoomId: string | null
  onSelectRoom: (id: string) => void
  newRoomName: string
  onNewRoomNameChange: (s: string) => void
  onCreateRoom: (e: React.FormEvent) => void
}

export function Sidebar({
  rooms,
  loading,
  error,
  selectedRoomId,
  onSelectRoom,
  newRoomName,
  onNewRoomNameChange,
  onCreateRoom,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h2>
          <Hash size={18} />
          Channels
        </h2>
        {loading && (
          <p className="sidebar-loading">
            <Loader2 size={16} className="spin" />
            Loading…
          </p>
        )}
        {error && <p className="error small">{error}</p>}
        <ul className="room-list">
          {rooms.map((room) => (
            <li key={room.id}>
              <button
                type="button"
                className={room.id === selectedRoomId ? 'room-button selected' : 'room-button'}
                onClick={() => onSelectRoom(room.id)}
              >
                <Hash size={18} className="room-icon" />
                <span>{room.name}</span>
              </button>
            </li>
          ))}
          {rooms.length === 0 && !loading && (
            <li className="room-empty">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={20} />
                <span>No channels yet</span>
              </div>
              <span className="room-empty-hint">Create one below to connect</span>
            </li>
          )}
        </ul>
      </div>
      <div className="sidebar-section create-room">
        <form onSubmit={onCreateRoom} className="create-room-form">
          <input
            placeholder="New channel name"
            value={newRoomName}
            onChange={(e) => onNewRoomNameChange(e.target.value)}
            aria-label="New channel name"
          />
          <button type="submit" className="icon-btn primary" title="Create channel">
            <Plus size={18} />
            <span className="btn-label">Create</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
