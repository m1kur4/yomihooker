export const runtime = "nodejs";

import { deleteDeck, updateDeck } from "@/lib/deck-store";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/decks/[id]">,
) {
  const { id } = await context.params;
  const deckId = Number(id);
  if (Number.isNaN(deckId)) {
    return Response.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    cover?: string;
  } | null;

  if (!payload) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updates: { name?: string; cover?: string } = {};
  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim();
  }
  if (typeof payload.cover === "string") {
    updates.cover = payload.cover;
  }

  const deck = await updateDeck(deckId, updates);
  if (!deck) {
    return Response.json({ error: "Deck not found" }, { status: 404 });
  }

  return Response.json(deck);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/decks/[id]">,
) {
  const { id } = await context.params;
  const deckId = Number(id);
  if (Number.isNaN(deckId)) {
    return Response.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const deleted = await deleteDeck(deckId);
  if (!deleted) {
    return Response.json({ error: "Deck not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
