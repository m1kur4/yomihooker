import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface DeckJson {
  id: number
  name: string
  cover?: string
  createdAt: string
}

interface MessageJson {
  original: string
  translation: string
  timestamp: string
}

async function main() {
  const db = createClient({ url: 'file:./data/data.db' })

  const decksPath = join(process.cwd(), 'data', 'decks.json')
  if (!existsSync(decksPath)) {
    console.log('No data/decks.json found, skipping seed.')
    return
  }

  const decks = JSON.parse(readFileSync(decksPath, 'utf-8')) as DeckJson[]
  console.log(`Seeding ${decks.length} deck(s)...`)

  for (const deck of decks) {
    const existing = await db.execute({
      sql: 'SELECT id FROM Deck WHERE id = ?',
      args: [deck.id],
    })

    if (existing.rows.length > 0) {
      console.log(`  Deck ${deck.id} "${deck.name}" already exists, skipping.`)
      continue
    }

    await db.execute({
      sql: 'INSERT INTO Deck (id, name, cover, createdAt) VALUES (?, ?, ?, ?)',
      args: [deck.id, deck.name, deck.cover ?? null, deck.createdAt],
    })
    console.log(`  Created deck ${deck.id} "${deck.name}"`)

    const messagesPath = join(
      process.cwd(),
      'data',
      'decks',
      String(deck.id),
      'messages.json',
    )
    if (!existsSync(messagesPath)) {
      console.log(
        `    No messages file for deck ${deck.id}, skipping messages.`,
      )
      continue
    }

    const messages = JSON.parse(
      readFileSync(messagesPath, 'utf-8'),
    ) as MessageJson[]
    console.log(`    Inserting ${messages.length} message(s)...`)

    for (const msg of messages) {
      await db.execute({
        sql: 'INSERT INTO Message (original, translation, timestamp, deckId) VALUES (?, ?, ?, ?)',
        args: [msg.original, msg.translation, msg.timestamp, deck.id],
      })
    }
    console.log(`    Done.`)
  }

  console.log('Seed complete.')
  await db.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
