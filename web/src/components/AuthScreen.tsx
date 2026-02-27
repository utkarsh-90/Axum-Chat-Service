import { MessageCircle, UserPlus, LogIn } from 'lucide-react'

type Props = {
  mode: 'login' | 'register'
  setMode: (m: 'login' | 'register') => void
  username: string
  setUsername: (s: string) => void
  password: string
  setPassword: (s: string) => void
  error: string | null
  setError: (s: string | null) => void
  onSubmit: (e: React.FormEvent) => void
}

export function AuthScreen({
  mode,
  setMode,
  username,
  setUsername,
  password,
  setPassword,
  error,
  setError,
  onSubmit,
}: Props) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0f0f12]">
      <div className="absolute inset-0 bg-linear-to-br from-[#1a1a24] via-[#15151d] to-[#0d0d12]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(88,101,242,0.25),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(124,58,237,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_10%_80%,rgba(88,101,242,0.12),transparent)]" />
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
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-brand/5 to-transparent" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="auth-card-enter rounded-2xl border border-white/10 bg-[#1c1c24]/90 backdrop-blur-xl shadow-2xl shadow-black/40 p-8 md:p-10">
          <div className="auth-logo-wrap text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-brand to-[#7c3aed] text-white shadow-lg shadow-brand/30 mb-4 transition-transform duration-300 ease-out hover:scale-[1.02]">
              <MessageCircle size={40} strokeWidth={1.8} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Axum Chat</h1>
            <p className="mt-1.5 text-sm text-gray-400">Register or log in to start chatting.</p>
          </div>
          <div className="auth-illustration-wrap flex justify-center mb-6" aria-hidden>
            <svg className="w-28 h-28 text-brand/30 transition-opacity duration-300 hover:opacity-60" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M42 48c0-5 8-10 18-10s18 5 18 10v18c0 5-4 10-18 10H48l-6 5v-5c-4 0-6-5-6-10V48z" fill="currentColor" fillOpacity="0.4" />
            </svg>
          </div>
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
              onClick={() => { setMode('register'); setError(null) }}
            >
              <UserPlus size={18} className="shrink-0" />
              Register
            </button>
            <button
              type="button"
              className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-gray-400 transition-colors duration-300 ease-out hover:text-white"
              style={{ color: mode === 'login' ? 'white' : undefined }}
              onClick={() => { setMode('login'); setError(null) }}
            >
              <LogIn size={18} className="shrink-0" />
              Login
            </button>
          </div>
          <form onSubmit={onSubmit} className="auth-form-wrap space-y-4">
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
            {error && (
              <div className="auth-error-enter rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300" role="alert">
                {error}
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
