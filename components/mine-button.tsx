"use client";

import { useState } from "react";
import { BookmarkPlus, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MessageData } from "@/lib/message-data";
import { captureScreenshot, formatFilename, saveToDesktop } from "@/lib/media-utils";

export function MineButton({ data }: { data: MessageData }) {
  const [isMining, setIsMining] = useState(false);

  const handleMine = async () => {
    if (isMining) return;
    setIsMining(true);

    try {
      // Screenshot must be first — requires user gesture for getDisplayMedia
      let screenshotPromise: Promise<void> = Promise.resolve();
      try {
        screenshotPromise = captureScreenshot(data.timestamp);
      } catch (err) {
        if (err instanceof Error && err.name !== "NotAllowedError") {
          console.error("Screenshot failed:", err);
        }
      }

      const audioPromise = (async () => {
        const trimmed = data.original.trim();
        if (!trimmed) return;
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
        const blob = await res.blob();
        await saveToDesktop(blob, `${formatFilename(data.timestamp)}.wav`);
      })().catch((e) => console.error("Audio download failed:", e));

      const clipboardPromise = navigator.clipboard
        .writeText(data.translation)
        .catch((e) => console.error("Clipboard write failed:", e));

      await Promise.all([screenshotPromise, audioPromise, clipboardPromise]);
    } finally {
      setIsMining(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => void handleMine()}
      disabled={isMining}
      aria-label="Mine card"
      title="Screenshot + download audio + copy translation"
    >
      {isMining ? <LoaderCircle className="animate-spin" /> : <BookmarkPlus />}
    </Button>
  );
}
