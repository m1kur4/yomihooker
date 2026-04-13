"use client";

import { useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ScreenshotButton() {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleScreenshot = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
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

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const raw = new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Shanghai",
        });
        // "13/04/2026, 17:24:32" -> "2026_0413_172432"
        const m = raw.match(
          /^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})$/,
        );
        const ts = m
          ? `${m[3]}_${m[2]}${m[1]}_${m[4]}${m[5]}${m[6]}`
          : raw.replace(/[/:, ]+/g, "_");
        const prefix = windowName || "screenshot";
        const filename = `${prefix}_${ts}.jpg`;
        const form = new FormData();
        form.append("file", blob, filename);
        form.append("name", filename);
        try {
          await fetch("/api/save-file", { method: "POST", body: form });
        } catch (err) {
          console.error("Screenshot save failed:", err);
        }
      }, "image/jpeg", 0.85);
    } catch (error) {
      // User cancelled or permission denied — silently ignore
      if (error instanceof Error && error.name !== "NotAllowedError") {
        console.error("Screenshot failed:", error);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => void handleScreenshot()}
      disabled={isCapturing}
      aria-label="Take screenshot"
      title="Capture a window and save to desktop"
    >
      {isCapturing ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <Camera />
      )}
    </Button>
  );
}
