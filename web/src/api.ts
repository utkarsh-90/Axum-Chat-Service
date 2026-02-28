import { API_BASE, WS_BASE } from './config'
import type { AuthState, LoginResponse, Room } from './types'

async function authFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(await res.text() || `Login failed: ${res.status}`)
  return res.json()
}

export async function register(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(await res.text() || `Register failed: ${res.status}`)
  return res.json()
}

export async function fetchRooms(auth: AuthState): Promise<Room[]> {
  const res = await authFetch('/api/rooms', {}, auth.token)
  if (!res.ok) throw new Error(`Failed to load rooms: ${res.status}`)
  return res.json()
}

export async function createRoom(auth: AuthState, name: string): Promise<Room> {
  const res = await authFetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }, auth.token)
  if (!res.ok) throw new Error(await res.text() || `Failed to create room: ${res.status}`)
  return res.json()
}

export async function joinRoom(auth: AuthState, roomId: string): Promise<Room> {
  const res = await authFetch(`/api/rooms/${roomId}/join`, { method: 'POST' }, auth.token)
  if (!res.ok) throw new Error(await res.text() || `Failed to join room: ${res.status}`)
  return res.json()
}

export function buildWsUrl(roomId: string, token: string): string {
  return `${WS_BASE}/ws/rooms/${roomId}?token=${encodeURIComponent(token)}`
}
