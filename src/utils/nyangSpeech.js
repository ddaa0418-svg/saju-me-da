/** 한국 이름 3글자면 이름만 쓴다. 정다혜 → 다혜 */
export function blessingName(name) {
  const trimmed = String(name || '').trim()
  if (/^[가-힣]{3}$/.test(trimmed)) return trimmed.slice(-2)
  return trimmed
}

/** 한줄 요약·오늘의 운세처럼 모든 문장을 냥체로 맞춘다. */
export function toNyangSpeech(text) {
  return convertToHaera(text, { nyangEverySentence: true })
}

/** 전체 해석 본문: 해라체로 풀고, 마지막 문장만 냥. */
export function toDetailSpeech(text) {
  return convertToHaera(text, { nyangEverySentence: false })
}

function convertToHaera(text, { nyangEverySentence }) {
  const raw = String(text || '').trim()
  if (!raw) return raw

  let t = raw
    .replace(/당신의/g, '네')
    .replace(/당신/g, '너')
    .replace(/것입니다/g, '거다')
    .replace(/좋습니다/g, '좋다')
    .replace(/됩니다/g, '된다')
    .replace(/입니다/g, '이다')
    .replace(/습니다/g, '다')
    .replace(/해요/g, '한다')
    .replace(/네요/g, '다')

  if (nyangEverySentence) {
    if (/냥/.test(t)) return t
    t = addNyangToSentences(t)
    if (!/냥/.test(t)) t = t.replace(/[.!?…]+$/, '') + '냥.'
    return t
  }

  if (/냥/.test(t)) return t
  return addNyangToLastSentence(t)
}

function addNyangToSentences(t) {
  return t
    .replace(/([다라])([.!?…]+)(?=\s|$)/g, '$1냥$2')
    .replace(/([다라])$/, '$1냥')
    .replace(/냥냥/g, '냥')
}

function addNyangToLastSentence(t) {
  const withNyang = t
    .replace(/([다라])([.!?…]+)(?=\s*$)/, '$1냥$2')
    .replace(/([다라])$/, '$1냥')
    .replace(/냥냥/g, '냥')

  if (/냥/.test(withNyang)) return withNyang
  return t.replace(/[.!?…]+$/, '') + '냥.'
}
