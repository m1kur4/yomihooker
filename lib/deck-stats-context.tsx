'use client'

import { createContext, useContext, useState } from 'react'

type DeckStatsContextValue = {
  charCount: number
  setCharCount: (count: number) => void
  todayCharCount: number
  setTodayCharCount: (count: number) => void
}

const DeckStatsContext = createContext<DeckStatsContextValue>({
  charCount: 0,
  setCharCount: () => {},
  todayCharCount: 0,
  setTodayCharCount: () => {},
})

export function DeckStatsProvider({ children }: { children: React.ReactNode }) {
  const [charCount, setCharCount] = useState(0)
  const [todayCharCount, setTodayCharCount] = useState(0)
  return (
    <DeckStatsContext.Provider value={{ charCount, setCharCount, todayCharCount, setTodayCharCount }}>
      {children}
    </DeckStatsContext.Provider>
  )
}

export function useDeckStats() {
  return useContext(DeckStatsContext)
}
