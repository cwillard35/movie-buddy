# Movie Buddy — Developer Notes

## Common Commands

### Start dev server
npm run dev

### Push to GitHub (auto-deploys to Vercel)
git add .
git commit -m "your message here"
git push

### Run import scripts
node scripts/import.mjs        # fetch TMDB data for all movies in ratings.csv
node scripts/patch.mjs         # fix unmatched titles
node scripts/seed.mjs          # import movies and scores into Supabase
node scripts/check.mjs         # check for missing Casey scores
node scripts/check2.mjs        # check for missing movie matches

### Link a new user to their historical scores
node scripts/link-user.mjs Username their-supabase-uuid

## Links
- Live site: https://movie-buddy-six.vercel.app
- Vercel dashboard: https://vercel.com
- Supabase dashboard: https://supabase.com/dashboard/project/vjsopncmntdrtuwwdgek
- GitHub repo: https://github.com/cwillard35/movie-buddy

## Onboarding a new user
1. They sign up at movie-buddy-six.vercel.app
2. They confirm their email
3. Go to Supabase → Authentication → Users → copy their UUID
4. Run: node scripts/link-user.mjs Username their-uuid
5. Their historical scores are now linked to their account

## Database
- Supabase project: vjsopncmntdrtuwwdgek
- Tables: movies, users, scores, defenses, defense_replies
- RLS enabled on all tables

## Tech stack
- Frontend: React + Vite
- Hosting: Vercel
- Database: Supabase (Postgres)
- Movie data: TMDB API
- Auth: Supabase Auth