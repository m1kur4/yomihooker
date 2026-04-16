import { prisma } from '@/lib/prisma'
import type { Deck } from '@/lib/deck-data'

function toDeck(row: {
  id: number
  name: string
  cover: string | null
  createdAt: Date
}): Deck {
  return {
    id: row.id,
    name: row.name,
    cover: row.cover ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function readDecks(): Promise<Deck[]> {
  const rows = await prisma.deck.findMany({ orderBy: { createdAt: 'asc' } })
  return rows.map(toDeck)
}

export async function createDeck(name: string, cover?: string): Promise<Deck> {
  const row = await prisma.deck.create({
    data: { name, cover: cover ?? null },
  })
  return toDeck(row)
}

export async function updateDeck(
  id: number,
  updates: Partial<Pick<Deck, 'name' | 'cover'>>,
): Promise<Deck | null> {
  try {
    const row = await prisma.deck.update({
      where: { id },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.cover !== undefined ? { cover: updates.cover } : {}),
      },
    })
    return toDeck(row)
  } catch {
    return null
  }
}

export async function deleteDeck(id: number): Promise<boolean> {
  try {
    await prisma.deck.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}
