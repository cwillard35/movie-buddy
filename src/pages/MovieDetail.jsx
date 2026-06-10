import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ThumbsUp, ThumbsDown, Trash2, Shield, ChevronDown, ChevronUp } from 'lucide-react'

function parseMentions(body) {
  const matches = body.match(/@(\w+)/g) || []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

function CommentBody({ body }) {
  const parts = body.split(/(@\w+)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} style={{ color: '#534AB7', fontWeight: 500, background: '#EEEDFE', borderRadius: 3, padding: '0 2px' }}>{part}</span>
        ) : part
      )}
    </span>
  )
}

function scoreColor(s) {
  if (s >= 8) return '#0F6E56'
  if (s >= 6.5) return '#534AB7'
  return '#993C1D'
}

function InsightPanel({ type, data, movie, myScore, onClose, navigate }) {
  if (!data || data.length === 0) return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8, fontSize: 12, color: '#888' }}>
      Not enough data yet.
    </div>
  )

  if (type === 'recent') {
    const sorted = [...data].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 10)
    const avg = sorted.reduce((s, x) => s + parseFloat(x.score), 0) / sorted.length
    const higher = sorted.filter(x => parseFloat(x.score) > myScore).length
    const lower = sorted.filter(x => parseFloat(x.score) < myScore).length
    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7', marginBottom: 8 }}>Your last 10 scores · avg {avg.toFixed(2)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map((s, i) => (
            <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={{ fontSize: 10, color: '#aaa', width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}</div>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 20, height: 30, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 20, height: 30, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />
              }
              <div style={{ flex: 1, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: s.movie_id === movie.id ? '#534AB7' : '#333', fontWeight: s.movie_id === movie.id ? 600 : 400 }}>
                {s.movies?.title} {s.movie_id === movie.id && '← this film'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: scoreColor(parseFloat(s.score)), flexShrink: 0 }}>{parseFloat(s.score).toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 8, borderTop: '0.5px solid #eee', paddingTop: 6 }}>
          Your {myScore?.toFixed(2)} is higher than {higher} and lower than {lower} of your last 10.
        </div>
      </div>
    )
  }

  if (type === 'director') {
    const currentEntry = { movie_id: movie.id, movies: movie, score: myScore, status: myScore !== null ? 'scored' : null, isCurrent: true }
    const allDir = [...data, currentEntry].sort((a, b) => {
      if (a.score !== null && b.score !== null) return parseFloat(b.score) - parseFloat(a.score)
      if (a.score !== null) return -1
      if (b.score !== null) return 1
      return a.movies.title.localeCompare(b.movies.title)
    })
    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7', marginBottom: 8 }}>Films by {movie.director}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {allDir.map(s => (
            <div key={s.movie_id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: s.isCurrent ? '#EEEDFE' : 'transparent', borderRadius: 6, padding: '2px 4px', margin: '0 -4px' }}>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 20, height: 30, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 20, height: 30, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />
              }
              <div style={{ flex: 1, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: s.isCurrent ? 600 : 400, color: s.isCurrent ? '#534AB7' : '#333' }}>
                {s.movies?.title} <span style={{ color: '#aaa', fontWeight: 400 }}>({s.movies?.year})</span>
                {s.isCurrent && <span style={{ fontSize: 9, color: '#534AB7', marginLeft: 4 }}>← this film</span>}
              </div>
              {s.score !== null
                ? <div style={{ fontSize: 11, fontWeight: 500, color: scoreColor(parseFloat(s.score)), flexShrink: 0 }}>{parseFloat(s.score).toFixed(2)}</div>
                : <div style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>unscored</div>
              }
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'samescore') {
    const currentEntry = { id: `current-${movie.id}`, movie_id: movie.id, movies: movie, score: myScore, isCurrent: true }
    const allSame = [currentEntry, ...data]
    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7', marginBottom: 8 }}>Films you've scored {myScore?.toFixed(2)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {allSame.map(s => (
            <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: s.isCurrent ? '#EEEDFE' : 'transparent', borderRadius: 6, padding: '2px 4px', margin: '0 -4px' }}>
              {s.movies?.poster_url
                ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 20, height: 30, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 20, height: 30, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />
              }
              <div style={{ flex: 1, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: s.isCurrent ? 600 : 400, color: s.isCurrent ? '#534AB7' : '#333' }}>
                {s.movies?.title} <span style={{ color: '#aaa', fontWeight: 400 }}>({s.movies?.year})</span>
                {s.isCurrent && <span style={{ fontSize: 9, color: '#534AB7', marginLeft: 4 }}>← this film</span>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: scoreColor(parseFloat(s.score)), flexShrink: 0 }}>{parseFloat(s.score).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'genre') {
    const { above, below } = data
    const primaryGenre = movie.genres?.[0] || 'this genre'
    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7', marginBottom: 8 }}>Your {primaryGenre} scores</div>
        {above.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>Scored higher or equal ({above[0] && parseFloat(above[0].score).toFixed(2)} – {above[above.length-1] && parseFloat(above[above.length-1].score).toFixed(2)})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {above.map(s => (
                <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  {s.movies?.poster_url ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 20, height: 30, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 20, height: 30, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />}
                  <div style={{ flex: 1, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title} <span style={{ color: '#aaa' }}>({s.movies?.year})</span></div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: scoreColor(parseFloat(s.score)), flexShrink: 0 }}>{parseFloat(s.score).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px', background: '#EEEDFE', borderRadius: 6, marginBottom: above.length > 0 ? 8 : 4 }}>
          {movie.poster_url ? <img src={movie.poster_url} alt={movie.title} style={{ width: 20, height: 30, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 20, height: 30, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />}
          <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#534AB7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title} <span style={{ fontSize: 9 }}>← this film</span></div>
          <div style={{ fontSize: 11, fontWeight: 500, color: myScore !== null ? scoreColor(myScore) : '#aaa', flexShrink: 0 }}>{myScore !== null ? myScore.toFixed(2) : 'unscored'}</div>
        </div>
        {below.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>Scored lower or equal ({below[0] && parseFloat(below[0].score).toFixed(2)} – {below[below.length-1] && parseFloat(below[below.length-1].score).toFixed(2)})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {below.map(s => (
                <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  {s.movies?.poster_url ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 20, height: 30, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 20, height: 30, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />}
                  <div style={{ flex: 1, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title} <span style={{ color: '#aaa' }}>({s.movies?.year})</span></div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: scoreColor(parseFloat(s.score)), flexShrink: 0 }}>{parseFloat(s.score).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}

// ── Inline score panel ────────────────────────────────────────────────────────
function ScorePanel({ movie, userId, existingScore, onSaved, onCancel }) {
  const [score, setScore] = useState(existingScore ? parseFloat(existingScore.score) : 5.0)
  const [notes, setNotes] = useState(existingScore?.notes || '')
  const [watchDate, setWatchDate] = useState(existingScore?.watch_date || '')
  const [showOptional, setShowOptional] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const quickScores = [1, 2, 3, 4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]
  function formatScore(v) { const n = parseFloat(v); return n % 1 === 0 ? n.toFixed(2) : n.toString() }

  async function handleSubmit() {
    if (!userId) return
    setSubmitting(true)
    const row = {
      user_id: userId,
      movie_id: movie.id,
      score: Math.round(score * 100) / 100,
      status: 'scored',
      notes: notes || null,
      watch_date: watchDate || null,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase.from('scores').upsert(row, { onConflict: 'user_id,movie_id' })
    if (error) { console.error(error); setSubmitting(false); return }
    setSubmitting(false)
    onSaved(score)
  }

  async function handleSkip() {
    if (!userId) return
    await supabase.from('scores').upsert({ user_id: userId, movie_id: movie.id, status: 'skipped', score: null }, { onConflict: 'user_id,movie_id' })
    onCancel()
  }

  return (
    <div style={{ marginTop: 12, background: '#f9f9f9', borderRadius: 10, padding: 14, border: '0.5px solid #e8e6fb' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 44, fontWeight: 500, color: scoreColor(score), lineHeight: 1 }}>{formatScore(score)}</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>drag or tap a score</div>
      </div>
      <input
        type="range" min="1" max="10" step="0.25" value={score}
        onChange={e => setScore(parseFloat(e.target.value))}
        style={{ width: '100%', marginBottom: 6 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginBottom: 10 }}>
        <span>1.0</span><span>3.0</span><span>5.0</span><span>7.0</span><span>9.0</span><span>10.0</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {quickScores.map(s => (
          <button key={s} onClick={() => setScore(s)} style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            border: '0.5px solid #ddd', cursor: 'pointer',
            background: score === s ? '#EEEDFE' : 'transparent',
            color: score === s ? '#534AB7' : '#666',
            fontWeight: score === s ? 500 : 400
          }}>{s.toFixed(2)}</button>
        ))}
      </div>

      <div style={{ borderTop: '0.5px solid #eee', paddingTop: 10, marginBottom: 10 }}>
        <div onClick={() => setShowOptional(!showOptional)} style={{ fontSize: 11, color: '#534AB7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          {showOptional ? '▾' : '▸'} Notes / watch date <span style={{ fontSize: 10, color: '#aaa' }}>optional</span>
        </div>
        {showOptional && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you think?" style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <input type="date" value={watchDate} onChange={e => setWatchDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 12 }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '8px 0', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          {submitting ? 'Saving…' : existingScore ? 'Update score' : 'Submit score'}
        </button>
        <button onClick={onCancel} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', fontSize: 12, color: '#666', cursor: 'pointer' }}>
          Cancel
        </button>
        {!existingScore && (
          <button onClick={handleSkip} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', fontSize: 12, color: '#993C1D', cursor: 'pointer' }}>
            Skip
          </button>
        )}
      </div>
    </div>
  )
}

export default function MovieDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [scores, setScores] = useState([])
  const [myScore, setMyScore] = useState(null)
  const [myScoreRow, setMyScoreRow] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [scorePanelOpen, setScorePanelOpen] = useState(false)

  const [activeInsight, setActiveInsight] = useState(null)
  const [recentScores, setRecentScores] = useState([])
  const [directorScores, setDirectorScores] = useState([])
  const [sameScores, setSameScores] = useState([])
  const [insightsLoaded, setInsightsLoaded] = useState(false)
  const [genreScores, setGenreScores] = useState({ above: [], below: [] })

  const [comments, setComments] = useState([])
  const [defenses, setDefenses] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [commentSort, setCommentSort] = useState('new')
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef(null)

  const loadScores = useCallback(async (uid) => {
    const { data: scoreData } = await supabase
      .from('scores')
      .select('*, users!scores_user_id_fkey(username, id)')
      .eq('movie_id', id)
      .eq('status', 'scored')
    if (scoreData) {
      setScores(scoreData)
      const mine = scoreData.find(s => s.user_id === uid)
      if (mine) {
        setMyScore(parseFloat(mine.score))
        setMyScoreRow(mine)
      } else {
        setMyScore(null)
        setMyScoreRow(null)
      }
    }
  }, [id])

  const loadFeed = useCallback(async (uid) => {
    const { data: commentData } = await supabase
      .from('comments')
      .select('*, users!comments_user_id_fkey(username, id)')
      .eq('movie_id', id)
      .order('created_at', { ascending: false })

    const { data: defenseData } = await supabase
      .from('defenses')
      .select('*, users!defenses_user_id_fkey(username, id)')
      .eq('movie_id', id)
      .order('created_at', { ascending: false })

    const { data: myVoteData } = await supabase.from('comment_votes').select('comment_id, vote').eq('user_id', uid || '')
    const { data: allVotes } = await supabase.from('comment_votes').select('comment_id, vote')

    const totals = {}
    if (allVotes) allVotes.forEach(v => { totals[v.comment_id] = (totals[v.comment_id] || 0) + v.vote })
    const myVoteMap = {}
    if (myVoteData) myVoteData.forEach(v => { myVoteMap[v.comment_id] = v.vote })

    const enrichedComments = (commentData || []).map(c => ({ ...c, type: 'comment', netVotes: totals[c.id] || 0 }))

    const defenseUserIds = (defenseData || []).map(d => d.user_id)
    let scoreMap = {}
    if (defenseUserIds.length > 0) {
      const { data: scoreRows } = await supabase.from('scores').select('user_id, score').eq('movie_id', id).in('user_id', defenseUserIds)
      if (scoreRows) scoreRows.forEach(r => { scoreMap[r.user_id] = parseFloat(r.score) })
    }

    const enrichedDefenses = (defenseData || []).map(d => ({ ...d, type: 'defense', netVotes: 0, authorScore: scoreMap[d.user_id] ?? null }))
    setComments(enrichedComments)
    setDefenses(enrichedDefenses)
    setMyVotes(myVoteMap)
  }, [id])

  async function loadInsights(uid, movieData, userScore) {
    if (insightsLoaded || !uid) return
    const { data: recent } = await supabase.from('scores').select('*, movies(*)').eq('user_id', uid).eq('status', 'scored').order('updated_at', { ascending: false }).limit(10)
    setRecentScores(recent || [])

    if (movieData.director) {
      const { data: dirMovies } = await supabase.from('movies').select('*').eq('director', movieData.director).neq('id', id).order('year', { ascending: false })
      if (dirMovies && dirMovies.length > 0) {
        const dirIds = dirMovies.map(m => m.id)
        const { data: dirScored } = await supabase.from('scores').select('movie_id, score, status').eq('user_id', uid).in('movie_id', dirIds)
        const scoreMap = {}
        if (dirScored) dirScored.forEach(s => { scoreMap[s.movie_id] = s })
        const merged = dirMovies.map(m => ({ movie_id: m.id, movies: m, score: scoreMap[m.id]?.score ?? null, status: scoreMap[m.id]?.status ?? null }))
        merged.sort((a, b) => {
          if (a.score !== null && b.score !== null) return parseFloat(b.score) - parseFloat(a.score)
          if (a.score !== null) return -1
          if (b.score !== null) return 1
          return a.movies.title.localeCompare(b.movies.title)
        })
        setDirectorScores(merged)
      }
    }

    if (userScore !== null) {
      const { data: same } = await supabase.from('scores').select('*, movies(*)').eq('user_id', uid).eq('status', 'scored').eq('score', userScore).neq('movie_id', id).order('updated_at', { ascending: false }).limit(20)
      setSameScores(same || [])
    }

    if (userScore !== null && movieData.genres && movieData.genres.length > 0) {
      const { data: genreData } = await supabase.from('scores').select('*, movies(*)').eq('user_id', uid).eq('status', 'scored').neq('movie_id', id).order('score', { ascending: false })
      if (genreData) {
        const sameGenre = genreData.filter(s => s.movies?.genres?.some(g => movieData.genres.includes(g)))
        const above = sameGenre.filter(s => parseFloat(s.score) >= userScore).slice(0, 4)
        const below = sameGenre.filter(s => parseFloat(s.score) <= userScore).sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).slice(0, 4)
        setGenreScores({ above, below })
      }
    }
    setInsightsLoaded(true)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || null
      if (uid) setUserId(uid)

      const { data: movieData } = await supabase.from('movies').select('*').eq('id', id).single()
      if (!movieData) { navigate('/'); return }
      setMovie(movieData)

      const { data: scoreData } = await supabase.from('scores').select('*, users!scores_user_id_fkey(username, id)').eq('movie_id', id).eq('status', 'scored')
      let userScore = null
      if (scoreData) {
        setScores(scoreData)
        const mine = scoreData.find(s => s.user_id === uid)
        if (mine) {
          userScore = parseFloat(mine.score)
          setMyScore(userScore)
          setMyScoreRow(mine)
        }
      }

      const { data: userData } = await supabase.from('users').select('id, username').order('username')
      if (userData) setAllUsers(userData)

      await loadFeed(uid)
      if (uid) loadInsights(uid, movieData, userScore)
      setLoading(false)
    }
    load()
  }, [id, loadFeed])

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function handleCommentChange(e) {
    const val = e.target.value
    if (val.length > 140) return
    setCommentBody(val)
    const cursor = e.target.selectionStart
    const textUpToCursor = val.slice(0, cursor)
    const match = textUpToCursor.match(/@(\w*)$/)
    if (match) { setMentionQuery(match[1].toLowerCase()); setMentionIndex(0) }
    else setMentionQuery(null)
  }

  function handleCommentKeyDown(e) {
    if (mentionQuery === null) return
    const filtered = allUsers.filter(u => u.username.toLowerCase().startsWith(mentionQuery))
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)) }
    else if ((e.key === 'Enter' || e.key === 'Tab') && filtered.length > 0) { e.preventDefault(); insertMention(filtered[mentionIndex].username) }
    else if (e.key === 'Escape') setMentionQuery(null)
  }

  function insertMention(username) {
    const cursor = textareaRef.current?.selectionStart ?? commentBody.length
    const textUpToCursor = commentBody.slice(0, cursor)
    const before = textUpToCursor.replace(/@(\w*)$/, `@${username} `)
    const after = commentBody.slice(cursor)
    const newBody = (before + after).slice(0, 140)
    setCommentBody(newBody)
    setMentionQuery(null)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const pos = before.length
        textareaRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  const filteredMentions = mentionQuery !== null ? allUsers.filter(u => u.username.toLowerCase().startsWith(mentionQuery)) : []

  async function handleVote(commentId, direction) {
    if (!userId) return
    const current = myVotes[commentId]
    if (current === direction) {
      await supabase.from('comment_votes').delete().eq('comment_id', commentId).eq('user_id', userId)
    } else {
      await supabase.from('comment_votes').upsert({ comment_id: commentId, user_id: userId, vote: direction }, { onConflict: 'comment_id,user_id' })
    }
    await loadFeed(userId)
  }

  async function handleDelete(commentId) {
    await supabase.from('comments').delete().eq('id', commentId)
    await loadFeed(userId)
  }

  async function handleCommentSubmit() {
    if (!commentBody.trim() || !userId) return
    setSubmitting(true)
    const { data: inserted } = await supabase.from('comments').insert({ movie_id: id, user_id: userId, body: commentBody.trim() }).select().single()
    if (inserted) {
      const mentionedUsernames = parseMentions(commentBody)
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = allUsers.filter(u => mentionedUsernames.includes(u.username.toLowerCase()))
        if (mentionedUsers.length > 0) {
          await supabase.from('comment_mentions').insert(mentionedUsers.map(u => ({ comment_id: inserted.id, mentioned_user_id: u.id, mentioning_user_id: userId, movie_id: id, notified: false })))
        }
      }
    }
    setCommentBody('')
    await loadFeed(userId)
    setSubmitting(false)
  }

  function toggleInsight(type) { setActiveInsight(prev => prev === type ? null : type) }

  const allFeedItems = [...comments, ...defenses].sort((a, b) => {
    if (commentSort === 'top') return b.netVotes - a.netVotes || new Date(b.created_at) - new Date(a.created_at)
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const totalFeedCount = comments.length + defenses.length

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (!movie) return <div style={{ padding: 20 }}>Movie not found</div>

  const groupAvg = scores.length > 0 ? scores.reduce((sum, s) => sum + parseFloat(s.score), 0) / scores.length : null
  const buckets = {}
  scores.forEach(s => { const bucket = Math.round(parseFloat(s.score) * 4) / 4; buckets[bucket] = (buckets[bucket] || 0) + 1 })
  const maxCount = Math.max(...Object.values(buckets), 1)
  const charsLeft = 140 - commentBody.length
  const charsLeftColor = charsLeft <= 10 ? '#993C1D' : charsLeft <= 30 ? '#b45309' : '#aaa'

  const insightLinks = [
    { type: 'recent', label: 'How does this stack up against your last 10 viewings?', available: recentScores.length > 0 },
    { type: 'director', label: `How does this compare to other ${movie.director} films you've scored?`, available: directorScores.length > 0 },
    { type: 'samescore', label: myScore !== null ? `See other films you've given a ${myScore.toFixed(2)}` : "See other films you've given the same score", available: sameScores.length > 0 },
    { type: 'genre', label: myScore !== null && movie.genres?.length > 0 ? `How does your ${myScore.toFixed(2)} compare to your other ${movie.genres[0]} scores?` : 'How does this compare to your other scores in this genre?', available: genreScores.above.length > 0 || genreScores.below.length > 0 },
  ]

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .detail-hero { display: flex; gap: 20px; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .insight-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; background: none; border: 0.5px solid #e8e6fb; border-radius: 8px; padding: 7px 10px; cursor: pointer; font-size: 11px; color: #534AB7; text-align: left; transition: background 0.15s; font-family: inherit; }
        .insight-btn:hover { background: #EEEDFE; }
        .insight-btn.active { background: #EEEDFE; border-color: #534AB7; }
        .comment-vote-btn { background: none; border: none; cursor: pointer; padding: 3px 5px; border-radius: 4px; display: flex; align-items: center; gap: 3px; font-size: 11px; transition: background 0.15s; }
        .comment-vote-btn:hover { background: #f0f0f0; }
        .sort-pill { padding: 4px 12px; border-radius: 20px; border: 0.5px solid #ddd; background: none; font-size: 11px; cursor: pointer; transition: all 0.15s; }
        .sort-pill.active { background: #534AB7; color: #fff; border-color: #534AB7; }
        .mention-item { padding: 6px 10px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .mention-item:hover, .mention-item.selected { background: #EEEDFE; }
        @media (max-width: 768px) {
          .detail-hero { flex-direction: column; align-items: center; text-align: center; }
          .detail-hero-info { width: 100%; }
          .detail-hero-tags { justify-content: center; }
          .detail-hero-stats { justify-content: center; }
          .detail-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Back</button>

      {/* Hero */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 20, marginBottom: 14 }}>
        <div className="detail-hero">
          {movie.poster_url
            ? <img src={movie.poster_url} alt={movie.title} onClick={() => setLightbox(true)} style={{ width: 120, height: 180, borderRadius: 8, objectFit: 'cover', flexShrink: 0, cursor: 'zoom-in' }} />
            : <div style={{ width: 120, height: 180, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>🎬</div>
          }
          <div className="detail-hero-info" style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{movie.title}</h1>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>{movie.year} · {movie.director} · {movie.runtime ? `${movie.runtime} min` : ''}</div>
            <div className="detail-hero-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {movie.genres?.map(g => <span key={g} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EEEDFE', color: '#534AB7', fontWeight: 500 }}>{g}</span>)}
            </div>
            <div className="detail-hero-stats" style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
              {movie.imdb_score && <div><div style={{ fontSize: 10, color: '#888' }}>IMDB</div><div style={{ fontSize: 16, fontWeight: 500 }}>{movie.imdb_score}</div></div>}
              {groupAvg && <div><div style={{ fontSize: 10, color: '#888' }}>Group avg</div><div style={{ fontSize: 16, fontWeight: 500, color: scoreColor(groupAvg) }}>{groupAvg.toFixed(2)}</div></div>}
              {myScore !== null && <div><div style={{ fontSize: 10, color: '#888' }}>Your score</div><div style={{ fontSize: 16, fontWeight: 500, color: scoreColor(myScore) }}>{myScore.toFixed(2)}</div></div>}
              <div><div style={{ fontSize: 10, color: '#888' }}>Scored by</div><div style={{ fontSize: 16, fontWeight: 500 }}>{scores.length} members</div></div>
            </div>

            {/* Log/Edit button */}
            <button
              onClick={() => setScorePanelOpen(o => !o)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: scorePanelOpen ? '#3d349e' : '#534AB7', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 4 }}
            >
              {myScore !== null ? (scorePanelOpen ? 'Cancel' : 'Edit your score') : (scorePanelOpen ? 'Cancel' : '+ Log your score')}
            </button>

            {/* Inline score panel */}
            {scorePanelOpen && (
              <ScorePanel
                movie={movie}
                userId={userId}
                existingScore={myScoreRow}
                onSaved={(newScore) => {
                  setMyScore(newScore)
                  setScorePanelOpen(false)
                  loadScores(userId)
                }}
                onCancel={() => setScorePanelOpen(false)}
              />
            )}

            {/* Insight links */}
            {userId && !scorePanelOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                {insightLinks.map(link => (
                  <div key={link.type}>
                    <button
                      className={`insight-btn${activeInsight === link.type ? ' active' : ''}`}
                      onClick={() => toggleInsight(link.type)}
                      disabled={!link.available}
                      style={{ opacity: link.available ? 1 : 0.4, cursor: link.available ? 'pointer' : 'default' }}
                    >
                      <span>{link.label}</span>
                      {link.available && (activeInsight === link.type ? <ChevronUp size={12} style={{ flexShrink: 0, marginLeft: 6 }} /> : <ChevronDown size={12} style={{ flexShrink: 0, marginLeft: 6 }} />)}
                    </button>
                    {activeInsight === link.type && (
                      <InsightPanel
                        type={link.type}
                        data={link.type === 'recent' ? recentScores : link.type === 'director' ? directorScores : link.type === 'genre' ? genreScores : sameScores}
                        movie={movie} myScore={myScore} onClose={() => setActiveInsight(null)} navigate={navigate}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Score distribution */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Score distribution</div>
          {(() => {
            const allBuckets = [10, 9.75, 9.5, 9.25, 9, 8.75, 8.5, 8.25, 8, 7.75, 7.5, 7.25, 7, 6.75, 6.5, 6.25, 6, 5.75, 5.5, 5.25, 5, 4.75, 4.5, 4.25, 4, 3.75, 3.5, 3.25, 3, 2.75, 2.5, 2.25, 2, 1.75, 1.5, 1.25, 1]
            const scoredBuckets = allBuckets.filter(b => (buckets[b] || 0) > 0)
            const myBucket = myScore !== null ? Math.round(myScore * 4) / 4 : null
            if (scoredBuckets.length === 0 && myBucket === null) return null
            const allVisible = myBucket !== null ? [...scoredBuckets, myBucket] : scoredBuckets
            const maxBucket = Math.max(...allVisible)
            const minBucket = Math.min(...allVisible)
            return allBuckets.filter(b => b >= minBucket && b <= maxBucket).map(bucket => {
              const count = buckets[bucket] || 0
              const isMe = myBucket === bucket
              return (
                <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: '#888', width: 28, textAlign: 'right', flexShrink: 0 }}>{bucket}</div>
                  <div style={{ flex: 1, height: 16, background: '#f5f5f5', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: isMe ? '#0F6E56' : '#534AB7', borderRadius: 3, minWidth: count > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#888', width: 16, flexShrink: 0 }}>{count > 0 ? count : ''}</div>
                </div>
              )
            })
          })()}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#534AB7' }} /> others</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#0F6E56' }} /> your score</div>
          </div>
        </div>

        {/* Member scores */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Member scores</div>
          {scores.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>No scores yet</div>}
          {scores.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid #f0f0f0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#534AB7', flexShrink: 0 }}>{s.users?.username?.slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: s.user_id === userId ? 500 : 400 }}>{s.users?.username} {s.user_id === userId && <span style={{ fontSize: 10, color: '#888' }}>(you)</span>}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: scoreColor(parseFloat(s.score)) }}>{parseFloat(s.score).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Unified feed */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Discussion {totalFeedCount > 0 && <span style={{ color: '#888', fontWeight: 400 }}>({totalFeedCount})</span>}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`sort-pill${commentSort === 'top' ? ' active' : ''}`} onClick={() => setCommentSort('top')}>Top</button>
            <button className={`sort-pill${commentSort === 'new' ? ' active' : ''}`} onClick={() => setCommentSort('new')}>New</button>
          </div>
        </div>

        {userId && (
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <textarea ref={textareaRef} value={commentBody} onChange={handleCommentChange} onKeyDown={handleCommentKeyDown} placeholder="Add a comment… type @ to mention someone" rows={2} style={{ width: '100%', boxSizing: 'border-box', border: '0.5px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 }} />
            {mentionQuery !== null && filteredMentions.length > 0 && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, background: '#fff', border: '0.5px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 180, maxHeight: 200, overflowY: 'auto', zIndex: 100, marginBottom: 4 }}>
                {filteredMentions.map((u, i) => (
                  <div key={u.id} className={`mention-item${i === mentionIndex ? ' selected' : ''}`} onMouseDown={e => { e.preventDefault(); insertMention(u.username) }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, color: '#534AB7', flexShrink: 0 }}>{u.username.slice(0, 2).toUpperCase()}</div>
                    <span style={{ color: '#534AB7', fontWeight: 500 }}>@{u.username}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: charsLeftColor }}>{charsLeft} left</span>
              <button onClick={handleCommentSubmit} disabled={!commentBody.trim() || submitting} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: commentBody.trim() ? '#534AB7' : '#ddd', color: commentBody.trim() ? '#fff' : '#aaa', fontSize: 12, fontWeight: 500, cursor: commentBody.trim() ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {allFeedItems.length === 0 ? (
          <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '20px 0' }}>No discussion yet. Be the first.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allFeedItems.map((item, i) => {
              const isLast = i === allFeedItems.length - 1
              const isMe = item.user_id === userId

              if (item.type === 'defense') {
                return (
                  <div key={`defense-${item.id}`} style={{ padding: '10px 0', borderBottom: isLast ? 'none' : '0.5px solid #f0f0f0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 3, borderRadius: 2, background: '#534AB7', alignSelf: 'stretch', flexShrink: 0, minHeight: 40 }} />
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? '#EEEDFE' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: isMe ? '#534AB7' : '#666', flexShrink: 0 }}>{item.users?.username?.slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{item.users?.username}</span>
                        {isMe && <span style={{ fontSize: 10, color: '#888' }}>(you)</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#534AB7', background: '#EEEDFE', padding: '1px 6px', borderRadius: 20 }}>
                          <Shield size={9} /> defending{item.authorScore !== null && <span style={{ fontWeight: 600, color: scoreColor(item.authorScore) }}> · {item.authorScore.toFixed(2)}</span>}
                        </span>
                        <span style={{ fontSize: 10, color: '#bbb' }}>{timeAgo(item.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.45, wordBreak: 'break-word' }}>{item.body}</div>
                      <div style={{ marginTop: 5 }}>
                        <button onClick={() => navigate('/defend')} style={{ fontSize: 10, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View thread →</button>
                      </div>
                    </div>
                  </div>
                )
              }

              const myVote = myVotes[item.id]
              return (
                <div key={`comment-${item.id}`} style={{ padding: '10px 0', borderBottom: isLast ? 'none' : '0.5px solid #f0f0f0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? '#EEEDFE' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: isMe ? '#534AB7' : '#666', flexShrink: 0 }}>{item.users?.username?.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{item.users?.username}</span>
                      {isMe && <span style={{ fontSize: 10, color: '#888' }}>(you)</span>}
                      <span style={{ fontSize: 10, color: '#bbb' }}>{timeAgo(item.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.45, wordBreak: 'break-word' }}><CommentBody body={item.body} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
                      <button className="comment-vote-btn" onClick={() => handleVote(item.id, 1)} style={{ color: myVote === 1 ? '#534AB7' : '#888' }} title="Upvote">
                        <ThumbsUp size={12} />{item.netVotes > 0 && <span>{item.netVotes}</span>}
                      </button>
                      <button className="comment-vote-btn" onClick={() => handleVote(item.id, -1)} style={{ color: myVote === -1 ? '#993C1D' : '#888' }} title="Downvote">
                        <ThumbsDown size={12} />{item.netVotes < 0 && <span>{Math.abs(item.netVotes)}</span>}
                      </button>
                      {isMe && <button className="comment-vote-btn" onClick={() => handleDelete(item.id)} style={{ color: '#ccc', marginLeft: 4 }} title="Delete comment"><Trash2 size={12} /></button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out' }}>
          <img src={movie.poster_url.replace('w500', 'w780')} alt={movie.title} style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}