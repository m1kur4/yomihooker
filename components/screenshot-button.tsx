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
        video: true,
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const { width = 1920, height = 1080 } = track.getSettings();

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(video, 0, 0, width, height);

      stream.getTracks().forEach((t) => t.stop());

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const ts = new Date()
          .toLocaleString("en-GB", { timeZone: "Asia/Shanghai" })
          .replace(/[/:, ]+/g, "_");
        const filename = `screenshot_${ts}.png`;
        const form = new FormData();
        form.append("file", blob, filename);
        form.append("name", filename);
        try {
          await fetch("/api/save-file", { method: "POST", body: form });
        } catch (err) {
          console.error("Screenshot save failed:", err);
        }
      }, "image/png");
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
