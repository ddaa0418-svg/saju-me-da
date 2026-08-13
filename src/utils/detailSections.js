export const DETAIL_HEADINGS = [
  '성격 및 기질 분석',
  '특이한 점',
  '솔직한 약점',
  '돋보이는 결정적 재능',
  '해석을 마치며...',
]

export function parseDetailSections(detail) {
  const text = String(detail || '').trim()
  if (!text) return []

  const positions = DETAIL_HEADINGS.map((heading) => ({
    heading,
    index: text.indexOf(heading),
  }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)

  if (positions.length === 0) {
    return [{ heading: '', body: text }]
  }

  const sections = []
  const lead = text.slice(0, positions[0].index).trim()
  if (lead) sections.push({ heading: '', body: lead })

  positions.forEach((pos, i) => {
    const start = pos.index + pos.heading.length
    const end = i + 1 < positions.length ? positions[i + 1].index : text.length
    const body = text.slice(start, end).replace(/^[\s:：\-–]+/, '').trim()
    sections.push({ heading: pos.heading, body })
  })

  return sections
}

export function splitLockedDetail(detail) {
  const text = String(detail || '').trim()
  if (!text) return { preview: '', locked: '' }

  const positions = DETAIL_HEADINGS.map((heading) => ({
    heading,
    index: text.indexOf(heading),
  }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)

  if (positions.length >= 3) {
    const cut = positions[2].index
    return {
      preview: text.slice(0, cut).trim(),
      locked: text.slice(cut).trim(),
    }
  }

  const mid = Math.max(80, Math.floor(text.length * 0.45))
  const newlineCut = text.indexOf('\n', mid)
  const cut = newlineCut >= 0 ? newlineCut : mid
  return {
    preview: text.slice(0, cut).trim(),
    locked: text.slice(cut).trim(),
  }
}
