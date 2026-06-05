import fs from 'fs'

const scoresRaw = JSON.parse(fs.readFileSync('scripts/scores_raw.json'))
const movies = JSON.parse(fs.readFileSync('scripts/movies_enriched.json'))

const movieMap = new Set(movies.map(m => `${m.title}|${m.year}`))

const caseyMissing = scoresRaw.filter(row => 
  row.scores.Casey !== undefined && 
  !movieMap.has(`${row.title}|${row.year}`)
)

console.log(`Casey scores missing movie match: ${caseyMissing.length}`)
caseyMissing.forEach(r => console.log(`  ${r.title} (${r.year})`))