import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ members: 18, films: 0 })
  const [recentScores, setRecentScores] = useState([])

  useEffect(() => {
    async function loadPublicData() {
      const { count: filmCount } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })

      const { count: memberCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      setStats({
        members: memberCount ?? 18,
        films: filmCount ?? 0,
      })

      const { data: recent } = await supabase
        .from('scores')
        .select('score, movies(title), users(display_name, username)')
        .eq('status', 'scored')
        .order('created_at', { ascending: false })
        .limit(3)

      if (recent) {
        setRecentScores(
          recent.map((s) => ({
            title: s.movies?.title ?? 'Unknown',
            user: s.users?.display_name || s.users?.username || '?',
            score: parseFloat(s.score).toFixed(2).replace(/\.?0+$/, ''),
          }))
        )
      }
    }

    loadPublicData()
  }, [])

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

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setMessage('')
  }

  const filmDisplay = stats.films >= 1000
    ? `${(stats.films / 1000).toFixed(1)}k`
    : stats.films > 0
    ? `${stats.films}+`
    : '500+'

  const yearsRunning = new Date().getFullYear() - 2014

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500&display=swap');

        .mb-login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 420px;
          background: #0c0a14;
          color: #e8e4f0;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .mb-left {
          position: relative;
          padding: 3rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .mb-film-bg {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 3px;
          opacity: 0.18;
          pointer-events: none;
        }
        .mb-film-cell { background: #1a1528; border-radius: 2px; }
        .mb-film-cell:nth-child(3n) { background: #1e1035; }
        .mb-film-cell:nth-child(5n) { background: #160e2a; }
        .mb-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, #0c0a14 0%, transparent 20%, transparent 80%, #0c0a14 100%),
            linear-gradient(to right, #0c0a14 0%, transparent 15%, transparent 85%, #0c0a14 100%);
          pointer-events: none;
        }
        .mb-brand {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mb-brand-icon {
          width: 36px;
          height: 36px;
          background: #aa3bff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .mb-brand-name {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 22px;
          letter-spacing: -0.3px;
          color: #f0ecff;
          margin: 0;
        }
        .mb-hero { position: relative; z-index: 2; }
        .mb-eyebrow {
          font-size: 11px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #aa3bff;
          margin: 0 0 1.25rem;
          font-weight: 500;
        }
        .mb-headline {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: clamp(36px, 5vw, 58px);
          line-height: 1.08;
          letter-spacing: -1px;
          color: #f0ecff;
          margin: 0 0 1.5rem;
          font-weight: 400;
        }
        .mb-headline em { font-style: italic; color: #c97bff; }
        .mb-sub {
          font-size: 16px;
          line-height: 1.65;
          color: #9e97b8;
          max-width: 460px;
          margin: 0 0 2.5rem;
        }
        .mb-stats { display: flex; gap: 2.5rem; align-items: center; }
        .mb-stat { display: flex; flex-direction: column; gap: 3px; }
        .mb-stat-num {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 28px;
          color: #f0ecff;
          letter-spacing: -0.5px;
        }
        .mb-stat-label {
          font-size: 11px;
          color: #6b6388;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .mb-stat-divider { width: 1px; height: 36px; background: #2a2540; }
        .mb-recent { position: relative; z-index: 2; }
        .mb-recent-label {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #4e4870;
          margin: 0 0 0.875rem;
        }
        .mb-score-cards { display: flex; gap: 10px; }
        .mb-score-card {
          background: #15112a;
          border: 1px solid #2a2540;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }
        .mb-card-title {
          font-size: 12px;
          color: #c4bedd;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mb-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .mb-card-user { font-size: 11px; color: #5c5580; }
        .mb-card-score {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 15px;
          color: #aa3bff;
        }
        .mb-right {
          background: #0f0c1f;
          border-left: 1px solid #1f1b38;
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .mb-form-header { margin-bottom: 2rem; }
        .mb-form-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 26px;
          color: #f0ecff;
          margin: 0 0 0.375rem;
          letter-spacing: -0.3px;
          font-weight: 400;
        }
        .mb-form-sub { font-size: 14px; color: #6b6388; margin: 0; }
        .mb-tabs {
          display: flex;
          margin-bottom: 2rem;
          border-bottom: 1px solid #1f1b38;
        }
        .mb-tab {
          padding: 0.6rem 0;
          margin-right: 1.5rem;
          margin-bottom: -1px;
          font-size: 14px;
          font-weight: 500;
          color: #4e4870;
          cursor: pointer;
          border: none;
          border-bottom: 2px solid transparent;
          background: none;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: color 0.15s, border-color 0.15s;
        }
        .mb-tab.active { color: #f0ecff; border-bottom-color: #aa3bff; }
        .mb-form-group { margin-bottom: 1rem; }
        .mb-label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #5c5580;
          margin-bottom: 0.5rem;
        }
        .mb-input {
          width: 100%;
          background: #15112a;
          border: 1px solid #2a2540;
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #e8e4f0;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .mb-input:focus { border-color: #aa3bff; }
        .mb-input::placeholder { color: #3a3560; }
        .mb-submit {
          width: 100%;
          padding: 12px;
          background: #aa3bff;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 1.5rem;
          transition: background 0.15s, opacity 0.15s;
        }
        .mb-submit:hover:not(:disabled) { background: #9c2ef7; }
        .mb-submit:disabled { opacity: 0.5; cursor: default; }
        .mb-error {
          margin-top: 0.875rem;
          font-size: 13px;
          padding: 10px 12px;
          border-radius: 6px;
          background: #2a0f1f;
          color: #f09595;
          border: 1px solid #4a1528;
        }
        .mb-success {
          margin-top: 0.875rem;
          font-size: 13px;
          padding: 10px 12px;
          border-radius: 6px;
          background: #0d2217;
          color: #97c459;
          border: 1px solid #173404;
        }
        .mb-invite-note {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #1f1b38;
          font-size: 12px;
          color: #3f3a5c;
          text-align: center;
          line-height: 1.6;
        }
        @media (max-width: 768px) {
          .mb-login-page { grid-template-columns: 1fr; }
          .mb-left { min-height: 55vh; padding: 2rem; }
          .mb-right { padding: 2rem; }
          .mb-headline { font-size: 36px; }
          .mb-stats { gap: 1.5rem; }
          .mb-score-cards { flex-wrap: wrap; }
          .mb-score-card { min-width: calc(50% - 5px); }
        }
      `}</style>

      <div className="mb-login-page">
        <div className="mb-left">
          <div className="mb-film-bg" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="mb-film-cell" />
            ))}
          </div>
          <div className="mb-overlay" aria-hidden="true" />

          <div className="mb-brand">
            <div className="mb-brand-icon">🎬</div>
            <span className="mb-brand-name">Movie Buddy</span>
          </div>

          <div className="mb-hero">
            <p className="mb-eyebrow">A decade of film, ranked together</p>
            <h1 className="mb-headline">
              Every film.<br /><em>Every take.</em><br />One crew.
            </h1>
            <p className="mb-sub">
              Movie Buddy is where a group of friends track, score, and argue about film together —
              quarter-point precision, real opinions, {yearsRunning}+ years of history.
            </p>
            <div className="mb-stats">
              <div className="mb-stat">
                <span className="mb-stat-num">{stats.members}</span>
                <span className="mb-stat-label">Members</span>
              </div>
              <div className="mb-stat-divider" />
              <div className="mb-stat">
                <span className="mb-stat-num">{filmDisplay}</span>
                <span className="mb-stat-label">Films scored</span>
              </div>
              <div className="mb-stat-divider" />
              <div className="mb-stat">
                <span className="mb-stat-num">{yearsRunning} yrs</span>
                <span className="mb-stat-label">Running</span>
              </div>
            </div>
          </div>

          <div className="mb-recent">
            <p className="mb-recent-label">Recently scored</p>
            <div className="mb-score-cards">
              {recentScores.length > 0
                ? recentScores.map((s, i) => (
                    <div key={i} className="mb-score-card">
                      <span className="mb-card-title">{s.title}</span>
                      <div className="mb-card-meta">
                        <span className="mb-card-user">{s.user}</span>
                        <span className="mb-card-score">{s.score}</span>
                      </div>
                    </div>
                  ))
                : ['Loading…', 'Loading…', 'Loading…'].map((_, i) => (
                    <div key={i} className="mb-score-card">
                      <span className="mb-card-title" style={{ color: '#3a3560' }}>—</span>
                      <div className="mb-card-meta">
                        <span className="mb-card-user">—</span>
                        <span className="mb-card-score" style={{ color: '#3a3560' }}>—</span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        <div className="mb-right">
          <div className="mb-form-header">
            <h2 className="mb-form-title">
              {mode === 'signin' ? 'Welcome back' : 'Join Movie Buddy'}
            </h2>
            <p className="mb-form-sub">
              {mode === 'signin'
                ? 'Sign in to see scores, buddies, and the Top 25.'
                : 'Create your account to start tracking and scoring films.'}
            </p>
          </div>

          <div className="mb-tabs">
            <button
              className={`mb-tab${mode === 'signin' ? ' active' : ''}`}
              onClick={() => switchMode('signin')}
            >
              Sign in
            </button>
            <button
              className={`mb-tab${mode === 'signup' ? ' active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-form-group">
              <label className="mb-label">Email</label>
              <input
                className="mb-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="mb-form-group">
              <label className="mb-label">Password</label>
              <input
                className="mb-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && <div className="mb-error">{error}</div>}
            {message && <div className="mb-success">{message}</div>}

            <button className="mb-submit" type="submit" disabled={loading}>
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mb-invite-note">
            Movie Buddy is a private group. You'll need to be invited by a member to join —
            once your account is created, an admin will link you to your scores.
          </p>
        </div>
      </div>
    </>
  )
}