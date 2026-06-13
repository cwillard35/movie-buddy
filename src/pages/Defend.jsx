import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function scoreColor(s) {
  if (s >= 8) return '#0F6E56'
  if (s >= 6.5) return '#534AB7'
  return '#993C1D'
}

// Defined outside Defend so it never remounts on parent state changes
function OutlierRow({ o, defendedIds, writing, draftText, setDraftText, setWriting, onSubmitDefense, submitting }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #f0f0f0' }}>
      {o.poster_url
        ? <img src={o.poster_url} alt={o.title} onClick={() => window.location.href = `/movie/${o.movie_id}`}
            style={{ width: 70, height: 105, borderRadius: 6, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} />
        : <div onClick={() => window.location.href = `/movie/${o.movie_id}`}
            style={{ width: 70, height: 105, borderRadius: 6, background: '#FAECE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, cursor: 'pointer' }}>🎬</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div onClick={() => window.location.href = `/movie/${o.movie_id}`}
          style={{ fontSize: 12, fontWeight: 500, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
          {o.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: scoreColor(o.my_score) }}>You {parseFloat(o.my_score).toFixed(1)}</span>
          <span style={{ fontSize: 10, color: '#aaa' }}>vs</span>
          <span style={{ fontSize: 11, color: '#666' }}>Group {parseFloat(o.group_avg).toFixed(1)}</span>
          <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 20,
            background: o.direction === 'above' ? '#E1F5EE' : '#FAECE7',
            color: o.direction === 'above' ? '#0F6E56' : '#993C1D' }}>
            {o.direction === 'above' ? '+' : '−'}{parseFloat(o.diff).toFixed(1)}
          </span>
        </div>
        {defendedIds.has(o.movie_id)
          ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#E1F5EE', color: '#0F6E56', fontWeight: 500 }}>✓ Defense written</span>
          : writing === o.movie_id
            ? (
              <div>
                <textarea
                  autoFocus
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  placeholder="Make your case..."
                  rows={3}
                  style={{ width: '100%', fontSize: 11, padding: '6px 8px', borderRadius: 8, border: '0.5px solid #ddd', resize: 'none', fontFamily: 'inherit', marginBottom: 6, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onSubmitDefense(o.movie_id)} disabled={submitting}
                    style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>Post</button>
                  <button onClick={() => { setWriting(null); setDraftText('') }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )
            : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setWriting(o.movie_id); setDraftText('') }}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>Write defense</button>
                <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#888', cursor: 'pointer' }}>Dismiss</button>
              </div>
            )
        }
      </div>
    </div>
  )
}

export default function Defend() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [outliers, setOutliers] = useState([])
  const [myDefenses, setMyDefenses] = useState([])
  const [groupFeed, setGroupFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState(null)
  const [draftText, setDraftText] = useState('')
  const [replyText, setReplyText] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: outlierData } = await supabase.rpc('get_user_outliers', {
        target_user_id: user.id,
        threshold: 1.5
      })
      setOutliers(outlierData || [])

      const { data: defenseData } = await supabase
        .from('defenses')
        .select('*, movies(*), users(username), defense_replies(*, users(username))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setMyDefenses(defenseData || [])

      const { data: feedData } = await supabase
        .from('defenses')
        .select('*, movies(*), users(username), defense_replies(*, users(username))')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setGroupFeed(feedData || [])

      setLoading(false)
    }
    load()
  }, [])

  async function submitDefense(movieId) {
    if (!draftText.trim()) return
    setSubmitting(true)
    const { error } = await supabase
      .from('defenses')
      .upsert({ user_id: userId, movie_id: movieId, body: draftText }, { onConflict: 'user_id,movie_id' })
    if (!error) {
      setWriting(null)
      setDraftText('')
      const { data } = await supabase
        .from('defenses')
        .select('*, movies(*), users(username), defense_replies(*, users(username))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setMyDefenses(data || [])
    }
    setSubmitting(false)
  }

  async function submitReply(defenseId) {
    const text = replyText[defenseId]
    if (!text?.trim()) return
    setSubmitting(true)
    const { error } = await supabase
      .from('defense_replies')
      .insert({ defense_id: defenseId, user_id: userId, body: text })
    if (!error) {
      setReplyText(r => ({ ...r, [defenseId]: '' }))
      const [{ data: defData }, { data: feedData }] = await Promise.all([
        supabase.from('defenses').select('*, movies(*), users(username), defense_replies(*, users(username))').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('defenses').select('*, movies(*), users(username), defense_replies(*, users(username))').neq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      ])
      setMyDefenses(defData || [])
      setGroupFeed(feedData || [])
    }
    setSubmitting(false)
  }

  const above = outliers.filter(o => o.direction === 'above').slice(0, 10)
  const below = outliers.filter(o => o.direction === 'below').slice(0, 10)
  const defendedIds = new Set(myDefenses.map(d => d.movie_id))

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .outlier-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 768px) {
          .outlier-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Defend Your Score</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Films where your score differs significantly from the group.</p>

      <div className="outlier-grid">
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
            ↓ You scored lower
            <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>≥1.5 below avg</span>
          </div>
          {below.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>No outliers here</div>}
          {below.map(o => (
            <OutlierRow
              key={o.movie_id}
              o={o}
              defendedIds={defendedIds}
              writing={writing}
              draftText={draftText}
              setDraftText={setDraftText}
              setWriting={setWriting}
              onSubmitDefense={submitDefense}
              submitting={submitting}
            />
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
            ↑ You scored higher
            <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>≥1.5 above avg</span>
          </div>
          {above.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>No outliers here</div>}
          {above.map(o => (
            <OutlierRow
              key={o.movie_id}
              o={o}
              defendedIds={defendedIds}
              writing={writing}
              draftText={draftText}
              setDraftText={setDraftText}
              setWriting={setWriting}
              onSubmitDefense={submitDefense}
              submitting={submitting}
            />
          ))}
        </div>
      </div>

      {myDefenses.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your active defenses</div>
          {myDefenses.map(d => (
            <div key={d.id} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '0.5px solid #f0f0f0' }}>
                {d.movies?.poster_url
                  ? <img src={d.movies.poster_url} alt={d.movies.title} onClick={() => navigate(`/movie/${d.movie_id}`)}
                      style={{ width: 70, height: 105, borderRadius: 6, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} />
                  : <div style={{ width: 70, height: 105, borderRadius: 6, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎬</div>
                }
                <div style={{ flex: 1 }}>
                  <div onClick={() => navigate(`/movie/${d.movie_id}`)} style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{d.movies?.title}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{d.movies?.year}</div>
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>{d.defense_replies?.length || 0} replies</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, color: '#534AB7', flexShrink: 0 }}>
                  {d.users?.username?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{d.users?.username} <span style={{ fontWeight: 400, color: '#888', fontSize: 10 }}>(you)</span></div>
                  <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>{d.body}</div>
                </div>
              </div>
              {d.defense_replies?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 8, marginBottom: 8, paddingLeft: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 500, color: '#666', flexShrink: 0 }}>
                    {r.users?.username?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 1 }}>{r.users?.username}</div>
                    <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{r.body}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #f0f0f0' }}>
                <input
                  type="text"
                  value={replyText[d.id] || ''}
                  onChange={e => setReplyText(r => ({ ...r, [d.id]: e.target.value }))}
                  placeholder="Add to the thread..."
                  style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '0.5px solid #ddd', background: '#f9f9f9' }}
                  onKeyDown={e => { if (e.key === 'Enter') submitReply(d.id) }}
                />
                <button onClick={() => submitReply(d.id)} disabled={submitting}
                  style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>Reply</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Group defense feed</div>
        {groupFeed.length === 0 && (
          <div style={{ fontSize: 12, color: '#888', padding: 16, background: '#fff', borderRadius: 12, border: '0.5px solid #eee' }}>
            No defenses posted yet. Be the first!
          </div>
        )}
        {groupFeed.map(d => (
          <div key={d.id} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#534AB7', flexShrink: 0 }}>
                {d.users?.username?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {d.users?.username} is defending <strong onClick={() => navigate(`/movie/${d.movie_id}`)} style={{ cursor: 'pointer' }}>{d.movies?.title}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>{d.movies?.year}</div>
              </div>
              {d.movies?.poster_url && (
                <img src={d.movies.poster_url} alt={d.movies.title} onClick={() => navigate(`/movie/${d.movie_id}`)}
                  style={{ width: 70, height: 105, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }} />
              )}
            </div>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8, marginBottom: 10 }}>
              {d.body}
            </div>
            {d.defense_replies?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 8, marginBottom: 8, paddingLeft: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 500, color: '#666', flexShrink: 0 }}>
                  {r.users?.username?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 1 }}>{r.users?.username}</div>
                  <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{r.body}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #f0f0f0' }}>
              <input
                type="text"
                value={replyText[d.id] || ''}
                onChange={e => setReplyText(r => ({ ...r, [d.id]: e.target.value }))}
                placeholder="Weigh in..."
                style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '0.5px solid #ddd', background: '#f9f9f9' }}
                onKeyDown={e => { if (e.key === 'Enter') submitReply(d.id) }}
              />
              <button onClick={() => submitReply(d.id)} disabled={submitting}
                style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#EEEDFE', color: '#534AB7', cursor: 'pointer', fontWeight: 500 }}>Reply</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}