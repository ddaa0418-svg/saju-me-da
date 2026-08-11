import { useState } from 'react'
import sajuCat from './assets/saju-cat.png'
import { buildSajuPrompt } from './buildSajuPrompt'
import './App.css'

// .env의 VITE_GEMINI_API_KEY 사용 (Vite는 VITE_ 접두사만 프론트에 노출)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// 신규 키는 gemini-2.5-flash 사용 불가 → Interactions API + gemini-3.6-flash 사용
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
        model: 'gemini-3.6-flash',
        input: prompt,
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
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('')

  const [result, setResult] = useState('')
  const [summary, setSummary] = useState('')
  const [todayFortune, setTodayFortune] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      // JSON만 뽑아서 파싱 (앞뒤에 다른 글자가 붙어도 대비)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        setSummary('')
        setTodayFortune('')
        setResult(text)
        return
      }

      const parsed = JSON.parse(jsonMatch[0])
      setSummary(parsed.summary || '')
      setTodayFortune(parsed.todayFortune || '')
      setResult(parsed.detail || text)
    } catch (err) {
      console.error(err)
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
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
          <label htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="birthTime">태어난 시간</label>
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={(event) => setBirthTime(event.target.value)}
          />
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
            사주 풀이 중... 고양이가 열심히 보는 중이에요
          </p>
        )}

        {error && <p className="error">{error}</p>}

        {(summary || result || todayFortune) && (
          <div className="result-block">
            {summary && (
              <p className="summary">
                <span className="summary-label">한줄 요약</span>
                {summary}
              </p>
            )}
            {result && <div className="result">{result}</div>}
            {todayFortune && (
              <p className="today-fortune">
                <span className="summary-label">오늘의 운세</span>
                {todayFortune}
              </p>
            )}
            <p className="blessing">{name}님 행운을 빌어요 🍀</p>
          </div>
        )}
      </form>
    </div>
  )
}

export default App
