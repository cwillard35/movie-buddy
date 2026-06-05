import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
console.log('Using key starting with:', process.env.SUPABASE_SERVICE_KEY?.slice(0, 20))
config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const movies = JSON.parse(fs.readFileSync('scripts/movies_enriched.json'))
const scoresRaw = JSON.parse(fs.readFileSync('scripts/scores_raw.json'))

const USERS = ['Casey','Dana','Brett','Brian','Dave','Jeff','Devin','Mark','RyRy','Eric','Hans','Susan','Jason','Julie','Brady','Lucy','Bryan','Owen']

async function main() {
  console.log('Inserting movies...')

  // Insert movies in batches of 100
  const batches = []
  for (let i = 0; i < movies.length; i += 100) {
    batches.push(movies.slice(i, i + 100))
  }

  const movieIdMap = {} // title+year -> uuid

  for (const batch of batches) {
    const { data, error } = await supabase
      .from('movies')
      .upsert(batch, { onConflict: 'tmdb_id' })
      .select('id, title, year')

    if (error) { console.error('Movie insert error:', error); continue }
    for (const m of data) {
      movieIdMap[`${m.title}|${m.year}`] = m.id
    }
    process.stdout.write('.')
  }

  console.log(`\nInserted ${Object.keys(movieIdMap).length} movies`)

  // We need user UUIDs - fetch them from the users table
  console.log('Fetching users...')
  const { data: userRows, error: userError } = await supabase
    .from('users')
    .select('id, username')

  if (userError) { console.error('User fetch error:', userError); return }

  const userIdMap = {}
  for (const u of userRows) {
    userIdMap[u.username] = u.id
  }

  console.log(`Found ${userRows.length} users:`, Object.keys(userIdMap))

  // Insert scores
  console.log('Inserting scores...')
  const scoreRows = []

  for (const row of scoresRaw) {
    const movieId = movieIdMap[`${row.title}|${row.year}`]
    if (!movieId) continue

    for (const [username, score] of Object.entries(row.scores)) {
      const userId = userIdMap[username]
      if (!userId) continue
      scoreRows.push({
        user_id: userId,
        movie_id: movieId,
        score,
        status: 'scored'
      })
    }
  }

  // Insert scores in batches
  for (let i = 0; i < scoreRows.length; i += 500) {
    const batch = scoreRows.slice(i, i + 500)
    const { error } = await supabase
      .from('scores')
      .upsert(batch, { onConflict: 'user_id,movie_id' })
    if (error) console.error('Score insert error:', error)
    else process.stdout.write('.')
  }

  console.log(`\nInserted ${scoreRows.length} scores`)
  console.log('\nDone!')
}

main().catch(console.error)