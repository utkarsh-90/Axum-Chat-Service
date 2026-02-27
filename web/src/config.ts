/**
 * Frontend config: API and WebSocket base URLs.
 * Use same host as the page when possible for fewer CORS/connection issues.
 */
const fallbackHost =
  typeof window !== 'undefined'
    ? `${window.location.hostname}:8080`
    : '127.0.0.1:8080'
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const httpProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:'

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? `${httpProtocol}//${fallbackHost}`
export const WS_BASE =
  import.meta.env.VITE_WS_BASE ?? `${protocol}//${fallbackHost}`
