"use client";

import { useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureScreenshot } from "@/lib/media-utils";

export function Screenshot() {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleScreenshot = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      await captureScreenshot();
    } catch (error) {
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
