export const runtime = 'nodejs'

import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { updateDeck } from '@/lib/deck-store'

export async function POST(
  request: Request,
  context: RouteContext<'/api/decks/[id]/cover'>,
) {
  const { id } = await context.params
  const deckId = Number(id)
  if (Number.isNaN(deckId)) {
    return Response.json({ error: 'Invalid deck id' }, { status: 400 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'file is required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${deckId}.${ext}`
  const destPath = path.join(process.cwd(), 'public', 'covers', filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(destPath, buffer)

  const coverUrl = `/covers/${filename}`
  const deck = await updateDeck(deckId, { cover: coverUrl })
  if (!deck) {
    return Response.json({ error: 'Deck not found' }, { status: 404 })
  }

  return Response.json({ cover: coverUrl })
}
