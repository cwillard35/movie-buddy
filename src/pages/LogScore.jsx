import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LogScore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledId = searchParams.get('movie')

  const [step, setStep] = useState(prefilledId ? 2 : 1)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [score, setScore] = useState(7.0)
  const [notes, setNotes] = useState('')
  const [watchDate, setWatchDate] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState(null)
  const [existingScore, setExistingScore] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      // If prefilled movie ID, load it
      if (prefilledId) {
        const { data } = await supabase
          .from('movies')
          .select('*')
          .eq('id', prefilledId)
          .single()
        if (data) {
          setSelectedMovie(data)
          // Check if user already scored this
          const { data: existing } = await supabase
            .from('scores')
            .select('*')
            .eq('movie_id', prefilledId)
            .eq('user_id', user.id)
            .single()
          if (existing) {
            setExistingScore(existing)
            if (existing.score) setScore(parseFloat(existing.score))
            if (existing.notes) setNotes(existing.notes)
            if (existing.watch_date) setWatchDate(existing.watch_date)
          }
        }
      }
    }
    init()
  }, [prefilledId])

  // Search movies
  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('movies')
        .select('*')
        .ilike('title', `%${query}%`)
        .order('year', { ascending: false })
        .limit(8)
      setResults(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function selectMovie(movie) {
    setSelectedMovie(movie)
    setQuery('')
    setResults([])
    setStep(2)
  }

  function formatScore(v) {
    const n = parseFloat(v)
    return n % 1 === 0 ? n.toFixed(1) : n.toString()
  }

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

  async function handleSubmit() {
    if (!selectedMovie || !userId) return
    setSubmitting(true)

    const row = {
      user_id: userId,
      movie_id: selectedMovie.id,
      score,
      status: 'scored',
      notes: notes || null,
      watch_date: watchDate || null,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('scores')
      .upsert(row, { onConflict: 'user_id,movie_id' })

    if (error) { console.error(error); setSubmitting(false); return }

    setStep(3)
    setSubmitting(false)
  }

  async function handleSkip() {
    if (!selectedMovie || !userId) return
    await supabase
      .from('scores')
      .upsert({ user_id: userId, movie_id: selectedMovie.id, status: 'skipped', score: null }, { onConflict: 'user_id,movie_id' })
    navigate(`/movie/${selectedMovie.id}`)
  }

  const quickScores = [1, 2, 3, 4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        {['Find a film', 'Score it', 'Done'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 500, flexShrink: 0,
                background: step > i + 1 ? '#E1F5EE' : step === i + 1 ? '#534AB7' : 'transparent',
                color: step > i + 1 ? '#0F6E56' : step === i + 1 ? '#fff' : '#aaa',
                border: step <= i + 1 ? '0.5px solid #ddd' : 'none'
              }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, color: step === i + 1 ? '#534AB7' : '#aaa', fontWeight: step === i + 1 ? 500 : 400 }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 0.5, background: '#eee', margin: '0 10px', width: 40 }} />}
          </div>
        ))}
      </div>

      {/* Step 1 — Search */}
      {step === 1 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Find a film</div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search by title..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 13 }}
            />
          </div>
          {results.length > 0 && (
            <div>
              {results.map(m => (
                <div key={m.id} onClick={() => selectMovie(m)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 8,
                  borderRadius: 8, cursor: 'pointer', marginBottom: 4
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {m.poster_url
                    ? <img src={m.poster_url} alt={m.title} style={{ width: 32, height: 48, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 48, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎬</div>
                  }
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{m.year} · {m.genres?.slice(0, 2).join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {query.length >= 2 && results.length === 0 && (
            <div style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: 16 }}>No films found</div>
          )}
        </div>
      )}

      {/* Step 2 — Score */}
      {step === 2 && selectedMovie && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>

          {/* Movie info */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '0.5px solid #f0f0f0' }}>
            {selectedMovie.poster_url
              ? <img src={selectedMovie.poster_url} alt={selectedMovie.title} style={{ width: 70, height: 105, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 70, height: 105, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎬</div>
            }
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{selectedMovie.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{selectedMovie.year} · {selectedMovie.director}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedMovie.genres?.map(g => (
                  <span key={g} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#EEEDFE', color: '#534AB7' }}>{g}</span>
                ))}
              </div>
              {existingScore && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
                  Previously scored: <strong>{parseFloat(existingScore.score).toFixed(1)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Score input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>Your score</div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 52, fontWeight: 500, color: scoreColor(score), lineHeight: 1 }}>{formatScore(score)}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>drag the slider or tap a score</div>
            </div>
            <input
              type="range" min="1" max="10" step="0.25" value={score}
              onChange={e => setScore(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginBottom: 12 }}>
              <span>1.0</span><span>3.0</span><span>5.0</span><span>7.0</span><span>9.0</span><span>10.0</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {quickScores.map(s => (
                <button key={s} onClick={() => setScore(s)} style={{
                  fontSize: 11, padding: '4px 9px', borderRadius: 8,
                  border: '0.5px solid #ddd', cursor: 'pointer',
                  background: score === s ? '#EEEDFE' : 'transparent',
                  color: score === s ? '#534AB7' : '#666',
                  fontWeight: score === s ? 500 : 400
                }}>{s.toFixed(1)}</button>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 14, marginBottom: 16 }}>
            <div
              onClick={() => setShowOptional(!showOptional)}
              style={{ fontSize: 12, color: '#534AB7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {showOptional ? '▾' : '▸'} Add notes or watch date <span style={{ fontSize: 10, color: '#aaa' }}>optional</span>
            </div>
            {showOptional && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Notes</div>
                  <textarea
                    rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="What did you think?"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12, resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Watch date</div>
                  <input type="date" value={watchDate} onChange={e => setWatchDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12 }}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}
          >
            {submitting ? 'Saving...' : existingScore ? 'Update score' : 'Submit score'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', fontSize: 12, color: '#666', cursor: 'pointer' }}>
              ← Back
            </button>
            <button onClick={handleSkip} style={{ flex: 1, padding: 8, borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', fontSize: 12, color: '#993C1D', cursor: 'pointer' }}>
              Mark as skipped
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Score logged!</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
            You gave <strong>{selectedMovie?.title}</strong> a <strong style={{ color: scoreColor(score) }}>{formatScore(score)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/movie/${selectedMovie?.id}`)} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>
              View film page
            </button>
            <button onClick={() => { setStep(1); setSelectedMovie(null); setScore(7.0); setNotes(''); setWatchDate('') }} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer' }}>
              Log another film
            </button>
            <button onClick={() => navigate('/')} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer' }}>
              Go to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}