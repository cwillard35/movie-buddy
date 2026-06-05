import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import Buddies from './pages/Buddies'
import Top25 from './pages/Top25'
import Defend from './pages/Defend'
import Profile from './pages/Profile'
import LogScore from './pages/LogScore'
import MyFilms from './pages/MyFilms'
import MovieDetail from './pages/MovieDetail'

function App() {
  return (
    <div>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log" element={<LogScore />} />
        <Route path="/films" element={<MyFilms />} />
        <Route path="/buddies" element={<Buddies />} />
        <Route path="/top25" element={<Top25 />} />
        <Route path="/defend" element={<Defend />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
      </Routes>
    </div>
  )
}

export default App