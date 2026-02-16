import { supabase } from './db/supabase.js'

const WORKER_URL = 'http://localhost:8787/sync'

const channel = supabase
  .channel('students-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'students' },
    async (payload) => {
      console.log('Change detected:', payload)
      
      // Transform payload to match Worker format
      const workerPayload = {
        type: payload.eventType,
        record: payload.new,
        old_record: payload.old
      }
      
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerPayload)
      })
    }
  )
  .subscribe()

console.log('Listening for changes on students table...')