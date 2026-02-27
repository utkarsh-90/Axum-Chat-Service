import { useEffect, useRef, useState } from 'react'
import { buildWsUrl } from '../api'
import type { AuthState, ChatMessage } from '../types'
import { WS_BASE } from '../config'

export type WsStatus = 'disconnected' | 'connecting' | 'connected'

export function useRoomWebSocket(
  auth: AuthState | null,
  roomId: string | null,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<WsStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!auth || !roomId) {
      wsRef.current?.close()
      wsRef.current = null
      setStatus('disconnected')
      setError(null)
      setMessages([])
      return
    }

    const url = buildWsUrl(roomId, auth.token)
    setStatus('connecting')
    setError(null)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      setError(null)
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

    ws.onclose = (ev) => {
      setStatus('disconnected')
      if (!ev.wasClean) {
        setError(
          ev.code === 1006
            ? `Connection failed. Is the backend running at ${WS_BASE}?`
            : `Connection closed (${ev.code}${ev.reason ? ': ' + ev.reason : ''})`,
        )
      }
    }

    ws.onerror = () => {
      setStatus('disconnected')
      setError('WebSocket error. Check backend is running and CORS.')
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [auth, roomId])

  const sendMessage = (content: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ content }))
  }

  return { messages, setMessages, status, error, wsRef, sendMessage }
}
