import { useState } from 'react'
import { shareSajuResult } from '../../utils/shareSaju'
import { trackEvent } from '../../lib/analytics'

export default function ShareButton({
  name,
  readingId,
  onMessage,
  className = 'share-btn',
}) {
  const [busy, setBusy] = useState(false)

  const handleShare = async () => {
    if (!readingId || busy) return
    setBusy(true)
    try {
      const outcome = await shareSajuResult({ name, readingId })
      if (outcome === 'copied') {
        trackEvent('share', {
          method: 'copy',
          content_type: 'saju_result',
          item_id: readingId,
        })
        onMessage?.('링크를 복사했다. 친구한테 보내라냥.')
      } else if (outcome === 'shared') {
        trackEvent('share', {
          method: 'native',
          content_type: 'saju_result',
          item_id: readingId,
        })
        onMessage?.('잘 보냈다. 친구가 보면 된다냥.')
      }
    } catch (shareError) {
      console.error(shareError)
      onMessage?.('공유에 실패했다. 다시 눌러 봐라.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleShare}
      disabled={busy || !readingId}
    >
      <ShareIcon />
      {busy ? '공유 준비 중...' : '친구에게 공유하기'}
    </button>
  )
}

function ShareIcon() {
  return (
    <svg
      className="share-btn-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.5 12.5 15 8.8M8.5 11.5 15 15.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="7" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="7.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="16.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
