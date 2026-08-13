export function getBirthSelectOptions() {
  const currentYear = new Date().getFullYear()

  return {
    years: Array.from({ length: currentYear - 1920 + 1 }, (_, i) =>
      String(currentYear - i)
    ),
    months: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    days: Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')),
    hours: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    minutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
  }
}

export function combineBirthDate(year, month, day) {
  return year && month && day ? `${year}-${month}-${day}` : ''
}

export function combineBirthTime(hour, minute) {
  return hour !== '' && minute !== '' ? `${hour}:${minute}` : ''
}

export function emptyBirthValues() {
  return {
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    birthMinute: '',
    gender: '',
    calendarType: '',
  }
}
