'use client'

import { useEffect } from 'react'

const mediaQuery = '(prefers-color-scheme: dark)'

function applySystemTheme(matchesDark: boolean) {
  document.documentElement.classList.toggle('dark', matchesDark)
}

export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia(mediaQuery)

    applySystemTheme(media.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      applySystemTheme(event.matches)
    }

    media.addEventListener('change', handleChange)

    return () => {
      media.removeEventListener('change', handleChange)
    }
  }, [])

  return null
}
