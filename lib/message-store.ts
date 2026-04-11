import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MessageData } from "@/lib/message-data";

const dataDirectory = path.join(process.cwd(), "data");
const messagesFilePath = path.join(dataDirectory, "messages.json");

async function ensureStoreFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(messagesFilePath, "utf8");
  } catch {
    await writeFile(messagesFilePath, "[]\n", "utf8");
  }
}

export async function readMessages(): Promise<MessageData[]> {
  await ensureStoreFile();

  const fileContents = await readFile(messagesFilePath, "utf8");

  try {
    const parsed = JSON.parse(fileContents) as unknown;
    return Array.isArray(parsed) ? (parsed as MessageData[]) : [];
  } catch {
    return [];
  }
}

export async function writeMessages(messages: MessageData[]) {
  await ensureStoreFile();
  await writeFile(messagesFilePath, `${JSON.stringify(messages, null, 2)}\n`, "utf8");
}

export async function appendMessage(message: MessageData) {
  const messages = await readMessages();
  messages.push(message);
  await writeMessages(messages);
  return message;
}

export async function deleteMessageById(messageId: number) {
  const messages = await readMessages();
  const nextMessages = messages.filter((message) => message.id !== messageId);
  const deleted = nextMessages.length !== messages.length;

  if (deleted) {
    await writeMessages(nextMessages);
  }

  return deleted;
}
