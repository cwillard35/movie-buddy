import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

// Read env variables
import { config } from 'dotenv'
config({ path: '.env.local' })

const TMDB_TOKEN = process.env.TMDB_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Read the CSV
const csvPath = path.join(process.cwd(), 'scripts', 'ratings.csv')
const csv = fs.readFileSync(csvPath, 'utf-8')
const rows = parse(csv, { columns: true, skip_empty_lines: true })

const users = ['Casey','Dana','Brett','Brian','Dave','Jeff','Devin','Mark','RyRy','Eric','Hans','Susan','Jason','Julie','Brady','Lucy','Bryan','Owen']

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
  const movies = []
  const scores = []
  let found = 0
  let notFound = 0

  console.log(`Processing ${rows.length} movies...`)

  for (const row of rows) {
    const title = row.Title?.trim()
    const year = parseInt(row.Year)
    if (!title) continue

    // Search TMDB
    let tmdb = await searchTMDB(title, year)

    // If not found with year, try without
    if (!tmdb) {
      const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&language=en-US&page=1`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } })
      const data = await res.json()
      tmdb = data.results?.[0] || null
    }

    if (!tmdb) {
      console.log(`NOT FOUND: ${title} (${year})`)
      notFound++
      // Still add the movie without TMDB data
      movies.push({ title, year, tmdb_id: null, poster_url: null, genres: [] })
    } else {
      found++
      // Get full details for genres and director
      const details = await getTMDBDetails(tmdb.id)
      const director = details.credits?.crew?.find(c => c.job === 'Director')?.name || null
      const genres = details.genres?.map(g => g.name) || []
      const poster_url = tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : null

      movies.push({
        title,
        year,
        tmdb_id: tmdb.id,
        poster_url,
        genres,
        director,
        runtime: details.runtime || null,
      })
    }

    // Add scores for each user
    const movieScores = {}
    for (const user of users) {
      const val = row[user]
      if (val && val !== '.') {
        if (val.toLowerCase() === 'no') {
            movieScores[user] = 'skipped'
        } else {
            const parsed = parseFloat(val)
            if (!isNaN(parsed)) movieScores[user] = parsed
        }
      }
    }
    scores.push({ title, year, scores: movieScores })

    // Be nice to TMDB API - small delay
    await new Promise(r => setTimeout(r, 100))
  }

  // Write output files
  fs.writeFileSync('scripts/movies_enriched.json', JSON.stringify(movies, null, 2))
  fs.writeFileSync('scripts/scores_raw.json', JSON.stringify(scores, null, 2))

  console.log(`\nDone! Found: ${found}, Not found: ${notFound}`)
  console.log('Output written to scripts/movies_enriched.json and scripts/scores_raw.json')
}

main().catch(console.error)