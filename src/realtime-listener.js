import { supabase } from './db/supabase.js'

const WORKER_URL = 'http://localhost:8787/sync' // Change to deployed URL later

// Subscribe to changes on students table
const channel = supabase
  .channel('students-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'students' },
    async (payload) => {
      console.log('Change detected:', payload)
      
      // Forward to Worker
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }
  )
  .subscribe()

console.log('Listening for changes on students table...')