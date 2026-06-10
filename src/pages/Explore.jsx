import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { searchTMDB } from '../lib/tmdb'

export default function Explore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbSearching, setTmdbSearching] = useState(false)

  // Sync ?q= param from nav search
  useEffect(() => {
    const q = searchParams.get('q') || ''
    setQuery(q)
  }, [searchParams])

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

  // Local filter + TMDB fallback
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
          top: 0;
          z-index: 10;
          background: #fff;
          padding: 12px 0;
          margin-bottom: 8px;
        }
      `}</style>

      {/* Sticky search bar */}
      <div className="search-sticky">
        <input
          type="text"
          placeholder="Search films..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '0.5px solid #ddd', fontSize: 14, boxSizing: 'border-box',
            outline: 'none'
          }}
        />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 13 }}>Loading…</div>
      )}

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
              <div className="poster-meta">
                {m.year}{m.scoreCount > 0 && ` · ${m.scoreCount} score${m.scoreCount !== 1 ? 's' : ''}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TMDB fallback */}
      {!loading && localFiltered.length === 0 && query.length >= 2 && (
        <div>
          {tmdbSearching && (
            <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 13 }}>Searching TMDB…</div>
          )}
          {!tmdbSearching && tmdbResults.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
                Not in your group's catalog — go to Log Score to add
              </div>
              <div className="poster-grid">
                {tmdbResults.map(m => {
                  const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null
                  const year = m.release_date ? m.release_date.split('-')[0] : '—'
                  return (
                    <div key={m.id} className="poster-card" onClick={() => navigate('/log')}
                      style={{ opacity: 0.85 }}
                    >
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