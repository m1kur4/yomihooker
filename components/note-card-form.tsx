"use client";

import { useRef, useState } from "react";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { Upload } from "lucide-react";

import { ankiRequest, storeMediaFileFromBlob } from "@/lib/anki-connect";
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

type PendingBlob = { blob: Blob; filename: string };

export const FIELD_ORDER = [
  "Expression",
  "Sentence",
  "SentenceFurigana",
  "SentenceAudio",
  "Picture",
] as const;

export const FILE_FIELDS: ReadonlySet<string> = new Set([
  "SentenceAudio",
  "Picture",
]);

export type FieldName = (typeof FIELD_ORDER)[number];
export type NoteFields = Record<FieldName, string>;

export function extractFilename(value: string): string {
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

function FileInputField({
  field,
  fieldName,
  onPendingBlob,
}: {
  field: ControllerRenderProps<NoteFields, FieldName>;
  fieldName: string;
  onPendingBlob: (blob: File, filename: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = fieldName === "SentenceAudio" ? "audio/*" : "image/*";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPendingBlob(file, file.name);
    field.onChange(file.name);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex gap-2">
      <Input value={field.value} readOnly lang="ja" onChange={() => {}} />
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
        aria-label={`Upload ${fieldName}`}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
      </Button>
    </div>
  );
}

type NoteCardFormProps = {
  noteId: number;
  defaultValues: NoteFields;
  /**
   * Blobs to upload to Anki media on submit. Keys match file field names.
   * The corresponding defaultValues entry should already contain the intended filename.
   */
  pendingBlobs?: Partial<Record<"SentenceAudio" | "Picture", Blob>>;
  /** Called after a successful updateNoteFields. */
  onSuccess?: () => void;
  /** Rendered to the left of the Update button (e.g. a Cancel button). */
  extraActions?: React.ReactNode;
};

export function NoteCardForm({
  noteId,
  defaultValues,
  pendingBlobs,
  onSuccess,
  extraActions,
}: NoteCardFormProps) {
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Pending blobs: seeded from prop, updated when user picks a file via upload button.
  const [pendingBlobMap, setPendingBlobMap] = useState<
    Partial<Record<"SentenceAudio" | "Picture", PendingBlob>>
  >(() => {
    const map: Partial<Record<"SentenceAudio" | "Picture", PendingBlob>> = {};
    if (pendingBlobs?.SentenceAudio)
      map.SentenceAudio = { blob: pendingBlobs.SentenceAudio, filename: defaultValues.SentenceAudio };
    if (pendingBlobs?.Picture)
      map.Picture = { blob: pendingBlobs.Picture, filename: defaultValues.Picture };
    return map;
  });

  const form = useForm<NoteFields>({ defaultValues });

  const handlePendingBlob = (
    fieldName: "SentenceAudio" | "Picture",
    blob: File,
    filename: string,
  ) => {
    setPendingBlobMap((prev) => ({ ...prev, [fieldName]: { blob, filename } }));
  };

  const onSubmit = async (data: NoteFields) => {
    setUpdateError(null);
    setUpdateSuccess(false);

    // Upload pending blobs to Anki media before updating note fields.
    for (const key of ["SentenceAudio", "Picture"] as const) {
      const pending = pendingBlobMap[key];
      if (pending) {
        try {
          await storeMediaFileFromBlob(pending.blob, pending.filename);
        } catch (e) {
          setUpdateError(e instanceof Error ? e.message : `Failed to upload ${key}`);
          return;
        }
      }
    }

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
        onSuccess?.();
      }
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
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
                  <FileInputField
                    field={field}
                    fieldName={fieldName}
                    onPendingBlob={(blob, filename) =>
                      handlePendingBlob(fieldName as "SentenceAudio" | "Picture", blob, filename)
                    }
                  />
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
          {extraActions}
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
  );
}
