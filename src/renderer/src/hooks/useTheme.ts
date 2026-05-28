import { useState, useEffect } from 'react'

export type Theme = 'pastel' | 'white' | 'dark'

const THEMES: Theme[] = ['pastel', 'white', 'dark']
const STORAGE_KEY = 'app-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'pastel'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'pastel') {
      delete root.dataset.theme
    } else {
      root.dataset.theme = theme
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const cycleTheme = () => {
    setTheme((prev) => {
      const idx = THEMES.indexOf(prev)
      return THEMES[(idx + 1) % THEMES.length]
    })
  }

  return { theme, setTheme, cycleTheme }
}
