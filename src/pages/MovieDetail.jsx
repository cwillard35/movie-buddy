import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MovieDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [scores, setScores] = useState([])
  const [myScore, setMyScore] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data: movieData } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single()

      if (!movieData) { navigate('/'); return }
      setMovie(movieData)

      const { data: scoreData } = await supabase
        .from('scores')
        .select('*, users(username, id)')
        .eq('movie_id', id)
        .eq('status', 'scored')

      if (scoreData) {
        setScores(scoreData)
        const mine = scoreData.find(s => s.user_id === user?.id)
        if (mine) setMyScore(parseFloat(mine.score))
      }

      setLoading(false)
    }
    load()
  }, [id])

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (!movie) return <div style={{ padding: 20 }}>Movie not found</div>

  const groupAvg = scores.length > 0
    ? scores.reduce((sum, s) => sum + parseFloat(s.score), 0) / scores.length
    : null

  const buckets = {}
  scores.forEach(s => {
    const bucket = Math.floor(parseFloat(s.score) * 2) / 2
    buckets[bucket] = (buckets[bucket] || 0) + 1
  })
  const maxCount = Math.max(...Object.values(buckets), 1)

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>

      <button onClick={() => navigate(-1)} style={{
        fontSize: 12, color: '#666', background: 'none', border: 'none',
        cursor: 'pointer', marginBottom: 16, padding: 0
      }}>← Back</button>

      {/* Hero */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 20, marginBottom: 14, display: 'flex', gap: 20 }}>
        {movie.poster_url
  ? <img
      src={movie.poster_url}
      alt={movie.title}
      onClick={() => setLightbox(true)}
      style={{ width: 120, height: 180, borderRadius: 8, objectFit: 'cover', flexShrink: 0, cursor: 'zoom-in' }}
    />
  : <div style={{ width: 120, height: 180, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>🎬</div>
        }

        {/* Lightbox */}
        {lightbox && (
        <div
            onClick={() => setLightbox(false)}
            style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out'
            }}
        >
            <img
            src={movie.poster_url.replace('w500', 'w780')}
            alt={movie.title}
            style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 12, objectFit: 'contain' }}
            />
        </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{movie.title}</h1>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
            {movie.year} · {movie.director} · {movie.runtime ? `${movie.runtime} min` : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {movie.genres?.map(g => (
              <span key={g} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EEEDFE', color: '#534AB7', fontWeight: 500 }}>{g}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            {movie.imdb_score && (
              <div>
                <div style={{ fontSize: 10, color: '#888' }}>IMDB</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{movie.imdb_score}</div>
              </div>
            )}
            {groupAvg && (
              <div>
                <div style={{ fontSize: 10, color: '#888' }}>Group avg</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: scoreColor(groupAvg) }}>{groupAvg.toFixed(2)}</div>
              </div>
            )}
            {myScore && (
              <div>
                <div style={{ fontSize: 10, color: '#888' }}>Your score</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: scoreColor(myScore) }}>{myScore.toFixed(1)}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: '#888' }}>Scored by</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{scores.length} members</div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/log?movie=${movie.id}`)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
          >
            {myScore ? 'Edit your score' : '+ Log your score'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Score distribution */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Score distribution</div>
          {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map(bucket => {
            const count = buckets[bucket] || 0
            const isMe = myScore === bucket
            if (count === 0 && !isMe) return null
            return (
              <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: '#888', width: 28, textAlign: 'right', flexShrink: 0 }}>{bucket}</div>
                <div style={{ flex: 1, height: 16, background: '#f5f5f5', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(count / maxCount) * 100}%`,
                    height: '100%',
                    background: isMe ? '#0F6E56' : '#534AB7',
                    borderRadius: 3,
                    minWidth: count > 0 ? 4 : 0
                  }} />
                </div>
                <div style={{ fontSize: 10, color: '#888', width: 16, flexShrink: 0 }}>{count}</div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#534AB7' }} /> others
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#0F6E56' }} /> your score
            </div>
          </div>
        </div>

        {/* Member scores */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Member scores</div>
          {scores.length === 0 && (
            <div style={{ fontSize: 12, color: '#888' }}>No scores yet</div>
          )}
          {scores
            .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
            .map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0', borderBottom: '0.5px solid #f0f0f0'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 500, color: '#534AB7', flexShrink: 0
                }}>
                  {s.users?.username?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: s.user_id === userId ? 500 : 400 }}>
                  {s.users?.username} {s.user_id === userId && <span style={{ fontSize: 10, color: '#888' }}>(you)</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: scoreColor(parseFloat(s.score)) }}>
                  {parseFloat(s.score).toFixed(1)}
                </div>
              </div>
            ))}
        </div>

      </div>
    </div>
  )
}