const GA_MEASUREMENT_ID = 'G-KP26NE8ZFT'

function isLocalHost() {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function canTrack() {
  return typeof window.gtag === 'function' && !isLocalHost()
}

export function trackEvent(eventName, params = {}) {
  if (!canTrack()) return
  window.gtag('event', eventName, params)
}

export function setAnalyticsUser(userId) {
  if (typeof window.gtag !== 'function') return
  window.gtag('set', { user_id: userId || undefined })
}

export { GA_MEASUREMENT_ID }
