'use client'

import { useDeckStats } from '@/lib/deck-stats-context'

export function DeckCharCount() {
  const { charCount, todayCharCount } = useDeckStats()
  return (
    <span className="text-muted-foreground ml-auto text-sm tabular-nums">
      {todayCharCount.toLocaleString()}/{charCount.toLocaleString()}
    </span>
  )
}
