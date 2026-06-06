import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MyFilms() {
  const [scores, setScores] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('scored')
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')
  const [sort, setSort] = useState('score-desc')
  const [view, setView] = useState('list')
  const [genres, setGenres] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function loadFilms() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('scores')
        .select('*, movies(*)')
        .eq('user_id', user.id)
      if (data) {
        setScores(data)
        const allGenres = new Set()
        data.forEach(s => s.movies?.genres?.forEach(g => allGenres.add(g)))
        setGenres([...allGenres].sort())
      }
      setLoading(false)
    }
    loadFilms()
  }, [])

  useEffect(() => {
    let result = scores.filter(s => s.status === status)
    if (search) result = result.filter(s => s.movies?.title?.toLowerCase().includes(search.toLowerCase()))
    if (genre !== 'all') result = result.filter(s => s.movies?.genres?.includes(genre))
    result.sort((a, b) => {
      if (sort === 'score-desc') return parseFloat(b.score || 0) - parseFloat(a.score || 0)
      if (sort === 'score-asc') return parseFloat(a.score || 0) - parseFloat(b.score || 0)
      if (sort === 'year-desc') return (b.movies?.year || 0) - (a.movies?.year || 0)
      if (sort === 'year-asc') return (a.movies?.year || 0) - (b.movies?.year || 0)
      if (sort === 'title') return a.movies?.title?.localeCompare(b.movies?.title)
      if (sort === 'date-desc') return new Date(b.created_at) - new Date(a.created_at)
      return 0
    })
    setFiltered(result)
  }, [scores, status, search, genre, sort])

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

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
        .status-tabs {
          display: flex;
          gap: 4px;
        }
        .films-search {
          flex: 1;
          min-width: 120px;
        }
        @media (max-width: 768px) {
          .films-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .status-tabs {
            width: 100%;
          }
          .status-tabs button {
            flex: 1;
          }
          .films-search {
            width: 100%;
          }
          .films-selects {
            display: flex;
            gap: 6px;
          }
          .films-selects select {
            flex: 1;
          }
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
            }}>{s} <span style={{ opacity: 0.7 }}>{scores.filter(sc => sc.status === s).length}</span></button>
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
            <option value="score-desc">Score ↓</option>
            <option value="score-asc">Score ↑</option>
            <option value="year-desc">Newest</option>
            <option value="year-asc">Oldest</option>
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
        Showing {filtered.length} film{filtered.length !== 1 ? 's' : ''}
      </div>

      {view === 'list' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>No films found</div>
          )}
          {filtered.map((s, i) => (
            <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
              borderBottom: i < filtered.length - 1 ? '0.5px solid #f0f0f0' : 'none',
              cursor: 'pointer'
            }}>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 28, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 28, height: 42, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🎬</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{s.movies?.year} · {s.movies?.genres?.slice(0, 2).join(', ')}</div>
              </div>
              {s.status === 'scored' && (
                <div style={{ fontSize: 14, fontWeight: 500, color: scoreColor(s.score), flexShrink: 0 }}>
                  {parseFloat(s.score).toFixed(1)}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {filtered.map(s => (
            <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ borderRadius: 8, overflow: 'hidden', border: '0.5px solid #eee', background: '#fff', cursor: 'pointer' }}>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: 130, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎬</div>
              }
              <div style={{ padding: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title}</div>
                {s.status === 'scored' && (
                  <div style={{ fontSize: 12, fontWeight: 500, color: scoreColor(s.score), marginTop: 2 }}>
                    {parseFloat(s.score).toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}