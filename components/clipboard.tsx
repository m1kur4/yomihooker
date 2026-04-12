"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

type ClipboardProps = {
  text: string;
  label?: string;
};

export function Clipboard({
  text,
  label = "Copy translation",
}: ClipboardProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1500);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const handleCopy = async () => {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (error) {
      console.error("Clipboard copy failed:", error);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={() => void handleCopy()}
      aria-label={label}
      title={label}
      disabled={!text}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
