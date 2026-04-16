'use client'

import { createContext, useContext, useState } from 'react'

type DeckStatsContextValue = {
  charCount: number
  setCharCount: (count: number) => void
}

const DeckStatsContext = createContext<DeckStatsContextValue>({
  charCount: 0,
  setCharCount: () => {},
})

export function DeckStatsProvider({ children }: { children: React.ReactNode }) {
  const [charCount, setCharCount] = useState(0)
  return (
    <DeckStatsContext.Provider value={{ charCount, setCharCount }}>
      {children}
    </DeckStatsContext.Provider>
  )
}

export function useDeckStats() {
  return useContext(DeckStatsContext)
}
