export default function BirthInfoFields({
  idPrefix,
  values,
  onChange,
  years,
  months,
  days,
  hours,
  minutes,
}) {
  const set = (field) => (event) => onChange(field, event.target.value)

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>
          이름 <span className="field-required">필수</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          placeholder="이름을 입력하세요"
          value={values.name}
          onChange={set('name')}
          required
          autoComplete="name"
          autoFocus={idPrefix === 'profile'}
        />
      </div>

      <div className="field">
        <span className="field-legend">
          생년월일 <span className="field-required">필수</span>
        </span>
        <div className="field-row field-row--date">
          <select
            aria-label="출생 연도"
            value={values.birthYear}
            onChange={set('birthYear')}
            required
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
            value={values.birthMonth}
            onChange={set('birthMonth')}
            required
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
            value={values.birthDay}
            onChange={set('birthDay')}
            required
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
        <span className="field-legend">
          태어난 시간 <span className="field-required">필수</span>
        </span>
        <div className="field-row field-row--time">
          <select
            aria-label="출생 시"
            value={values.birthHour}
            onChange={set('birthHour')}
            required
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
            value={values.birthMinute}
            onChange={set('birthMinute')}
            required
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
        <label htmlFor={`${idPrefix}-gender`}>
          성별 <span className="field-required">필수</span>
        </label>
        <select
          id={`${idPrefix}-gender`}
          value={values.gender}
          onChange={set('gender')}
          required
        >
          <option value="">선택하세요</option>
          <option value="남성">남성</option>
          <option value="여성">여성</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-calendar`}>
          양력 / 음력 <span className="field-required">필수</span>
        </label>
        <select
          id={`${idPrefix}-calendar`}
          value={values.calendarType}
          onChange={set('calendarType')}
          required
        >
          <option value="">선택하세요</option>
          <option value="양력">양력</option>
          <option value="음력">음력</option>
        </select>
      </div>
    </>
  )
}
