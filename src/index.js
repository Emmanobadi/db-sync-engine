import { Hono } from 'hono'
import { supabase } from './db/supabase.js'

const app = new Hono()

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'DB Sync Worker Running' })
})

// Webhook endpoint for Supabase Realtime
app.post('/sync', async (c) => {
  try {
    const payload = await c.req.json()
    
    // Log the incoming change
    console.log('Received change:', payload)
    
    // Handle the sync based on operation type
    const { type, record, old_record } = payload
    
    if (type === 'INSERT') {
      await handleInsert(record, c.env)
    } else if (type === 'UPDATE') {
      await handleUpdate(record, c.env)
    } else if (type === 'DELETE') {
      await handleDelete(old_record, c.env)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Sync error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Handle INSERT operations
async function handleInsert(record, env) {
  try {
    // Transform normalized data to JSONB
    const jsonbData = {
      fname: record.fname,
      lname: record.lname,
      email: record.email
    }
    
    // Insert into students_sync table
    const { error } = await supabase
      .from('students_sync')
      .insert({ id: record.id, data: jsonbData })
    
    if (error) throw error
    
    // Log success
    await logSync(record.id, 'INSERT', 'success', null)
  } catch (error) {
    // Log failure and push to queue for retry
    await logSync(record.id, 'INSERT', 'failed', error.message)
    await env.SYNC_QUEUE.send({ operation: 'INSERT', record })
  }
}

// Handle UPDATE operations
async function handleUpdate(record, env) {
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
  } catch (error) {
    await logSync(record.id, 'UPDATE', 'failed', error.message)
    await env.SYNC_QUEUE.send({ operation: 'UPDATE', record })
  }
}

// Handle DELETE operations
async function handleDelete(record, env) {
  try {
    const { error } = await supabase
      .from('students_sync')
      .delete()
      .eq('id', record.id)
    
    if (error) throw error
    
    await logSync(record.id, 'DELETE', 'success', null)
  } catch (error) {
    await logSync(record.id, 'DELETE', 'failed', error.message)
    await env.SYNC_QUEUE.send({ operation: 'DELETE', record })
  }
}

// Log sync operations
async function logSync(recordId, operation, status, error) {
  await supabase.from('sync_logs').insert({
    record_id: recordId,
    operation,
    status,
    error
  })
}

export default app

// Queue consumer for retrying failed syncs
export async function queue(batch, env) {
  for (const message of batch.messages) {
    const { operation, record } = message.body
    
    try {
      // Retry the failed operation
      if (operation === 'INSERT') {
        await handleInsert(record, env)
      } else if (operation === 'UPDATE') {
        await handleUpdate(record, env)
      } else if (operation === 'DELETE') {
        await handleDelete(record, env)
      }
      
      // Mark message as processed
      message.ack()
    } catch (error) {
      // Retry will happen automatically with exponential backoff
      console.error('Retry failed:', error)
      message.retry()
    }
  }
}