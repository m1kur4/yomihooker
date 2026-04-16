export const runtime = "nodejs";

import type { MessageData } from "@/lib/message-data";
import { appendMessage, readMessages } from "@/lib/message-store";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/decks/[id]/messages">,
) {
  const { id } = await context.params;
  const deckId = Number(id);
  if (Number.isNaN(deckId)) {
    return Response.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const messages = await readMessages(deckId);
  return Response.json(messages);
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/decks/[id]/messages">,
) {
  const { id } = await context.params;
  const deckId = Number(id);
  if (Number.isNaN(deckId)) {
    return Response.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const payload = (await request.json()) as Partial<Omit<MessageData, "id">>;

  if (
    typeof payload.original !== "string" ||
    typeof payload.translation !== "string" ||
    typeof payload.timestamp !== "string"
  ) {
    return Response.json({ error: "Invalid message payload" }, { status: 400 });
  }

  const message = await appendMessage(deckId, {
    original: payload.original,
    translation: payload.translation,
    timestamp: payload.timestamp,
  });

  return Response.json(message, { status: 201 });
}
