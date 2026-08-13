import { blessingName, toNyangSpeech, toDetailSpeech } from '../../utils/nyangSpeech'
import { parseDetailSections, splitLockedDetail } from '../../utils/detailSections'

function DetailSections({ text, teaser = false, label = '전체 해석' }) {
  const sections = parseDetailSections(text)
  if (!sections.length) return null

  return (
    <div className={`result${teaser ? ' result--teaser' : ''}`}>
      <span className="summary-label">{label}</span>
      <div className="result-sections">
        {sections.map((section, index) => (
          <section className="result-section" key={`${section.heading}-${index}`}>
            {section.heading ? (
              <h3 className="result-section-title">{section.heading}</h3>
            ) : null}
            {section.body ? (
              <p className="result-section-body">{toDetailSpeech(section.body)}</p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}

export default function ResultPanel({
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
  shareButton,
}) {
  if (!(summary || result || todayFortune || showBlessing || shareButton)) return null

  const { preview, locked: lockedDetail } = splitLockedDetail(result)
  const visibleDetail = locked ? preview || result : result

  return (
    <div className="result-block" ref={resultBlockRef} aria-live="polite">
      {summary && (
        <p className="summary reveal-item">
          <span className="summary-label">한줄 요약</span>
          <span className="nyang-copy">{toNyangSpeech(summary)}</span>
        </p>
      )}
      {visibleDetail && (
        <div className="reveal-item">
          <DetailSections
            text={visibleDetail}
            label={locked ? '해석 미리보기' : '전체 해석'}
          />
        </div>
      )}
      {locked ? (
        <div className="result-lock reveal-item">
          <div className="result-lock-preview" aria-hidden="true">
            {lockedDetail ? (
              <DetailSections text={lockedDetail} teaser label="이어서" />
            ) : null}
            {todayFortune ? (
              <p className="today-fortune">
                <span className="summary-label">오늘의 운세</span>
                <span className="nyang-copy">{toNyangSpeech(todayFortune)}</span>
              </p>
            ) : (
              <p className="today-fortune">
                <span className="summary-label">오늘의 운세</span>
                <span className="nyang-copy">
                  잠긴 운세 문장. 로그인하면 약점과 재능까지 이어서 본다냥.
                </span>
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
              <span className="nyang-copy">{toNyangSpeech(todayFortune)}</span>
            </p>
          )}
          {showBlessing && name && (
            <p className="blessing reveal-item">
              {blessingName(name)} 행운을 빈다냥.
            </p>
          )}
          {shareButton}
        </>
      )}
    </div>
  )
}
