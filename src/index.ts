import { Hono } from 'hono'
import { supabase } from './db/supabase'
import type { Student, SyncPayload, QueueMessage, Operation, SyncStatus } from './types'

// Worker Bindings
type Bindings = {
  SYNC_QUEUE: Queue<QueueMessage>
}

// Initialize Hono with bindings
const app = new Hono<{ Bindings: Bindings }>()

// Health check endpoint
app.get('/', (c) => c.json({ status: 'DB Sync Worker Running' }))

// Webhook endpoint for Supabase Realtime
app.post('/sync', async (c) => {
  try {
    const payload = await c.req.json<SyncPayload>()
    console.log('Received change:', payload)

    const { type, record, old_record } = payload

    if (type === 'INSERT' && record) {
  await handleInsert(record, c.env)
} else if (type === 'UPDATE' && record) {
  await handleUpdate(record, c.env)
} else if (type === 'DELETE') {
      
      if (!old_record) throw new Error('No old_record found for DELETE')
      await handleDelete(old_record, c.env)
    }

    return c.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Sync error:', error)
      return c.json({ success: false, error: error.message }, 500)
    }
    return c.json({ success: false, error: 'Unknown error' }, 500)
  }
})

// Handle INSERT operations
async function handleInsert(record: Student, env: Bindings) {
  try {
    const jsonbData = {
      fname: record.fname,
      lname: record.lname,
      email: record.email
    }

    const { error } = await supabase
      .from('students_sync')
      .insert({ id: record.id, data: jsonbData })

    if (error) throw error

    await logSync(record.id, 'INSERT', 'success', null)
  } catch (error: unknown) {
    if (error instanceof Error) {
      await logSync(record.id, 'INSERT', 'failed', error.message)
      await env.SYNC_QUEUE.send({ operation: 'INSERT', record })
    }
  }
}

// Handle UPDATE operations
async function handleUpdate(record: Student, env: Bindings) {
  try {
    const jsonbData = {
      fname: record.fname,
      lname: record.lname,
      email: record.email
    }

    const { error } = await supabase
      .from('students_sync')
      .update({ data: jsonbData })
      .eq('id', record.id)

    if (error) throw error

    await logSync(record.id, 'UPDATE', 'success', null)
  } catch (error: unknown) {
    if (error instanceof Error) {
      await logSync(record.id, 'UPDATE', 'failed', error.message)
      await env.SYNC_QUEUE.send({ operation: 'UPDATE', record })
    }
  }
}

// Handle DELETE operations
async function handleDelete(record: Student, env: Bindings) {
  try {
    const { error } = await supabase
      .from('students_sync')
      .delete()
      .eq('id', record.id)

    if (error) throw error

    await logSync(record.id, 'DELETE', 'success', null)
  } catch (error: unknown) {
    if (error instanceof Error) {
      await logSync(record.id, 'DELETE', 'failed', error.message)
      await env.SYNC_QUEUE.send({ operation: 'DELETE', record })
    }
  }
}

// Log sync operations
async function logSync(
  recordId: number,
  operation: Operation,
  status: SyncStatus,
  error: string | null
) {
  await supabase.from('sync_logs').insert({
    record_id: recordId,
    operation,
    status,
    error
  })
}

// Queue consumer for retrying failed syncs
export async function queue(
  batch: MessageBatch<QueueMessage>,
  env: Bindings
) {
  for (const message of batch.messages) {
    const { operation, record } = message.body

    try {
      if (operation === 'INSERT') {
        await handleInsert(record, env)
      } else if (operation === 'UPDATE') {
        await handleUpdate(record, env)
      } else if (operation === 'DELETE') {
        await handleDelete(record, env)
      }

      message.ack()
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Retry failed:', error)
      }
      message.retry()
    }
  }
}

export default {
  fetch: app.fetch,
  queue,
  
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    console.log('Running hourly sync check...')
    
    try {
      // Get all students from DB1
      const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('*')
      
      if (fetchError) {
        console.error('Error fetching students:', fetchError)
        return
      }
      
      // Get all from DB2
      const { data: synced } = await supabase
        .from('students_sync')
        .select('id')
      
      const syncedIds = new Set(synced?.map(s => s.id) || [])
      
      // Find missing records
      let syncedCount = 0
      for (const student of students as Student[]) {
        if (!syncedIds.has(student.id)) {
          const jsonbData = {
            fname: student.fname,
            lname: student.lname,
            email: student.email
          }
          await supabase
            .from('students_sync')
            .upsert({ id: student.id, data: jsonbData })
          syncedCount++
        }
      }
      
      console.log(`Hourly sync: ${syncedCount} records synced`)
    } catch (error) {
      console.error('Scheduled sync error:', error)
    }
  }
}