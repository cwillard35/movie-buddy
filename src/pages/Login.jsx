import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Mock Dashboard preview
function MockDashboard() {
  const recentFilms = [
    { title: 'The Substance', year: 2024, genres: 'Horror, Drama', score: 8.5, edited: false },
    { title: 'Anora', year: 2024, genres: 'Drama, Romance', score: 9.0, edited: true },
    { title: 'Conclave', year: 2024, genres: 'Drama, Thriller', score: 7.5, edited: false },
    { title: 'A Real Pain', year: 2024, genres: 'Drama, Comedy', score: 8.0, edited: false },
    { title: 'The Brutalist', year: 2024, genres: 'Drama, History', score: 9.5, edited: true },
  ]
  const buddyFilms = [
    { title: 'Dune: Part Two', year: 2024, buddy: 'Jordan', score: 9.0, time: '2h ago' },
    { title: 'Civil War', year: 2024, buddy: 'Sam', score: 7.5, time: '5h ago' },
    { title: 'Furiosa', year: 2024, buddy: 'Alex', score: 8.0, time: 'yesterday' },
    { title: 'Hit Man', year: 2024, buddy: 'Jordan', score: 8.5, time: 'yesterday' },
  ]
  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: '#333' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, color: '#111' }}>Welcome back, Alex</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {[['628', 'Films scored'], ['7.4', 'Avg score'], ['12', 'Buddy activity']].map(([val, label]) => (
            <div key={label} style={{ background: '#f8f8f8', borderRadius: 8, padding: '8px 10px', border: '0.5px solid #eee' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #eee', padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8, color: '#555' }}>Recently scored by you</div>
            {recentFilms.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < recentFilms.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                <div style={{ width: 18, height: 27, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {f.title}
                    {f.edited && <span style={{ fontSize: 8, background: '#f0f0f0', color: '#888', padding: '0 3px', borderRadius: 10 }}>edited</span>}
                  </div>
                  <div style={{ fontSize: 9, color: '#aaa' }}>{f.year} · {f.genres}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: scoreColor(f.score), flexShrink: 0 }}>{f.score.toFixed(1)}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #eee', padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8, color: '#555' }}>Buddy activity</div>
            {buddyFilms.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < buddyFilms.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                <div style={{ width: 18, height: 27, borderRadius: 3, background: '#f5f5f5', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
                  <div style={{ fontSize: 9, color: '#534AB7' }}>{f.buddy} · {f.time}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: scoreColor(f.score), flexShrink: 0 }}>{f.score.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock Movie Detail preview
function MockMovieDetail() {
  const memberScores = [
    { name: 'Jordan', initials: 'JO', score: 9.5 },
    { name: 'Sam', initials: 'SA', score: 9.0 },
    { name: 'Alex', initials: 'AL', score: 9.0 },
    { name: 'Morgan', initials: 'MO', score: 8.5 },
    { name: 'Riley', initials: 'RI', score: 8.0 },
    { name: 'Casey', initials: 'CA', score: 7.5 },
  ]
  const bars = [
    { score: 9.5, count: 1, isMe: false },
    { score: 9.0, count: 2, isMe: false },
    { score: 8.5, count: 1, isMe: false },
    { score: 8.0, count: 1, isMe: true },
  ]
  const maxCount = 2
  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }
  const comments = [
    { initials: 'JO', name: 'Jordan', body: 'Best film of the year, not even close.', time: '2h ago', votes: 4 },
    { initials: 'SA', name: 'Sam', body: '@Jordan agreed — the third act is stunning.', time: '1h ago', votes: 2 },
  ]
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: '#333' }}>
      {/* Hero */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 60, height: 90, borderRadius: 6, background: 'linear-gradient(135deg, #534AB7 0%, #2d2870 100%)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎬</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>The Brutalist</div>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>2024 · Brady Corbet · 215 min</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {['Drama', 'History'].map(g => <span key={g} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: '#EEEDFE', color: '#534AB7', fontWeight: 500 }}>{g}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
            {[['8.73', 'Group avg', '#534AB7'], ['8.0', 'Your score', '#0F6E56'], ['6', 'Scored by', '#333']].map(([val, label, color]) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: '#888' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color }}>{val}{label === 'Scored by' ? ' members' : ''}</div>
              </div>
            ))}
          </div>
          <button style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#534AB7', color: '#fff', cursor: 'default' }}>Edit your score</button>
        </div>
      </div>
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #eee', padding: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 500, marginBottom: 6, color: '#555' }}>Score distribution</div>
          {bars.map(b => (
            <div key={b.score} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <div style={{ fontSize: 9, color: '#888', width: 24, textAlign: 'right', flexShrink: 0 }}>{b.score}</div>
              <div style={{ flex: 1, height: 10, background: '#f5f5f5', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${(b.count / maxCount) * 100}%`, height: '100%', background: b.isMe ? '#0F6E56' : '#534AB7', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: '#888', width: 10, flexShrink: 0 }}>{b.count}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #eee', padding: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 500, marginBottom: 6, color: '#555' }}>Member scores</div>
          {memberScores.map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 500, color: '#534AB7', flexShrink: 0 }}>{m.initials}</div>
              <div style={{ flex: 1, fontSize: 10 }}>{m.name}</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: scoreColor(m.score) }}>{m.score.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Discussion */}
      <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #eee', padding: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 500, marginBottom: 6, color: '#555' }}>Discussion (2)</div>
        {comments.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, padding: '5px 0', borderBottom: i < comments.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 500, color: '#666', flexShrink: 0 }}>{c.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'baseline', marginBottom: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 8, color: '#bbb' }}>{c.time}</span>
              </div>
              <div style={{ fontSize: 9, color: '#444', lineHeight: 1.4 }}>
                {c.body.includes('@') ? (
                  <span>
                    {c.body.split(/(@\w+)/g).map((p, j) =>
                      p.startsWith('@')
                        ? <span key={j} style={{ color: '#534AB7', fontWeight: 500, background: '#EEEDFE', borderRadius: 2, padding: '0 1px' }}>{p}</span>
                        : p
                    )}
                  </span>
                ) : c.body}
              </div>
              <div style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>👍 {c.votes}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ members: 18, films: 0 })
  const [recentScores, setRecentScores] = useState([])
  const [activePanel, setActivePanel] = useState(0) // 0=dashboard, 1=movie detail
  const [panelFading, setPanelFading] = useState(false)

  useEffect(() => {
    async function loadPublicData() {
      const { count: filmCount } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
      const { count: memberCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      setStats({ members: memberCount ?? 18, films: filmCount ?? 0 })
      const { data: recent } = await supabase
        .from('scores')
        .select('score, movies(title), users(display_name, username)')
        .eq('status', 'scored')
        .order('updated_at', { ascending: false })
        .limit(3)
      if (recent) {
        setRecentScores(recent.map(s => ({
          title: s.movies?.title ?? 'Unknown',
          user: s.users?.display_name || s.users?.username || '?',
          score: parseFloat(s.score).toFixed(1),
        })))
      }
    }
    loadPublicData()
  }, [])

  // auto-rotate panels every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      setPanelFading(true)
      setTimeout(() => {
        setActivePanel(p => (p + 1) % 2)
        setPanelFading(false)
      }, 400)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  function switchPanel(idx) {
    if (idx === activePanel) return
    setPanelFading(true)
    setTimeout(() => {
      setActivePanel(idx)
      setPanelFading(false)
    }, 300)
  }

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
    : stats.films > 0 ? `${stats.films}+` : '500+'
  const yearsRunning = new Date().getFullYear() - 2014

  const panels = [
    { label: 'Dashboard', component: <MockDashboard /> },
    { label: 'Film detail', component: <MockMovieDetail /> },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500&display=swap');
        .mb-login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 420px;
          align-items: start;
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
        .mb-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, #0c0a14 0%, transparent 15%, transparent 85%, #0c0a14 100%),
            linear-gradient(to right, transparent 60%, #0c0a14 100%);
          pointer-events: none;
          z-index: 1;
        }
        .mb-brand {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mb-brand-icon {
          width: 36px; height: 36px;
          background: #aa3bff;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .mb-brand-name {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 22px; letter-spacing: -0.3px;
          color: #f0ecff; margin: 0;
        }
        .mb-hero { position: relative; z-index: 2; }
        .mb-eyebrow {
          font-size: 11px; letter-spacing: 2.5px;
          text-transform: uppercase; color: #aa3bff;
          margin: 0 0 1.25rem; font-weight: 500;
        }
        .mb-headline {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: clamp(36px, 5vw, 58px);
          line-height: 1.08; letter-spacing: -1px;
          color: #f0ecff; margin: 0 0 1.5rem; font-weight: 400;
        }
        .mb-headline em { font-style: italic; color: #c97bff; }
        .mb-sub {
          font-size: 16px; line-height: 1.65;
          color: #9e97b8; max-width: 460px; margin: 0 0 2.5rem;
        }
        .mb-stats { display: flex; gap: 2.5rem; align-items: center; }
        .mb-stat { display: flex; flex-direction: column; gap: 3px; }
        .mb-stat-num {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 28px; color: #f0ecff; letter-spacing: -0.5px;
        }
        .mb-stat-label {
          font-size: 11px; color: #6b6388;
          text-transform: uppercase; letter-spacing: 1.5px;
        }
        .mb-stat-divider { width: 1px; height: 36px; background: #2a2540; }

        /* Preview panel */
        .mb-preview-wrap {
          position: relative; z-index: 2;
          margin-top: 2.5rem;
        }
        .mb-preview-tabs {
          display: flex; gap: 8px; margin-bottom: 10px; align-items: center;
        }
        .mb-preview-tab {
          font-size: 11px; padding: 3px 10px; border-radius: 20px;
          border: 1px solid #2a2540; background: none;
          color: #4e4870; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif;
          transition: all 0.2s;
        }
        .mb-preview-tab.active {
          background: #1e1a38; color: #c97bff; border-color: #534AB7;
        }
        .mb-preview-label {
          font-size: 10px; color: #3a3560;
          text-transform: uppercase; letter-spacing: 1.5px; margin-left: auto;
        }
        .mb-preview-card {
          background: #fff;
          border-radius: 12px;
          padding: 14px;
          max-width: 520px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
          transition: opacity 0.3s ease;
        }
        .mb-preview-card.fading { opacity: 0; }
        .mb-preview-dots {
          display: flex; gap: 5px; margin-top: 10px;
        }
        .mb-preview-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #2a2540; cursor: pointer; transition: background 0.2s;
          border: none; padding: 0;
        }
        .mb-preview-dot.active { background: #aa3bff; }

        /* Right panel */
        .mb-right {
          background: #0f0c1f;
          border-left: 1px solid #1f1b38;
          padding: 3rem 2.5rem;
          display: flex; flex-direction: column; justify-content: center;
          position: sticky;
          top: 0;
          min-height: 100vh;
        }
        .mb-form-header { margin-bottom: 2rem; }
        .mb-form-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 26px; color: #f0ecff;
          margin: 0 0 0.375rem; letter-spacing: -0.3px; font-weight: 400;
        }
        .mb-form-sub { font-size: 14px; color: #6b6388; margin: 0; }
        .mb-tabs {
          display: flex; margin-bottom: 2rem;
          border-bottom: 1px solid #1f1b38;
        }
        .mb-tab {
          padding: 0.6rem 0; margin-right: 1.5rem; margin-bottom: -1px;
          font-size: 14px; font-weight: 500; color: #4e4870; cursor: pointer;
          border: none; border-bottom: 2px solid transparent; background: none;
          font-family: 'DM Sans', system-ui, sans-serif;
          transition: color 0.15s, border-color 0.15s;
        }
        .mb-tab.active { color: #f0ecff; border-bottom-color: #aa3bff; }
        .mb-form-group { margin-bottom: 1rem; }
        .mb-label {
          display: block; font-size: 11px; text-transform: uppercase;
          letter-spacing: 1.5px; color: #5c5580; margin-bottom: 0.5rem;
        }
        .mb-input {
          width: 100%; background: #15112a; border: 1px solid #2a2540;
          border-radius: 8px; padding: 11px 14px; font-size: 14px;
          font-family: 'DM Sans', system-ui, sans-serif; color: #e8e4f0;
          outline: none; box-sizing: border-box; transition: border-color 0.15s;
        }
        .mb-input:focus { border-color: #aa3bff; }
        .mb-input::placeholder { color: #3a3560; }
        .mb-submit {
          width: 100%; padding: 12px; background: #aa3bff; border: none;
          border-radius: 8px; color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px; font-weight: 500; cursor: pointer; margin-top: 1.5rem;
          transition: background 0.15s, opacity 0.15s;
        }
        .mb-submit:hover:not(:disabled) { background: #9c2ef7; }
        .mb-submit:disabled { opacity: 0.5; cursor: default; }
        .mb-error {
          margin-top: 0.875rem; font-size: 13px; padding: 10px 12px;
          border-radius: 6px; background: #2a0f1f; color: #f09595;
          border: 1px solid #4a1528;
        }
        .mb-success {
          margin-top: 0.875rem; font-size: 13px; padding: 10px 12px;
          border-radius: 6px; background: #0d2217; color: #97c459;
          border: 1px solid #173404;
        }
        .mb-invite-note {
          margin-top: 2rem; padding-top: 1.5rem;
          border-top: 1px solid #1f1b38;
          font-size: 12px; color: #3f3a5c; text-align: center; line-height: 1.6;
        }

        /* Recent scored row */
        .mb-recent { position: relative; z-index: 2; margin-top: 1.5rem; }
        .mb-recent-label {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #4e4870; margin: 0 0 0.875rem;
        }
        .mb-score-cards { display: flex; gap: 10px; }
        .mb-score-card {
          background: #15112a; border: 1px solid #2a2540; border-radius: 10px;
          padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
          flex: 1; min-width: 0;
        }
        .mb-card-title {
          font-size: 12px; color: #c4bedd; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .mb-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
        .mb-card-user { font-size: 11px; color: #5c5580; }
        .mb-card-score {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 15px; color: #aa3bff;
        }

        @media (max-width: 768px) {
          .mb-login-page { grid-template-columns: 1fr; }
          .mb-left { min-height: auto; padding: 2rem; }
          .mb-right { padding: 2rem; }
          .mb-headline { font-size: 36px; }
          .mb-stats { gap: 1.5rem; }
          .mb-preview-card { max-width: 100%; }
        }
      `}</style>

      <div className="mb-login-page">
        <div className="mb-left">
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

          {/* Auto-rotating preview */}
          <div className="mb-preview-wrap">
            <div className="mb-preview-tabs">
              {panels.map((p, i) => (
                <button
                  key={i}
                  className={`mb-preview-tab${activePanel === i ? ' active' : ''}`}
                  onClick={() => switchPanel(i)}
                >
                  {p.label}
                </button>
              ))}
              <span className="mb-preview-label">Live preview</span>
            </div>
            <div className={`mb-preview-card${panelFading ? ' fading' : ''}`} style={{ minHeight: 380, overflow: 'hidden' }}>
              {panels[activePanel].component}
            </div>
            <div className="mb-preview-dots">
              {panels.map((_, i) => (
                <button
                  key={i}
                  className={`mb-preview-dot${activePanel === i ? ' active' : ''}`}
                  onClick={() => switchPanel(i)}
                />
              ))}
            </div>
          </div>

          {/* Live recent scores */}
          {recentScores.length > 0 && (
            <div className="mb-recent">
              <p className="mb-recent-label">Recently scored</p>
              <div className="mb-score-cards">
                {recentScores.map((s, i) => (
                  <div key={i} className="mb-score-card">
                    <span className="mb-card-title">{s.title}</span>
                    <div className="mb-card-meta">
                      <span className="mb-card-user">{s.user}</span>
                      <span className="mb-card-score">{s.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <button className={`mb-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => switchMode('signin')}>Sign in</button>
            <button className={`mb-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => switchMode('signup')}>Create account</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-form-group">
              <label className="mb-label">Email</label>
              <input className="mb-input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="mb-form-group">
              <label className="mb-label">Password</label>
              <input className="mb-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
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