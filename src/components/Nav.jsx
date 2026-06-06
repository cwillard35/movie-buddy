import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, Search, Film, Users, Trophy, Shield, User, LogOut
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/log', label: 'Search', icon: Search },
  { to: '/films', label: 'My Films', icon: Film },
  { to: '/buddies', label: 'Buddies', icon: Users },
  { to: '/top25', label: 'Top 25', icon: Trophy },
  { to: '/defend', label: 'Defend', icon: Shield },
  { to: '/profile', label: 'Profile', icon: User },
]

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
          padding: 12px 20px;
          border-bottom: 0.5px solid #eee;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-mobile {
          display: none;
        }
        .page-wrap {
          padding-bottom: 0;
        }
        @media (max-width: 768px) {
          .nav-desktop {
            display: none;
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
          .page-wrap {
            padding-bottom: 70px;
          }
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
        .nav-mobile-item.active {
          color: #534AB7;
        }
      `}</style>

      {/* Desktop nav */}
      <nav className="nav-desktop">
        <div style={{ fontWeight: 500, fontSize: 16 }}>🎬 Movie Buddy</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              fontSize: 13, padding: '6px 12px', borderRadius: 6, textDecoration: 'none',
              background: pathname === l.to ? '#EEEDFE' : 'transparent',
              color: pathname === l.to ? '#534AB7' : '#666',
              fontWeight: pathname === l.to ? 500 : 400
            }}>
              {l.label}
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#534AB7' }}>{initials}</div>
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #eee', background: 'transparent', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="nav-mobile">
        {links.map(l => {
          const Icon = l.icon
          const active = pathname === l.to
          return (
            <Link key={l.to} to={l.to} className={`nav-mobile-item ${active ? 'active' : ''}`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span>{l.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Spacer so content doesn't hide behind mobile nav */}
      <div className="page-wrap" />
    </>
  )
}