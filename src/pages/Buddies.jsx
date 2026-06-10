import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Buddies() {
  const navigate = useNavigate()
  const [buddies, setBuddies] = useState([])
  const [selected, setSelected] = useState(null)
  const [agreements, setAgreements] = useState([])
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data, error } = await supabase.rpc('get_user_correlations', {
        target_user_id: user.id
      })

      if (error) { console.error(error); setLoading(false); return }
      setBuddies(data || [])
      if (data?.length > 0) loadDetail(data[0], user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadDetail(buddy, uid) {
    setSelected(buddy)
    setDetailLoading(true)

    const { data: myScores } = await supabase
      .from('scores')
      .select('movie_id, score, movies(*)')
      .eq('user_id', uid || userId)
      .eq('status', 'scored')
      .gte('score', 7.5)

    const { data: theirScores } = await supabase
      .from('scores')
      .select('movie_id, score')
      .eq('user_id', buddy.user_id)
      .eq('status', 'scored')
      .gte('score', 7.5)

    if (myScores && theirScores) {
      const theirMap = {}
      theirScores.forEach(s => { theirMap[s.movie_id] = parseFloat(s.score) })
      const shared = myScores
        .filter(s => theirMap[s.movie_id])
        .map(s => ({
          ...s.movies,
          myScore: parseFloat(s.score),
          theirScore: theirMap[s.movie_id],
          diff: Math.abs(parseFloat(s.score) - theirMap[s.movie_id])
        }))
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 6)
      setAgreements(shared)
    }

    const { data: myAllScores } = await supabase
      .from('scores')
      .select('movie_id')
      .eq('user_id', uid || userId)

    const mySeen = new Set((myAllScores || []).map(s => s.movie_id))

    const { data: theirHighScores } = await supabase
      .from('scores')
      .select('movie_id, score, movies(*)')
      .eq('user_id', buddy.user_id)
      .eq('status', 'scored')
      .gte('score', 7.5)
      .order('score', { ascending: false })

    if (theirHighScores) {
      const unseen = theirHighScores.filter(s => !mySeen.has(s.movie_id)).slice(0, 5)
      setRecs(unseen)
    }

    setDetailLoading(false)
  }

  function corrColor(r) {
    if (r >= 0.8) return '#534AB7'
    if (r >= 0.6) return '#0F6E56'
    if (r >= 0.4) return '#854F0B'
    return '#993C1D'
  }

  function corrBg(r) {
    if (r >= 0.8) return '#EEEDFE'
    if (r >= 0.6) return '#E1F5EE'
    if (r >= 0.4) return '#FAEEDA'
    return '#FAECE7'
  }

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

  if (loading) return <div style={{ padding: 20 }}>Calculating your buddy matches...</div>

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .buddies-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 14px;
        }
        .buddies-agreements {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .buddy-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        @media (max-width: 768px) {
          .buddies-layout {
            grid-template-columns: 1fr;
          }
          .buddies-agreements {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Buddies</h2>

      {buddies.length === 0 && (
        <div style={{ padding: 20, color: '#888', fontSize: 13 }}>No buddy matches found yet.</div>
      )}

      {buddies[0] && (
        <div style={{ background: '#EEEDFE', borderRadius: 12, border: '1.5px solid #AFA9EC', padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 500, color: '#fff', flexShrink: 0 }}>
            {buddies[0].username.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Your top buddy</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#333', marginBottom: 4 }}>{buddies[0].username}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{buddies[0].shared_count} films scored together</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <div style={{ flex: 1, height: 5, background: '#fff', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(0, buddies[0].correlation) * 100}%`, height: '100%', background: '#534AB7', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: '#534AB7' }}>top match</div>
            </div>
          </div>
        </div>
      )}

      <div className="buddies-layout">

        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10 }}>All matches · most similar to you</div>
          <div className="buddy-list">
            {buddies.map(b => (
              <div key={b.user_id} onClick={() => loadDetail(b, userId)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px',
                borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                background: selected?.user_id === b.user_id ? '#EEEDFE' : 'transparent',
                border: selected?.user_id === b.user_id ? '0.5px solid #AFA9EC' : '0.5px solid transparent'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: corrBg(b.correlation),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500, color: corrColor(b.correlation), flexShrink: 0
                }}>
                  {b.username.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{b.username}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <div style={{ flex: 1, height: 3, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(0, b.correlation) * 100}%`, height: '100%', background: corrColor(b.correlation), borderRadius: 2 }} />
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: corrColor(b.correlation), flexShrink: 0 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {detailLoading && <div style={{ padding: 20, color: '#888', fontSize: 13 }}>Loading...</div>}

          {!detailLoading && selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: corrBg(selected.correlation),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 500, color: corrColor(selected.correlation), flexShrink: 0
                  }}>
                    {selected.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{selected.username}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{selected.shared_count} films scored together</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Taste match</div>
                  <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, selected.correlation) * 100}%`, height: '100%', background: corrColor(selected.correlation), borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: corrColor(selected.correlation), flexShrink: 0 }} />
                </div>
              </div>

              {agreements.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Films you both loved</div>
                  <div className="buddies-agreements">
                    {agreements.map(m => (
                      <div key={m.id} onClick={() => navigate(`/movie/${m.id}`)} style={{ cursor: 'pointer', background: '#f9f9f9', borderRadius: 8, padding: 10 }}>
                        {m.poster_url
                          ? <img src={m.poster_url} alt={m.title} style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />
                          : <div style={{ width: '100%', height: 70, borderRadius: 6, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>🎬</div>
                        }
                        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 10 }}>
                            <span style={{ color: '#888' }}>you </span>
                            <span style={{ fontWeight: 500, color: scoreColor(m.myScore) }}>{m.myScore.toFixed(2)}</span>
                          </div>
                          <div style={{ fontSize: 10 }}>
                            <span style={{ color: '#888' }}>{selected.username.split(' ')[0]} </span>
                            <span style={{ fontWeight: 500, color: scoreColor(m.theirScore) }}>{m.theirScore.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recs.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Films {selected.username} loved that you haven't seen</div>
                  {recs.map(s => (
                    <div key={s.movie_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                      {s.movies?.poster_url
                        ? <img src={s.movies.poster_url} alt={s.movies?.title} style={{ width: 28, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 28, height: 42, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🎬</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title}</div>
                        <div style={{ fontSize: 10, color: '#888' }}>{s.movies?.year} · {s.movies?.genres?.slice(0, 2).join(', ')}</div>
                        <div style={{ fontSize: 10, color: '#534AB7', fontWeight: 500 }}>{selected.username} scored {parseFloat(s.score).toFixed(2)}</div>
                      </div>
                      <button onClick={() => navigate(`/log?movie=${s.movie_id}`)} style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 8,
                        border: '0.5px solid #AFA9EC', background: 'transparent',
                        color: '#534AB7', cursor: 'pointer', flexShrink: 0
                      }}>+ Log</button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}