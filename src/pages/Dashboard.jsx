import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentScores, setRecentScores] = useState([])
  const [buddyActivity, setBuddyActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: scores } = await supabase
        .from('scores')
        .select('*, movies(*)')
        .eq('user_id', user.id)
        .eq('status', 'scored')
        .order('created_at', { ascending: false })

      if (scores) {
        const total = scores.length
        const avg = scores.reduce((sum, s) => sum + parseFloat(s.score), 0) / total
        setStats({
          total,
          avg: avg.toFixed(1),
          username: profile?.display_name || profile?.username || user.email
        })
        setRecentScores(scores.slice(0, 5))
      }

      const { data: activity } = await supabase.rpc('get_buddy_activity', {
        target_user_id: user.id,
        days_back: 14
      })
      setBuddyActivity(activity || [])

      setLoading(false)
    }
    loadDashboard()
  }, [])

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (days === 0) return hours <= 1 ? 'just now' : `${hours}h ago`
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 768px) {
          .dash-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>
        Welcome back, {stats?.username}
      </h2>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Films scored</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{stats?.total}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Your avg score</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{stats?.avg}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Buddy activity</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{buddyActivity.length}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>films scored in last 14 days</div>
        </div>
      </div>

      <div className="dash-grid">

        {/* Recently scored */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Recently scored by you</div>
          {recentScores.length === 0 && (
            <div style={{ fontSize: 12, color: '#888' }}>No scores yet — go log some films!</div>
          )}
          {recentScores.map(s => (
            <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
              borderBottom: '0.5px solid #f0f0f0', cursor: 'pointer'
            }}>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 32, height: 48, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 32, height: 48, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🎬</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{s.movies?.year} · {s.movies?.genres?.slice(0, 2).join(', ')}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: s.score >= 8 ? '#0F6E56' : s.score >= 6.5 ? '#534AB7' : '#993C1D', flexShrink: 0 }}>
                {parseFloat(s.score).toFixed(1)}
              </div>
            </div>
          ))}
        </div>

        {/* Buddy activity feed */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Recent activity from your buddies</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Films scored by your top 10 matches in the last 2 weeks</div>
          {buddyActivity.length === 0 && (
            <div style={{ fontSize: 12, color: '#888' }}>No buddy activity in the last 14 days.</div>
          )}
          {buddyActivity.map((a, i) => (
            <div key={`${a.movie_id}-${a.scored_by}`} onClick={() => navigate(`/movie/${a.movie_id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
              borderBottom: i < buddyActivity.length - 1 ? '0.5px solid #f0f0f0' : 'none',
              cursor: 'pointer'
            }}>
              {a.poster_url
                ? <img src={a.poster_url} alt={a.title} style={{ width: 32, height: 48, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 32, height: 48, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🎬</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{a.year} · {a.genres?.slice(0, 2).join(', ')}</div>
                <div style={{ fontSize: 11, color: '#534AB7', marginTop: 2 }}>
                  scored by <strong>{a.scored_by}</strong> · {timeAgo(a.scored_at)}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}