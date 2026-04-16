'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, LoaderCircle, Pause, Play, Volume2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { audioFilename, fetchTtsBlob, saveToDesktop } from '@/lib/media-utils'
import { useSettings } from '@/lib/settings-context'

const DEFAULT_TEXT = ''
const FOLATING_DURATION = 200 // ms

type AudioPlayerProps = {
  text?: string
  compact?: boolean
  filename?: string
}

export function AudioPlayer({
  text: initialText = DEFAULT_TEXT,
  compact = false,
  filename,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const lastTextRef = useRef<string>('')

  const { settings } = useSettings()
  const [text, setText] = useState(initialText)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!compact) {
      setText(initialText)
      return
    }

    setText(initialText)
    setError(null)
  }, [compact, initialText])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const attachAudioEvents = (audio: HTMLAudioElement) => {
    audio.volume = volume
    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)
    audio.onended = () => {
      setIsPlaying(false)
      setCurrentTime(audio.duration || 0)
    }
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0)
      setCurrentTime(audio.currentTime)
    }
  }

  const handlePlay = async () => {
    const trimmedText = text.trim()

    if (!trimmedText || isLoading) {
      return
    }

    if (isPlaying) {
      audioRef.current?.pause()
      return
    }

    if (audioRef.current && lastTextRef.current === trimmedText) {
      try {
        await audioRef.current.play()
        return
      } catch (playbackError) {
        console.error('Audio resume failed:', playbackError)
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const audioBlob = await fetchTtsBlob(trimmedText, {
        voicevoxPort: settings.voicevoxPort,
        speaker: settings.voicevoxSpeaker,
      })

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      objectUrlRef.current = audioUrl
      lastTextRef.current = trimmedText

      const audio = new Audio(audioUrl)
      audioRef.current = audio
      setDuration(0)
      setCurrentTime(0)
      attachAudioEvents(audio)

      await audio.play()
    } catch (playbackError) {
      console.error('Audio playback failed:', playbackError)
      setError(
        playbackError instanceof Error
          ? playbackError.message
          : 'Unable to synthesize audio.',
      )
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProgressChange = (value: number) => {
    setCurrentTime(value)

    if (audioRef.current) {
      audioRef.current.currentTime = value
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const handleDownload = async () => {
    if (isDownloading) return

    const wavName = audioFilename(filename)

    // If audio already fetched, save directly
    if (objectUrlRef.current) {
      const blob = await fetch(objectUrlRef.current).then((r) => r.blob())
      await saveToDesktop(blob, wavName)
      return
    }

    const trimmedText = text.trim()
    if (!trimmedText) return

    setIsDownloading(true)
    try {
      const audioBlob = await fetchTtsBlob(trimmedText, {
        voicevoxPort: settings.voicevoxPort,
        speaker: settings.voicevoxSpeaker,
      })
      const audioUrl = URL.createObjectURL(audioBlob)
      objectUrlRef.current = audioUrl
      lastTextRef.current = trimmedText
      await saveToDesktop(audioBlob, wavName)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleVolumeChange = (value: number) => {
    setVolume(value)

    if (audioRef.current) {
      audioRef.current.volume = value
    }
  }

  const openPanel = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    setIsPanelOpen(true)
  }

  const closePanel = () => {
    hideTimeoutRef.current = setTimeout(
      () => setIsPanelOpen(false),
      FOLATING_DURATION,
    )
  }

  // Shared controls panel content (progress + volume + download)
  const controlsPanel = (
    <div className="flex items-center gap-1.5 pl-2.5">
      {/* Progress slider */}
      <Slider
        aria-label="Audio progress"
        min={0}
        max={duration || 0}
        step={0.1}
        value={[Math.min(currentTime, duration || 0)]}
        onValueChange={([val]) => handleProgressChange(val)}
        className="min-w-0 flex-1"
      />
      {/* Current time */}
      <span className="text-muted-foreground/80 shrink-0 text-[10px] tabular-nums">
        {formatTime(currentTime)}
      </span>
      {/* Volume icon + slider that expands on hover */}
      <div className="group/vol flex shrink-0 items-center gap-1">
        <Volume2 className="size-3" />
        <div className="w-0 overflow-hidden transition-[width] duration-200 ease-in-out group-hover/vol:w-14">
          <div
            aria-label="Volume"
            role="slider"
            aria-valuenow={Math.round(volume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-14 origin-left scale-x-0 cursor-pointer transition-transform duration-200 group-hover/vol:scale-x-100"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              handleVolumeChange(
                Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
              )
            }}
          >
            <Progress value={volume * 100} />
          </div>
        </div>
      </div>
      {/* Download */}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => void handleDownload()}
        disabled={isDownloading || !text.trim()}
        className="shrink-0"
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
  )

  if (compact) {
    return (
      <div
        className="relative flex items-center"
        onMouseEnter={openPanel}
        onMouseLeave={closePanel}
        onFocus={openPanel}
        onBlur={closePanel}
      >
        {/* Floating panel — rises above the button */}
        <div
          className={[
            'border-border/60 bg-card/98 absolute right-0 bottom-full z-10 mb-3 w-44 rounded-xl border px-2.5 py-2 shadow-xl backdrop-blur-md transition-all duration-200',
            isPanelOpen
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-1.5 opacity-0',
          ].join(' ')}
          onMouseEnter={openPanel}
          onMouseLeave={closePanel}
        >
          {controlsPanel}
          {/* Caret pointing down */}
          <div className="border-border/60 bg-card/98 absolute right-2.5 -bottom-1.5 size-3 rotate-45 border-r border-b" />
          {/* Invisible bridge covering the mb-3 gap so hover stays active */}
          <div className="absolute right-0 -bottom-3 left-0 h-3" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => void handlePlay()}
          disabled={!text.trim() || isLoading}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          title={error ?? (isPlaying ? 'Pause audio' : 'Play audio')}
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
    )
  }

  // Non-compact (navbar): button + hover panel that drops down, with text input inside
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={openPanel}
      onMouseLeave={closePanel}
      onFocus={openPanel}
      onBlur={closePanel}
    >
      {/* Floating panel — drops below the button */}
      <div
        className={[
          'border-border/60 bg-card/98 absolute top-full right-0 z-10 mt-3 w-72 rounded-xl border px-2.5 py-2 shadow-xl backdrop-blur-md transition-all duration-200',
          isPanelOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1.5 opacity-0',
        ].join(' ')}
        onMouseEnter={openPanel}
        onMouseLeave={closePanel}
      >
        {/* Text input */}
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type Japanese text"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 mb-2 w-full rounded-lg border px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2"
        />
        {controlsPanel}
        {error && <p className="text-destructive mt-1.5 text-xs">{error}</p>}
        {/* Caret pointing up */}
        <div className="border-border/60 bg-card/98 absolute -top-1.5 right-2.5 size-3 rotate-45 border-t border-l" />
        {/* Invisible bridge covering the mt-3 gap so hover stays active */}
        <div className="absolute -top-3 right-0 left-0 h-3" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => void handlePlay()}
        disabled={!text.trim() || isLoading}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        title={error ?? (isPlaying ? 'Pause audio' : 'Play audio')}
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
  )
}
