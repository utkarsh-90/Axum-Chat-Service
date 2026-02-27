export type LoginResponse = {
  token: string
  user_id: string
  username: string
}

export type Room = {
  id: string
  name: string
  created_at: string
  owner_user_id?: string | null
}

export type WsMessageKind = 'history' | 'message' | 'system'

export type ChatMessage = {
  id: string
  room_id: string
  user_id: string
  username: string
  content: string
  created_at: string
  kind: WsMessageKind
}

export type AuthState = {
  token: string
  userId: string
  username: string
}
