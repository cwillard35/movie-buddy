import fs from 'fs'
import { parse } from 'csv-parse/sync'

const csv = fs.readFileSync('scripts/ratings.csv', 'utf-8')
const rows = parse(csv, { columns: true, skip_empty_lines: true })
const enriched = JSON.parse(fs.readFileSync('scripts/movies_enriched.json'))

const enrichedTitles = new Set(enriched.map(m => m.title))
const caseyRows = rows.filter(r => r.Casey && r.Casey !== '.')

const missing = caseyRows.filter(r => !enrichedTitles.has(r.Title))

console.log(`Casey scores in CSV: ${caseyRows.length}`)
console.log(`Missing from enriched: ${missing.length}`)
console.log('\nMissing titles:')
missing.forEach(r => console.log(`  ${r.Title} (${r.Year})`))