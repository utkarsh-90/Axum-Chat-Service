import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Hash, MessageCircle, Send, UserPlus, Loader2, WifiOff, CheckCircle2 } from 'lucide-react'
import { Avatar } from './Avatar'
import type { AuthState, ChatMessage, Room } from '../types'
import type { WsStatus } from '../hooks'

type Props = {
  auth: AuthState
  selectedRoom: Room | null
  messages: ChatMessage[]
  status: WsStatus
  wsError: string | null
  onSendMessage: (content: string) => void
}

export function ChatArea({
  auth,
  selectedRoom,
  messages,
  status,
  wsError,
  onSendMessage,
}: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const inviteLink =
    selectedRoom && typeof window !== 'undefined'
      ? `${window.location.origin}/#room=${selectedRoom.id}`
      : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSendMessage(text)
    setInput('')
  }

  return (
    <section className="chat">
      <div className="chat-header">
        <div className="chat-header-left">
          <Hash size={22} className="chat-channel-icon" />
          <h2>{selectedRoom ? selectedRoom.name : 'Select a channel'}</h2>
        </div>
        {selectedRoom && inviteLink && (
          <button
            type="button"
            className="icon-btn ghost"
            onClick={() => navigator.clipboard.writeText(inviteLink).catch(() => {})}
          >
            <UserPlus size={16} />
            <span className="btn-label">Copy invite link</span>
          </button>
        )}
        <div className="chat-status" title={`WebSocket: ${status}`}>
          {status === 'connected' && (
            <>
              <CheckCircle2 size={16} className="status-ok" />
              <span>Connected</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <Loader2 size={16} className="spin" />
              <span>Connecting…</span>
            </>
          )}
          {status === 'disconnected' && (
            <>
              <WifiOff size={16} className="status-off" />
              <span>Disconnected</span>
            </>
          )}
        </div>
        {wsError && (
          <p className="error small" style={{ marginTop: 4 }}>
            {wsError}
          </p>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && status === 'connected' && (
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
            key={`${m.id}-${m.created_at}-${m.kind}`}
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
                <span className="message-meta">{new Date(m.created_at).toLocaleTimeString()}</span>{' '}
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

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          placeholder={
            status === 'connected'
              ? `Message #${selectedRoom?.name ?? 'channel'}`
              : 'Connecting…'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== 'connected'}
          aria-label="Message"
        />
        <button
          type="submit"
          className="icon-btn primary"
          disabled={status !== 'connected' || !input.trim()}
          title="Send message"
        >
          <Send size={18} />
          <span className="btn-label">Send</span>
        </button>
      </form>
    </section>
  )
}
