import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link!')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>Movie Buddy</h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
        />
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {message && <p style={{ color: 'green', fontSize: 13 }}>{message}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          {loading ? 'Loading...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#666' }}>
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <span
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}
          style={{ color: '#534AB7', cursor: 'pointer', fontWeight: 500 }}
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </span>
      </p>
    </div>
  )
}