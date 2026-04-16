export const runtime = 'nodejs'

import { createDeck, readDecks } from '@/lib/deck-store'

export async function GET() {
  const decks = await readDecks()
  return Response.json(decks)
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    name?: string
    cover?: string
  } | null

  if (!payload || typeof payload.name !== 'string' || !payload.name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const deck = await createDeck(
    payload.name.trim(),
    typeof payload.cover === 'string' ? payload.cover : undefined,
  )

  return Response.json(deck, { status: 201 })
}
