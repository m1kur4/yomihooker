import { DeckGrid } from "@/components/deck-grid";
import { readDecks } from "@/lib/deck-store";

export default async function Home() {
  const decks = await readDecks();

  return (
    <main className="min-h-screen px-6 py-8">
      <DeckGrid initialDecks={decks} />
    </main>
  );
}
