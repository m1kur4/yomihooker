import { notFound } from 'next/navigation'
import Link from 'next/link'

import TextDeck from '@/app/deck'
import { DeckCharCount } from '@/components/deck-char-count'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { readDecks } from '@/lib/deck-store'

export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params
  const id = Number(deckId)
  if (Number.isNaN(id)) notFound()

  const decks = await readDecks()
  const deck = decks.find((d) => d.id === id)
  if (!deck) notFound()

  return (
    <main className="flex min-h-screen flex-col px-4 py-4">
      <div className="mb-4 flex items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{deck.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <DeckCharCount />
      </div>

      <TextDeck deckId={id} deckName={deck.name} />
    </main>
  )
}
