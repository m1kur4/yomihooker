import type { MessageData } from "@/lib/message-data";
import { appendMessage, readMessages } from "@/lib/message-store";

export const runtime = "nodejs";

export async function GET() {
  const messages = await readMessages();
  return Response.json(messages);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<MessageData>;

  if (
    typeof payload.id !== "number" ||
    typeof payload.original !== "string" ||
    typeof payload.translation !== "string" ||
    typeof payload.timestamp !== "string"
  ) {
    return Response.json({ error: "Invalid message payload" }, { status: 400 });
  }

  const message = await appendMessage({
    id: payload.id,
    original: payload.original,
    translation: payload.translation,
    timestamp: payload.timestamp,
  });

  return Response.json(message, { status: 201 });
}
