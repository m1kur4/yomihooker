import { deleteMessageById } from "@/lib/message-store";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/messages/[id]">,
) {
  const { id } = await context.params;
  const messageId = Number(id);

  if (Number.isNaN(messageId)) {
    return Response.json({ error: "Invalid message id" }, { status: 400 });
  }

  const deleted = await deleteMessageById(messageId);

  if (!deleted) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
