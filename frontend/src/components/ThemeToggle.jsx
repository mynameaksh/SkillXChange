import { useEffect, useState } from 'react'

const THEMES = ['light', 'emeraldDark']

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'emeraldDark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const next = () => {
    const idx = THEMES.indexOf(theme)
    setTheme(THEMES[(idx + 1) % THEMES.length])
  }

  return (
    <button className="btn btn-sm" onClick={next} aria-label="Toggle theme">
      {theme === 'emeraldDark' ? 'Dark' : 'Light'}
    </button>
  )
}


