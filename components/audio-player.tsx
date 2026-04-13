"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, LoaderCircle, Pause, Play, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const DEFAULT_TEXT = "";

type AudioPlayerProps = {
  text?: string;
  compact?: boolean;
  filename?: string;
};

export function AudioPlayer({
  text: initialText = DEFAULT_TEXT,
  compact = false,
  filename,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastTextRef = useRef<string>("");
  const progressId = useId();
  const volumeId = useId();

  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!compact) {
      setText(initialText);
      return;
    }

    setText(initialText);
    setError(null);
  }, [compact, initialText]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const attachAudioEvents = (audio: HTMLAudioElement) => {
    audio.volume = volume;
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
      setCurrentTime(audio.currentTime);
    };
  };

  const handlePlay = async () => {
    const trimmedText = text.trim();

    if (!trimmedText || isLoading) {
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      return;
    }

    if (audioRef.current && lastTextRef.current === trimmedText) {
      try {
        await audioRef.current.play();
        return;
      } catch (playbackError) {
        console.error("Audio resume failed:", playbackError);
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? `TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = audioUrl;
      lastTextRef.current = trimmedText;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setDuration(0);
      setCurrentTime(0);
      attachAudioEvents(audio);

      await audio.play();
    } catch (playbackError) {
      console.error("Audio playback failed:", playbackError);
      setError(
        playbackError instanceof Error
          ? playbackError.message
          : "Unable to synthesize audio.",
      );
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgressChange = (value: string) => {
    const nextTime = Number(value);
    setCurrentTime(nextTime);

    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const formatFilename = (ts: string | undefined) => {
    if (!ts) return "audio";
    // "13/04/2026, 17:24:32" -> "2026_0413_172432"
    const m = ts.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return ts;
    const [, dd, mm, yyyy, hh, min, ss] = m;
    return `${yyyy}_${mm}${dd}_${hh}${min}${ss}`;
  };

  const handleDownload = async () => {
    if (isDownloading) return;

    // If audio already fetched, download directly
    if (objectUrlRef.current) {
      const a = document.createElement("a");
      a.href = objectUrlRef.current;
      a.download = `${formatFilename(filename)}.wav`;
      a.click();
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) return;

    setIsDownloading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = audioUrl;
      lastTextRef.current = trimmedText;

      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = `${formatFilename(filename)}.wav`;
      a.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleVolumeChange = (value: string) => {
    const nextVolume = Number(value);
    setVolume(nextVolume);

    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  };

  const openPanel = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    hideTimeoutRef.current = setTimeout(() => setIsPanelOpen(false), 500);
  };

  if (compact) {
    return (
      <div
        className="relative flex items-center"
        onMouseEnter={openPanel}
        onMouseLeave={closePanel}
        onFocus={openPanel}
        onBlur={closePanel}
      >
        {/* Floating panel */}
        <div
          className={[
            "absolute bottom-full right-0 z-10 mb-3 w-44 rounded-xl border border-border/60 bg-card/98 px-2.5 py-2 shadow-xl backdrop-blur-md transition-all duration-200",
            isPanelOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1.5 opacity-0",
          ].join(" ")}
          onMouseEnter={openPanel}
          onMouseLeave={closePanel}
        >
          {/* Progress bar */}
          <label htmlFor={progressId} className="sr-only">Audio progress</label>
          <input
            id={progressId}
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => handleProgressChange(event.target.value)}
            className="h-1 w-full accent-foreground"
          />

          {/* Volume + time + download */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <Volume2 className="size-3 shrink-0 text-muted-foreground/60" />
            <label htmlFor={volumeId} className="sr-only">Volume</label>
            <input
              id={volumeId}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => handleVolumeChange(event.target.value)}
              className="w-full accent-foreground"
            />
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => void handleDownload()}
              disabled={isDownloading || !text.trim()}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Download audio"
              title="Download WAV"
            >
              {isDownloading ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : (
                <Download className="size-3" />
              )}
            </Button>
          </div>

          {/* Caret */}
          <div className="absolute -bottom-1.5 right-2.5 size-3 rotate-45 border-b border-r border-border/60 bg-card/98" />
          {/* Invisible bridge covering the mb-3 gap so hover stays active */}
          <div className="absolute -bottom-3 left-0 right-0 h-3" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => void handlePlay()}
          disabled={!text.trim() || isLoading}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          title={error ?? (isPlaying ? "Pause audio" : "Play audio")}
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" />
          ) : isPlaying ? (
            <Pause />
          ) : (
            <Play />
          )}
        </Button>
      </div>
    );
  }

  return (
    <section className="w-full max-w-3xl rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Volume2 className="size-4" />
        Japanese Text To Speech
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type Japanese text"
          className="h-11 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        <Button
          type="button"
          size="lg"
          onClick={() => void handlePlay()}
          disabled={!text.trim() || isLoading}
          className="min-w-30"
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" />
          ) : isPlaying ? (
            <Pause />
          ) : (
            <Play />
          )}
          {isLoading ? "Generating" : isPlaying ? "Pause" : "Play"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Uses the local VOICEVOX engine on `127.0.0.1:50021` with speaker `14`.
        </p>
      )}
    </section>
  );
}
