import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dlncoszsqdvhujnzihsk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbmNvc3pzcWR2aHVqbnppaHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDUxODEsImV4cCI6MjA5MDQyMTE4MX0.IlUedCOqLKb3SDdU_h0C8w6zKsMXBaqs1SdvIhBf0nQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
