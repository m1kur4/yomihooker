export const runtime = "nodejs";

const ENGINE_URL = "http://127.0.0.1:50021";
const SPEAKER = "14";

type TtsRequest = {
  text?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as TtsRequest | null;
  const text = payload?.text?.trim();

  if (!text) {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    const queryUrl = new URL("/audio_query", ENGINE_URL);
    queryUrl.searchParams.set("speaker", SPEAKER);
    queryUrl.searchParams.set("text", text);

    const queryResponse = await fetch(queryUrl, {
      method: "POST",
      cache: "no-store",
    });

    if (!queryResponse.ok) {
      throw new Error(`audio_query failed with status ${queryResponse.status}`);
    }

    const queryJson = await queryResponse.json();

    const synthesisUrl = new URL("/synthesis", ENGINE_URL);
    synthesisUrl.searchParams.set("speaker", SPEAKER);

    const synthesisResponse = await fetch(synthesisUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryJson),
      cache: "no-store",
    });

    if (!synthesisResponse.ok) {
      throw new Error(`synthesis failed with status ${synthesisResponse.status}`);
    }

    const audioBuffer = await synthesisResponse.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS synthesis failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reach the local TTS engine",
      },
      { status: 502 },
    );
  }
}
