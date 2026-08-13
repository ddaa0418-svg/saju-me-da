import { useEffect, useRef, useState } from 'react'
import { askGemini, hasGeminiKey, parseSajuResponse } from '../api/gemini'
import {
  deleteSajuUser,
  fetchSajuReadingCount,
  fetchSajuUsers,
  getGoogleSession,
  getUserDisplayName,
  isSupabaseConfigured,
  pickProfile,
  requireAuthSession,
  saveSajuReading,
  saveSajuUser,
  signInWithGoogle,
  signOut,
  splitBirthDate,
  splitBirthTime,
  supabase,
} from '../lib/supabase'
import { buildSajuPrompt } from '../utils/buildSajuPrompt'
import {
  combineBirthDate,
  combineBirthTime,
  emptyBirthValues,
  getBirthSelectOptions,
} from '../utils/birthOptions'
import {
  clearGuestDraft,
  draftBirthDate,
  draftBirthTime,
  persistGuestDraft,
  readGuestDraft,
} from '../utils/guestDraft'
import { setAnalyticsUser, trackEvent } from '../lib/analytics'
import { useToast } from './useToast'

const ALREADY_OPEN_TOASTS = [
  '이미 새 사주 화면이다냥.',
  '여기다. 또 누를 필요 없다냥.',
  '사주? 내 전문이지. 이미 보고 있다냥.',
  '화면은 열려 있다. 입력이나 해라냥.',
]

function getProfileModalValues(profileModal, profile, user) {
  if (profileModal === 'edit' && profile) {
    const { year, month, day } = splitBirthDate(profile.birth_date)
    const { hour, minute } = splitBirthTime(profile.birth_time)
    return {
      name: profile.name || '',
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthHour: hour,
      birthMinute: minute,
      gender: profile.gender || '',
      calendarType: profile.calendar_type || '',
    }
  }

  return {
    ...emptyBirthValues(),
    name: getUserDisplayName(user),
  }
}

export function useSajuApp() {
  const birthOptions = getBirthSelectOptions()
  const { toast, showToast } = useToast()

  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [birthMinute, setBirthMinute] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('')

  const [result, setResult] = useState('')
  const [summary, setSummary] = useState('')
  const [todayFortune, setTodayFortune] = useState('')
  const [showBlessing, setShowBlessing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sajuUsers, setSajuUsers] = useState([])
  const [readingsError, setReadingsError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [viewMode, setViewMode] = useState('create')
  const [editingId, setEditingId] = useState(null)
  const [resultRevealKey, setResultRevealKey] = useState(0)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [profileModal, setProfileModal] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [readingCount, setReadingCount] = useState(null)
  const resultBlockRef = useRef(null)
  const selectTokenRef = useRef(0)
  const hydratedRef = useRef(false)
  const pendingGuestDraftRef = useRef(null)
  const alreadyOpenToastRef = useRef(0)

  const birthDate = combineBirthDate(birthYear, birthMonth, birthDay)
  const birthTime = combineBirthTime(birthHour, birthMinute)

  const loadSajuUsers = async (sessionUser) => {
    if (!isSupabaseConfigured) {
      setReadingsError(
        'Supabase 환경변수가 없습니다. .env에 URL/키를 넣고 npm run dev를 재시작하세요.'
      )
      setSajuUsers([])
      return []
    }

    if (!sessionUser?.id) {
      setReadingsError('')
      setSajuUsers([])
      return []
    }

    try {
      const data = await fetchSajuUsers(sessionUser.id)
      setReadingsError('')
      setSajuUsers(data)
      return data
    } catch (fetchError) {
      console.error(fetchError)
      setReadingsError(fetchError.message || '저장된 사주 정보를 불러오지 못했습니다.')
      setSajuUsers([])
      return []
    }
  }

  const loadReadingCount = async () => {
    if (!isSupabaseConfigured) return

    try {
      const count = await fetchSajuReadingCount()
      setReadingCount(count)
    } catch (countError) {
      console.error(countError)
    }
  }

  const captureGuestDraft = (overrides = {}) => ({
    name,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    gender,
    calendarType,
    summary,
    result,
    todayFortune,
    showBlessing,
    viewMode,
    ...overrides,
  })

  const applyGuestDraft = (draft) => {
    if (!draft) return
    selectTokenRef.current += 1
    setName(draft.name || '')
    setBirthYear(draft.birthYear || '')
    setBirthMonth(draft.birthMonth || '')
    setBirthDay(draft.birthDay || '')
    setBirthHour(draft.birthHour || '')
    setBirthMinute(draft.birthMinute || '')
    setGender(draft.gender || '')
    setCalendarType(draft.calendarType || '')
    setSummary(draft.summary || '')
    setResult(draft.result || '')
    setTodayFortune(draft.todayFortune || '')
    setShowBlessing(
      Boolean(draft.showBlessing || draft.summary || draft.result || draft.todayFortune)
    )
    setSelectedId(null)
    setSelectedUserId(null)
    setEditingId(null)
    setViewMode('create')
    setError('')
    setResultRevealKey((key) => key + 1)
  }

  const persistPendingReading = async (sessionUser, people, draft) => {
    if (!sessionUser?.id || !(draft?.summary || draft?.result || draft?.todayFortune)) {
      return null
    }

    const birthDateValue = draftBirthDate(draft)
    const birthTimeValue = draftBirthTime(draft)
    if (!draft.name || !birthDateValue || !birthTimeValue || !draft.gender || !draft.calendarType) {
      return null
    }

    const matched =
      (people || []).find(
        (item) =>
          item.name === draft.name &&
          item.birth_date === birthDateValue &&
          String(item.birth_time || '').slice(0, 5) === birthTimeValue &&
          item.gender === draft.gender &&
          item.calendar_type === draft.calendarType
      ) || null

    const savedUser = await saveSajuUser({
      authUserId: sessionUser.id,
      sajuUserId: matched?.id || null,
      profile: {
        name: draft.name,
        birthDate: birthDateValue,
        birthTime: birthTimeValue,
        gender: draft.gender,
        calendarType: draft.calendarType,
      },
    })

    const savedReading = await saveSajuReading({
      authUserId: sessionUser.id,
      sajuUserId: savedUser.id,
      readingId: matched?.latestReading?.id || null,
      result: {
        summary: draft.summary || '',
        detail: draft.result || '',
        todayFortune: draft.todayFortune || '',
      },
    })

    const merged = {
      ...savedUser,
      latestReading: savedReading,
    }

    setSajuUsers((prev) => {
      const without = prev.filter((item) => item.id !== savedUser.id)
      return [merged, ...without]
    })
    pendingGuestDraftRef.current = null
    clearGuestDraft()
    loadReadingCount()
    return merged
  }

  const startNewSaju = () => {
    selectTokenRef.current += 1
    setName('')
    setBirthYear('')
    setBirthMonth('')
    setBirthDay('')
    setBirthHour('')
    setBirthMinute('')
    setGender('')
    setCalendarType('')
    setResult('')
    setSummary('')
    setTodayFortune('')
    setShowBlessing(false)
    setError('')
    setSelectedId(null)
    setSelectedUserId(null)
    setEditingId(null)
    setViewMode('create')
    setResultRevealKey((key) => key + 1)
    pendingGuestDraftRef.current = null
    clearGuestDraft()
  }

  const handleGoogleLogin = async (source = 'unknown') => {
    const loginSource = typeof source === 'string' ? source : 'unknown'
    trackEvent('login_click', { method: 'google', source: loginSource })
    const draft = captureGuestDraft()
    pendingGuestDraftRef.current = draft
    persistGuestDraft(draft)
    setAuthBusy(true)
    setError('')
    setReadingsError('')
    try {
      await signInWithGoogle()
    } catch (authError) {
      console.error(authError)
      trackEvent('login_fail', { method: 'google', source: loginSource })
      setReadingsError(authError.message || 'Google 로그인에 실패했습니다.')
      setAuthBusy(false)
    }
  }

  const handleLogout = async () => {
    setAuthBusy(true)
    setError('')
    setReadingsError('')
    try {
      await signOut()
      trackEvent('logout', { method: 'google' })
      setAnalyticsUser(undefined)
      setUser(null)
      setSajuUsers([])
      hydratedRef.current = false
      setProfileModal(null)
      setProfileError('')
      startNewSaju()
    } catch (authError) {
      console.error(authError)
      setReadingsError(authError.message || '로그아웃에 실패했습니다.')
    } finally {
      setAuthBusy(false)
    }
  }

  const applySajuUser = (person, { openSaved = true } = {}) => {
    selectTokenRef.current += 1
    const { year, month, day } = splitBirthDate(person.birth_date)
    const { hour, minute } = splitBirthTime(person.birth_time)
    const reading = person.latestReading

    setName(person.name || '')
    setBirthYear(year)
    setBirthMonth(month)
    setBirthDay(day)
    setBirthHour(hour)
    setBirthMinute(minute)
    setGender(person.gender || '')
    setCalendarType(person.calendar_type || '')
    setSelectedUserId(person.id)
    setSelectedId(reading?.id || null)
    setEditingId(null)
    setError('')

    if (openSaved && reading) {
      setViewMode('saved')
      setSummary(reading.summary || '')
      setResult(reading.detail || '')
      setTodayFortune(reading.today_fortune || '')
      setShowBlessing(
        Boolean(reading.summary || reading.detail || reading.today_fortune)
      )
    } else {
      setViewMode(person.id ? 'ready' : 'create')
      setSummary('')
      setResult('')
      setTodayFortune('')
      setShowBlessing(false)
    }

    setResultRevealKey((key) => key + 1)

    requestAnimationFrame(() => {
      resultBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const afterAuthLoad = (sessionUser, people) => {
    const pendingDraft = pendingGuestDraftRef.current || readGuestDraft()
    const hasPendingResult = Boolean(
      pendingDraft?.summary || pendingDraft?.result || pendingDraft?.todayFortune
    )

    if (!sessionUser) {
      setProfileModal(null)
      if (hasPendingResult) {
        pendingGuestDraftRef.current = pendingDraft
        applyGuestDraft(pendingDraft)
      }
      return
    }

    if (hasPendingResult) {
      pendingGuestDraftRef.current = pendingDraft
      applyGuestDraft(pendingDraft)
      hydratedRef.current = true
      void persistPendingReading(sessionUser, people, pendingDraft)
        .then((merged) => {
          if (merged) {
            setProfileModal(null)
            applySajuUser(merged)
            return
          }
          if (!people.length) setProfileModal('onboard')
        })
        .catch((saveError) => {
          console.error(saveError)
          if (!people.length) setProfileModal('onboard')
          setError(
            saveError?.message
              ? `해석은 나왔다. 저장만 실패했다: ${saveError.message}`
              : '해석은 나왔다. 저장만 실패했다.'
          )
        })
      return
    }

    if (!people.length) {
      setProfileModal('onboard')
      return
    }

    if (hydratedRef.current) return
    hydratedRef.current = true
    applySajuUser(pickProfile(people))
  }

  useEffect(() => {
    let cancelled = false

    const readOAuthErrorFromUrl = () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const search = window.location.search.startsWith('?')
        ? window.location.search.slice(1)
        : window.location.search
      const params = new URLSearchParams(hash || search)
      const description =
        params.get('error_description') || params.get('error') || ''
      if (!description) return ''
      window.history.replaceState({}, '', window.location.pathname)
      return decodeURIComponent(description.replace(/\+/g, ' '))
    }

    const bootstrap = async () => {
      void loadReadingCount()
      const oauthError = readOAuthErrorFromUrl()
      if (oauthError && !cancelled) {
        setReadingsError(oauthError)
      }

      let sessionUser = null
      try {
        const session = await getGoogleSession()
        sessionUser = session?.user || null
      } catch (authError) {
        console.error(authError)
        if (!cancelled) {
          setReadingsError(authError.message || '로그인 상태를 확인하지 못했습니다.')
        }
      }

      if (cancelled) return
      setUser(sessionUser)
      setAnalyticsUser(sessionUser?.id)
      const people = await loadSajuUsers(sessionUser)
      if (cancelled) return
      afterAuthLoad(sessionUser, people)
      setAuthReady(true)
    }

    bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      const nextUser =
        session?.user && !session.user.is_anonymous ? session.user : null
      setUser(nextUser)
      setAnalyticsUser(nextUser?.id)

      if (event === 'SIGNED_OUT') {
        hydratedRef.current = false
        setSajuUsers([])
        setProfileModal(null)
        setAuthReady(true)
        return
      }

      if (event === 'SIGNED_IN') {
        trackEvent('login', { method: 'google' })
      }

      const people = await loadSajuUsers(nextUser)
      if (cancelled) return
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        afterAuthLoad(nextUser, people)
      }
      setAuthReady(true)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
    // Bootstrap and auth subscription should run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNewSajuClick = () => {
    if (viewMode === 'create') {
      const line =
        ALREADY_OPEN_TOASTS[alreadyOpenToastRef.current % ALREADY_OPEN_TOASTS.length]
      alreadyOpenToastRef.current += 1
      showToast(line)
      return
    }
    trackEvent('new_saju')
    startNewSaju()
  }

  const startEditReading = () => {
    if (!selectedUserId) return
    trackEvent('edit_saju')
    setEditingId(selectedId)
    setViewMode('edit')
    setError('')
    setResultRevealKey((key) => key + 1)
  }

  const handleDeleteSajuUser = async (person, event) => {
    event.stopPropagation()
    const ok = window.confirm(`「${person.name}」 정보 삭제한다. 되돌릴 수 없다.`)
    if (!ok) return

    if (!user) {
      setReadingsError('삭제는 Google 로그인 후 가능합니다.')
      return
    }

    try {
      await requireAuthSession()
      await deleteSajuUser({ authUserId: user.id, sajuUserId: person.id })
      trackEvent('delete_saju')
    } catch (deleteError) {
      console.error(deleteError)
      setReadingsError(deleteError.message || '삭제에 실패했습니다.')
      return
    }

    setSajuUsers((prev) => prev.filter((item) => item.id !== person.id))
    loadReadingCount()
    if (selectedUserId === person.id) {
      startNewSaju()
    }
  }

  const handleFieldChange = (field, value) => {
    const setters = {
      name: setName,
      birthYear: setBirthYear,
      birthMonth: setBirthMonth,
      birthDay: setBirthDay,
      birthHour: setBirthHour,
      birthMinute: setBirthMinute,
      gender: setGender,
      calendarType: setCalendarType,
    }
    setters[field]?.(value)
  }

  const handleSaveProfile = async (profilePayload) => {
    setProfileSaving(true)
    setProfileError('')

    try {
      const session = await requireAuthSession()
      const currentProfile = pickProfile(sajuUsers)
      const savedUser = await saveSajuUser({
        authUserId: session.user.id,
        sajuUserId: profileModal === 'edit' ? currentProfile?.id : null,
        profile: profilePayload,
      })
      const previous = sajuUsers.find((item) => item.id === savedUser.id)
      const merged = {
        ...savedUser,
        latestReading:
          previous?.latestReading ||
          (profileModal === 'edit' ? currentProfile?.latestReading : null) ||
          null,
      }

      setSajuUsers((prev) => {
        const without = prev.filter((item) => item.id !== savedUser.id)
        return [merged, ...without]
      })
      hydratedRef.current = true
      setProfileModal(null)
      trackEvent(profileModal === 'onboard' ? 'complete_profile' : 'profile_save')

      const pending = pendingGuestDraftRef.current || readGuestDraft()
      if (pending?.summary || pending?.result || pending?.todayFortune) {
        try {
          const savedReadingUser = await persistPendingReading(
            session.user,
            [merged, ...sajuUsers.filter((item) => item.id !== savedUser.id)],
            pending
          )
          applySajuUser(savedReadingUser || merged)
        } catch (pendingError) {
          console.error(pendingError)
          applyGuestDraft(pending)
          setError('해석은 나왔다. 저장만 실패했다.')
        }
      } else {
        applySajuUser(merged)
      }
    } catch (saveError) {
      console.error(saveError)
      setProfileError(saveError.message || '프로필 저장에 실패했습니다.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleAnalyze = async () => {
    if (!name || !birthDate || !birthTime || !gender || !calendarType) {
      setError('이름, 생년월일, 시간, 성별, 양력/음력. 빠진 게 있다.')
      return
    }

    if (!hasGeminiKey()) {
      setError('.env에 VITE_GEMINI_API_KEY가 없습니다. 서버를 재시작해 보세요.')
      trackEvent('saju_analyze_fail', { reason: 'missing_api_key' })
      return
    }

    trackEvent('saju_analyze', {
      view_mode: viewMode,
      logged_in: Boolean(user),
    })

    const matchedUser = selectedUserId
      ? sajuUsers.find((item) => item.id === selectedUserId)
      : sajuUsers.find(
          (item) =>
            item.name === name &&
            item.birth_date === birthDate &&
            String(item.birth_time || '').slice(0, 5) === birthTime &&
            item.gender === gender &&
            item.calendar_type === calendarType
        )
    const existingUserId = matchedUser?.id || null
    const existingReadingId = editingId || selectedId || matchedUser?.latestReading?.id || null

    setLoading(true)
    setError('')
    setResult('')
    setSummary('')
    setTodayFortune('')
    setShowBlessing(false)
    if (!existingReadingId && viewMode !== 'ready' && viewMode !== 'saved') {
      setSelectedId(null)
      setViewMode('create')
    }

    try {
      const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })

      const prompt = buildSajuPrompt({
        name,
        birth: birthDate,
        time: birthTime,
        gender,
        calendar: calendarType,
        today,
      })

      const text = await askGemini(prompt)
      const parsed = parseSajuResponse(text)

      setSummary(parsed.summary || '')
      setResult(parsed.detail || '')
      setTodayFortune(parsed.todayFortune || '')
      setShowBlessing(true)
      setLoading(false)
      setResultRevealKey((key) => key + 1)
      trackEvent('saju_analyze_complete', {
        view_mode: viewMode,
        logged_in: Boolean(user),
      })

      requestAnimationFrame(() => {
        resultBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })

      if (!user) {
        const draft = captureGuestDraft({
          summary: parsed.summary || '',
          result: parsed.detail || '',
          todayFortune: parsed.todayFortune || '',
          showBlessing: true,
          viewMode: 'create',
        })
        pendingGuestDraftRef.current = draft
        persistGuestDraft(draft)
        return
      }

      try {
        const session = await requireAuthSession()
        const savedUser = await saveSajuUser({
          authUserId: session.user.id,
          sajuUserId: existingUserId,
          profile: {
            name,
            birthDate,
            birthTime,
            gender,
            calendarType,
          },
        })

        const savedReading = await saveSajuReading({
          authUserId: session.user.id,
          sajuUserId: savedUser.id,
          readingId: existingReadingId,
          result: {
            summary: parsed.summary || '',
            detail: parsed.detail || '',
            todayFortune: parsed.todayFortune || '',
          },
        })

        const merged = {
          ...savedUser,
          latestReading: savedReading,
        }

        setSelectedUserId(savedUser.id)
        setSelectedId(savedReading.id)
        setEditingId(null)
        setViewMode('saved')
        setSajuUsers((prev) => {
          const without = prev.filter((item) => item.id !== savedUser.id)
          return [merged, ...without]
        })
        loadReadingCount()
      } catch (saveError) {
        console.error(saveError)
        setError(
          saveError?.message
            ? `해석은 나왔다. 저장만 실패했다: ${saveError.message}`
            : '해석은 나왔다. 저장만 실패했다.'
        )
      }
    } catch (err) {
      console.error(err)
      trackEvent('saju_analyze_fail', { reason: 'request_error' })
      setError(err.message || '사주 분석이 중간에 끊겼다.')
      setLoading(false)
    }
  }

  const openProfileModal = (mode) => {
    setProfileError('')
    setProfileModal(mode)
  }

  const profile = pickProfile(sajuUsers)
  const otherPeople = profile
    ? sajuUsers.filter((item) => item.id !== profile.id)
    : sajuUsers
  const isViewingProfile = Boolean(profile && selectedUserId === profile.id)
  const resultLocked = Boolean(!user && (summary || result || todayFortune))
  const canShareResult = Boolean(
    selectedId && !resultLocked && (summary || result || todayFortune)
  )
  const isSavedView = viewMode === 'saved' || viewMode === 'ready'
  const layoutClass = `layout${
    viewMode === 'saved'
      ? ' layout--saved'
      : viewMode === 'ready'
        ? ' layout--ready'
        : viewMode === 'edit'
          ? ' layout--edit'
          : ' layout--create'
  }`

  return {
    layoutClass,
    viewMode,
    isSavedView,
    toast,
    showToast,
    birthOptions,
    user,
    authReady,
    authBusy,
    profile,
    profileModal,
    profileSaving,
    profileError,
    profileModalValues: getProfileModalValues(profileModal, profile, user),
    otherPeople,
    readingsError,
    selectedUserId,
    selectedId,
    name,
    birthDate,
    birthTime,
    gender,
    calendarType,
    formValues: {
      name,
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      gender,
      calendarType,
    },
    isViewingProfile,
    loading,
    error,
    canShareResult,
    resultRevealKey,
    summary,
    result,
    todayFortune,
    showBlessing,
    resultBlockRef,
    resultLocked,
    readingCount,
    loginDisabled: !isSupabaseConfigured,
    handleGoogleLogin,
    handleLogout,
    handleNewSajuClick,
    handleDeleteSajuUser,
    handleFieldChange,
    handleSaveProfile,
    handleAnalyze,
    startEditReading,
    applySajuUser,
    loadSajuUsers,
    openProfileModal,
    closeProfileModal: () => {
      setProfileModal(null)
      setProfileError('')
    },
    deleteSelectedUser: (event) => {
      const person = sajuUsers.find((item) => item.id === selectedUserId)
      if (person) handleDeleteSajuUser(person, event)
    },
  }
}
