import { supabase } from './db/supabase'
import type { Student } from './types'

async function backfillData(): Promise<void> {
  console.log('Starting back-fill...')
  
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
  
  if (error) {
    console.error('Error fetching students:', error)
    return
  }
  
  console.log(`Found ${students.length} students to sync`)
  
  for (const student of students as Student[]) {
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