import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
).trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('http') &&
    supabaseKey.length > 20
)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase env missing:',
    {
      hasUrl: Boolean(supabaseUrl),
      hasKey: Boolean(supabaseKey),
      envKeys: Object.keys(import.meta.env).filter((k) => k.includes('SUPABASE')),
    }
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
)
