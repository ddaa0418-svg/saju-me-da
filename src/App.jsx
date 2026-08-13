import { useEffect, useRef, useState } from 'react'
import sajuCat from './assets/saju-cat.png'
import bakingCat from './assets/saju-cat-baking.png'
import BirthInfoFields from './BirthInfoFields'
import { buildSajuPrompt } from './buildSajuPrompt'
import ProfileModal from './ProfileModal'
import {
  deleteSajuUser,
  fetchSajuUsers,
  getGoogleSession,
  getUserAvatarUrl,
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
} from './lib/supabase'
import './App.css'

// .env의 VITE_GEMINI_API_KEY 사용 (Vite는 VITE_ 접두사만 프론트에 노출)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Interactions API — 신규 키는 2.5-flash-lite 사용 불가 → 3.x lite 사용
async function askGemini(prompt) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        model: 'gemini-3.1-flash-lite',
        input: prompt,
        generation_config: {
          thinking_level: 'minimal',
          max_output_tokens: 1400,
          temperature: 0.7,
        },
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini API 요청에 실패했습니다.'
    throw new Error(message)
  }

  // SDK의 interaction.output_text와 같은 역할
  if (data.output_text) {
    return data.output_text
  }

  // REST 응답: steps 안의 model_output 텍스트를 모음
  const texts = (data.steps || [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content || [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)

  const text = texts.join('\n').trim()
  if (!text) {
    throw new Error('Gemini 응답에서 텍스트를 찾지 못했습니다.')
  }

  return text
}

function parseSajuResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { summary: '', detail: text, todayFortune: '' }
  }

  const parsed = JSON.parse(jsonMatch[0])
  return {
    summary: parsed.summary || '',
    detail: parsed.detail || text,
    todayFortune: parsed.todayFortune || '',
  }
}

const GUEST_DRAFT_KEY = 'sajumi-guest-draft'
const DETAIL_HEADINGS = [
  '성격 및 기질 분석',
  '특이한 점',
  '솔직한 약점',
  '돋보이는 결정적 재능',
  '해석을 마치며...',
]

function readGuestDraft() {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistGuestDraft(draft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Safari private mode 등에서 sessionStorage가 막힐 수 있다.
  }
}

function clearGuestDraft() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // ignore
  }
}

function draftBirthDate(draft) {
  return draft?.birthYear && draft?.birthMonth && draft?.birthDay
    ? `${draft.birthYear}-${draft.birthMonth}-${draft.birthDay}`
    : ''
}

function draftBirthTime(draft) {
  return draft?.birthHour !== '' && draft?.birthMinute !== ''
    ? `${draft.birthHour}:${draft.birthMinute}`
    : ''
}

function splitLockedDetail(detail) {
  const text = String(detail || '').trim()
  if (!text) return { preview: '', locked: '' }

  const positions = DETAIL_HEADINGS.map((heading) => ({
    heading,
    index: text.indexOf(heading),
  }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)

  if (positions.length >= 3) {
    const cut = positions[2].index
    return {
      preview: text.slice(0, cut).trim(),
      locked: text.slice(cut).trim(),
    }
  }

  const mid = Math.max(80, Math.floor(text.length * 0.45))
  const newlineCut = text.indexOf('\n', mid)
  const cut = newlineCut >= 0 ? newlineCut : mid
  return {
    preview: text.slice(0, cut).trim(),
    locked: text.slice(cut).trim(),
  }
}

const LOADING_LINES = [
  '식빵 굽는 중. 사주도 같이 익히는 중이다냥.',
  '오븐 예열 끝. 명식부터 정리한다.',
  '겉은 바삭하게, 해석은 팩트로. 조금만 기다려.',
]

function BrandMascot() {
  return (
    <div className="brand-mascot">
      <img
        className="brand-mascot-img"
        src={sajuCat}
        alt="사주 해석 전문 뚱냥이"
        width={360}
        height={360}
      />
    </div>
  )
}

function LoadingOven() {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % LOADING_LINES.length)
    }, 2400)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="loading-oven" aria-live="polite" aria-busy="true">
      <div className="loading-oven-stage">
        <span className="loading-oven-glow" aria-hidden="true" />
        <span className="loading-oven-steam" aria-hidden="true" />
        <span className="loading-oven-steam loading-oven-steam--delay" aria-hidden="true" />
        <img
          className="loading-oven-cat"
          src={bakingCat}
          alt=""
          width={280}
          height={280}
        />
      </div>
      <p className="loading-text">{LOADING_LINES[lineIndex]}</p>
    </div>
  )
}

function ResultPanel({
  name,
  summary,
  result,
  todayFortune,
  showBlessing,
  resultBlockRef,
  locked,
  onLogin,
  authBusy,
  loginDisabled,
}) {
  if (!(summary || result || todayFortune || showBlessing)) return null

  const { preview, locked: lockedDetail } = splitLockedDetail(result)
  const visibleDetail = locked ? preview || result : result

  return (
    <div className="result-block" ref={resultBlockRef} aria-live="polite">
      {summary && (
        <p className="summary reveal-item">
          <span className="summary-label">한줄 요약</span>
          {summary}
        </p>
      )}
      {visibleDetail && (
        <div className="result reveal-item">
          <span className="summary-label">{locked ? '해석 미리보기' : '전체 해석'}</span>
          {visibleDetail}
        </div>
      )}
      {locked ? (
        <div className="result-lock reveal-item">
          <div className="result-lock-preview" aria-hidden="true">
            {lockedDetail ? (
              <div className="result result--teaser">
                <span className="summary-label">이어서</span>
                {lockedDetail}
              </div>
            ) : null}
            {todayFortune ? (
              <p className="today-fortune">
                <span className="summary-label">오늘의 운세</span>
                {todayFortune}
              </p>
            ) : (
              <p className="today-fortune">
                <span className="summary-label">오늘의 운세</span>
                잠긴 운세 문장. 로그인하면 약점과 재능까지 이어서 본다.
              </p>
            )}
          </div>
          <div className="result-lock-overlay">
            <p className="result-lock-kicker">나머지 절반</p>
            <p className="result-lock-title">여기부터는 로그인해야 본다냥.</p>
            <p className="result-lock-copy">
              솔직한 약점, 결정적 재능, 오늘의 운세가 잠겨 있다.
            </p>
            <button
              type="button"
              className="result-lock-btn"
              onClick={onLogin}
              disabled={authBusy || loginDisabled}
            >
              {authBusy ? '이동 중…' : 'Google로 로그인하고 이어서 보기'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {todayFortune && (
            <p className="today-fortune reveal-item">
              <span className="summary-label">오늘의 운세</span>
              {todayFortune}
            </p>
          )}
          {showBlessing && name && (
            <p className="blessing reveal-item">
              {name}, 해석은 끝났다. 나머지는 네가 하면 된다냥.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function App() {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) =>
    String(currentYear - i)
  )
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

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
  const [viewMode, setViewMode] = useState('create') // 'create' | 'ready' | 'saved' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [resultRevealKey, setResultRevealKey] = useState(0)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [profileModal, setProfileModal] = useState(null) // 'onboard' | 'edit' | null
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [toast, setToast] = useState(null)
  const resultBlockRef = useRef(null)
  const selectTokenRef = useRef(0)
  const hydratedRef = useRef(false)
  const toastHideRef = useRef(null)
  const toastRemoveRef = useRef(null)
  const pendingGuestDraftRef = useRef(null)

  // select로 고른 값을 API용 문자열로 합침
  const birthDate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth}-${birthDay}`
      : ''
  const birthTime =
    birthHour !== '' && birthMinute !== ''
      ? `${birthHour}:${birthMinute}`
      : ''

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
    return merged
  }

  const handleGoogleLogin = async () => {
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

      if (event === 'SIGNED_OUT') {
        hydratedRef.current = false
        setSajuUsers([])
        setProfileModal(null)
        setAuthReady(true)
        return
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

  useEffect(() => {
    return () => {
      window.clearTimeout(toastHideRef.current)
      window.clearTimeout(toastRemoveRef.current)
    }
  }, [])

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

  const showToast = (message) => {
    window.clearTimeout(toastHideRef.current)
    window.clearTimeout(toastRemoveRef.current)
    setToast({ id: Date.now(), message, leaving: false })
    toastHideRef.current = window.setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, leaving: true } : null))
      toastRemoveRef.current = window.setTimeout(() => {
        setToast(null)
      }, 320)
    }, 2200)
  }

  const handleNewSajuClick = () => {
    if (viewMode === 'create') {
      showToast('이미 새 사주 화면이다냥.')
      return
    }
    startNewSaju()
  }

  const startEditReading = () => {
    if (!selectedUserId) return
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
    } catch (deleteError) {
      console.error(deleteError)
      setReadingsError(deleteError.message || '삭제에 실패했습니다.')
      return
    }

    setSajuUsers((prev) => prev.filter((item) => item.id !== person.id))
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

  const handleSaveProfile = async (profile) => {
    setProfileSaving(true)
    setProfileError('')

    try {
      const session = await requireAuthSession()
      const currentProfile = pickProfile(sajuUsers)
      const savedUser = await saveSajuUser({
        authUserId: session.user.id,
        sajuUserId: profileModal === 'edit' ? currentProfile?.id : null,
        profile,
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

    if (!API_KEY) {
      setError('.env에 VITE_GEMINI_API_KEY가 없습니다. 서버를 재시작해 보세요.')
      return
    }

    const matchedUser =
      selectedUserId
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
      setError(err.message || '사주 분석이 중간에 끊겼다.')
      setLoading(false)
    }
  }

  const profile = pickProfile(sajuUsers)
  const otherPeople = profile
    ? sajuUsers.filter((item) => item.id !== profile.id)
    : sajuUsers
  const isViewingProfile = Boolean(profile && selectedUserId === profile.id)
  const avatarUrl = getUserAvatarUrl(user)
  const resultLocked = Boolean(!user && (summary || result || todayFortune))
  const profileModalValues =
    profileModal === 'edit' && profile
      ? (() => {
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
        })()
      : {
          name: getUserDisplayName(user),
          birthYear: '',
          birthMonth: '',
          birthDay: '',
          birthHour: '',
          birthMinute: '',
          gender: '',
          calendarType: '',
        }

  return (
    <div
      className={`layout${
        viewMode === 'saved'
          ? ' layout--saved'
          : viewMode === 'ready'
            ? ' layout--ready'
            : viewMode === 'edit'
              ? ' layout--edit'
              : ' layout--create'
      }`}
    >
      <aside className="sidebar" aria-label="프로필과 저장된 사주">
        <div className="auth-panel">
          {!authReady ? (
            <p className="auth-status">로그인 확인 중…</p>
          ) : user ? (
            <div className="profile-card">
              <div className="profile-card-top">
                {avatarUrl ? (
                  <img className="profile-avatar" src={avatarUrl} alt="" />
                ) : (
                  <span className="profile-avatar profile-avatar--fallback" aria-hidden="true">
                    {(profile?.name || getUserDisplayName(user)).slice(0, 1)}
                  </span>
                )}
                <div className="profile-card-copy">
                  <p className="auth-user" title={user.email || ''}>
                    {profile?.name || getUserDisplayName(user)}
                  </p>
                  {profile ? (
                    <p className="profile-meta">
                      {profile.birth_date} · {String(profile.birth_time || '').slice(0, 5)} · {profile.calendar_type}
                    </p>
                  ) : (
                    <p className="profile-meta">프로필부터 입력해라</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => {
                  setProfileError('')
                  setProfileModal('edit')
                }}
                disabled={!profile || profileModal === 'onboard'}
              >
                프로필 수정
              </button>
              <button
                type="button"
                className="auth-logout-btn"
                onClick={handleLogout}
                disabled={authBusy}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <>
              <p className="auth-hint">
                사주는 로그인 없이 된다. 저장하고 나머지를 보려면 그때 로그인해라냥.
              </p>
              <button
                type="button"
                className="auth-google-btn auth-google-btn--quiet"
                onClick={handleGoogleLogin}
                disabled={authBusy || !isSupabaseConfigured}
              >
                {authBusy ? '이동 중…' : 'Google로 로그인'}
              </button>
            </>
          )}
        </div>

        <h2 className="sidebar-title">다른 사람</h2>
        <button type="button" className="new-saju-btn" onClick={handleNewSajuClick}>
          다른 사람 사주 보기
        </button>
        {readingsError ? (
          <p className="sidebar-empty sidebar-error">{readingsError}</p>
        ) : !user ? (
          <p className="sidebar-empty">로그인하면 다른 사람 사주도 여기에 남는다.</p>
        ) : otherPeople.length === 0 ? (
          <p className="sidebar-empty">가족·친구 사주는 여기에 따로 둔다.</p>
        ) : (
          <ul className="sidebar-list">
            {otherPeople.map((person) => (
              <li key={person.id} className="sidebar-row">
                <button
                  type="button"
                  className={`sidebar-item${selectedUserId === person.id && (viewMode === 'saved' || viewMode === 'ready') ? ' sidebar-item--active' : ''}`}
                  onClick={() => applySajuUser(person)}
                >
                  <span className="sidebar-item-name">{person.name}</span>
                  {selectedUserId === person.id && viewMode === 'saved' && (
                    <span className="sidebar-item-badge">보는 중</span>
                  )}
                </button>
                <button
                  type="button"
                  className="sidebar-delete"
                  aria-label={`${person.name} 정보 삭제`}
                  title="삭제"
                  onClick={(event) => handleDeleteSajuUser(person, event)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="sidebar-refresh"
          onClick={() => loadSajuUsers(user)}
          disabled={!user}
        >
          목록 새로고침
        </button>
      </aside>

      <div className="app">
        <header className="brand">
          {loading ? null : <BrandMascot />}
          <h1>사주미</h1>
          <p className="brand-tagline">
            {loading
              ? '식빵이 익는 동안 명식을 세운다.'
              : '사주? 내 전문이지. 돌려 말하지 않는다.'}
          </p>
        </header>

        <div className="view-tabs" role="tablist" aria-label="보기 모드">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'saved' || viewMode === 'ready'}
            className={`view-tab view-tab--saved${viewMode === 'saved' || viewMode === 'ready' ? ' view-tab--active' : ''}`}
            disabled={!profile}
            onClick={() => {
              if (profile) applySajuUser(profile)
            }}
          >
            <span className="view-tab-label">내 사주</span>
            <span className="view-tab-desc">
              {profile ? `${profile.name}의 사주` : '프로필부터 저장해라'}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'create' || viewMode === 'edit'}
            className={`view-tab view-tab--create${viewMode === 'create' || viewMode === 'edit' ? ' view-tab--active' : ''}`}
            onClick={handleNewSajuClick}
          >
            <span className="view-tab-label">{viewMode === 'edit' ? '수정 중' : '다른 사람'}</span>
            <span className="view-tab-desc">
              {viewMode === 'edit' ? '저장된 사주 수정하기' : '다른 사람 사주 보기'}
            </span>
          </button>
        </div>

        {viewMode === 'saved' || viewMode === 'ready' ? (
          <section className="saved-view" aria-label="내 사주">
            <div className="saved-view-banner">
              <span className={`mode-chip ${viewMode === 'saved' ? 'mode-chip--saved' : 'mode-chip--create'}`}>
                {viewMode === 'saved' ? '저장됨' : '준비됨'}
              </span>
              <p className="saved-view-title">
                <span className="saved-view-name">{name}</span>
                {isViewingProfile ? '님의 사주' : '님의 저장된 사주'}
              </p>
              <p className="saved-view-hint">
                {isViewingProfile
                  ? '정보는 이미 있다. 사주만 보면 된다.'
                  : '다른 사람 사주다. 내 걸로 돌아가려면 「내 사주」를 눌러라.'}
              </p>
              <div className="saved-actions">
                <button
                  type="button"
                  className="saved-edit-btn"
                  onClick={handleAnalyze}
                  disabled={loading || !user}
                >
                  {loading
                    ? '식빵 굽는 중...'
                    : viewMode === 'ready'
                      ? '사주 보기'
                      : '이 정보로 다시 본다'}
                </button>
                {isViewingProfile ? (
                  <button
                    type="button"
                    className="saved-secondary-btn"
                    onClick={() => {
                      setProfileError('')
                      setProfileModal('edit')
                    }}
                  >
                    프로필 수정
                  </button>
                ) : (
                  <>
                    <button type="button" className="saved-secondary-btn" onClick={startEditReading}>
                      정보 수정하기
                    </button>
                    <button
                      type="button"
                      className="saved-delete-btn"
                      onClick={(event) => {
                        const person = sajuUsers.find((item) => item.id === selectedUserId)
                        if (person) handleDeleteSajuUser(person, event)
                      }}
                    >
                      이 정보 삭제하기
                    </button>
                  </>
                )}
              </div>
            </div>
            {loading && <LoadingOven />}
            <dl className="saved-meta">
              <div>
                <dt>생년월일</dt>
                <dd>{birthDate || '-'}</dd>
              </div>
              <div>
                <dt>시간</dt>
                <dd>{birthTime || '-'}</dd>
              </div>
              <div>
                <dt>성별</dt>
                <dd>{gender || '-'}</dd>
              </div>
              <div>
                <dt>달력</dt>
                <dd>{calendarType || '-'}</dd>
              </div>
            </dl>

            {error && <p className="error">{error}</p>}

            {!loading && (
              <ResultPanel
                key={resultRevealKey}
                name={name}
                summary={summary}
                result={result}
                todayFortune={todayFortune}
                showBlessing={showBlessing}
                resultBlockRef={resultBlockRef}
                locked={resultLocked}
                onLogin={handleGoogleLogin}
                authBusy={authBusy}
                loginDisabled={!isSupabaseConfigured}
              />
            )}
          </section>
        ) : (
        <form
          className={`form form--create${viewMode === 'edit' ? ' form--edit' : ''}`}
          onSubmit={(event) => {
            event.preventDefault()
            handleAnalyze()
          }}
        >
          <div className="create-view-banner">
            <span className={`mode-chip ${viewMode === 'edit' ? 'mode-chip--edit' : 'mode-chip--create'}`}>
              {viewMode === 'edit' ? '수정' : '다른 사람'}
            </span>
            <p className="create-view-title">
              {viewMode === 'edit'
                ? '정보 고친 뒤 다시 풀이한다.'
                : '내 프로필이 아니다. 정보는 정확히 넣어라.'}
            </p>
          </div>
          <BirthInfoFields
            idPrefix="saju"
            values={{
              name,
              birthYear,
              birthMonth,
              birthDay,
              birthHour,
              birthMinute,
              gender,
              calendarType,
            }}
            onChange={handleFieldChange}
            years={years}
            months={months}
            days={days}
            hours={hours}
            minutes={minutes}
          />

          <p className="preview">{name}님의 사주 </p>

          <button className="analyze-btn" type="submit" disabled={loading}>
            {loading
              ? '식빵 굽는 중...'
              : viewMode === 'edit'
                ? '다시 풀이하고 수정 저장'
                : '사주 보기'}
          </button>

          {loading && <LoadingOven />}

          {error && <p className="error">{error}</p>}

          {!loading && (
            <ResultPanel
              key={resultRevealKey}
              name={name}
              summary={summary}
              result={result}
              todayFortune={todayFortune}
              showBlessing={showBlessing}
              resultBlockRef={resultBlockRef}
              locked={resultLocked}
              onLogin={handleGoogleLogin}
              authBusy={authBusy}
              loginDisabled={!isSupabaseConfigured}
            />
          )}
        </form>
        )}
      </div>

      {profileModal ? (
        <ProfileModal
          key={profileModal}
          mode={profileModal}
          initialValues={profileModalValues}
          years={years}
          months={months}
          days={days}
          hours={hours}
          minutes={minutes}
          saving={profileSaving}
          error={profileError}
          onSubmit={handleSaveProfile}
          onCancel={
            profileModal === 'edit'
              ? () => {
                  setProfileModal(null)
                  setProfileError('')
                }
              : undefined
          }
          onLogout={profileModal === 'onboard' ? handleLogout : undefined}
        />
      ) : null}

      {toast ? (
        <div
          key={toast.id}
          className={`toast${toast.leaving ? ' toast--leaving' : ''}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}

export default App
