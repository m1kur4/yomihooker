export const runtime = "nodejs";

import { writeConfigFile } from "@/lib/read-config";
import type { AppSettings } from "@/lib/settings-context";

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const s = body as Partial<AppSettings>;
  if (
    typeof s.lunatranslatorPort !== "number" ||
    typeof s.voicevoxPort !== "number" ||
    typeof s.voicevoxSpeaker !== "string" ||
    typeof s.ankiPort !== "number"
  ) {
    return Response.json({ error: "Invalid settings shape" }, { status: 400 });
  }

  try {
    writeConfigFile(s as AppSettings);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Write failed" },
      { status: 500 },
    );
  }
}
