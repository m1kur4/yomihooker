import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Deck } from "@/lib/deck-data";

const DATA_DIR = path.join(process.cwd(), "data");
const DECKS_FILE = path.join(DATA_DIR, "decks.json");

async function ensureDecksFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DECKS_FILE, "utf8");
  } catch {
    await writeFile(DECKS_FILE, "[]\n", "utf8");
  }
}

export async function readDecks(): Promise<Deck[]> {
  await ensureDecksFile();
  const contents = await readFile(DECKS_FILE, "utf8");
  try {
    const parsed = JSON.parse(contents) as unknown;
    return Array.isArray(parsed) ? (parsed as Deck[]) : [];
  } catch {
    return [];
  }
}

export async function writeDecks(decks: Deck[]): Promise<void> {
  await ensureDecksFile();
  await writeFile(DECKS_FILE, `${JSON.stringify(decks, null, 2)}\n`, "utf8");
}

export async function createDeck(name: string, cover?: string): Promise<Deck> {
  const decks = await readDecks();
  const id = decks.reduce((max, d) => Math.max(max, d.id), 0) + 1;
  const deck: Deck = {
    id,
    name,
    ...(cover ? { cover } : {}),
    createdAt: new Date().toISOString(),
  };
  decks.push(deck);
  await writeDecks(decks);
  return deck;
}

export async function updateDeck(
  id: number,
  updates: Partial<Pick<Deck, "name" | "cover">>,
): Promise<Deck | null> {
  const decks = await readDecks();
  const idx = decks.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  decks[idx] = { ...decks[idx], ...updates };
  await writeDecks(decks);
  return decks[idx];
}

export async function deleteDeck(id: number): Promise<boolean> {
  const decks = await readDecks();
  const next = decks.filter((d) => d.id !== id);
  if (next.length === decks.length) return false;
  await writeDecks(next);
  return true;
}
