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
  console.warn('Supabase env missing:', {
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseKey),
    envKeys: Object.keys(import.meta.env).filter((k) => k.includes('SUPABASE')),
  })
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
)

function isGoogleUser(user) {
  if (!user || user.is_anonymous) return false
  const providers = user.app_metadata?.providers
  if (Array.isArray(providers) && providers.includes('google')) return true
  return user.app_metadata?.provider === 'google'
}

/** Current session if the user signed in with Google. */
export async function getGoogleSession() {
  if (!isSupabaseConfigured) return null

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw error

  if (session?.user?.is_anonymous) {
    await supabase.auth.signOut()
    return null
  }

  if (!session?.user || !isGoogleUser(session.user)) return null
  return session
}

/** Require a Google-authenticated session for save/update/delete. */
export async function requireAuthSession() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  const session = await getGoogleSession()
  if (!session) {
    throw new Error('Google 로그인이 필요합니다.')
  }

  return session
}

/** @deprecated Use requireAuthSession — anonymous sign-in is no longer used. */
export async function ensureAuthSession() {
  return requireAuthSession()
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) {
    throw new Error(error.message || 'Google 로그인에 실패했습니다.')
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message || '로그아웃에 실패했습니다.')
  }
}

export function getUserDisplayName(user) {
  if (!user) return ''
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'Google 사용자'
  )
}
