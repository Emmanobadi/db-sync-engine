import { supabase } from './db/supabase.js'

async function loadTest() {
  console.log('Starting load test - creating 200 students...')
  const startTime = Date.now()
  
  const students = []
  for (let i = 1; i <= 200; i++) {
    students.push({
      fname: `Student${i}`,
      lname: `Test${i}`,
      email: `student${i}@test.com`
    })
  }
  
  // Insert all 200 students
  const { error } = await supabase
    .from('students')
    .insert(students)
  
  if (error) {
    console.error('Insert error:', error)
    return
  }
  
  console.log('200 students inserted!')
  console.log('Waiting 10 seconds for sync...')
  
  await new Promise(resolve => setTimeout(resolve, 10000))
  
  // Check how many synced
  const { data: synced, error: syncError } = await supabase
    .from('students_sync')
    .select('id')
  
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(200)
  
  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000
  
  console.log('\n=== LOAD TEST RESULTS ===')
  console.log(`Total records created: 200`)
  console.log(`Successfully synced: ${synced?.length || 0}`)
  console.log(`Failed syncs: ${200 - (synced?.length || 0)}`)
  console.log(`Total duration: ${duration} seconds`)
  console.log(`Average latency: ${duration / 200} seconds per record`)
  
  const successLogs = logs?.filter(l => l.status === 'success').length || 0
  const failedLogs = logs?.filter(l => l.status === 'failed').length || 0
  
  console.log(`\nSync Logs:`)
  console.log(`- Success: ${successLogs}`)
  console.log(`- Failed: ${failedLogs}`)
}

loadTest()