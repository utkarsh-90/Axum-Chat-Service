import { type FormEvent, useState } from 'react'
import { register, login } from '../api'
import type { AuthState } from '../types'

const STORAGE_KEY = 'chat_auth'

function loadStoredAuth(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthState
    return parsed.token ? parsed : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [auth, setAuthState] = useState<AuthState | null>(loadStoredAuth)
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setAuth = (next: AuthState | null) => {
    setAuthState(next)
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const data = mode === 'register'
        ? await register(username, password)
        : await login(username, password)
      const next: AuthState = {
        token: data.token,
        userId: data.user_id,
        username: data.username,
      }
      setAuth(next)
      setPassword('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const logout = () => {
    setAuth(null)
  }

  return {
    auth,
    setAuth,
    mode,
    setMode,
    username,
    setUsername,
    password,
    setPassword,
    error,
    setError,
    handleSubmit,
    logout,
  }
}
