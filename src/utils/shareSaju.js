const SHARE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isShareId(value) {
  return SHARE_ID_RE.test(String(value || ''))
}

export function getResultShareIdFromPath(pathname = window.location.pathname) {
  const match = String(pathname || '').match(/^\/result\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function getShareUrl(readingId) {
  return `${window.location.origin}/result/${readingId}`
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
  const title = name ? `${name}님의 사주 해석` : '사주 해석'
  const text = name
    ? `${name}님의 사주 결과를 사주미에서 봤다냥.`
    : '사주미에서 본 사주 결과다냥.'

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (shareError) {
      if (shareError?.name === 'AbortError') return 'cancelled'
    }
  }

  await copyText(url)
  return 'copied'
}
