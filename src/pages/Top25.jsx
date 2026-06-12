import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Top25() {
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('group')
  const [genre, setGenre] = useState('all')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [threshold, setThreshold] = useState(5)
  const [showSeen, setShowSeen] = useState(true)
  const [showUnseen, setShowUnseen] = useState(true)
  const [genres, setGenres] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: groupData, error: groupError } = await supabase.rpc('get_top25_films')
      if (groupError) { console.error('RPC error:', groupError); return }

      let myScoreMap = {}
      if (user) {
        const { data: myScores } = await supabase
          .from('scores')
          .select('movie_id, score')
          .eq('user_id', user.id)
          .eq('status', 'scored')
        myScores?.forEach(s => { myScoreMap[s.movie_id] = parseFloat(s.score) })
      }

      const enriched = groupData.map(m => ({
        ...m,
        groupScore: parseFloat(m.group_avg),
        myScore: myScoreMap[m.id] ?? null,
        scoredBy: parseInt(m.scored_by)
      }))

      const allGenres = new Set()
      enriched.forEach(m => m.genres?.forEach(g => allGenres.add(g)))
      setGenres([...allGenres].sort())
      setFilms(enriched)
      setLoading(false)
    }
    load()
  }, [])

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

  const minY = yearMin ? parseInt(yearMin) : null
  const maxY = yearMax ? parseInt(yearMax) : null

  let filtered = films.filter(m => {
    if (m.scoredBy < threshold) return false
    if (genre !== 'all' && !m.genres?.includes(genre)) return false
    if (minY && m.year < minY) return false
    if (maxY && m.year > maxY) return false
    const seen = m.myScore !== null
    if (seen && !showSeen) return false
    if (!seen && !showUnseen) return false
    return true
  })

  const scoreKey = mode === 'group' ? 'groupScore' : 'myScore'
  filtered = filtered.filter(m => m[scoreKey] !== null && !isNaN(m[scoreKey]))
  filtered.sort((a, b) => b[scoreKey] - a[scoreKey])

  const top25 = filtered.slice(0, 25)
  const bottom10 = [...filtered].sort((a, b) => a[scoreKey] - b[scoreKey]).slice(0, 10)

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .top25-filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .top25-toggle {
          margin-left: auto;
          display: flex;
          gap: 6px;
        }
        .top25-lists {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 14px;
        }
        .year-input {
          font-size: 12px;
          padding: 5px 8px;
          border-radius: 8px;
          border: 0.5px solid #ddd;
          width: 72px;
        }
        .year-input:focus {
          outline: none;
          border-color: #534AB7;
        }
        @media (max-width: 768px) {
          .top25-filters {
            flex-direction: column;
            align-items: stretch;
          }
          .top25-filters select {
            width: 100%;
          }
          .top25-filters input[type=range] {
            width: 100%;
          }
          .year-input {
            width: 100%;
          }
          .top25-toggle {
            margin-left: 0;
            width: 100%;
          }
          .top25-toggle button {
            flex: 1;
          }
          .top25-lists {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Top 25 & Bottom 10</h2>

      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 14, marginBottom: 14 }}>
        <div className="top25-filters">
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>From year</div>
            <input
              type="number"
              className="year-input"
              placeholder="e.g. 1980"
              value={yearMin}
              min="1900"
              max="2099"
              onChange={e => setYearMin(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>To year</div>
            <input
              type="number"
              className="year-input"
              placeholder="e.g. 2015"
              value={yearMax}
              min="1900"
              max="2099"
              onChange={e => setYearMax(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Genre</div>
            <select value={genre} onChange={e => setGenre(e.target.value)}
              style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '0.5px solid #ddd' }}>
              <option value="all">All genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Min scorers: {threshold}+</div>
            <input type="range" min="1" max="18" value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value))}
              style={{ width: 120 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Watched status</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 30 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={showSeen} onChange={e => setShowSeen(e.target.checked)} />
                Seen by me
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={showUnseen} onChange={e => setShowUnseen(e.target.checked)} />
                Not seen by me
              </label>
            </div>
          </div>
          <div className="top25-toggle">
            {['group', 'mine'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 8,
                border: '0.5px solid #ddd', cursor: 'pointer',
                background: mode === m ? '#534AB7' : 'transparent',
                color: mode === m ? '#fff' : '#666',
                fontWeight: mode === m ? 500 : 400
              }}>{m === 'group' ? 'Group consensus' : 'My scores'}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="top25-lists">

        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
            🏆 Top 25 <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>showing {top25.length} films</span>
          </div>
          {top25.map((m, i) => (
            <div key={m.id} onClick={() => navigate(`/movie/${m.id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
              borderBottom: i < top25.length - 1 ? '0.5px solid #f0f0f0' : 'none', cursor: 'pointer'
            }}>
              <div style={{ fontSize: 12, color: i < 3 ? '#534AB7' : '#aaa', width: 22, textAlign: 'right', fontWeight: i < 3 ? 500 : 400, flexShrink: 0 }}>{i + 1}</div>
              {m.poster_url
                ? <img src={m.poster_url} alt={m.title} style={{ width: 28, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 28, height: 42, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🎬</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{m.year} · {m.genres?.slice(0, 2).join(', ')} · {m.scoredBy} scored</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: scoreColor(m[scoreKey]) }}>{m[scoreKey]?.toFixed(2)}</div>
                {mode === 'group' && m.myScore !== null && (
                  <div style={{ fontSize: 10, color: '#888' }}>mine {m.myScore.toFixed(2)}</div>
                )}
                {mode === 'mine' && m.groupScore !== null && (
                  <div style={{ fontSize: 10, color: '#888' }}>group {m.groupScore.toFixed(2)}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
            😬 Bottom 10 <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>showing {bottom10.length} films</span>
          </div>
          {bottom10.map((m, i) => (
            <div key={m.id} onClick={() => navigate(`/movie/${m.id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
              borderBottom: i < bottom10.length - 1 ? '0.5px solid #f0f0f0' : 'none', cursor: 'pointer'
            }}>
              <div style={{ fontSize: 12, color: '#aaa', width: 22, textAlign: 'right', flexShrink: 0 }}>{i + 1}</div>
              {m.poster_url
                ? <img src={m.poster_url} alt={m.title} style={{ width: 28, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 28, height: 42, borderRadius: 4, background: '#FAECE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🎬</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{m.year} · {m.genres?.slice(0, 2).join(', ')} · {m.scoredBy} scored</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: scoreColor(m[scoreKey]) }}>{m[scoreKey]?.toFixed(2)}</div>
                {mode === 'group' && m.myScore !== null && (
                  <div style={{ fontSize: 10, color: '#888' }}>mine {m.myScore.toFixed(2)}</div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}