/**
 * Fetch TTS audio from the local VOICEVOX proxy and return the WAV blob.
 * Throws on network or server errors.
 */
export async function fetchTtsBlob(
  text: string,
  overrides?: { voicevoxPort?: number; speaker?: string },
): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Text is empty");

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: trimmed, ...overrides }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `TTS request failed: ${res.status}`);
  }

  return res.blob();
}

/**
 * Returns the standard audio filename for a given timestamp.
 * Format: audio_<formatted-timestamp>.wav
 */
export function audioFilename(ts: string | undefined): string {
  return `audio_${formatFilename(ts, "unknown")}.wav`;
}

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
 * Returns the standard screenshot filename for a given timestamp.
 * Format: screenshot_<formatted-timestamp>.jpg
 */
export function screenshotFilename(ts?: string): string {
  return `screenshot_${formatFilename(ts, "unknown")}.jpg`;
}

/**
 * Capture a window screenshot and return the Blob.
 * Must be called synchronously within a user-gesture handler (getDisplayMedia requirement).
 */
export async function captureScreenshotAsBlob(): Promise<Blob> {
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

  stream.getTracks().forEach((t) => t.stop());

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("Canvas toBlob returned null"));
      else resolve(b);
    }, "image/jpeg", 0.85);
  });
}
