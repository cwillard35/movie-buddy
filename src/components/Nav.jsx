import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, Compass, Film, Users, Trophy, Shield, User, Search
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/films', label: 'My Films', icon: Film },
  { to: '/buddies', label: 'Buddies', icon: Users },
  { to: '/top25', label: 'Top 25', icon: Trophy },
  { to: '/defend', label: 'Defend', icon: Shield },
  { to: '/profile', label: 'Profile', icon: User },
]

function SearchBar({ onNavigate }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [allMovies, setAllMovies] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    async function load() {
      const pageSize = 1000
      let from = 0
      let all = []
      while (true) {
        const { data } = await supabase
          .from('movies')
          .select('id, title, year, poster_url')
          .order('title', { ascending: true })
          .range(from, from + pageSize - 1)
        if (!data || data.length === 0) break
        all = [...all, ...data]
        if (data.length < pageSize) break
        from += pageSize
      }
      setAllMovies(all)
    }
    load()
  }, [])

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); setOpen(false); return }
    const q = query.toLowerCase()
    const matches = allMovies.filter(m => m.title.toLowerCase().includes(q)).slice(0, 8)
    setResults(matches)
    setOpen(matches.length > 0)
  }, [query, allMovies])

  // Close on outside click
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setOpen(false)
    setQuery('')
    navigate(`/explore?q=${encodeURIComponent(query.trim())}`)
    if (onNavigate) onNavigate()
  }

  function handleSelect(movie) {
    setQuery('')
    setOpen(false)
    navigate(`/movie/${movie.id}`)
    if (onNavigate) onNavigate()
  }

  return (
    <div ref={ref} style={{ position: 'relative', flex: '0 1 220px' }}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: 20, padding: '5px 12px', gap: 6 }}
      >
        <Search size={13} color="#aaa" />
        <input
          type="text"
          placeholder="Search films…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12, color: '#333', width: '100%', fontFamily: 'inherit' }}
        />
      </form>

      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: '#fff', borderRadius: 10, border: '0.5px solid #eee',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 200, overflow: 'hidden'
          }}
        >
          {results.map(m => (
            <div
              key={m.id}
              onMouseDown={() => handleSelect(m)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid #f5f5f5' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {m.poster_url
                ? <img src={m.poster_url} alt={m.title} style={{ width: 24, height: 36, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 24, height: 36, borderRadius: 3, background: '#EEEDFE', flexShrink: 0 }} />
              }
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{m.year}</div>
              </div>
            </div>
          ))}
          <div
            onMouseDown={handleSubmit}
            style={{ padding: '8px 12px', fontSize: 11, color: '#534AB7', cursor: 'pointer', textAlign: 'center', borderTop: '0.5px solid #f0f0f0' }}
          >
            See all results for "{query}" →
          </div>
        </div>
      )}
    </div>
  )
}

export default function Nav({ session }) {
  const { pathname } = useLocation()
  const initials = session?.user?.email?.slice(0, 2).toUpperCase() || 'MB'

  return (
    <>
      <style>{`
        .nav-desktop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          border-bottom: 0.5px solid #eee;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 100;
          gap: 12px;
        }
        .nav-mobile {
          display: none;
        }
        .nav-mobile-search {
          display: none;
        }
        .page-wrap {
          padding-bottom: 0;
        }
        @media (max-width: 768px) {
          .nav-desktop { display: none; }
          .nav-mobile-search {
            display: flex;
            position: fixed;
            bottom: 60px;
            left: 0;
            right: 0;
            background: #fff;
            border-top: 0.5px solid #eee;
            padding: 8px 14px;
            z-index: 99;
          }
          .nav-mobile {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #fff;
            border-top: 0.5px solid #eee;
            z-index: 100;
            padding: 8px 0 env(safe-area-inset-bottom);
          }
          .page-wrap { padding-bottom: 120px; }
        }
        .nav-mobile-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 4px 0;
          text-decoration: none;
          color: #aaa;
          font-size: 10px;
        }
        .nav-mobile-item.active { color: #534AB7; }
      `}</style>

      {/* Desktop nav */}
      <nav className="nav-desktop">
        <Link to="/" style={{ fontWeight: 500, fontSize: 16, flexShrink: 0, textDecoration: 'none', color: 'inherit' }}>🎬 Movie Buddy</Link>

        <SearchBar />

        <div style={{ display: 'flex', gap: 4 }}>
          {links.map(l => (
            <Link key={l.to} to={l.to === '/explore' ? `/explore?t=${Date.now()}` : l.to} style={{
              fontSize: 13, padding: '6px 12px', borderRadius: 6, textDecoration: 'none',
              background: pathname === l.to ? '#EEEDFE' : 'transparent',
              color: pathname === l.to ? '#534AB7' : '#666',
              fontWeight: pathname === l.to ? 500 : 400
            }}>{l.label}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#534AB7' }}>{initials}</div>
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #eee', background: 'transparent', color: '#666', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile search bar (above tab bar) */}
      <div className="nav-mobile-search">
        <SearchBar />
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="nav-mobile">
        {links.map(l => {
          const Icon = l.icon
          const active = pathname === l.to
          return (
            <Link key={l.to} to={l.to === '/explore' ? `/explore?t=${Date.now()}` : l.to} className={`nav-mobile-item${active ? ' active' : ''}`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span>{l.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="page-wrap" />
    </>
  )
}