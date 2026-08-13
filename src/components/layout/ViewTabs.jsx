export default function ViewTabs({
  viewMode,
  profile,
  onSelectProfile,
  onNewSaju,
}) {
  const savedActive = viewMode === 'saved' || viewMode === 'ready'
  const createActive = viewMode === 'create' || viewMode === 'edit'

  return (
    <div className="view-tabs" role="tablist" aria-label="보기 모드">
      <button
        type="button"
        role="tab"
        aria-selected={savedActive}
        className={`view-tab view-tab--saved${savedActive ? ' view-tab--active' : ''}`}
        disabled={!profile}
        onClick={onSelectProfile}
      >
        <span className="view-tab-label">내 사주</span>
        <span className="view-tab-desc">
          {profile ? `${profile.name}의 사주` : '프로필부터 저장해라'}
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={createActive}
        className={`view-tab view-tab--create${createActive ? ' view-tab--active' : ''}`}
        onClick={onNewSaju}
      >
        <span className="view-tab-label">{viewMode === 'edit' ? '수정 중' : '다른 사람'}</span>
        <span className="view-tab-desc">
          {viewMode === 'edit' ? '저장된 사주 수정하기' : '다른 사람 사주 보기'}
        </span>
      </button>
    </div>
  )
}
