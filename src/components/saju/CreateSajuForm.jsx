import LoadingOven from '../brand/LoadingOven'
import BirthInfoFields from '../form/BirthInfoFields'
import ResultPanel from './ResultPanel'
import ShareButton from './ShareButton'

export default function CreateSajuForm({
  viewMode,
  values,
  onFieldChange,
  birthOptions,
  name,
  loading,
  error,
  onSubmit,
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
  canShareResult,
  selectedId,
  onToast,
}) {
  return (
    <form
      className={`form form--create${viewMode === 'edit' ? ' form--edit' : ''}`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="create-view-banner">
        <span className={`mode-chip ${viewMode === 'edit' ? 'mode-chip--edit' : 'mode-chip--create'}`}>
          {viewMode === 'edit' ? '수정' : '다른 사람'}
        </span>
        <p className="create-view-title">
          {viewMode === 'edit'
            ? '정보 고친 뒤 다시 풀이한다.'
            : '다른 사람의 사주도 보고싶냥. 정보는 정확히 넣어라냥'}
        </p>
      </div>
      <BirthInfoFields
        idPrefix="saju"
        values={values}
        onChange={onFieldChange}
        years={birthOptions.years}
        months={birthOptions.months}
        days={birthOptions.days}
        hours={birthOptions.hours}
        minutes={birthOptions.minutes}
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
    </form>
  )
}
