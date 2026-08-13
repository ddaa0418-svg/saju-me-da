import { useEffect, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const toastHideRef = useRef(null)
  const toastRemoveRef = useRef(null)

  useEffect(() => {
    return () => {
      window.clearTimeout(toastHideRef.current)
      window.clearTimeout(toastRemoveRef.current)
    }
  }, [])

  const showToast = (message) => {
    window.clearTimeout(toastHideRef.current)
    window.clearTimeout(toastRemoveRef.current)
    setToast({ id: Date.now(), message, leaving: false })
    toastHideRef.current = window.setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, leaving: true } : null))
      toastRemoveRef.current = window.setTimeout(() => {
        setToast(null)
      }, 420)
    }, 2500)
  }

  return { toast, showToast }
}
