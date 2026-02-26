import { supabase } from './db/supabase'
import type { SyncPayload } from './types'

const WORKER_URL = 'http://localhost:8787/sync'

const channel = supabase
  .channel('students-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'students' },
    async (payload: any) => {
      console.log('Change detected:', payload)
      
      const workerPayload: SyncPayload = {
        type: payload.eventType,
        record: payload.new,
        old_record: payload.old
      }
      
      console.log('Sending to Worker:', workerPayload)
      
      try {
        const response = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workerPayload)
        })
        console.log('Worker response:', response.status)
      } catch (error) {
        console.error('Fetch error:', error)
      }
    }
  )
  .subscribe()

console.log('Listening for changes on students table...')