const SHARE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isShareId(value) {
  return SHARE_ID_RE.test(String(value || ''))
}

export function getResultShareIdFromPath(pathname = window.location.pathname) {
  const match = String(pathname || '').match(/^\/result\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

const PUBLIC_ORIGIN = 'https://saju-me-da.vercel.app'

function isLocalHost() {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

export function getShareOrigin() {
  if (isLocalHost()) return PUBLIC_ORIGIN
  return window.location.origin.replace(/\/$/, '')
}

export function getShareUrl(readingId) {
  return `${getShareOrigin()}/result/${readingId}?s=3`
}

function getShareCopy({ name }) {
  const title = name ? `🐱 ${name}님의 사주 해석` : '🐱 사주 해석'
  const text = name
    ? `${name}님의 사주 결과를 사주미에서 봤다냥.`
    : '사주미에서 본 사주 결과다냥.'
  return { title, text }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

/** @returns {Promise<'shared' | 'copied' | 'cancelled'>} */
export async function shareSajuResult({ name, readingId }) {
  if (!readingId) {
    throw new Error('공유할 결과가 없다.')
  }

  const url = getShareUrl(readingId)
  const { title, text } = getShareCopy({ name })

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (shareError) {
      if (shareError?.name === 'AbortError') return 'cancelled'
    }
  }

  await copyText(`${title}\n${text}\n${url}`)
  return 'copied'
}
