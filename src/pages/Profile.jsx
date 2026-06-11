import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [privacy, setPrivacy] = useState({
    show_top10: true,
    show_recent: true,
    show_genres: true,
    show_buddies: true,
    show_franchises: false
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setEditName(profileData.display_name || profileData.username)
        setEditUsername(profileData.username || '')
        setEditBio(profileData.bio || '')
        setPrivacy({
          show_top10: profileData.show_top10 ?? true,
          show_recent: profileData.show_recent ?? true,
          show_genres: profileData.show_genres ?? true,
          show_buddies: profileData.show_buddies ?? true,
          show_franchises: profileData.show_franchises ?? false
        })
      }

      const { data: scoreData } = await supabase
        .from('scores')
        .select('*, movies(*)')
        .eq('user_id', user.id)
        .eq('status', 'scored')

      if (scoreData) setScores(scoreData)
      setLoading(false)
    }
    load()
  }, [])

  function sanitizeUsername(val) {
    // only allow letters, numbers, underscores, hyphens
    return val.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  }

  async function saveProfile() {
    setUsernameError('')

    const trimmedUsername = editUsername.trim()
    if (!trimmedUsername) {
      setUsernameError('Username cannot be empty.')
      return
    }
    if (trimmedUsername.length < 2) {
      setUsernameError('Username must be at least 2 characters.')
      return
    }

    // check uniqueness only if username changed
    if (trimmedUsername !== profile.username) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmedUsername)
        .single()
      if (existing) {
        setUsernameError(`@${trimmedUsername} is already taken.`)
        return
      }
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('users').update({
      display_name: editName,
      username: trimmedUsername,
      bio: editBio,
      ...privacy
    }).eq('id', user.id)

    setProfile(p => ({ ...p, display_name: editName, username: trimmedUsername, bio: editBio, ...privacy }))
    setEditing(false)
    setSaving(false)
  }

  async function togglePrivacy(key) {
    const newVal = !privacy[key]
    const newPrivacy = { ...privacy, [key]: newVal }
    setPrivacy(newPrivacy)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('users').update({ [key]: newVal }).eq('id', user.id)
  }

  function scoreColor(s) {
    if (s >= 8) return '#0F6E56'
    if (s >= 6.5) return '#534AB7'
    return '#993C1D'
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>

  const avg = scores.length > 0
    ? (scores.reduce((sum, s) => sum + parseFloat(s.score), 0) / scores.length).toFixed(2)
    : '—'

  const top10 = [...scores]
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
    .slice(0, 10)

  const recent5 = [...scores]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  const genreMap = {}
  scores.forEach(s => {
    s.movies?.genres?.forEach(g => {
      if (!genreMap[g]) genreMap[g] = []
      genreMap[g].push(parseFloat(s.score))
    })
  })
  const genreAvgs = Object.entries(genreMap)
    .map(([g, vals]) => ({ genre: g, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8)
  const maxGenreAvg = Math.max(...genreAvgs.map(g => g.avg), 1)

  const initials = (profile?.display_name || profile?.username || '??').slice(0, 2).toUpperCase()
  const memberYear = profile?.member_since ? new Date(profile.member_since).getFullYear() : '—'

  const privacyItems = [
    { key: 'show_top10', label: 'Top 10 films' },
    { key: 'show_recent', label: 'Recent scores' },
    { key: 'show_genres', label: 'Genre fingerprint' },
    { key: 'show_buddies', label: 'Buddy matches' },
    { key: 'show_franchises', label: 'Franchise averages' },
  ]

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .profile-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding-top: 14px;
          border-top: 0.5px solid #f0f0f0;
        }
        .top10-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }
        .top10-label {
          display: block;
        }
        @media (max-width: 480px) {
          .top10-grid { gap: 5px; }
          .top10-label { display: none; }
        }
        .profile-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }
        @media (max-width: 768px) {
          .profile-stats { grid-template-columns: repeat(2, 1fr); }
          .top10-grid { grid-template-columns: repeat(5, 1fr); gap: 4px; }
          .profile-bottom { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Profile header */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#EEEDFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 500, color: '#534AB7', flexShrink: 0
          }}>{initials}</div>

          <div style={{ flex: 1 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Display name"
                  style={{ fontSize: 16, padding: '6px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontWeight: 500 }}
                />

                {/* Username field */}
                <div>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 13, color: '#aaa', pointerEvents: 'none'
                    }}>@</span>
                    <input
                      value={editUsername}
                      onChange={e => {
                        setUsernameError('')
                        setEditUsername(sanitizeUsername(e.target.value))
                      }}
                      placeholder="username"
                      maxLength={30}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        fontSize: 13, padding: '6px 10px 6px 22px',
                        borderRadius: 8,
                        border: `0.5px solid ${usernameError ? '#993C1D' : '#ddd'}`,
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  {usernameError
                    ? <div style={{ fontSize: 11, color: '#993C1D', marginTop: 3 }}>{usernameError}</div>
                    : <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>Letters, numbers, _ and - only. This is how others @mention you.</div>
                  }
                </div>

                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Write a short bio..."
                  rows={2}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '0.5px solid #ddd', resize: 'none', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveProfile} disabled={saving} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setUsernameError('') }} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 2 }}>{profile?.display_name || profile?.username}</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>@{profile?.username} · member since {memberYear}</div>
                {profile?.bio && <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>{profile.bio}</div>}
              </>
            )}
          </div>

          {!editing && (
            <button onClick={() => setEditing(true)} style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 8,
              border: '0.5px solid #ddd', background: 'transparent', color: '#666', cursor: 'pointer', flexShrink: 0
            }}>Edit</button>
          )}
        </div>

        <div className="profile-stats">
          {[
            { label: 'Films scored', value: scores.length },
            { label: 'Avg score', value: avg },
            { label: 'Years active', value: new Date().getFullYear() - memberYear || '—' },
            { label: 'Top score', value: top10[0] ? parseFloat(top10[0].score).toFixed(2) : '—' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 10 */}
      {privacy.show_top10 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>🏆 Your top 10</div>
          <div style={{ overflow: 'hidden' }}>
          <div className="top10-grid">
            {top10.map((s, i) => (
              <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{ cursor: 'pointer' }}>
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  {s.movies?.poster_url
                    ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 8 }} />
                    : <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎬</div>
                  }
                  <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, fontWeight: 500, background: 'rgba(83,74,183,0.9)', color: '#fff', padding: '1px 5px', borderRadius: 10 }}>#{i + 1}</div>
                  <div style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 10, fontWeight: 500, background: 'rgba(15,110,86,0.9)', color: '#fff', padding: '1px 5px', borderRadius: 10 }}>{parseFloat(s.score).toFixed(2)}</div>
                </div>
                <div className="top10-label" style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title}</div>
                <div className="top10-label" style={{ fontSize: 9, color: '#888' }}>{s.movies?.year}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="profile-bottom">
        {privacy.show_recent && (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Recently scored</div>
            {recent5.map(s => (
              <div key={s.id} onClick={() => navigate(`/movie/${s.movie_id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                borderBottom: '0.5px solid #f0f0f0', cursor: 'pointer'
              }}>
                {s.movies?.poster_url
                  ? <img src={s.movies.poster_url} alt={s.movies.title} style={{ width: 28, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 28, height: 42, borderRadius: 4, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🎬</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.movies?.title}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{s.movies?.year}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: scoreColor(parseFloat(s.score)) }}>
                  {parseFloat(s.score).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {privacy.show_genres && (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Genre fingerprint</div>
            {genreAvgs.map(g => (
              <div key={g.genre} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                <div style={{ fontSize: 11, color: '#666', width: 80, flexShrink: 0 }}>{g.genre}</div>
                <div style={{ flex: 1, height: 5, background: '#f5f5f5', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(g.avg / maxGenreAvg) * 100}%`, height: '100%', background: '#534AB7', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7', minWidth: 28, textAlign: 'right' }}>{g.avg.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy controls */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #eee', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>🔒 Privacy controls</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Choose what others can see on your profile.</div>
        {privacyItems.map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #f0f0f0' }}>
            <div style={{ fontSize: 13, color: '#333' }}>{item.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: privacy[item.key] ? '#0F6E56' : '#888' }}>
                {privacy[item.key] ? 'Public' : 'Private'}
              </span>
              <div
                onClick={() => togglePrivacy(item.key)}
                style={{
                  width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative',
                  background: privacy[item.key] ? '#534AB7' : '#ddd', transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 2, transition: 'left 0.2s',
                  left: privacy[item.key] ? 18 : 2
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div style={{ marginTop: 14, marginBottom: 8, textAlign: 'center' }}>
        <button
          onClick={async () => { await supabase.auth.signOut() }}
          style={{
            fontSize: 13, padding: '8px 24px', borderRadius: 8,
            border: '0.5px solid #eee', background: 'transparent',
            color: '#999', cursor: 'pointer'
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}