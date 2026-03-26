// src/hooks/useToast.js
import { useState, useCallback } from 'react'

let id = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'info', duration = 3000) => {
    const tid = ++id
    setToasts(t => [...t, { id: tid, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), duration)
  }, [])

  return { toasts, addToast }
}
