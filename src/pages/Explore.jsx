import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Buddies from './pages/Buddies'
import Top25 from './pages/Top25'
import Defend from './pages/Defend'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import MyFilms from './pages/MyFilms'
import MovieDetail from './pages/MovieDetail'

function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div style={{ padding: 20 }}>Loading...</div>
  if (!session) return <Login />

  return (
    <div>
      <Nav session={session} />
      <div className="page-wrap">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/log" element={<Navigate to="/explore" replace />} />
          <Route path="/films" element={<MyFilms />} />
          <Route path="/buddies" element={<Buddies />} />
          <Route path="/top25" element={<Top25 />} />
          <Route path="/defend" element={<Defend />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App