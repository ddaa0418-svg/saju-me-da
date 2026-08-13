import { useEffect, useState } from 'react'
import { BrandHeader } from '../components/brand'
import { Toast } from '../components/layout'
import { ResultPanel, SavedMeta, ShareButton } from '../components/saju'
import { useToast } from '../hooks/useToast'
import { fetchSharedSajuReading, isSupabaseConfigured } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'
import { isShareId } from '../utils/shareSaju'
import '../App.css'

export default function SharedResultPage({ shareId }) {
  const { toast, showToast } = useToast()
  const [reading, setReading] = useState(null)
  const [status, setStatus] = useState(() =>
    isShareId(shareId) ? 'loading' : 'missing'
  )
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!isShareId(shareId)) return

      if (!isSupabaseConfigured) {
        setError('Supabase 환경변수가 없습니다.')
        setStatus('error')
        return
      }

      try {
        const data = await fetchSharedSajuReading(shareId)
        if (cancelled) return
        if (!data) {
          setStatus('missing')
          return
        }
        setReading(data)
        setStatus('ready')
        document.title = data.name
          ? `${data.name}님의 사주 해석`
          : '공유된 사주 해석'
        trackEvent('shared_result_view', { item_id: shareId })
      } catch (loadError) {
        console.error(loadError)
        if (cancelled) return
        setError(loadError.message || '사주 결과를 불러오지 못했다.')
        setStatus('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [shareId])

  const birthTime = String(reading?.birth_time || '').slice(0, 5)

  return (
    <div className="layout layout--shared">
      <div className="app">
        <BrandHeader tagline="친구가 보낸 사주다. 로그인은 필요 없다냥." />

        {status === 'loading' ? (
          <section className="saved-view" aria-label="공유된 사주">
            <p className="shared-status">사주 결과를 꺼내는 중이다…</p>
          </section>
        ) : status === 'missing' ? (
          <section className="saved-view" aria-label="없는 사주">
            <p className="saved-view-title">이 사주 결과는 없다.</p>
            <p className="saved-view-hint">링크가 잘못됐거나, 주인이 지웠을 수 있다.</p>
            <a
              className="shared-home-link"
              href="/"
              onClick={() => trackEvent('cta_try_own_saju', { source: 'missing' })}
            >
              내 사주 보러 가기
            </a>
          </section>
        ) : status === 'error' ? (
          <section className="saved-view" aria-label="불러오기 실패">
            <p className="saved-view-title">결과를 열지 못했다.</p>
            <p className="error">{error}</p>
            <a
              className="shared-home-link"
              href="/"
              onClick={() => trackEvent('cta_try_own_saju', { source: 'error' })}
            >
              내 사주 보러 가기
            </a>
          </section>
        ) : (
          <section className="saved-view" aria-label="공유된 사주">
            <div className="saved-view-banner">
              <span className="mode-chip mode-chip--saved">공유됨</span>
              <p className="saved-view-title">
                <span className="saved-view-name">{reading.name || '이름 없음'}</span>
                님의 사주
              </p>
              <p className="saved-view-hint">링크만 있으면 된다. 로그인하지 않아도 된다.</p>
              <div className="saved-actions">
                <ShareButton
                  name={reading.name}
                  readingId={reading.id}
                  onMessage={showToast}
                />
              </div>
            </div>

            {(reading.birth_date || birthTime || reading.gender || reading.calendar_type) && (
              <SavedMeta
                birthDate={reading.birth_date}
                birthTime={birthTime}
                gender={reading.gender}
                calendarType={reading.calendar_type}
              />
            )}

            <ResultPanel
              name={reading.name}
              summary={reading.summary}
              result={reading.detail}
              todayFortune={reading.today_fortune}
              showBlessing
              locked={false}
              shareButton={
                <div className="share-actions reveal-item">
                  <ShareButton
                    name={reading.name}
                    readingId={reading.id}
                    onMessage={showToast}
                  />
                </div>
              }
            />

            <a
              className="shared-home-link"
              href="/"
              onClick={() => trackEvent('cta_try_own_saju', { source: 'shared' })}
            >
              내 사주도 보러 가기
            </a>
          </section>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  )
}
