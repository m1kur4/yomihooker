export const runtime = 'nodejs'

import { readDeckStats } from '@/lib/message-store'

export async function GET(
  _request: Request,
  context: RouteContext<'/api/decks/[id]/stats'>,
) {
  const { id } = await context.params
  const deckId = Number(id)
  if (Number.isNaN(deckId)) {
    return Response.json({ error: 'Invalid deck id' }, { status: 400 })
  }

  const stats = await readDeckStats(deckId)
  return Response.json(stats)
}
