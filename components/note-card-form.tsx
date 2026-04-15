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
      await storeMediaFileFromBlob(file, file.name);
      field.onChange(file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
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

type NoteCardFormProps = {
  noteId: number;
  defaultValues: NoteFields;
  /** Called after a successful updateNoteFields. */
  onSuccess?: () => void;
  /** Rendered to the left of the Update button (e.g. a Cancel button). */
  extraActions?: React.ReactNode;
};

export function NoteCardForm({
  noteId,
  defaultValues,
  onSuccess,
  extraActions,
}: NoteCardFormProps) {
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const form = useForm<NoteFields>({ defaultValues });

  const onSubmit = async (data: NoteFields) => {
    setUpdateError(null);
    setUpdateSuccess(false);

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
