'use client'

import { useState } from 'react'
import { BookmarkPlus, LoaderCircle } from 'lucide-react'

import { ankiRequest } from '@/lib/anki-connect'
import { useSettings } from '@/lib/settings-context'
import {
  audioFilename,
  captureScreenshotAsBlob,
  fetchTtsBlob,
  screenshotFilename,
} from '@/lib/media-utils'
import type { MessageData } from '@/lib/message-data'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  NoteCardForm,
  extractFilename,
  type NoteFields,
} from '@/components/note-card-form'

type NoteInfo = {
  noteId: number
  fields: Record<string, { value: string; order: number }>
}

export function MineButton({ data }: { data: MessageData }) {
  const { settings } = useSettings()
  const [isMining, setIsMining] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mineKey, setMineKey] = useState(0)
  const [noteState, setNoteState] = useState<{
    noteId: number
    defaultValues: NoteFields
    pendingBlobs: Partial<Record<'SentenceAudio' | 'Picture', Blob>>
  } | null>(null)
  const [prepareError, setPrepareError] = useState<string | null>(null)

  const handleMine = async () => {
    if (isMining) return
    setIsMining(true)
    setPrepareError(null)

    // Screenshot MUST start here — getDisplayMedia requires the user gesture
    const screenshotPromise = captureScreenshotAsBlob().catch(() => null)

    // TTS audio for the original text
    const audioPromise = (async () => {
      const trimmed = data.original.trim()
      if (!trimmed) return null
      return fetchTtsBlob(trimmed, {
        voicevoxPort: settings.voicevoxPort,
        speaker: settings.voicevoxSpeaker,
      })
    })().catch(() => null)

    // Fetch latest Anki note
    const notePromise = (async () => {
      const ankiOverride = { ankiPort: settings.ankiPort }
      const findResult = await ankiRequest(
        'findNotes',
        { query: 'added:1' },
        ankiOverride,
      )
      const ids = findResult.result as number[] | null
      if (!ids || ids.length === 0)
        throw new Error('No recent Anki notes found.')
      const noteId = Math.max(...ids)
      const infoResult = await ankiRequest(
        'notesInfo',
        { notes: [noteId] },
        ankiOverride,
      )
      const notes = infoResult.result as NoteInfo[] | null
      if (!notes || notes.length === 0)
        throw new Error('Could not fetch note info.')
      return { noteId, note: notes[0] }
    })()

    try {
      const [screenshot, audio, { noteId, note }] = await Promise.all([
        screenshotPromise,
        audioPromise,
        notePromise,
      ])

      const { fields } = note

      // Append translation as new line in SentenceFurigana, but only if not already present
      const existingFurigana = fields['SentenceFurigana']?.value ?? ''
      const newFurigana = existingFurigana.includes(data.translation)
        ? existingFurigana
        : existingFurigana
          ? `${existingFurigana}\n<br>${data.translation}`
          : data.translation

      setNoteState({
        noteId,
        defaultValues: {
          Expression: fields['Expression']?.value ?? '',
          Sentence: fields['Sentence']?.value ?? '',
          SentenceFurigana: newFurigana,
          SentenceAudio: audio
            ? audioFilename(data.timestamp)
            : extractFilename(fields['SentenceAudio']?.value ?? ''),
          Picture: screenshot
            ? screenshotFilename(data.timestamp)
            : extractFilename(fields['Picture']?.value ?? ''),
        },
        pendingBlobs: {
          ...(audio ? { SentenceAudio: audio } : {}),
          ...(screenshot ? { Picture: screenshot } : {}),
        },
      })
      setMineKey((k) => k + 1)
      setDialogOpen(true)
    } catch (e) {
      setPrepareError(e instanceof Error ? e.message : 'Preparation failed.')
    } finally {
      setIsMining(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => void handleMine()}
        disabled={isMining}
        aria-label="Mine card"
        title={prepareError ?? 'Open Anki note editor'}
      >
        {isMining ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <BookmarkPlus />
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-h-[90vh] w-full max-w-xl overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Update Anki Note</DialogTitle>
          </DialogHeader>
          {noteState && (
            <NoteCardForm
              key={mineKey}
              noteId={noteState.noteId}
              defaultValues={noteState.defaultValues}
              pendingBlobs={noteState.pendingBlobs}
              onSuccess={() => setDialogOpen(false)}
              extraActions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
