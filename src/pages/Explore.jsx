import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { searchTMDB, importTMDBFilm } from '../lib/tmdb'

export default function Explore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbSearching, setTmdbSearching] = useState(false)

  // Scoring flow state
  const [scoringMovie, setScoringMovie] = useState(null) // raw TMDB object
  const [score, setScore] = useState(5.0)
  const [notes, setNotes] = useState('')
  const [watchDate, setWatchDate] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState(null)
  const [done, setDone] = useState(false)
  const [savedMovie, setSavedMovie] = useState(null)

  // Sync ?q= param from nav search
  useEffect(() => {
    const q = searchParams.get('q') || ''
    setQuery(q)
    setScoringMovie(null)
    setDone(false)
  }, [searchParams])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    init()
  }, [])

  useEffect(() => {
    async function load() {
      const { data: scoreData } = await supabase
        .from('scores')
        .select('movie_id, score, updated_at')
        .eq('status', 'scored')

      const pageSize = 1000
      let from = 0
      let all = []
      while (true) {
        const { data } = await supabase
          .from('movies')
          .select('id, title, year, poster_url, genres')
          .range(from, from + pageSize - 1)
        if (!data || data.length === 0) break
        all = [...all, ...data]
        if (data.length < pageSize) break
        from += pageSize
      }

      const statsMap = {}
      if (scoreData) {
        scoreData.forEach(s => {
          if (!statsMap[s.movie_id]) statsMap[s.movie_id] = { count: 0, latestDate: null, total: 0 }
          statsMap[s.movie_id].count++
          statsMap[s.movie_id].total += parseFloat(s.score)
          const d = s.updated_at
          if (!statsMap[s.movie_id].latestDate || d > statsMap[s.movie_id].latestDate) {
            statsMap[s.movie_id].latestDate = d
          }
        })
      }

      const enriched = all.map(m => ({
        ...m,
        scoreCount: statsMap[m.id]?.count || 0,
        latestDate: statsMap[m.id]?.latestDate || null,
      }))

      enriched.sort((a, b) => {
        if (a.scoreCount > 0 && b.scoreCount === 0) return -1
        if (b.scoreCount > 0 && a.scoreCount === 0) return 1
        if (a.latestDate && b.latestDate) {
          if (a.latestDate > b.latestDate) return -1
          if (a.latestDate < b.latestDate) return 1
        }
        return b.scoreCount - a.scoreCount
      })

      setMovies(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const localFiltered = query.length > 0
    ? movies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
    : movies

  useEffect(() => {
    if (!query || query.length < 2) { setTmdbResults([]); return }
    setTmdbResults([])
    const timer = setTimeout(async () => {
      if (localFiltered.length === 0 && !loading) {
        setTmdbSearching(true)
        try {
          const results = await searchTMDB(query)
          setTmdbResults(results.slice(0, 16))
        } catch (e) {
          console.error('TMDB search failed:', e)
        } finally {
          setTmdbSearching(false)
        }
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query, loading, localFiltered.length])

  function handleTMDBSelect(m) {
    setScoringMovie(m)
    setScore(5.0)
    setNotes('')
    setWatchDate('')
    setShowOptional(false)
    setDone(false)
  }

  async function handleSubmit() {
    if (!scoringMovie || !userId) return
    setSubmitting(true)
    try {
      const imported = await importTMDBFilm(scoringMovie.id, supabase)
      if (!imported) { setSubmitting(false); return }
      const row = {
        user_id: userId,
        movie_id: imported.id,
        score,
        status: 'scored',
        notes: notes || null,
        watch_date: watchDate || null,
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase.from('scores').upsert(row, { onConflict: 'user_id,movie_id' })
      if (error) { console.error(error); setSubmitting(false); return }
      setSavedMovie(imported)
      setDone(true)
    } catch (e) {
      console.error('Submit error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  function formatScore(v) { const n = parseFloat(v); return n % 1 === 0 ? n.toFixed(1) : n.toString() }
  function scoreColor(s) { if (s >= 8) return '#0F6E56'; if (s >= 6.5) return '#534AB7'; return '#993C1D' }

  // ── Scoring overlay ───────────────────────────────────────────────────────
  if (scoringMovie) {
    const posterUrl = scoringMovie.poster_path
      ? `https://image.tmdb.org/t/p/w500${scoringMovie.poster_path}`
      : null
    const year = scoringMovie.release_date ? scoringMovie.release_date.split('-')[0] : '—'

    if (done && savedMovie) {
      return (
        <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Score logged!</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
              You gave <strong>{scoringMovie.title}</strong> a <strong style={{ color: scoreColor(score) }}>{formatScore(score)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate(`/movie/${savedMovie.id}`)} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>View film page</button>
              <button onClick={() => { setScoringMovie(null); setDone(false) }} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer' }}>Back to Explore</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        <button onClick={() => setScoringMovie(null)} style={{ fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Back</button>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 11, color: '#534AB7', background: '#EEEDFE', borderRadius: 8, padding: '6px 10px', marginBottom: 12 }}>
            This film isn't in your catalog yet — it will be added when you submit your score.
          </div>
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '0.5px solid #f0f0f0' }}>
            {posterUrl
              ? <img src={posterUrl} alt={scoringMovie.title} style={{ width: 70, height: 105, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 70, height: 105, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎬</div>
            }
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{scoringMovie.title}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{year}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>Your score</div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 52, fontWeight: 500, color: scoreColor(score), lineHeight: 1 }}>{formatScore(score)}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>drag the slider or tap a score</div>
            </div>
            <style>{`
              .explore-score-range {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 4px;
                border-radius: 2px;
                background: linear-gradient(to right, #534AB7 0%, #534AB7 ${((score - 1) / 9) * 100}%, #ddd ${((score - 1) / 9) * 100}%, #ddd 100%);
                outline: none;
                margin-bottom: 6px;
                cursor: pointer;
              }
              .explore-score-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: #fff;
                border: 2px solid #534AB7;
                box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                cursor: pointer;
              }
              .explore-score-range::-moz-range-thumb {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: #fff;
                border: 2px solid #534AB7;
                box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                cursor: pointer;
              }
              .explore-score-range::-webkit-slider-runnable-track { border-radius: 2px; }
              .explore-score-range::-moz-range-track { height: 4px; border-radius: 2px; }
            `}</style>
            <input type="range" min="1" max="10" step="0.25" value={score} onChange={e => setScore(parseFloat(e.target.value))} className="explore-score-range" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 2px' }}>
              {[1,3,5,7,9,10].map(n => (
                <span key={n} style={{ fontSize: 10, color: '#bbb' }}>{n}.0</span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 14, marginBottom: 16 }}>
            <div onClick={() => setShowOptional(!showOptional)} style={{ fontSize: 12, color: '#534AB7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {showOptional ? '▾' : '▸'} Add notes or watch date <span style={{ fontSize: 10, color: '#aaa' }}>optional</span>
            </div>
            {showOptional && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Notes</div>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you think?" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12, resize: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Watch date</div>
                  <input type="date" value={watchDate} onChange={e => setWatchDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12 }} />
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {submitting ? 'Adding to catalog…' : 'Submit score'}
          </button>
        </div>
      </div>
    )
  }

  // ── Main grid view ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 20px 80px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .poster-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }
        @media (max-width: 480px) {
          .poster-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
          }
        }
        .poster-card {
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .poster-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .poster-img {
          width: 100%;
          aspect-ratio: 2/3;
          object-fit: cover;
          display: block;
          background: #EEEDFE;
        }
        .poster-placeholder {
          width: 100%;
          aspect-ratio: 2/3;
          background: #EEEDFE;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        .poster-title {
          font-size: 12px;
          font-weight: 500;
          margin-top: 6px;
          line-height: 1.3;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .poster-meta {
          font-size: 11px;
          color: #aaa;
          margin-top: 2px;
          margin-bottom: 8px;
        }
        .search-sticky {
          position: sticky;
          top: 53px;  /* height of your desktop nav */
          z-index: 10;
          background: #fff;
          padding: 12px 0;
          margin-bottom: 8px;
        }
      `}</style>

      <div className="search-sticky">
        <input
          type="text"
          placeholder="Search films..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 13 }}>Loading…</div>}

      {/* Local results */}
      {!loading && localFiltered.length > 0 && (
        <div className="poster-grid">
          {localFiltered.map(m => (
            <div key={m.id} className="poster-card" onClick={() => navigate(`/movie/${m.id}`)}>
              {m.poster_url
                ? <img src={m.poster_url} alt={m.title} className="poster-img" loading="lazy" />
                : <div className="poster-placeholder">🎬</div>
              }
              <div className="poster-title">{m.title}</div>
              <div className="poster-meta">{m.year}{m.scoreCount > 0 && ` · ${m.scoreCount} score${m.scoreCount !== 1 ? 's' : ''}`}</div>
            </div>
          ))}
        </div>
      )}

      {/* TMDB fallback */}
      {!loading && localFiltered.length === 0 && query.length >= 2 && (
        <div>
          {tmdbSearching && <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 13 }}>Searching TMDB…</div>}
          {!tmdbSearching && tmdbResults.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>Not in your group's catalog — click to score and add</div>
              <div className="poster-grid">
                {tmdbResults.map(m => {
                  const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null
                  const year = m.release_date ? m.release_date.split('-')[0] : '—'
                  return (
                    <div key={m.id} className="poster-card" onClick={() => handleTMDBSelect(m)} style={{ opacity: 0.85 }}>
                      {posterUrl
                        ? <img src={posterUrl} alt={m.title} className="poster-img" loading="lazy" />
                        : <div className="poster-placeholder">🎬</div>
                      }
                      <div className="poster-title">{m.title}</div>
                      <div className="poster-meta">{year}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {!tmdbSearching && tmdbResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 13 }}>No films found</div>
          )}
        </div>
      )}

      {!loading && !query && movies.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 13 }}>No films yet</div>
      )}
    </div>
  )
}