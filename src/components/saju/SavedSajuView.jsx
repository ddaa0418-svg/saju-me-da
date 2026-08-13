import LoadingOven from '../brand/LoadingOven'
import ResultPanel from './ResultPanel'
import SavedMeta from './SavedMeta'
import ShareButton from './ShareButton'

export default function SavedSajuView({
  viewMode,
  name,
  birthDate,
  birthTime,
  gender,
  calendarType,
  isViewingProfile,
  loading,
  error,
  canShareResult,
  selectedId,
  resultRevealKey,
  summary,
  result,
  todayFortune,
  showBlessing,
  resultBlockRef,
  resultLocked,
  onLogin,
  authBusy,
  loginDisabled,
  onAnalyze,
  onEditProfile,
  onEditReading,
  onDelete,
  onToast,
  user,
}) {
  return (
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
            ? '정보는 이미 있다. 사주만 보면 된다냥.'
            : '다른 사람 사주다. 내 걸로 돌아가려면 「내 사주」를 눌러라냥.'}
        </p>
        <div className="saved-actions">
          {viewMode === 'ready' ? (
            <button
              type="button"
              className="saved-edit-btn"
              onClick={onAnalyze}
              disabled={loading || !user}
            >
              {loading ? '식빵 굽는 중...' : '사주 본다냥'}
            </button>
          ) : null}
          {isViewingProfile ? (
            <button type="button" className="saved-secondary-btn" onClick={onEditProfile}>
              프로필 수정
            </button>
          ) : (
            <>
              <button type="button" className="saved-secondary-btn" onClick={onEditReading}>
                정보 수정하기
              </button>
              <button type="button" className="saved-delete-btn" onClick={onDelete}>
                이 정보 삭제하기
              </button>
            </>
          )}
          {canShareResult ? (
            <ShareButton name={name} readingId={selectedId} onMessage={onToast} />
          ) : null}
        </div>
      </div>
      {loading && <LoadingOven />}
      <SavedMeta
        birthDate={birthDate}
        birthTime={birthTime}
        gender={gender}
        calendarType={calendarType}
      />

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
          onLogin={onLogin}
          authBusy={authBusy}
          loginDisabled={loginDisabled}
          shareButton={
            canShareResult ? (
              <div className="share-actions reveal-item">
                <ShareButton name={name} readingId={selectedId} onMessage={onToast} />
              </div>
            ) : null
          }
        />
      )}
    </section>
  )
}
