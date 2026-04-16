export async function ankiRequest(
  action: string,
  params: Record<string, unknown>,
  overrides?: { ankiPort?: number },
): Promise<{ result: unknown; error: string | null }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (overrides?.ankiPort !== undefined) {
    headers["X-Anki-Port"] = String(overrides.ankiPort);
  }
  const res = await fetch("/api/anki", {
    method: "POST",
    headers,
    body: JSON.stringify({ action, version: 6, params }),
  });
  return res.json() as Promise<{ result: unknown; error: string | null }>;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Stores a Blob in Anki's media collection. Returns the stored filename. */
export async function storeMediaFileFromBlob(
  blob: Blob,
  filename: string,
  overrides?: { ankiPort?: number },
): Promise<string> {
  const data = await blobToBase64(blob);
  const result = await ankiRequest("storeMediaFile", { filename, data }, overrides);
  if (result.error) throw new Error(String(result.error));
  return result.result as string;
}
