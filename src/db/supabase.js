import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfqopbccqskerrfoabvb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcW9wYmNjcXNrZXJyZm9hYnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMTgwNjEsImV4cCI6MjA4NjY5NDA2MX0.Soqvgy2SyMrCDlMsrRtVVoSOKPNLsba8d6-TanVvt-U'

export const supabase = createClient(supabaseUrl, supabaseKey)