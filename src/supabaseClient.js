import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dlncoszsqdvhujnzihsk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbmNvc3pzcWR2aHVqbnppaHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDUxODEsImV4cCI6MjA5MDQyMTE4MX0.IlUedCOqLKb3SDdU_h0C8w6zKsMXBaqs1SdvIhBf0nQ'

// Patch to suppress harmless Supabase lock errors when running multiple tabs simultaneously
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Lock broken')) {
      event.preventDefault(); // Swallow the expected 'steal' option lock error silently
    }
  });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
