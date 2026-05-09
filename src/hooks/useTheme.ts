import { useState, useEffect } from 'react'

// Module-level singleton — all useTheme instances share the same value
const listeners = new Set<(t: 'dark' | 'light') => void>()
let _theme: 'dark' | 'light' = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'

function applyTheme(next: 'dark' | 'light') {
  _theme = next
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('theme', next)
  listeners.forEach(fn => fn(next))
}

// Apply on load so the DOM is correct immediately
applyTheme(_theme)

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(_theme)

  useEffect(() => {
    listeners.add(setTheme)
    return () => { listeners.delete(setTheme) }
  }, [])

  const toggle = () => applyTheme(_theme === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
