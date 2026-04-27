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

export async function readMessagesPaginated(
  deckId: number,
  page: number,
  pageSize: number,
): Promise<{ messages: MessageData[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where: { deckId },
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.message.count({ where: { deckId } }),
  ])
  return { messages: rows.map(toMessage), total }
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

export async function readDeckStats(
  deckId: number,
): Promise<{ totalChars: number; todayChars: number }> {
  const todayPrefix = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Shanghai' })
  const [totalResult, todayResult] = await Promise.all([
    prisma.$queryRaw<[{ total: bigint | null }]>`
      SELECT SUM(LENGTH(original)) as total FROM Message WHERE deckId = ${deckId}
    `,
    prisma.$queryRaw<[{ total: bigint | null }]>`
      SELECT SUM(LENGTH(original)) as total FROM Message WHERE deckId = ${deckId} AND timestamp LIKE ${todayPrefix + '%'}
    `,
  ])
  return {
    totalChars: Number(totalResult[0]?.total ?? 0),
    todayChars: Number(todayResult[0]?.total ?? 0),
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
