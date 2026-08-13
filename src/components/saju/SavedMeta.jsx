export default function SavedMeta({ birthDate, birthTime, gender, calendarType }) {
  return (
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
  )
}
