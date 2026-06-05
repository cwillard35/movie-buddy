import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentScores, setRecentScores] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadDashboard() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      // Get user's scores with movie details
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
          username: profile?.username || user.email
        })

        setRecentScores(scores.slice(0, 5))
      }

      setLoading(false)
    }
    loadDashboard()
  }, [])

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>
        Welcome back, {stats?.username}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Films scored</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{stats?.total}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Your avg score</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{stats?.avg}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Member since</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>2015</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Recently scored</div>
        {recentScores.map(s => (
          <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid #f0f0f0', cursor: 'pointer' }}>
            {s.movies?.poster_url
              ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 32, height: 48, borderRadius: 4, objectFit: 'cover' }} />
              : <div style={{ width: 32, height: 48, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎬</div>
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.movies?.title}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{s.movies?.year} · {s.movies?.genres?.join(', ')}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: s.score >= 8 ? '#0F6E56' : s.score >= 6.5 ? '#534AB7' : '#993C1D' }}>
              {parseFloat(s.score).toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}