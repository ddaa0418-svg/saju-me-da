const GUEST_DRAFT_KEY = 'sajumi-guest-draft'

export function readGuestDraft() {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistGuestDraft(draft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Safari private mode 등에서 sessionStorage가 막힐 수 있다.
  }
}

export function clearGuestDraft() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // ignore
  }
}

export function draftBirthDate(draft) {
  return draft?.birthYear && draft?.birthMonth && draft?.birthDay
    ? `${draft.birthYear}-${draft.birthMonth}-${draft.birthDay}`
    : ''
}

export function draftBirthTime(draft) {
  return draft?.birthHour !== '' && draft?.birthMinute !== ''
    ? `${draft.birthHour}:${draft.birthMinute}`
    : ''
}
