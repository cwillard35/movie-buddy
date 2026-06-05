import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [status, setStatus] = useState('testing')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('movies').select('count')
      if (error) {
        setStatus('failed')
        setErrorMsg(error.message + ' — code: ' + error.code)
      } else {
        setStatus('connected')
      }
    }
    testConnection()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>
      {status === 'testing' && <p>Testing connection...</p>}
      {status === 'connected' && <p style={{ color: 'green' }}>✅ Supabase connected — movies table ready</p>}
      {status === 'failed' && <p style={{ color: 'red' }}>❌ {errorMsg}</p>}
    </div>
  )
}