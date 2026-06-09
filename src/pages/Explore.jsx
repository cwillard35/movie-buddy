import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { searchTMDB, importTMDBFilm } from '../lib/tmdb'

export default function Explore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledId = searchParams.get('movie')
  const initialQuery = searchParams.get('q') || ''

  const [step, setStep] = useState(prefilledId ? 2 : 1)
  const [query, setQuery] = useState(initialQuery)
  const [score, setScore] = useState(5.0)
  const [notes, setNotes] = useState('')
  const [watchDate, setWatchDate] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState(null)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [existingScore, setExistingScore] = useState(null)
  const [isTMDB, setIsTMDB] = useState(false)
  const [allMovies, setAllMovies] = useState([])
  const [allMoviesLoaded, setAllMoviesLoaded] = useState(false)
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbSearching, setTmdbSearching] = useState(false)

  // sync query param changes (from nav search bar)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    const movieId = searchParams.get('movie')
    if (movieId) {
      setStep(2)
    } else if (q) {
      setQuery(q)
      setStep(1)
    }
  }, [searchParams])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      if (prefilledId) {
        const { data } = await supabase.from('movies').select('*').eq('id', prefilledId).single()
        if (data) {
          setSelectedMovie(data)
          setIsTMDB(false)
          const { data: existing } = await supabase.from('scores').select('*').eq('movie_id', prefilledId).eq('user_id', user.id).single()
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

  useEffect(() => {
    async function loadAllMovies() {
      const pageSize = 1000
      let from = 0
      let all = []
      while (true) {
        const { data } = await supabase.from('movies').select('id, title, year, poster_url, genres').order('title', { ascending: true }).range(from, from + pageSize - 1)
        if (!data || data.length === 0) break
        all = [...all, ...data]
        if (data.length < pageSize) break
        from += pageSize
      }
      setAllMovies(all)
      setAllMoviesLoaded(true)
    }
    loadAllMovies()
  }, [])

  useEffect(() => {
    if (!query || query.length < 2) { setTmdbResults([]); return }
    setTmdbResults([])
    const timer = setTimeout(async () => {
      const localMatches = allMovies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
      if (localMatches.length === 0 && allMoviesLoaded) {
        setTmdbSearching(true)
        try {
          const results = await searchTMDB(query)
          setTmdbResults(results.slice(0, 8))
        } catch (e) {
          console.error('TMDB search failed:', e)
        } finally {
          setTmdbSearching(false)
        }
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query, allMovies, allMoviesLoaded])

  function handleLocalSelect(movie) { navigate(`/movie/${movie.id}`) }

  function handleTMDBSelect(tmdbMovie) {
    const posterUrl = tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : null
    const year = tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : null
    setSelectedMovie({ tmdb_id: tmdbMovie.id, title: tmdbMovie.title, year, poster_url: posterUrl, genres: [], director: null })
    setIsTMDB(true)
    setExistingScore(null)
    setStep(2)
  }

  async function handleSubmit() {
    if (!selectedMovie || !userId) return
    setSubmitting(true)
    let movieId = selectedMovie.id
    if (isTMDB) {
      try {
        const imported = await importTMDBFilm(selectedMovie.tmdb_id, supabase)
        if (!imported) { setSubmitting(false); return }
        movieId = imported.id
        setSelectedMovie(imported)
        setIsTMDB(false)
      } catch (e) { console.error('Import error:', e); setSubmitting(false); return }
    }
    const row = { user_id: userId, movie_id: movieId, score, status: 'scored', notes: notes || null, watch_date: watchDate || null, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('scores').upsert(row, { onConflict: 'user_id,movie_id' })
    if (error) { console.error(error); setSubmitting(false); return }
    setStep(3)
    setSubmitting(false)
  }

  async function handleSkip() {
    if (!selectedMovie || !userId || isTMDB) return
    await supabase.from('scores').upsert({ user_id: userId, movie_id: selectedMovie.id, status: 'skipped', score: null }, { onConflict: 'user_id,movie_id' })
    navigate(`/movie/${selectedMovie.id}`)
  }

  function formatScore(v) { const n = parseFloat(v); return n % 1 === 0 ? n.toFixed(1) : n.toString() }
  function scoreColor(s) { if (s >= 8) return '#0F6E56'; if (s >= 6.5) return '#534AB7'; return '#993C1D' }
  function groupByLetter(movies) {
    const groups = {}
    movies.forEach(m => {
      const raw = m.title.replace(/^(The |A |An )/i, '')
      const letter = raw[0]?.toUpperCase() || '#'
      const key = /[A-Z]/.test(letter) ? letter : '#'
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }

  const quickScores = [1, 2, 3, 4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

  function FilmRow({ movie, onClick, isTmdb }) {
    const [hovered, setHovered] = useState(false)
    const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : null)
    const year = movie.year || (movie.release_date ? movie.release_date.split('-')[0] : '—')
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', borderBottom: '0.5px solid #f5f5f5', cursor: 'pointer', borderRadius: 6, background: hovered ? '#f9f9f9' : 'transparent', transition: 'background 0.1s' }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {posterUrl ? <img src={posterUrl} alt={movie.title} style={{ width: 28, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 28, height: 42, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🎬</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>{year}</div>
        </div>
        {isTmdb && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: '#EEEDFE', color: '#534AB7', fontWeight: 600, flexShrink: 0 }}>TMDB</span>}
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        {['Find a film', 'Score it', 'Done'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0, background: step > i + 1 ? '#E1F5EE' : step === i + 1 ? '#534AB7' : 'transparent', color: step > i + 1 ? '#0F6E56' : step === i + 1 ? '#fff' : '#aaa', border: step <= i + 1 ? '0.5px solid #ddd' : 'none' }}>{step > i + 1 ? '✓' : i + 1}</div>
              <span style={{ fontSize: 12, color: step === i + 1 ? '#534AB7' : '#aaa', fontWeight: step === i + 1 ? 500 : 400 }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 0.5, background: '#eee', margin: '0 10px', width: 40 }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <input type="text" placeholder="Search by title..." value={query} onChange={e => setQuery(e.target.value)} autoFocus style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />
          {!allMoviesLoaded && <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: 24 }}>Loading…</div>}
          {allMoviesLoaded && (() => {
            const filtered = query.length > 0 ? allMovies.filter(m => m.title.toLowerCase().includes(query.toLowerCase())) : allMovies
            const isSearching = query.length > 0
            const grouped = !isSearching ? groupByLetter(filtered) : null
            return (
              <div>
                {filtered.length > 0 && (grouped ? grouped.map(([letter, movies]) => (
                  <div key={letter}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', padding: '8px 0 3px', borderBottom: '0.5px solid #eee', letterSpacing: '0.5px', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>{letter}</div>
                    {movies.map(m => <FilmRow key={m.id} movie={m} onClick={() => handleLocalSelect(m)} />)}
                  </div>
                )) : filtered.map(m => <FilmRow key={m.id} movie={m} onClick={() => handleLocalSelect(m)} />))}
                {isSearching && filtered.length === 0 && (
                  <div>
                    {tmdbSearching && <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: 16 }}>Searching TMDB…</div>}
                    {!tmdbSearching && tmdbResults.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: '#aaa', padding: '8px 0 6px', borderBottom: '0.5px solid #eee', marginBottom: 4 }}>Not in your group's catalog — score it to add</div>
                        {tmdbResults.map(m => <FilmRow key={m.id} movie={m} onClick={() => handleTMDBSelect(m)} isTmdb />)}
                      </div>
                    )}
                    {!tmdbSearching && tmdbResults.length === 0 && query.length >= 2 && <div style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: 16 }}>No films found</div>}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {step === 2 && selectedMovie && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          {isTMDB && <div style={{ fontSize: 11, color: '#534AB7', background: '#EEEDFE', borderRadius: 8, padding: '6px 10px', marginBottom: 12 }}>This film isn't in your catalog yet — it will be added when you submit your score.</div>}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '0.5px solid #f0f0f0' }}>
            {selectedMovie.poster_url ? <img src={selectedMovie.poster_url} alt={selectedMovie.title} style={{ width: 70, height: 105, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 70, height: 105, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎬</div>}
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{selectedMovie.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{selectedMovie.year} · {selectedMovie.director}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{selectedMovie.genres?.map(g => <span key={g} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#EEEDFE', color: '#534AB7' }}>{g}</span>)}</div>
              {existingScore && <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>Previously scored: <strong>{parseFloat(existingScore.score).toFixed(1)}</strong></div>}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>Your score</div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 52, fontWeight: 500, color: scoreColor(score), lineHeight: 1 }}>{formatScore(score)}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>drag the slider or tap a score</div>
            </div>
            <input type="range" min="1" max="10" step="0.25" value={score} onChange={e => setScore(parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginBottom: 12 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{quickScores.map(s => <button key={s} onClick={() => setScore(s)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 8, border: '0.5px solid #ddd', cursor: 'pointer', background: score === s ? '#EEEDFE' : 'transparent', color: score === s ? '#534AB7' : '#666', fontWeight: score === s ? 500 : 400 }}>{s.toFixed(1)}</button>)}</div>
          </div>
          <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 14, marginBottom: 16 }}>
            <div onClick={() => setShowOptional(!showOptional)} style={{ fontSize: 12, color: '#534AB7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{showOptional ? '▾' : '▸'} Add notes or watch date <span style={{ fontSize: 10, color: '#aaa' }}>optional</span></div>
            {showOptional && <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}><div><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Notes</div><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you think?" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12, resize: 'none', fontFamily: 'inherit' }} /></div><div><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Watch date</div><input type="date" value={watchDate} onChange={e => setWatchDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12 }} /></div></div>}
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}>{submitting ? (isTMDB ? 'Adding to catalog…' : 'Saving...') : existingScore ? 'Update score' : 'Submit score'}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setStep(1); setIsTMDB(false) }} style={{ flex: 1, padding: 8, borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', fontSize: 12, color: '#666', cursor: 'pointer' }}>← Back</button>
            {!isTMDB && <button onClick={handleSkip} style={{ flex: 1, padding: 8, borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', fontSize: 12, color: '#993C1D', cursor: 'pointer' }}>Mark as skipped</button>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Score logged!</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>You gave <strong>{selectedMovie?.title}</strong> a <strong style={{ color: scoreColor(score) }}>{formatScore(score)}</strong></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/movie/${selectedMovie?.id}`)} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>View film page</button>
            <button onClick={() => { setStep(1); setSelectedMovie(null); setIsTMDB(false); setScore(5.0); setNotes(''); setWatchDate('') }} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer' }}>Log another film</button>
            <button onClick={() => navigate('/')} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer' }}>Go to dashboard</button>
          </div>
        </div>
      )}
    </div>
  )
}
