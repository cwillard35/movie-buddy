import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 25

export default function MyFilms() {
  const [films, setFilms] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [statusCounts, setStatusCounts] = useState({ scored: 0, unseen: 0, skipped: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [status, setStatus] = useState('scored')
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')
  const [sort, setSort] = useState('score-desc')
  const [view, setView] = useState('list')
  const [genres, setGenres] = useState([])
  const [userId, setUserId] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const navigate = useNavigate()

  // load genre list and status counts once on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // status counts
      const { data: countData } = await supabase
        .from('scores')
        .select('status')
        .eq('user_id', user.id)
      if (countData) {
        const counts = { scored: 0, unseen: 0, skipped: 0 }
        countData.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++ })
        setStatusCounts(counts)
      }

      // genre list from scored films
      const { data: genreData } = await supabase
        .from('scores')
        .select('movies(genres)')
        .eq('user_id', user.id)
        .eq('status', 'scored')
      if (genreData) {
        const allGenres = new Set()
        genreData.forEach(s => s.movies?.genres?.forEach(g => allGenres.add(g)))
        setGenres([...allGenres].sort())
      }
    }
    init()
  }, [])

  const fetchFilms = useCallback(async (uid, pageNum, append = false) => {
    if (!uid) return
    if (append) setLoadingMore(true)
    else setLoading(true)

    let query = supabase
      .from('scores')
      .select('*, movies(*)', { count: 'exact' })
      .eq('user_id', uid)
      .eq('status', status)

    // genre filter — filter client-side after fetch since genres is an array column
    // sort
    if (sort === 'score-desc') query = query.order('score', { ascending: false })
    else if (sort === 'score-asc') query = query.order('score', { ascending: true })
    else if (sort === 'year-desc') query = query.order('movies(year)', { ascending: false })
    else if (sort === 'year-asc') query = query.order('movies(year)', { ascending: true })
    else if (sort === 'title') query = query.order('movies(title)', { ascending: true })
    else if (sort === 'date-desc') query = query.order('updated_at', { ascending: false })

    // pagination — fetch extra to handle genre filtering
    const fetchSize = genre !== 'all' ? PAGE_SIZE * 4 : PAGE_SIZE
    query = query.range(pageNum * fetchSize, (pageNum + 1) * fetchSize - 1)

    const { data, count } = await query

    let result = data || []

    // client-side search filter
    if (search) {
      result = result.filter(s => s.movies?.title?.toLowerCase().includes(search.toLowerCase()))
    }

    // client-side genre filter
    if (genre !== 'all') {
      result = result.filter(s => s.movies?.genres?.includes(genre))
    }

    // trim to PAGE_SIZE after genre/search filtering
    const trimmed = result.slice(0, PAGE_SIZE)

    setTotalCount(count || 0)
    setHasMore(result.length > PAGE_SIZE || (count || 0) > (pageNum + 1) * fetchSize)

    if (append) {
      setFilms(prev => [...prev, ...trimmed])
    } else {
      setFilms(trimmed)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [status, sort, search, genre])

  // re-fetch when filters change
  useEffect(() => {
    if (!userId) return
    setPage(0)
    fetchFilms(userId, 0, false)
  }, [userId, status, sort, genre, fetchFilms])

  // debounce search
  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      setPage(0)
      fetchFilms(userId, 0, false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchFilms(userId, nextPage, true)
  }

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

  const sortLabel = {
    'score-desc': 'Top rated',
    'score-asc': 'Bottom rated',
    'year-desc': 'Newest films',
    'year-asc': 'Oldest films',
    'title': 'A–Z',
    'date-desc': 'Recently logged',
  }[sort]

  if (loading) return <div style={{ padding: 20 }}>Loading your films...</div>

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .films-controls {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 12px;
        }
        .status-tabs { display: flex; gap: 4px; }
        .films-search { flex: 1; min-width: 120px; }
        .films-poster-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }
        @media (max-width: 480px) {
          .films-poster-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
          }
        }
        .films-poster-card {
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .films-poster-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .films-poster-img {
          width: 100%;
          aspect-ratio: 2/3;
          object-fit: cover;
          display: block;
          background: #EEEDFE;
          border-radius: 8px;
        }
        .films-poster-placeholder {
          width: 100%;
          aspect-ratio: 2/3;
          background: #EEEDFE;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        .films-poster-title {
          font-size: 12px;
          font-weight: 500;
          margin-top: 6px;
          line-height: 1.3;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .films-poster-meta {
          font-size: 11px;
          margin-top: 2px;
          margin-bottom: 8px;
        }
        @media (max-width: 768px) {
          .films-controls { flex-direction: column; align-items: stretch; }
          .status-tabs { width: 100%; }
          .status-tabs button { flex: 1; }
          .films-search { width: 100%; }
          .films-selects { display: flex; gap: 6px; }
          .films-selects select { flex: 1; }
        }
      `}</style>

      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>My Films</h2>

      <div className="films-controls">
        <div className="status-tabs">
          {['scored', 'unseen', 'skipped'].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 8,
              border: '0.5px solid #ddd', cursor: 'pointer',
              background: status === s ? '#534AB7' : 'transparent',
              color: status === s ? '#fff' : '#666',
              fontWeight: status === s ? 500 : 400,
              textTransform: 'capitalize'
            }}>{s} <span style={{ opacity: 0.7 }}>{statusCounts[s]}</span></button>
          ))}
        </div>

        <input
          className="films-search"
          type="text"
          placeholder="Search titles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12 }}
        />

        <div className="films-selects" style={{ display: 'flex', gap: 6 }}>
          <select value={genre} onChange={e => setGenre(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '0.5px solid #ddd' }}>
            <option value="all">All genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '0.5px solid #ddd' }}>
            <option value="score-desc">Top rated</option>
            <option value="score-asc">Bottom rated</option>
            <option value="year-desc">Newest films</option>
            <option value="year-asc">Oldest films</option>
            <option value="title">Title A–Z</option>
            <option value="date-desc">Recently logged</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 2 }}>
          {['list', 'grid'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 8px', borderRadius: 8, border: '0.5px solid #ddd',
              background: view === v ? '#EEEDFE' : 'transparent',
              color: view === v ? '#534AB7' : '#666', cursor: 'pointer', fontSize: 13
            }}>{v === 'list' ? '☰' : '⊞'}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
        {sortLabel} · showing {films.length}{totalCount > films.length ? ` of ${totalCount}` : ''} film{films.length !== 1 ? 's' : ''}
        {(search || genre !== 'all') && ' (filtered)'}
      </div>

      {view === 'list' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee' }}>
          {films.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>No films found</div>
          )}
          {films.map((s, i) => (
            <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
              borderBottom: i < films.length - 1 ? '0.5px solid #f0f0f0' : 'none',
              cursor: 'pointer'
            }}>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 70, height: 105, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 70, height: 105, borderRadius: 6, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎬</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{s.movies?.year} · {s.movies?.genres?.slice(0, 2).join(', ')}</div>
              </div>
              {s.status === 'scored' && (
                <div style={{ fontSize: 14, fontWeight: 500, color: scoreColor(s.score), flexShrink: 0 }}>
                  {parseFloat(s.score).toFixed(2)}
                </div>
              )}
              {s.status === 'unseen' && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#F1EFE8', color: '#666' }}>unseen</span>
              )}
              {s.status === 'skipped' && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FAECE7', color: '#993C1D' }}>skipped</span>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'grid' && (
        <div className="films-poster-grid">
          {films.map(s => (
            <div key={s.id} className="films-poster-card" onClick={() => navigate(`/movie/${s.movie_id}`)}>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} className="films-poster-img" loading="lazy" />
                : <div className="films-poster-placeholder">🎬</div>
              }
              <div className="films-poster-title">{s.movies?.title}</div>
              <div className="films-poster-meta">
                {s.status === 'scored' && (
                  <span style={{ fontWeight: 500, color: scoreColor(s.score) }}>{parseFloat(s.score).toFixed(2)}</span>
                )}
                {s.status === 'unseen' && (
                  <span style={{ color: '#888' }}>unseen</span>
                )}
                {s.status === 'skipped' && (
                  <span style={{ color: '#993C1D' }}>skipped</span>
                )}
                {' · '}{s.movies?.year}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              fontSize: 12, padding: '7px 20px', borderRadius: 8,
              border: '0.5px solid #ddd', background: 'transparent',
              color: '#534AB7', cursor: loadingMore ? 'default' : 'pointer'
            }}
          >
            {loadingMore ? 'Loading…' : 'Load 25 more'}
          </button>
        </div>
      )}
    </div>
  )
}