export const runtime = "nodejs";

import { deleteMessageById } from "@/lib/message-store";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/decks/[id]/messages/[msgId]">,
) {
  const { id, msgId } = await context.params;
  const deckId = Number(id);
  const messageId = Number(msgId);

  if (Number.isNaN(deckId) || Number.isNaN(messageId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const deleted = await deleteMessageById(deckId, messageId);
  if (!deleted) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
