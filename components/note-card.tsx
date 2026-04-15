"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ANKI_URL = "/api/anki";
const FIELD_ORDER = [
  "Expression",
  "Sentence",
  "SentenceFurigana",
  "SentenceAudio",
  "Picture",
] as const;
const FILE_FIELDS: ReadonlySet<string> = new Set(["SentenceAudio", "Picture"]);

type NoteFields = Record<(typeof FIELD_ORDER)[number], string>;

type NoteInfo = {
  noteId: number;
  fields: Record<string, { value: string; order: number }>;
};

async function ankiRequest(
  action: string,
  params: Record<string, unknown>,
): Promise<{ result: unknown; error: string | null }> {
  const res = await fetch(ANKI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: 6, params }),
  });
  return res.json() as Promise<{ result: unknown; error: string | null }>;
}

function extractFilename(value: string): string {
  const soundMatch = value.match(/\[sound:([^\]]+)\]/);
  if (soundMatch) return soundMatch[1];
  const srcMatch = value.match(/src="([^"]+)"/);
  if (srcMatch) return srcMatch[1];
  return value;
}

export function NoteCard() {
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);

  const form = useForm<NoteFields>();

  useEffect(() => {
    async function fetchLatestNote() {
      try {
        setLoading(true);
        setStatusMessage(null);

        const findResult = await ankiRequest("findNotes", { query: "added:1" });
        const ids = findResult.result as number[] | null;

        if (!ids || ids.length === 0) {
          setStatusMessage("No recently added cards found.");
          setLoading(false);
          return;
        }

        const latestId = Math.max(...ids);
        setNoteId(latestId);

        const infoResult = await ankiRequest("notesInfo", {
          notes: [latestId],
        });
        const notes = infoResult.result as NoteInfo[] | null;

        if (!notes || notes.length === 0) {
          setStatusMessage("Could not fetch note info.");
          setLoading(false);
          return;
        }

        const { fields } = notes[0];

        form.reset({
          Expression: fields["Expression"]?.value ?? "",
          Sentence: fields["Sentence"]?.value ?? "",
          SentenceFurigana: fields["SentenceFurigana"]?.value ?? "",
          SentenceAudio: extractFilename(
            fields["SentenceAudio"]?.value ?? "",
          ),
          Picture: extractFilename(fields["Picture"]?.value ?? ""),
        });
      } catch {
        setStatusMessage(
          "Failed to connect to AnkiConnect. Is Anki running?",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchLatestNote();
  }, [form]);

  const onSubmit = (_data: NoteFields) => {
    // TODO: implement update via AnkiConnect updateNoteFields action
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (statusMessage) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Latest Anki Note</h2>
        {noteId !== null && (
          <span className="text-xs text-muted-foreground">ID: {noteId}</span>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {FIELD_ORDER.map((fieldName) => (
            <FormField
              key={fieldName}
              control={form.control}
              name={fieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{fieldName}</FormLabel>
                  <FormControl>
                    {FILE_FIELDS.has(fieldName) ? (
                      <Input {...field} readOnly lang="ja" />
                    ) : (
                      <Textarea {...field} lang="ja" />
                    )}
                  </FormControl>
                </FormItem>
              )}
            />
          ))}

          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Update
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
