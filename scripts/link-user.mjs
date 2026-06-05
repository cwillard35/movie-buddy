import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const [,, username, newUuid] = process.argv

if (!username || !newUuid) {
  console.error('Usage: node scripts/link-user.mjs <username> <new-uuid>')
  process.exit(1)
}

async function main() {
  console.log(`Linking ${username} to UUID ${newUuid}...`)

  // Find existing user record
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (findError || !existingUser) {
    console.error(`No user found with username: ${username}`)
    return
  }

  const oldId = existingUser.id
  console.log(`Found existing UUID: ${oldId}`)

  if (oldId === newUuid) {
    console.log('IDs already match — nothing to do.')
    return
  }

  // Call the SQL function
  const { error } = await supabase.rpc('link_user', {
    old_id: oldId,
    new_id: newUuid
  })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log(`✅ Successfully linked ${username} to ${newUuid}`)
}

main().catch(console.error)