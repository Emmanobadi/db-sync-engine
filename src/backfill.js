import { supabase } from './db/supabase.js'

async function backfillData() {
  console.log('Starting back-fill...')
  
  // Get all records from students table
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
  
  if (error) {
    console.error('Error fetching students:', error)
    return
  }
  
  console.log(`Found ${students.length} students to sync`)
  
  // Sync each student to students_sync
  for (const student of students) {
    const jsonbData = {
      fname: student.fname,
      lname: student.lname,
      email: student.email
    }
    
    const { error: syncError } = await supabase
      .from('students_sync')
      .upsert({ id: student.id, data: jsonbData })
    
    if (syncError) {
      console.error(`Failed to sync student ${student.id}:`, syncError)
    } else {
      console.log(`Synced student ${student.id}`)
    }
  }
  
  console.log('Back-fill complete!')
}

backfillData()