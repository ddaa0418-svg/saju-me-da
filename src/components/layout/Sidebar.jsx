import {
  getUserAvatarUrl,
  getUserDisplayName,
  isSupabaseConfigured,
} from '../../lib/supabase'

export default function Sidebar({
  authReady,
  user,
  profile,
  authBusy,
  profileModal,
  onEditProfile,
  onLogout,
  onLogin,
  onNewSaju,
  readingsError,
  otherPeople,
  selectedUserId,
  viewMode,
  onSelectPerson,
  onDeletePerson,
  onRefresh,
}) {
  const avatarUrl = getUserAvatarUrl(user)

  return (
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
              onClick={onEditProfile}
              disabled={!profile || profileModal === 'onboard'}
            >
              프로필 수정
            </button>
            <button
              type="button"
              className="auth-logout-btn"
              onClick={onLogout}
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
              onClick={onLogin}
              disabled={authBusy || !isSupabaseConfigured}
            >
              {authBusy ? '이동 중…' : 'Google로 로그인'}
            </button>
          </>
        )}
      </div>

      <h2 className="sidebar-title">다른 사람</h2>
      <button type="button" className="new-saju-btn" onClick={onNewSaju}>
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
                onClick={() => onSelectPerson(person)}
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
                onClick={(event) => onDeletePerson(person, event)}
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
        onClick={onRefresh}
        disabled={!user}
      >
        목록 새로고침
      </button>
    </aside>
  )
}
