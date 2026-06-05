import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/log', label: 'Log a score' },
  { to: '/films', label: 'My films' },
  { to: '/buddies', label: 'Buddies' },
  { to: '/top25', label: 'Top 25' },
  { to: '/defend', label: 'Defend' },
  { to: '/profile', label: 'Profile' },
]

export default function Nav({ session }) {
  const { pathname } = useLocation()
  const initials = session?.user?.email?.slice(0, 2).toUpperCase() || 'MB'

  return (
    <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid #eee', background:'#fff' }}>
      <div style={{ fontWeight:500, fontSize:16 }}>🎬 Movie Buddy</div>
      <div style={{ display:'flex', gap:4 }}>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{ fontSize:13, padding:'6px 12px', borderRadius:6, textDecoration:'none', background: pathname===l.to ? '#EEEDFE' : 'transparent', color: pathname===l.to ? '#534AB7' : '#666', fontWeight: pathname===l.to ? 500 : 400 }}>
            {l.label}
          </Link>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'#EEEDFE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:500, color:'#534AB7' }}>{initials}</div>
        <button onClick={() => supabase.auth.signOut()} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid #eee', background:'transparent', color:'#666', cursor:'pointer' }}>Sign out</button>
      </div>
    </nav>
  )
}