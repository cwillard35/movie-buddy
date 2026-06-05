import fs from 'fs'
import { config } from 'dotenv'
config({ path: '.env.local' })

const TMDB_TOKEN = process.env.TMDB_TOKEN

const patches = [
  { oldTitle: "Mollie\uFFFDs Game", newTitle: "Molly's Game", year: 2017 },
  { oldTitle: "Thoroghbreds", newTitle: "Thoroughbreds", year: 2018 },
  { oldTitle: "Oh Brother, Where Art Thou?", newTitle: "O Brother, Where Art Thou?", year: 2000 },
  { oldTitle: "Suspiria (2018)", newTitle: "Suspiria", year: 2018 },
  { oldTitle: "The Whale Rider", newTitle: "Whale Rider", year: 2002 },
  { oldTitle: "The King (2019, Netflix)", newTitle: "The King", year: 2019 },
  { oldTitle: "Zach Snyder's Justice League", newTitle: "Zack Snyder's Justice League", year: 2021 },
  { oldTitle: "The Rescue (Nat Geo)", newTitle: "The Rescue", year: 2021 },
  { oldTitle: "Bev Hills Cop: Axel F", newTitle: "Beverly Hills Cop: Axel F", year: 2024 },
  { oldTitle: "The Materialists", newTitle: "The Materialists", year: 2025 },
]

async function searchTMDB(title, year) {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&year=${year}&language=en-US&page=1`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
  })
  const data = await res.json()
  return data.results?.[0] || null
}

async function getTMDBDetails(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits&language=en-US`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
  })
  return await res.json()
}

async function main() {
  const movies = JSON.parse(fs.readFileSync('scripts/movies_enriched.json'))

  for (const patch of patches) {
    const movie = movies.find(m => m.title === patch.oldTitle)
    if (!movie) { console.log(`Could not find in JSON: ${patch.oldTitle}`); continue }

    const tmdb = await searchTMDB(patch.newTitle, patch.year)
    if (!tmdb) { console.log(`TMDB still not found: ${patch.newTitle}`); continue }

    const details = await getTMDBDetails(tmdb.id)
    const director = details.credits?.crew?.find(c => c.job === 'Director')?.name || null
    const genres = details.genres?.map(g => g.name) || []
    const poster_url = tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : null

    movie.title = patch.newTitle
    movie.tmdb_id = tmdb.id
    movie.poster_url = poster_url
    movie.genres = genres
    movie.director = director
    movie.runtime = details.runtime || null

    console.log(`✅ Patched: ${patch.oldTitle} → ${patch.newTitle}`)
    await new Promise(r => setTimeout(r, 200))
  }

  fs.writeFileSync('scripts/movies_enriched.json', JSON.stringify(movies, null, 2))
  console.log('\nDone! movies_enriched.json updated.')
}

main().catch(console.error)