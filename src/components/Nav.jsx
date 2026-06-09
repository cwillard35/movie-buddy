import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
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

export default function Nav({ session }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const initials = session?.user?.email?.slice(0, 2).toUpperCase() || 'MB'

  function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
  }

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
        .nav-search-form {
          display: flex;
          align-items: center;
          background: #f5f5f5;
          border-radius: 20px;
          padding: 5px 12px;
          gap: 6px;
          flex: 0 1 220px;
        }
        .nav-search-input {
          border: none;
          background: none;
          outline: none;
          font-size: 12px;
          color: #333;
          width: 100%;
          font-family: inherit;
        }
        .nav-search-input::placeholder { color: #aaa; }
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
          .nav-mobile-search form {
            display: flex;
            align-items: center;
            background: #f5f5f5;
            border-radius: 20px;
            padding: 7px 14px;
            gap: 8px;
            width: 100%;
          }
          .nav-mobile-search input {
            border: none; background: none; outline: none;
            font-size: 13px; color: #333; width: 100%; font-family: inherit;
          }
          .nav-mobile-search input::placeholder { color: #aaa; }
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
        <div style={{ fontWeight: 500, fontSize: 16, flexShrink: 0 }}>🎬 Movie Buddy</div>

        {/* Search bar */}
        <form className="nav-search-form" onSubmit={handleSearch}>
          <Search size={13} color="#aaa" />
          <input
            className="nav-search-input"
            type="text"
            placeholder="Search films…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', gap: 4 }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              fontSize: 13, padding: '6px 12px', borderRadius: 6, textDecoration: 'none',
              background: pathname === l.to ? '#EEEDFE' : 'transparent',
              color: pathname === l.to ? '#534AB7' : '#666',
              fontWeight: pathname === l.to ? 500 : 400
            }}>{l.label}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#534AB7' }}>{initials}</div>
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #eee', background: 'transparent', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile search bar (above tab bar) */}
      <div className="nav-mobile-search">
        <form onSubmit={handleSearch}>
          <Search size={14} color="#aaa" />
          <input
            type="text"
            placeholder="Search films…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="nav-mobile">
        {links.map(l => {
          const Icon = l.icon
          const active = pathname === l.to
          return (
            <Link key={l.to} to={l.to} className={`nav-mobile-item${active ? ' active' : ''}`}>
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