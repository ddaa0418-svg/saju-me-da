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
  supabaseKey || 'placeholder',
  {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
    },
  }
)

function getAuthRedirectTo() {
  // Prefer exact origin (no trailing slash) so it matches Supabase Redirect URL allow-list.
  // pathname "/" becomes "https://example.com/" which can fail exact-match allow lists.
  return window.location.origin
}

/** Current authenticated session (Google login). */
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

  if (!session?.user) return null
  return session
}

/** Require an authenticated session for save/update/delete. */
export async function requireAuthSession() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw error

  if (!session?.user || session.user.is_anonymous) {
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

  const redirectTo = getAuthRedirectTo()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: false,
      queryParams: {
        access_type: 'online',
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    throw new Error(error.message || 'Google 로그인에 실패했습니다.')
  }

  // Some mobile browsers need an explicit navigation.
  if (data?.url) {
    window.location.assign(data.url)
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

export function getUserAvatarUrl(user) {
  if (!user) return ''
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
}

/** The first saved row is treated as the logged-in user's own profile. */
export function pickProfile(people) {
  if (!people?.length) return null
  return [...people].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )[0]
}

const SAJU_USER_COLUMNS =
  'id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at'
const SAJU_READING_COLUMNS =
  'id, summary, detail, today_fortune, created_at, saju_user_id'

function normalizeSajuUser(row) {
  const readings = Array.isArray(row.saju_readings)
    ? [...row.saju_readings].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    : []

  return {
    id: row.id,
    name: row.name,
    birth_date: row.birth_date,
    birth_time: row.birth_time,
    gender: row.gender,
    calendar_type: row.calendar_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
    latestReading: readings[0] || null,
  }
}

export function splitBirthDate(birthDate) {
  const [year = '', month = '', day = ''] = String(birthDate || '').split('-')
  return {
    year,
    month: month ? month.padStart(2, '0') : '',
    day: day ? day.padStart(2, '0') : '',
  }
}

export function splitBirthTime(birthTime) {
  const [hour = '', minute = ''] = String(birthTime || '').slice(0, 5).split(':')
  return {
    hour: hour ? hour.padStart(2, '0') : '',
    minute: minute ? minute.padStart(2, '0') : '',
  }
}

/** Load person profiles and their latest saju result for a Google account. */
export async function fetchSajuUsers(authUserId) {
  const { data, error } = await supabase
    .from('users')
    .select(`${SAJU_USER_COLUMNS}, saju_readings (${SAJU_READING_COLUMNS})`)
    .eq('auth_user_id', authUserId)
    .order('updated_at', { ascending: false })
    .order('created_at', { referencedTable: 'saju_readings', ascending: false })

  if (error) throw error
  return (data || []).map(normalizeSajuUser)
}

export async function saveSajuUser({ authUserId, sajuUserId, profile }) {
  const payload = {
    name: profile.name,
    birth_date: profile.birthDate,
    birth_time: profile.birthTime,
    gender: profile.gender,
    calendar_type: profile.calendarType,
    updated_at: new Date().toISOString(),
  }

  const query = sajuUserId
    ? supabase
        .from('users')
        .update(payload)
        .eq('id', sajuUserId)
        .eq('auth_user_id', authUserId)
    : supabase.from('users').insert({ ...payload, auth_user_id: authUserId })

  const { data, error } = await query.select(SAJU_USER_COLUMNS).single()
  if (error) throw error
  return data
}

export async function saveSajuReading({
  authUserId,
  sajuUserId,
  readingId,
  result,
}) {
  const payload = {
    summary: result.summary || '',
    detail: result.detail || '',
    today_fortune: result.todayFortune || '',
    saju_user_id: sajuUserId,
    user_id: authUserId,
  }

  const query = readingId
    ? supabase
        .from('saju_readings')
        .update(payload)
        .eq('id', readingId)
        .eq('user_id', authUserId)
    : supabase.from('saju_readings').insert(payload)

  const { data, error } = await query.select(SAJU_READING_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteSajuUser({ authUserId, sajuUserId }) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', sajuUserId)
    .eq('auth_user_id', authUserId)

  if (error) throw error
}
