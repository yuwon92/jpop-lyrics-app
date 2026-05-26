import { useEffect } from 'react'

export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onEscape])
}
