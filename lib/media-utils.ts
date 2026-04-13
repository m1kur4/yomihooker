/**
 * Format a locale timestamp string ("dd/mm/yyyy, hh:mm:ss") into "yyyy_mmdd_hhmmss".
 * Falls back to sanitizing the raw string if it doesn't match.
 */
export function formatFilename(ts: string | undefined, fallback = "file"): string {
  if (!ts) return fallback;
  const m = ts.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return ts.replace(/[/:, ]+/g, "_");
  const [, dd, mm, yyyy, hh, min, ss] = m;
  return `${yyyy}_${mm}${dd}_${hh}${min}${ss}`;
}

export async function saveToDesktop(blob: Blob, name: string): Promise<void> {
  const form = new FormData();
  form.append("file", blob, name);
  form.append("name", name);
  const res = await fetch("/api/save-file", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

/**
 * Capture a window screenshot and save to Desktop.
 * @param ts  Optional timestamp string to embed in the filename.
 *            If omitted, the current time is used.
 */
export async function captureScreenshot(ts?: string): Promise<void> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "window" },
    audio: false,
  });

  const track = stream.getVideoTracks()[0];
  const { width = 1920, height = 1080 } = track.getSettings();

  const video = document.createElement("video");
  video.srcObject = stream;
  await video.play();

  const scale = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);

  const windowName = track.label
    .replace(/[\\/:*?"<>|]+/g, "")
    .trim()
    .replace(/\s+/g, "_");

  stream.getTracks().forEach((t) => t.stop());

  const formattedTs = ts
    ? formatFilename(ts)
    : formatFilename(new Date().toLocaleString("en-GB", { timeZone: "Asia/Shanghai" }));
  const filename = `${windowName || "screenshot"}_${formattedTs}.jpg`;

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { resolve(); return; }
      try {
        await saveToDesktop(blob, filename);
        resolve();
      } catch (e) {
        reject(e);
      }
    }, "image/jpeg", 0.85);
  });
}
