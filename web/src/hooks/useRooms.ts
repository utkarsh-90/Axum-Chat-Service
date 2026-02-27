import { useEffect, useState } from 'react'
import { fetchRooms, createRoom } from '../api'
import type { AuthState, Room } from '../types'

export function useRooms(auth: AuthState | null) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')

  useEffect(() => {
    if (!auth) return
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const requestedRoomId = hash.get('room') ?? null
    setLoading(true)
    setError(null)
    fetchRooms(auth)
      .then((data) => {
        setRooms(data)
        if (requestedRoomId && data.some((r) => r.id === requestedRoomId)) {
          setSelectedRoomId(requestedRoomId)
        } else if (data.length > 0) {
          setSelectedRoomId(data[0].id)
        } else {
          setSelectedRoomId(null)
        }
      })
      .catch((err) => setError(err.message ?? 'Failed to load rooms'))
      .finally(() => setLoading(false))
  }, [auth])

  const createRoomHandler = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !newRoomName.trim()) return
    try {
      const room = await createRoom(auth, newRoomName.trim())
      setRooms((prev) => [...prev, room])
      setNewRoomName('')
      setSelectedRoomId(room.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  return {
    rooms,
    loading,
    error,
    selectedRoomId,
    setSelectedRoomId,
    newRoomName,
    setNewRoomName,
    createRoomHandler,
  }
}
