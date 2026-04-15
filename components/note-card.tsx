"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { Upload } from "lucide-react";

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

type FieldName = (typeof FIELD_ORDER)[number];
type NoteFields = Record<FieldName, string>;

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

function wrapFileValue(fieldName: string, filename: string): string {
  if (fieldName === "SentenceAudio") return `[sound:${filename}]`;
  if (fieldName === "Picture") return `<img src="${filename}">`;
  return filename;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FileInputField({
  field,
  fieldName,
}: {
  field: ControllerRenderProps<NoteFields, FieldName>;
  fieldName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const accept = fieldName === "SentenceAudio" ? "audio/*" : "image/*";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const base64 = await readFileAsBase64(file);

      const result = await ankiRequest("storeMediaFile", {
        filename: file.name,
        data: base64,
      });

      if (result.error) {
        setUploadError(String(result.error));
        return;
      }

      field.onChange(file.name);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input {...field} readOnly lang="ja" />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={uploading}
          aria-label={`Upload ${fieldName}`}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
        </Button>
      </div>
      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}
    </div>
  );
}

export function NoteCard() {
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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
          SentenceAudio: extractFilename(fields["SentenceAudio"]?.value ?? ""),
          Picture: extractFilename(fields["Picture"]?.value ?? ""),
        });
      } catch {
        setStatusMessage("Failed to connect to AnkiConnect. Is Anki running?");
      } finally {
        setLoading(false);
      }
    }

    void fetchLatestNote();
  }, [form]);

  const onSubmit = async (data: NoteFields) => {
    if (noteId === null) return;

    setUpdateError(null);
    setUpdateSuccess(false);

    // Wrap file field filenames back into the format Anki expects
    const fields = Object.fromEntries(
      FIELD_ORDER.map((f) => [
        f,
        FILE_FIELDS.has(f) ? wrapFileValue(f, data[f]) : data[f],
      ]),
    );

    try {
      const result = await ankiRequest("updateNoteFields", {
        note: { id: noteId, fields },
      });

      if (result.error) {
        setUpdateError(String(result.error));
      } else {
        setUpdateSuccess(true);
      }
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Update failed");
    }
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
                  {FILE_FIELDS.has(fieldName) ? (
                    <FileInputField field={field} fieldName={fieldName} />
                  ) : (
                    <FormControl>
                      <Textarea {...field} lang="ja" />
                    </FormControl>
                  )}
                </FormItem>
              )}
            />
          ))}

          <div className="flex items-center justify-end gap-3">
            {updateSuccess && (
              <span className="text-sm text-green-500">Updated.</span>
            )}
            {updateError && (
              <span className="text-sm text-destructive">{updateError}</span>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting}
            >
              Update
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
