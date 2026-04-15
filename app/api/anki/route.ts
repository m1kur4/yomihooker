export const runtime = "nodejs";

import { config } from "@/lib/config";

const ANKI_URL = config.ankiConnect.url;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const response = await fetch(ANKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: unknown = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reach AnkiConnect",
      },
      { status: 502 },
    );
  }
}
