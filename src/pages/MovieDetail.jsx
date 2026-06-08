import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react'

// Parse @mentions out of comment body, return array of username strings
function parseMentions(body) {
  const matches = body.match(/@(\w+)/g) || []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

// Render comment body with highlighted @mentions
function CommentBody({ body }) {
  const parts = body.split(/(@\w+)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} style={{
            color: '#534AB7', fontWeight: 500,
            background: '#EEEDFE', borderRadius: 3,
            padding: '0 2px'
          }}>{part}</span>
        ) : part
      )}
    </span>
  )
}

export default function MovieDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [scores, setScores] = useState([])
  const [myScore, setMyScore] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [allUsers, setAllUsers] = useState([])

  // comments
  const [comments, setComments] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [commentSort, setCommentSort] = useState('top')
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // @mention picker
  const [mentionQuery, setMentionQuery] = useState(null) // null = closed, string = filter
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef(null)

  const loadComments = useCallback(async (uid) => {
    const { data: commentData } = await supabase
      .from('comments')
      .select('*, users(username)')
      .eq('movie_id', id)
      .order('created_at', { ascending: false })

    if (!commentData) return

    const { data: myVoteData } = await supabase
      .from('comment_votes')
      .select('comment_id, vote')
      .eq('user_id', uid || '')

    const { data: allVotes } = await supabase
      .from('comment_votes')
      .select('comment_id, vote')

    const totals = {}
    if (allVotes) {
      allVotes.forEach(v => {
        totals[v.comment_id] = (totals[v.comment_id] || 0) + v.vote
      })
    }

    const myVoteMap = {}
    if (myVoteData) {
      myVoteData.forEach(v => { myVoteMap[v.comment_id] = v.vote })
    }

    const enriched = commentData.map(c => ({
      ...c,
      netVotes: totals[c.id] || 0
    }))

    setComments(enriched)
    setMyVotes(myVoteMap)
  }, [id])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || null
      if (uid) setUserId(uid)

      const { data: movieData } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single()

      if (!movieData) { navigate('/'); return }
      setMovie(movieData)

      const { data: scoreData } = await supabase
        .from('scores')
        .select('*, users(username, id)')
        .eq('movie_id', id)
        .eq('status', 'scored')

      if (scoreData) {
        setScores(scoreData)
        const mine = scoreData.find(s => s.user_id === uid)
        if (mine) setMyScore(parseFloat(mine.score))
      }

      // load all users for @mention picker
      const { data: userData } = await supabase
        .from('users')
        .select('id, username')
        .order('username')
      if (userData) setAllUsers(userData)

      await loadComments(uid)
      setLoading(false)
    }
    load()
  }, [id, loadComments])

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

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

  // Detect @mention trigger as user types
  function handleCommentChange(e) {
    const val = e.target.value
    if (val.length > 140) return
    setCommentBody(val)

    // Find if cursor is inside an @word
    const cursor = e.target.selectionStart
    const textUpToCursor = val.slice(0, cursor)
    const match = textUpToCursor.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1].toLowerCase())
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  function handleCommentKeyDown(e) {
    if (mentionQuery === null) return

    const filtered = allUsers.filter(u =>
      u.username.toLowerCase().startsWith(mentionQuery)
    )

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered.length > 0) {
        e.preventDefault()
        insertMention(filtered[mentionIndex].username)
      }
    } else if (e.key === 'Escape') {
      setMentionQuery(null)
    }
  }

  function insertMention(username) {
    const cursor = textareaRef.current?.selectionStart ?? commentBody.length
    const textUpToCursor = commentBody.slice(0, cursor)
    const before = textUpToCursor.replace(/@(\w*)$/, `@${username} `)
    const after = commentBody.slice(cursor)
    const newBody = (before + after).slice(0, 140)
    setCommentBody(newBody)
    setMentionQuery(null)

    // restore focus and move cursor to after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const pos = before.length
        textareaRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  const filteredMentions = mentionQuery !== null
    ? allUsers.filter(u => u.username.toLowerCase().startsWith(mentionQuery))
    : []

  async function handleVote(commentId, direction) {
    if (!userId) return
    const current = myVotes[commentId]
    if (current === direction) {
      await supabase.from('comment_votes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
    } else {
      await supabase.from('comment_votes')
        .upsert(
          { comment_id: commentId, user_id: userId, vote: direction },
          { onConflict: 'comment_id,user_id' }
        )
    }
    await loadComments(userId)
  }

  async function handleDelete(commentId) {
    await supabase.from('comments').delete().eq('id', commentId)
    await loadComments(userId)
  }

  async function handleSubmit() {
    if (!commentBody.trim() || !userId) return
    setSubmitting(true)

    const { data: inserted } = await supabase
      .from('comments')
      .insert({ movie_id: id, user_id: userId, body: commentBody.trim() })
      .select()
      .single()

    // write mentions to comment_mentions for future notification use
    if (inserted) {
      const mentionedUsernames = parseMentions(commentBody)
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = allUsers.filter(u =>
          mentionedUsernames.includes(u.username.toLowerCase())
        )
        if (mentionedUsers.length > 0) {
          await supabase.from('comment_mentions').insert(
            mentionedUsers.map(u => ({
              comment_id: inserted.id,
              mentioned_user_id: u.id,
              mentioning_user_id: userId,
              movie_id: id,
              notified: false
            }))
          )
        }
      }
    }

    setCommentBody('')
    await loadComments(userId)
    setSubmitting(false)
  }

  const sortedComments = [...comments].sort((a, b) => {
    if (commentSort === 'top') {
      return b.netVotes - a.netVotes || new Date(b.created_at) - new Date(a.created_at)
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (!movie) return <div style={{ padding: 20 }}>Movie not found</div>

  const groupAvg = scores.length > 0
    ? scores.reduce((sum, s) => sum + parseFloat(s.score), 0) / scores.length
    : null

  const buckets = {}
  scores.forEach(s => {
    const bucket = Math.floor(parseFloat(s.score) * 2) / 2
    buckets[bucket] = (buckets[bucket] || 0) + 1
  })
  const maxCount = Math.max(...Object.values(buckets), 1)

  const charsLeft = 140 - commentBody.length
  const charsLeftColor = charsLeft <= 10 ? '#993C1D' : charsLeft <= 30 ? '#b45309' : '#aaa'

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .detail-hero { display: flex; gap: 20px; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .comment-vote-btn {
          background: none; border: none; cursor: pointer;
          padding: 3px 5px; border-radius: 4px;
          display: flex; align-items: center; gap: 3px;
          font-size: 11px; transition: background 0.15s;
        }
        .comment-vote-btn:hover { background: #f0f0f0; }
        .sort-pill {
          padding: 4px 12px; border-radius: 20px;
          border: 0.5px solid #ddd; background: none;
          font-size: 11px; cursor: pointer; transition: all 0.15s;
        }
        .sort-pill.active { background: #534AB7; color: #fff; border-color: #534AB7; }
        .mention-item {
          padding: 6px 10px; font-size: 12px; cursor: pointer;
          display: flex; align-items: center; gap: 8px;
        }
        .mention-item:hover, .mention-item.selected { background: #EEEDFE; }
        @media (max-width: 768px) {
          .detail-hero { flex-direction: column; align-items: center; text-align: center; }
          .detail-hero-info { width: 100%; }
          .detail-hero-tags { justify-content: center; }
          .detail-hero-stats { justify-content: center; }
          .detail-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <button onClick={() => navigate(-1)} style={{
        fontSize: 12, color: '#666', background: 'none', border: 'none',
        cursor: 'pointer', marginBottom: 16, padding: 0
      }}>← Back</button>

      {/* Hero */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 20, marginBottom: 14 }}>
        <div className="detail-hero">
          {movie.poster_url
            ? <img src={movie.poster_url} alt={movie.title} onClick={() => setLightbox(true)}
                style={{ width: 120, height: 180, borderRadius: 8, objectFit: 'cover', flexShrink: 0, cursor: 'zoom-in' }} />
            : <div style={{ width: 120, height: 180, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>🎬</div>
          }
          <div className="detail-hero-info" style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{movie.title}</h1>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              {movie.year} · {movie.director} · {movie.runtime ? `${movie.runtime} min` : ''}
            </div>
            <div className="detail-hero-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {movie.genres?.map(g => (
                <span key={g} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EEEDFE', color: '#534AB7', fontWeight: 500 }}>{g}</span>
              ))}
            </div>
            <div className="detail-hero-stats" style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
              {movie.imdb_score && (
                <div>
                  <div style={{ fontSize: 10, color: '#888' }}>IMDB</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{movie.imdb_score}</div>
                </div>
              )}
              {groupAvg && (
                <div>
                  <div style={{ fontSize: 10, color: '#888' }}>Group avg</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: scoreColor(groupAvg) }}>{groupAvg.toFixed(2)}</div>
                </div>
              )}
              {myScore && (
                <div>
                  <div style={{ fontSize: 10, color: '#888' }}>Your score</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: scoreColor(myScore) }}>{myScore.toFixed(1)}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, color: '#888' }}>Scored by</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{scores.length} members</div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/log?movie=${movie.id}`)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              {myScore ? 'Edit your score' : '+ Log your score'}
            </button>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Score distribution */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Score distribution</div>
          {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map(bucket => {
            const count = buckets[bucket] || 0
            const isMe = myScore === bucket
            if (count === 0 && !isMe) return null
            return (
              <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: '#888', width: 28, textAlign: 'right', flexShrink: 0 }}>{bucket}</div>
                <div style={{ flex: 1, height: 16, background: '#f5f5f5', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(count / maxCount) * 100}%`, height: '100%',
                    background: isMe ? '#0F6E56' : '#534AB7', borderRadius: 3,
                    minWidth: count > 0 ? 4 : 0
                  }} />
                </div>
                <div style={{ fontSize: 10, color: '#888', width: 16, flexShrink: 0 }}>{count}</div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#534AB7' }} /> others
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#0F6E56' }} /> your score
            </div>
          </div>
        </div>

        {/* Member scores */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Member scores</div>
          {scores.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>No scores yet</div>}
          {scores
            .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
            .map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0', borderBottom: '0.5px solid #f0f0f0'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 500, color: '#534AB7', flexShrink: 0
                }}>
                  {s.users?.username?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: s.user_id === userId ? 500 : 400 }}>
                  {s.users?.username} {s.user_id === userId && <span style={{ fontSize: 10, color: '#888' }}>(you)</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: scoreColor(parseFloat(s.score)) }}>
                  {parseFloat(s.score).toFixed(1)}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Comment feed */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16, marginTop: 14 }}>

        {/* Header + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            Comments {comments.length > 0 && <span style={{ color: '#888', fontWeight: 400 }}>({comments.length})</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`sort-pill${commentSort === 'top' ? ' active' : ''}`} onClick={() => setCommentSort('top')}>Top</button>
            <button className={`sort-pill${commentSort === 'new' ? ' active' : ''}`} onClick={() => setCommentSort('new')}>New</button>
          </div>
        </div>

        {/* Compose */}
        {userId && (
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={commentBody}
              onChange={handleCommentChange}
              onKeyDown={handleCommentKeyDown}
              placeholder="Add a comment… type @ to mention someone"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '0.5px solid #ddd', borderRadius: 8,
                padding: '8px 10px', fontSize: 13, resize: 'none',
                fontFamily: 'inherit', outline: 'none', lineHeight: 1.5
              }}
            />

            {/* @mention dropdown */}
            {mentionQuery !== null && filteredMentions.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0,
                background: '#fff', border: '0.5px solid #ddd',
                borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                minWidth: 180, maxHeight: 200, overflowY: 'auto',
                zIndex: 100, marginBottom: 4
              }}>
                {filteredMentions.map((u, i) => (
                  <div
                    key={u.id}
                    className={`mention-item${i === mentionIndex ? ' selected' : ''}`}
                    onMouseDown={e => { e.preventDefault(); insertMention(u.username) }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#EEEDFE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 500, color: '#534AB7', flexShrink: 0
                    }}>
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ color: '#534AB7', fontWeight: 500 }}>@{u.username}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: charsLeftColor }}>{charsLeft} left</span>
              <button
                onClick={handleSubmit}
                disabled={!commentBody.trim() || submitting}
                style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none',
                  background: commentBody.trim() ? '#534AB7' : '#ddd',
                  color: commentBody.trim() ? '#fff' : '#aaa',
                  fontSize: 12, fontWeight: 500,
                  cursor: commentBody.trim() ? 'pointer' : 'default',
                  transition: 'all 0.15s'
                }}
              >
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        {sortedComments.length === 0 ? (
          <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '20px 0' }}>
            No comments yet. Be the first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortedComments.map((c, i) => {
              const isMe = c.user_id === userId
              const myVote = myVotes[c.id]
              return (
                <div key={c.id} style={{
                  padding: '10px 0',
                  borderBottom: i < sortedComments.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                  display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isMe ? '#EEEDFE' : '#f5f5f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 500,
                    color: isMe ? '#534AB7' : '#666', flexShrink: 0
                  }}>
                    {c.users?.username?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{c.users?.username}</span>
                      {isMe && <span style={{ fontSize: 10, color: '#888' }}>(you)</span>}
                      <span style={{ fontSize: 10, color: '#bbb' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.45, wordBreak: 'break-word' }}>
                      <CommentBody body={c.body} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
                      <button className="comment-vote-btn" onClick={() => handleVote(c.id, 1)}
                        style={{ color: myVote === 1 ? '#534AB7' : '#888' }} title="Upvote">
                        <ThumbsUp size={12} />
                        {c.netVotes > 0 && <span>{c.netVotes}</span>}
                      </button>
                      <button className="comment-vote-btn" onClick={() => handleVote(c.id, -1)}
                        style={{ color: myVote === -1 ? '#993C1D' : '#888' }} title="Downvote">
                        <ThumbsDown size={12} />
                        {c.netVotes < 0 && <span>{Math.abs(c.netVotes)}</span>}
                      </button>
                      {isMe && (
                        <button className="comment-vote-btn" onClick={() => handleDelete(c.id)}
                          style={{ color: '#ccc', marginLeft: 4 }} title="Delete comment">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out'
        }}>
          <img
            src={movie.poster_url.replace('w500', 'w780')}
            alt={movie.title}
            style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  )
}