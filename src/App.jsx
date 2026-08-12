import { useEffect, useRef, useState } from 'react'
import sajuCat from './assets/saju-cat.png'
import { buildSajuPrompt } from './buildSajuPrompt'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

// .env의 VITE_GEMINI_API_KEY 사용 (Vite는 VITE_ 접두사만 프론트에 노출)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Interactions API — 할당량 여유 있는 lite 모델 사용
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
        model: 'gemini-2.5-flash-lite',
        input: prompt,
        generation_config: {
          thinking_level: 'minimal',
          max_output_tokens: 400,
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
  const [resultRevealKey, setResultRevealKey] = useState(0)
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

  const loadReadings = async () => {
    if (!isSupabaseConfigured) {
      setReadingsError(
        'Supabase 환경변수가 없습니다. .env에 URL/키를 넣고 npm run dev를 재시작하세요.'
      )
      setReadings([])
      return
    }

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select(
        'id, name, birth_date, birth_time, gender, calendar_type, summary, detail, today_fortune, created_at'
      )
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error(fetchError)
      setReadingsError(fetchError.message || '저장된 사주를 불러오지 못했습니다.')
      setReadings([])
      return
    }

    setReadingsError('')
    setReadings(data || [])
  }

  useEffect(() => {
    loadReadings()
  }, [])

  const applyReadingToForm = async (reading) => {
    const token = ++selectTokenRef.current
    const [y = '', m = '', d = ''] = (reading.birth_date || '').split('-')
    const [h = '', min = ''] = (reading.birth_time || '').split(':')

    setName(reading.name || '')
    setBirthYear(y)
    setBirthMonth(m)
    setBirthDay(d)
    setBirthHour(h)
    setBirthMinute(min)
    setGender(reading.gender || '')
    setCalendarType(reading.calendar_type || '')
    setSelectedId(reading.id)
    setError('')
    setSummary('')
    setResult('')
    setTodayFortune('')
    setShowBlessing(false)
    setResultRevealKey((key) => key + 1)

    requestAnimationFrame(() => {
      resultBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })

    // 저장된 결과도 빠르게 복원
    if (reading.summary) {
      if (token !== selectTokenRef.current) return
      setSummary(reading.summary)
    }

    if (reading.detail) {
      if (token !== selectTokenRef.current) return
      setResult(reading.detail)
    }

    if (reading.today_fortune) {
      if (token !== selectTokenRef.current) return
      setTodayFortune(reading.today_fortune)
    }

    if (token !== selectTokenRef.current) return
    setShowBlessing(Boolean(reading.summary || reading.detail || reading.today_fortune))
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
    setResultRevealKey((key) => key + 1)
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

    setLoading(true)
    setError('')
    setResult('')
    setSummary('')
    setTodayFortune('')
    setShowBlessing(false)
    setSelectedId(null)

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

      // CSS 애니메이션으로 바로 표시 (인위적 대기 없음)
      setSummary(parsed.summary || '')
      setResult(parsed.detail || '')
      setTodayFortune(parsed.todayFortune || '')
      setShowBlessing(true)
      setLoading(false)

      const { data: saved, error: saveError } = await supabase
        .from('saju_readings')
        .insert({
          name,
          birth_date: birthDate,
          birth_time: birthTime,
          gender,
          calendar_type: calendarType,
          summary: parsed.summary || '',
          detail: parsed.detail || '',
          today_fortune: parsed.todayFortune || '',
        })
        .select('id, name, birth_date, birth_time, gender, calendar_type, summary, detail, today_fortune, created_at')
        .single()

      if (saveError) {
        console.error(saveError)
        setError('사주 결과는 나왔지만 저장에 실패했습니다.')
      } else if (saved) {
        setSelectedId(saved.id)
        setReadings((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)])
      }
    } catch (err) {
      console.error(err)
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar" aria-label="저장된 사주 목록">
        <h2 className="sidebar-title">저장된 사주</h2>
        <button type="button" className="new-saju-btn" onClick={startNewSaju}>
          새 사주 만들기
        </button>
        {readingsError ? (
          <p className="sidebar-empty sidebar-error">{readingsError}</p>
        ) : readings.length === 0 ? (
          <p className="sidebar-empty">아직 저장된 사주가 없습니다.</p>
        ) : (
          <ul className="sidebar-list">
            {readings.map((reading) => (
              <li key={reading.id}>
                <button
                  type="button"
                  className={`sidebar-item${selectedId === reading.id ? ' sidebar-item--active' : ''}`}
                  onClick={() => applyReadingToForm(reading)}
                >
                  {reading.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="sidebar-refresh" onClick={loadReadings}>
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

        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            handleAnalyze()
          }}
        >
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

          <button className="analyze-btn" type="submit" disabled={loading}>
            {loading ? '사주 풀이 중...' : '사주 보기'}
          </button>

          {loading && (
            <p className="loading-text" aria-live="polite">
              고양이가 사주보는중
            </p>
          )}

          {error && <p className="error">{error}</p>}

          {(summary || result || todayFortune || showBlessing || selectedId) && (
            <div
              key={resultRevealKey}
              className="result-block"
              ref={resultBlockRef}
              aria-live="polite"
            >
              {selectedId && (
                <p className="result-heading reveal-item">
                  <span className="result-heading-name">{name}</span>
                  님의 저장된 사주
                </p>
              )}
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
      </div>
    </div>
  )
}

export default App
