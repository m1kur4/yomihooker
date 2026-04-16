import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MessageData } from "@/lib/message-data";

const DATA_DIR = path.join(process.cwd(), "data");

function deckDir(deckId: number) {
  return path.join(DATA_DIR, "decks", String(deckId));
}

function messagesFile(deckId: number) {
  return path.join(deckDir(deckId), "messages.json");
}

async function ensureMessagesFile(deckId: number) {
  await mkdir(deckDir(deckId), { recursive: true });
  try {
    await readFile(messagesFile(deckId), "utf8");
  } catch {
    await writeFile(messagesFile(deckId), "[]\n", "utf8");
  }
}

export async function readMessages(deckId: number): Promise<MessageData[]> {
  await ensureMessagesFile(deckId);
  const contents = await readFile(messagesFile(deckId), "utf8");
  try {
    const parsed = JSON.parse(contents) as unknown;
    return Array.isArray(parsed) ? (parsed as MessageData[]) : [];
  } catch {
    return [];
  }
}

export async function writeMessages(deckId: number, messages: MessageData[]) {
  await ensureMessagesFile(deckId);
  await writeFile(
    messagesFile(deckId),
    `${JSON.stringify(messages, null, 2)}\n`,
    "utf8",
  );
}

export async function appendMessage(deckId: number, message: MessageData) {
  const messages = await readMessages(deckId);
  messages.push(message);
  await writeMessages(deckId, messages);
  return message;
}

export async function deleteMessageById(deckId: number, messageId: number) {
  const messages = await readMessages(deckId);
  const next = messages.filter((m) => m.id !== messageId);
  const deleted = next.length !== messages.length;
  if (deleted) await writeMessages(deckId, next);
  return deleted;
}
