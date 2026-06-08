const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN
const TMDB_BASE = 'https://api.themoviedb.org/3'

const headers = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  'Content-Type': 'application/json',
}

export async function searchTMDB(query) {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
    { headers }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.results || []
}

export async function fetchTMDBDetails(tmdbId) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${tmdbId}?append_to_response=credits&language=en-US`,
    { headers }
    if (!res.ok) return null
  )
  return res.json()
}

function mapTMDBToMovie(d) {
  const director = d.credits?.crew?.find(c => c.job === 'Director')?.name || null
  const genres = d.genres?.map(g => g.name) || []
  const poster_url = d.poster_path
    ? `https://image.tmdb.org/t/p/w500${d.poster_path}`
    : null
  const year = d.release_date ? parseInt(d.release_date.split('-')[0]) : null
  return { tmdb_id: d.id, title: d.title, year, director, runtime: d.runtime || null, genres, poster_url, imdb_score: null }
}

export async function importTMDBFilm(tmdbId, supabase) {
  const { data: existing } = await supabase.from('movies').select('*').eq('tmdb_id', tmdbId).single()
  if (existing) return existing
  const details = await fetchTMDBDetails(tmdbId)
  if (!details) return null
  const movie = mapTMDBToMovie(details)
  const { data: inserted, error } = await supabase.from('movies').insert(movie).select().single()
  if (error) { console.error('Failed to import film:', error); return null }
  return inserted
}
