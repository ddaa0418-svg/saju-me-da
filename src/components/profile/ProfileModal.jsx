import { useEffect, useState } from 'react'
import BirthInfoFields from '../form/BirthInfoFields'
import { combineBirthDate, combineBirthTime, emptyBirthValues } from '../../utils/birthOptions'

export default function ProfileModal({
  mode,
  initialValues,
  years,
  months,
  days,
  hours,
  minutes,
  saving,
  error,
  onSubmit,
  onCancel,
  onLogout,
}) {
  const [values, setValues] = useState(() => ({
    ...emptyBirthValues(),
    ...initialValues,
  }))
  const isOnboard = mode === 'onboard'

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (isOnboard) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onCancel?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOnboard, onCancel, saving])

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const birthDate = combineBirthDate(values.birthYear, values.birthMonth, values.birthDay)
    const birthTime = combineBirthTime(values.birthHour, values.birthMinute)

    if (
      !values.name.trim() ||
      !birthDate ||
      !birthTime ||
      !values.gender ||
      !values.calendarType
    ) {
      return
    }

    onSubmit({
      name: values.name.trim(),
      birthDate,
      birthTime,
      gender: values.gender,
      calendarType: values.calendarType,
    })
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (!isOnboard && event.target === event.currentTarget && !saving) {
          onCancel?.()
        }
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <p className="modal-eyebrow">{isOnboard ? '처음이다' : '내 프로필'}</p>
        <h2 id="profile-modal-title" className="modal-title">
          {isOnboard ? '사주에 필요한 정보다. 빠짐없이 넣어라.' : '프로필 수정'}
        </h2>
        <p className="modal-copy">
          {isOnboard
            ? '한 번만 입력하면 다음부터 바로 본다. 전부 필수다냥.'
            : '이름과 생년월일은 저장 후에도 바꿀 수 있다.'}
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <BirthInfoFields
            idPrefix="profile"
            values={values}
            onChange={handleChange}
            years={years}
            months={months}
            days={days}
            hours={hours}
            minutes={minutes}
          />

          {error ? <p className="error">{error}</p> : null}

          <div className="modal-actions">
            {!isOnboard ? (
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={onCancel}
                disabled={saving}
              >
                취소
              </button>
            ) : null}
            <button className="modal-primary-btn" type="submit" disabled={saving}>
              {saving
                ? '저장 중...'
                : isOnboard
                  ? '저장하고 시작한다'
                  : '프로필 저장'}
            </button>
          </div>
        </form>

        {isOnboard && onLogout ? (
          <button
            type="button"
            className="modal-logout"
            onClick={onLogout}
            disabled={saving}
          >
            다른 계정으로 로그인
          </button>
        ) : null}
      </div>
    </div>
  )
}
