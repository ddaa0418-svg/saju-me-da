import { useEffect, useRef, useState } from 'react'
import sajuCat from './assets/saju-cat.png'
import { buildSajuPrompt } from './buildSajuPrompt'
import {
  getGoogleSession,
  getUserDisplayName,
  isSupabaseConfigured,
  requireAuthSession,
  signInWithGoogle,
  signOut,
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

// 사주 해석 옆 — 사주 보는 귀여운 고양이
function SajuCat({ loading }) {
  return (
    <span className={`brand-cat-wrap${loading ? ' brand-cat-wrap--loading' : ''}`}>
      <img
        className="brand-cat"
        src={sajuCat}
        alt="사주를 보는 귀여운 고양이"
        width={48}
        height={48}
      />
    </span>
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
  const [readings, setReadings] = useState([])
  const [readingsError, setReadingsError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [viewMode, setViewMode] = useState('create') // 'create' | 'saved' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [resultRevealKey, setResultRevealKey] = useState(0)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const resultBlockRef = useRef(null)
  const selectTokenRef = useRef(0)

  // select로 고른 값을 API용 문자열로 합침
  const birthDate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth}-${birthDay}`
      : ''
  const birthTime =
    birthHour !== '' && birthMinute !== ''
      ? `${birthHour}:${birthMinute}`
      : ''

  const loadReadings = async (sessionUser = user) => {
    if (!isSupabaseConfigured) {
      setReadingsError(
        'Supabase 환경변수가 없습니다. .env에 URL/키를 넣고 npm run dev를 재시작하세요.'
      )
      setReadings([])
      return []
    }

    if (!sessionUser?.id) {
      setReadingsError('')
      setReadings([])
      return []
    }

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select(
        'id, name, birth_date, birth_time, gender, calendar_type, summary, detail, today_fortune, created_at'
      )
      .eq('user_id', sessionUser.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error(fetchError)
      setReadingsError(fetchError.message || '저장된 사주를 불러오지 못했습니다.')
      setReadings([])
      return []
    }

    setReadingsError('')
    setReadings(data || [])
    return data || []
  }

  const handleGoogleLogin = async () => {
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
      setReadings([])
      startNewSaju()
    } catch (authError) {
      console.error(authError)
      setReadingsError(authError.message || '로그아웃에 실패했습니다.')
    } finally {
      setAuthBusy(false)
    }
  }

  const applyReadingToForm = (reading) => {
    selectTokenRef.current += 1
    const [y = '', m = '', d = ''] = String(reading.birth_date || '').split('-')
    const [h = '', min = ''] = String(reading.birth_time || '').split(':')

    setName(reading.name || '')
    setBirthYear(y)
    setBirthMonth(m)
    setBirthDay(d)
    setBirthHour(h)
    setBirthMinute(min)
    setGender(reading.gender || '')
    setCalendarType(reading.calendar_type || '')
    setSelectedId(reading.id)
    setEditingId(null)
    setViewMode('saved')
    setError('')
    setSummary(reading.summary || '')
    setResult(reading.detail || '')
    setTodayFortune(reading.today_fortune || '')
    setShowBlessing(
      Boolean(reading.summary || reading.detail || reading.today_fortune)
    )
    setResultRevealKey((key) => key + 1)

    requestAnimationFrame(() => {
      resultBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
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
      setAuthReady(true)
      await loadReadings(sessionUser)
    }

    bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return
      const nextUser =
        session?.user && !session.user.is_anonymous ? session.user : null
      setUser(nextUser)
      setAuthReady(true)
      await loadReadings(nextUser)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
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
    setEditingId(null)
    setViewMode('create')
    setResultRevealKey((key) => key + 1)
  }

  const startEditReading = () => {
    if (!selectedId) return
    setEditingId(selectedId)
    setViewMode('edit')
    setError('')
    setResultRevealKey((key) => key + 1)
  }

  const handleDeleteReading = async (reading, event) => {
    event.stopPropagation()
    const ok = window.confirm(`「${reading.name}」님의 저장된 사주를 삭제할까요?`)
    if (!ok) return

    if (!user) {
      setReadingsError('삭제는 Google 로그인 후 가능합니다.')
      return
    }

    try {
      await requireAuthSession()
    } catch (authError) {
      console.error(authError)
      setReadingsError(authError.message || '로그인이 필요합니다.')
      return
    }

    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', reading.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error(deleteError)
      setReadingsError(deleteError.message || '삭제에 실패했습니다.')
      return
    }

    setReadings((prev) => prev.filter((item) => item.id !== reading.id))
    if (selectedId === reading.id || editingId === reading.id) {
      startNewSaju()
    }
  }

  const handleNameChange = (event) => {
    setName(event.target.value)
  }

  const handleAnalyze = async () => {
    if (!name || !birthDate || !birthTime || !gender || !calendarType) {
      setError('이름, 생년월일, 시간, 성별, 양력/음력을 모두 입력해 주세요.')
      return
    }

    if (!API_KEY) {
      setError('.env에 VITE_GEMINI_API_KEY가 없습니다. 서버를 재시작해 보세요.')
      return
    }

    if (!user) {
      setError('사주를 저장하려면 Google로 로그인해 주세요.')
      return
    }

    const isEditing = Boolean(editingId)

    setLoading(true)
    setError('')
    setResult('')
    setSummary('')
    setTodayFortune('')
    setShowBlessing(false)
    if (!isEditing) {
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
      const session = await requireAuthSession()
      const payload = {
        name,
        birth_date: birthDate,
        birth_time: birthTime,
        gender,
        calendar_type: calendarType,
        summary: parsed.summary || '',
        detail: parsed.detail || '',
        today_fortune: parsed.todayFortune || '',
      }

      setSummary(payload.summary)
      setResult(payload.detail)
      setTodayFortune(payload.today_fortune)
      setShowBlessing(true)
      setLoading(false)

      const query = isEditing
        ? supabase
            .from('saju_readings')
            .update(payload)
            .eq('id', editingId)
            .eq('user_id', session.user.id)
            .select(
              'id, name, birth_date, birth_time, gender, calendar_type, summary, detail, today_fortune, created_at'
            )
            .single()
        : supabase
            .from('saju_readings')
            .insert({ ...payload, user_id: session.user.id })
            .select(
              'id, name, birth_date, birth_time, gender, calendar_type, summary, detail, today_fortune, created_at'
            )
            .single()

      const { data: saved, error: saveError } = await query

      if (saveError) {
        console.error(saveError)
        setError(
          isEditing
            ? '사주 결과는 나왔지만 수정 저장에 실패했습니다.'
            : '사주 결과는 나왔지만 저장에 실패했습니다.'
        )
      } else if (saved) {
        setSelectedId(saved.id)
        setEditingId(null)
        setViewMode('saved')
        setReadings((prev) => {
          const without = prev.filter((item) => item.id !== saved.id)
          return [saved, ...without]
        })
      } else {
        setViewMode('saved')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div
      className={`layout${
        viewMode === 'saved'
          ? ' layout--saved'
          : viewMode === 'edit'
            ? ' layout--edit'
            : ' layout--create'
      }`}
    >
      <aside className="sidebar" aria-label="저장된 사주 목록">
        <div className="auth-panel">
          {!authReady ? (
            <p className="auth-status">로그인 확인 중…</p>
          ) : user ? (
            <>
              <p className="auth-user" title={user.email || ''}>
                {getUserDisplayName(user)}
              </p>
              <button
                type="button"
                className="auth-logout-btn"
                onClick={handleLogout}
                disabled={authBusy}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <p className="auth-hint">Google 계정으로 로그인하면 사주를 저장할 수 있어요.</p>
              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleLogin}
                disabled={authBusy || !isSupabaseConfigured}
              >
                {authBusy ? '이동 중…' : 'Google로 로그인'}
              </button>
            </>
          )}
        </div>

        <h2 className="sidebar-title">저장된 사주</h2>
        <button type="button" className="new-saju-btn" onClick={startNewSaju}>
          새 사주 만들기
        </button>
        {readingsError ? (
          <p className="sidebar-empty sidebar-error">{readingsError}</p>
        ) : !user ? (
          <p className="sidebar-empty">로그인 후 내 사주 목록이 여기에 표시됩니다.</p>
        ) : readings.length === 0 ? (
          <p className="sidebar-empty">아직 저장된 사주가 없습니다.</p>
        ) : (
          <ul className="sidebar-list">
            {readings.map((reading) => (
              <li key={reading.id} className="sidebar-row">
                <button
                  type="button"
                  className={`sidebar-item${selectedId === reading.id && viewMode === 'saved' ? ' sidebar-item--active' : ''}`}
                  onClick={() => applyReadingToForm(reading)}
                >
                  <span className="sidebar-item-name">{reading.name}</span>
                  {selectedId === reading.id && viewMode === 'saved' && (
                    <span className="sidebar-item-badge">보는 중</span>
                  )}
                </button>
                <button
                  type="button"
                  className="sidebar-delete"
                  aria-label={`${reading.name} 사주 삭제`}
                  title="삭제"
                  onClick={(event) => handleDeleteReading(reading, event)}
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
          onClick={() => loadReadings(user)}
          disabled={!user}
        >
          목록 새로고침
        </button>
      </aside>

      <div className="app">
        <header className="brand">
          <div className="brand-row">
            <div className="brand-spacer" aria-hidden="true" />
            <h1>사주 해석</h1>
            <div className="brand-side">
              <SajuCat loading={loading} />
            </div>
          </div>
          <p className="brand-tagline">
            태어난 정보를 입력하면 사주를 해석해 드립니다.
          </p>
        </header>

        <div className="view-tabs" role="tablist" aria-label="보기 모드">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'saved'}
            className={`view-tab view-tab--saved${viewMode === 'saved' ? ' view-tab--active' : ''}`}
            disabled={viewMode !== 'saved'}
          >
            <span className="view-tab-label">저장 목록</span>
            <span className="view-tab-desc">저장된 사주를 보고 있습니다.</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'create' || viewMode === 'edit'}
            className={`view-tab view-tab--create${viewMode === 'create' || viewMode === 'edit' ? ' view-tab--active' : ''}`}
            onClick={startNewSaju}
          >
            <span className="view-tab-label">{viewMode === 'edit' ? '수정 중' : '새 입력'}</span>
            <span className="view-tab-desc">
              {viewMode === 'edit' ? '저장된 사주 수정하기' : '새로 입력하기'}
            </span>
          </button>
        </div>

        {viewMode === 'saved' ? (
          <section className="saved-view" aria-label="저장된 사주">
            <div className="saved-view-banner">
              <span className="mode-chip mode-chip--saved">저장됨</span>
              <p className="saved-view-title">
                <span className="saved-view-name">{name}</span>
                님의 저장된 사주
              </p>
              <p className="saved-view-hint">왼쪽 목록에서 다른 이름을 고르거나, 위쪽 「새로 입력하기」로 새 사주를 작성하세요.</p>
              <div className="saved-actions">
                <button type="button" className="saved-edit-btn" onClick={startEditReading}>
                  이 사주 수정하기
                </button>
                <button
                  type="button"
                  className="saved-delete-btn"
                  onClick={(event) => {
                    const reading = readings.find((item) => item.id === selectedId)
                    if (reading) handleDeleteReading(reading, event)
                  }}
                >
                  이 사주 삭제하기
                </button>
              </div>
            </div>
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

            {(summary || result || todayFortune || showBlessing) && (
              <div
                key={resultRevealKey}
                className="result-block"
                ref={resultBlockRef}
                aria-live="polite"
              >
                {summary && (
                  <p className="summary reveal-item">
                    <span className="summary-label">한줄 요약</span>
                    {summary}
                  </p>
                )}
                {result && (
                  <div className="result reveal-item">
                    <span className="summary-label">상세 해석</span>
                    {result}
                  </div>
                )}
                {todayFortune && (
                  <p className="today-fortune reveal-item">
                    <span className="summary-label">오늘의 운세</span>
                    {todayFortune}
                  </p>
                )}
                {showBlessing && name && (
                  <p className="blessing reveal-item">{name}님 행운을 빌어요 🍀</p>
                )}
              </div>
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
              {viewMode === 'edit' ? '수정' : '새 입력'}
            </span>
            <p className="create-view-title">
              {viewMode === 'edit'
                ? '저장된 사주 정보를 수정한 뒤 다시 풀이하세요'
                : '새 사주 정보를 입력하세요'}
            </p>
          </div>
          <div className="field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={handleNameChange}
            />
          </div>

          <div className="field">
            <span className="field-legend">생년월일</span>
            <div className="field-row field-row--date">
              <select
                aria-label="출생 연도"
                value={birthYear}
                onChange={(event) => setBirthYear(event.target.value)}
              >
                <option value="">년</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
              <select
                aria-label="출생 월"
                value={birthMonth}
                onChange={(event) => setBirthMonth(event.target.value)}
              >
                <option value="">월</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {Number(month)}월
                  </option>
                ))}
              </select>
              <select
                aria-label="출생 일"
                value={birthDay}
                onChange={(event) => setBirthDay(event.target.value)}
              >
                <option value="">일</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {Number(day)}일
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <span className="field-legend">태어난 시간</span>
            <div className="field-row field-row--time">
              <select
                aria-label="출생 시"
                value={birthHour}
                onChange={(event) => setBirthHour(event.target.value)}
              >
                <option value="">시</option>
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}시
                  </option>
                ))}
              </select>
              <select
                aria-label="출생 분"
                value={birthMinute}
                onChange={(event) => setBirthMinute(event.target.value)}
              >
                <option value="">분</option>
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}분
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="gender">성별</label>
            <select
              id="gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
            >
              <option value="">선택하세요</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="calendarType">양력 / 음력</label>
            <select
              id="calendarType"
              value={calendarType}
              onChange={(event) => setCalendarType(event.target.value)}
            >
              <option value="">선택하세요</option>
              <option value="양력">양력</option>
              <option value="음력">음력</option>
            </select>
          </div>

          <p className="preview">{name}님의 사주 </p>

          <button className="analyze-btn" type="submit" disabled={loading || !user}>
            {loading
              ? '사주 풀이 중...'
              : !user
                ? 'Google 로그인 후 사주 보기'
              : viewMode === 'edit'
                ? '다시 풀이하고 수정 저장'
                : '사주 보기'}
          </button>

          {loading && (
            <p className="loading-text" aria-live="polite">
              고양이가 사주보는중
            </p>
          )}

          {error && <p className="error">{error}</p>}

          {(summary || result || todayFortune || showBlessing) && (
            <div
              key={resultRevealKey}
              className="result-block"
              ref={resultBlockRef}
              aria-live="polite"
            >
              {summary && (
                <p className="summary reveal-item">
                  <span className="summary-label">한줄 요약</span>
                  {summary}
                </p>
              )}
              {result && (
                <div className="result reveal-item">
                  <span className="summary-label">상세 해석</span>
                  {result}
                </div>
              )}
              {todayFortune && (
                <p className="today-fortune reveal-item">
                  <span className="summary-label">오늘의 운세</span>
                  {todayFortune}
                </p>
              )}
              {showBlessing && name && (
                <p className="blessing reveal-item">{name}님 행운을 빌어요 🍀</p>
              )}
            </div>
          )}
        </form>
        )}
      </div>
    </div>
  )
}

export default App
