export const runtime = 'nodejs'

import type { MessageData } from '@/lib/message-data'
import { appendMessage, readMessagesPaginated } from '@/lib/message-store'

export async function GET(
  request: Request,
  context: RouteContext<'/api/decks/[id]/messages'>,
) {
  const { id } = await context.params
  const deckId = Number(id)
  if (Number.isNaN(deckId)) {
    return Response.json({ error: 'Invalid deck id' }, { status: 400 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? '1000'))

  const result = await readMessagesPaginated(deckId, page, pageSize)
  return Response.json(result)
}

export async function POST(
  request: Request,
  context: RouteContext<'/api/decks/[id]/messages'>,
) {
  const { id } = await context.params
  const deckId = Number(id)
  if (Number.isNaN(deckId)) {
    return Response.json({ error: 'Invalid deck id' }, { status: 400 })
  }

  const payload = (await request.json()) as Partial<Omit<MessageData, 'id'>>

  if (
    typeof payload.original !== 'string' ||
    typeof payload.translation !== 'string' ||
    typeof payload.timestamp !== 'string'
  ) {
    return Response.json({ error: 'Invalid message payload' }, { status: 400 })
  }

  const message = await appendMessage(deckId, {
    original: payload.original,
    translation: payload.translation,
    timestamp: payload.timestamp,
  })

  return Response.json(message, { status: 201 })
}
