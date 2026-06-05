import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const movies = JSON.parse(fs.readFileSync('scripts/movies_enriched.json'))
const scoresRaw = JSON.parse(fs.readFileSync('scripts/scores_raw.json'))

async function main() {
  console.log('Inserting movies one by one...')
  const movieIdMap = {}
  let movieInserted = 0
  let movieSkipped = 0

  for (const movie of movies) {
    let error
    if (movie.tmdb_id) {
      const res = await supabase
        .from('movies')
        .upsert(movie, { onConflict: 'tmdb_id' })
        .select('id, title, year')
      error = res.error
      if (!error && res.data?.[0]) {
        movieIdMap[`${res.data[0].title}|${res.data[0].year}`] = res.data[0].id
      }
    } else {
      const res = await supabase
        .from('movies')
        .insert(movie)
        .select('id, title, year')
      error = res.error
      if (!error && res.data?.[0]) {
        movieIdMap[`${res.data[0].title}|${res.data[0].year}`] = res.data[0].id
      }
    }
    if (error) movieSkipped++
    else movieInserted++
    if ((movieInserted + movieSkipped) % 50 === 0) process.stdout.write('.')
  }

  console.log(`\nMapped ${Object.keys(movieIdMap).length} movies`)

  // Fetch users
  const { data: userRows, error: userError } = await supabase
    .from('users')
    .select('id, username')

  if (userError) { console.error('User fetch error:', userError.message); return }

  const userIdMap = {}
  for (const u of userRows) {
    userIdMap[u.username] = u.id
  }

  console.log(`Found ${userRows.length} users`)

  // Build score rows
  const scoreRows = []
  for (const row of scoresRaw) {
    const movieId = movieIdMap[`${row.title}|${row.year}`]
    if (!movieId) continue
    for (const [username, score] of Object.entries(row.scores)) {
        const userId = userIdMap[username]
        if (!userId) continue
        if (score === 'skipped') {
            scoreRows.push({ user_id: userId, movie_id: movieId, score: null, status: 'skipped' })
        } else {
            scoreRows.push({ user_id: userId, movie_id: movieId, score, status: 'scored' })
        }
}
  }

  console.log(`Inserting ${scoreRows.length} scores one by one...`)
  let inserted = 0
  let skipped = 0

  for (const row of scoreRows) {
    const { error } = await supabase
      .from('scores')
      .upsert(row, { onConflict: 'user_id,movie_id' })
    if (error) skipped++
    else inserted++
    if ((inserted + skipped) % 200 === 0) process.stdout.write('.')
  }

  console.log(`\nInserted: ${inserted}, Skipped: ${skipped}`)
  console.log('Done!')
}

main().catch(console.error)