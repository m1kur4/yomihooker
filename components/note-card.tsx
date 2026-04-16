'use client'

import { useEffect, useState } from 'react'

import { ankiRequest } from '@/lib/anki-connect'
import { useSettings } from '@/lib/settings-context'
import {
  NoteCardForm,
  extractFilename,
  type NoteFields,
} from '@/components/note-card-form'

type NoteInfo = {
  noteId: number
  fields: Record<string, { value: string; order: number }>
}

export function NoteCard() {
  const { settings } = useSettings()
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [noteState, setNoteState] = useState<{
    noteId: number
    defaultValues: NoteFields
  } | null>(null)

  useEffect(() => {
    async function fetchLatestNote() {
      try {
        setLoading(true)
        setStatusMessage(null)

        const ankiOverride = { ankiPort: settings.ankiPort }
        const findResult = await ankiRequest(
          'findNotes',
          { query: 'added:1' },
          ankiOverride,
        )
        const ids = findResult.result as number[] | null

        if (!ids || ids.length === 0) {
          setStatusMessage('No recently added cards found.')
          return
        }

        const latestId = Math.max(...ids)

        const infoResult = await ankiRequest(
          'notesInfo',
          { notes: [latestId] },
          ankiOverride,
        )
        const notes = infoResult.result as NoteInfo[] | null

        if (!notes || notes.length === 0) {
          setStatusMessage('Could not fetch note info.')
          return
        }

        const { fields } = notes[0]

        setNoteState({
          noteId: latestId,
          defaultValues: {
            Expression: fields['Expression']?.value ?? '',
            Sentence: fields['Sentence']?.value ?? '',
            SentenceFurigana: fields['SentenceFurigana']?.value ?? '',
            SentenceAudio: extractFilename(
              fields['SentenceAudio']?.value ?? '',
            ),
            Picture: extractFilename(fields['Picture']?.value ?? ''),
          },
        })
      } catch {
        setStatusMessage('Failed to connect to AnkiConnect. Is Anki running?')
      } finally {
        setLoading(false)
      }
    }

    void fetchLatestNote()
  }, [settings.ankiPort])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (statusMessage || !noteState) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{statusMessage}</p>
      </div>
    )
  }

  return (
    <div className="border-border bg-card w-full max-w-xl rounded-xl border p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Latest Anki Note</h2>
        <span className="text-muted-foreground text-xs">
          ID: {noteState.noteId}
        </span>
      </div>
      <NoteCardForm
        noteId={noteState.noteId}
        defaultValues={noteState.defaultValues}
      />
    </div>
  )
}
