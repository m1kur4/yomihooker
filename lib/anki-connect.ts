const ANKI_URL = "/api/anki";

export async function ankiRequest(
  action: string,
  params: Record<string, unknown>,
): Promise<{ result: unknown; error: string | null }> {
  const res = await fetch(ANKI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
): Promise<string> {
  const data = await blobToBase64(blob);
  const result = await ankiRequest("storeMediaFile", { filename, data });
  if (result.error) throw new Error(String(result.error));
  return result.result as string;
}
