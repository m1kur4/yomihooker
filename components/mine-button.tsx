"use client";

import { useState } from "react";
import { BookmarkPlus, LoaderCircle } from "lucide-react";

import { ankiRequest, storeMediaFileFromBlob } from "@/lib/anki-connect";
import { captureScreenshotAsBlob, formatFilename } from "@/lib/media-utils";
import type { MessageData } from "@/lib/message-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NoteCardForm,
  extractFilename,
  type NoteFields,
} from "@/components/note-card-form";

type NoteInfo = {
  noteId: number;
  fields: Record<string, { value: string; order: number }>;
};

export function MineButton({ data }: { data: MessageData }) {
  const [isMining, setIsMining] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mineKey, setMineKey] = useState(0);
  const [noteState, setNoteState] = useState<{
    noteId: number;
    defaultValues: NoteFields;
  } | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  const handleMine = async () => {
    if (isMining) return;
    setIsMining(true);
    setPrepareError(null);

    // Screenshot MUST start here — getDisplayMedia requires the user gesture
    const screenshotPromise = captureScreenshotAsBlob(data.timestamp).catch(
      () => null,
    );

    // TTS audio for the original text
    const audioPromise = (async () => {
      const trimmed = data.original.trim();
      if (!trimmed) return null;
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
      const blob = await res.blob();
      return { blob, filename: `audio_${formatFilename(data.timestamp)}.wav` };
    })().catch(() => null);

    // Fetch latest Anki note
    const notePromise = (async () => {
      const findResult = await ankiRequest("findNotes", { query: "added:1" });
      const ids = findResult.result as number[] | null;
      if (!ids || ids.length === 0) throw new Error("No recent Anki notes found.");
      const noteId = Math.max(...ids);
      const infoResult = await ankiRequest("notesInfo", { notes: [noteId] });
      const notes = infoResult.result as NoteInfo[] | null;
      if (!notes || notes.length === 0) throw new Error("Could not fetch note info.");
      return { noteId, note: notes[0] };
    })();

    try {
      const [screenshot, audio, { noteId, note }] = await Promise.all([
        screenshotPromise,
        audioPromise,
        notePromise,
      ]);

      const { fields } = note;

      // Upload screenshot → Anki media; fall back to existing value on failure
      let pictureFilename = extractFilename(fields["Picture"]?.value ?? "");
      if (screenshot) {
        pictureFilename = await storeMediaFileFromBlob(
          screenshot.blob,
          screenshot.filename,
        );
      }

      // Upload TTS audio → Anki media; fall back to existing value on failure
      let audioFilename = extractFilename(fields["SentenceAudio"]?.value ?? "");
      if (audio) {
        audioFilename = await storeMediaFileFromBlob(audio.blob, audio.filename);
      }

      // Append translation as new line in SentenceFurigana, but only if not already present
      const existingFurigana = fields["SentenceFurigana"]?.value ?? "";
      const newFurigana =
        existingFurigana.includes(data.translation)
          ? existingFurigana
          : existingFurigana
          ? `${existingFurigana}\n<br>${data.translation}`
          : data.translation;

      setNoteState({
        noteId,
        defaultValues: {
          Expression: fields["Expression"]?.value ?? "",
          Sentence: fields["Sentence"]?.value ?? "",
          SentenceFurigana: newFurigana,
          SentenceAudio: audioFilename,
          Picture: pictureFilename,
        },
      });
      setMineKey((k) => k + 1);
      setDialogOpen(true);
    } catch (e) {
      setPrepareError(e instanceof Error ? e.message : "Preparation failed.");
    } finally {
      setIsMining(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => void handleMine()}
        disabled={isMining}
        aria-label="Mine card"
        title={prepareError ?? "Open Anki note editor"}
      >
        {isMining ? <LoaderCircle className="animate-spin" /> : <BookmarkPlus />}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Anki Note</DialogTitle>
          </DialogHeader>
          {noteState && (
            <NoteCardForm
              key={mineKey}
              noteId={noteState.noteId}
              defaultValues={noteState.defaultValues}
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
  );
}
