import { prisma } from '@/lib/prisma'
import type { MessageData } from '@/lib/message-data'

function toMessage(row: {
  id: number
  original: string
  translation: string
  timestamp: string
}): MessageData {
  return {
    id: row.id,
    original: row.original,
    translation: row.translation,
    timestamp: row.timestamp,
  }
}

export async function readMessages(deckId: number): Promise<MessageData[]> {
  const rows = await prisma.message.findMany({
    where: { deckId },
    orderBy: { id: 'asc' },
  })
  return rows.map(toMessage)
}

export async function appendMessage(
  deckId: number,
  message: Omit<MessageData, 'id'>,
): Promise<MessageData> {
  const row = await prisma.message.create({
    data: {
      original: message.original,
      translation: message.translation,
      timestamp: message.timestamp,
      deckId,
    },
  })
  return toMessage(row)
}

export async function updateMessageTranslation(
  deckId: number,
  messageId: number,
  translation: string,
): Promise<MessageData | null> {
  try {
    const row = await prisma.message.update({
      where: { id: messageId, deckId },
      data: { translation },
    })
    return toMessage(row)
  } catch {
    return null
  }
}

export async function deleteMessageById(
  deckId: number,
  messageId: number,
): Promise<boolean> {
  try {
    await prisma.message.delete({ where: { id: messageId, deckId } })
    return true
  } catch {
    return false
  }
}
