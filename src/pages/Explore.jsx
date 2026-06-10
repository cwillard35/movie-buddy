import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Explore() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState([])
  const [filtered, setFiltered] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Load movies with their score counts and most recent score date
      // sorted by: most recently scored first, then by number of scores
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

      // Build score stats per movie
      const statsMap = {}
      if (scoreData) {
        scoreData.forEach(s => {
          if (!statsMap[s.movie_id]) {
            statsMap[s.movie_id] = { count: 0, latestDate: null, total: 0 }
          }
          statsMap[s.movie_id].count++
          statsMap[s.movie_id].total += parseFloat(s.score)
          const d = s.updated_at
          if (!statsMap[s.movie_id].latestDate || d > statsMap[s.movie_id].latestDate) {
            statsMap[s.movie_id].latestDate = d
          }
        })
      }

      // Attach stats and sort: most recently scored first, then by score count
      const enriched = all.map(m => ({
        ...m,
        scoreCount: statsMap[m.id]?.count || 0,
        avgScore: statsMap[m.id] ? statsMap[m.id].total / statsMap[m.id].count : null,
        latestDate: statsMap[m.id]?.latestDate || null,
      }))

      enriched.sort((a, b) => {
        // First: has any scores at all
        if (a.scoreCount > 0 && b.scoreCount === 0) return -1
        if (b.scoreCount > 0 && a.scoreCount === 0) return 1
        // Second: most recently scored
        if (a.latestDate && b.latestDate) {
          if (a.latestDate > b.latestDate) return -1
          if (a.latestDate < b.latestDate) return 1
        }
        // Third: most scores
        return b.scoreCount - a.scoreCount
      })

      setMovies(enriched)
      setFiltered(enriched)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!query) { setFiltered(movies); return }
    const q = query.toLowerCase()
    setFiltered(movies.filter(m => m.title.toLowerCase().includes(q)))
  }, [query, movies])

  return (
    <div style={{ padding: '20px 20px 80px', maxWidth: 1200, margin: '0 auto' }}>
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
        }
      `}</style>

      {/* Search bar */}
      <div style={{ marginBottom: 20 }}>
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

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 13 }}>No films found</div>
      )}

      {!loading && (
        <div className="poster-grid">
          {filtered.map(m => (
            <div key={m.id} className="poster-card" onClick={() => navigate(`/movie/${m.id}`)}>
              {m.poster_url
                ? <img src={m.poster_url} alt={m.title} className="poster-img" loading="lazy" />
                : <div className="poster-placeholder">🎬</div>
              }
              <div className="poster-title">{m.title}</div>
              <div className="poster-meta">
                {m.year}
                {m.scoreCount > 0 && ` · ${m.scoreCount} score${m.scoreCount !== 1 ? 's' : ''}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}