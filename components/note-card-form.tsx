'use client'

import { useRef, useState } from 'react'
import { useForm, type ControllerRenderProps } from 'react-hook-form'
import { Upload, X } from 'lucide-react'

import { ankiRequest, storeMediaFileFromBlob } from '@/lib/anki-connect'
import { useSettings } from '@/lib/settings-context'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type PendingBlob = { blob: Blob; filename: string }

export const FIELD_ORDER = [
  'Expression',
  'Sentence',
  'SentenceFurigana',
  'SentenceAudio',
  'Picture',
] as const

export const FILE_FIELDS: ReadonlySet<string> = new Set([
  'SentenceAudio',
  'Picture',
])

export type FieldName = (typeof FIELD_ORDER)[number]
export type NoteFields = Record<FieldName, string>

export function extractFilename(value: string): string {
  const soundMatch = value.match(/\[sound:([^\]]+)\]/)
  if (soundMatch) return soundMatch[1]
  const srcMatch = value.match(/src="([^"]+)"/)
  if (srcMatch) return srcMatch[1]
  return value
}

function wrapFileValue(fieldName: string, filename: string): string {
  if (fieldName === 'SentenceAudio') return `[sound:${filename}]`
  if (fieldName === 'Picture') return `<img src="${filename}">`
  return filename
}

function FileInputField({
  field,
  fieldName,
  onPendingBlob,
  onClear,
}: {
  field: ControllerRenderProps<NoteFields, FieldName>
  fieldName: string
  onPendingBlob: (blob: File, filename: string) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = fieldName === 'SentenceAudio' ? 'audio/*' : 'image/*'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onPendingBlob(file, file.name)
    field.onChange(file.name)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClear = () => {
    field.onChange('')
    onClear()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          value={field.value}
          readOnly
          lang="ja"
          onChange={() => {}}
          className="pr-7"
        />
        {field.value && (
          <button
            type="button"
            aria-label={`Clear ${fieldName}`}
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1.5 flex items-center"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
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
  )
}

type NoteCardFormProps = {
  noteId: number
  defaultValues: NoteFields
  /**
   * Blobs to upload to Anki media on submit. Keys match file field names.
   * The corresponding defaultValues entry should already contain the intended filename.
   */
  pendingBlobs?: Partial<Record<'SentenceAudio' | 'Picture', Blob>>
  /** Called after a successful updateNoteFields. */
  onSuccess?: () => void
  /** Rendered to the left of the Update button (e.g. a Cancel button). */
  extraActions?: React.ReactNode
}

export function NoteCardForm({
  noteId,
  defaultValues,
  pendingBlobs,
  onSuccess,
  extraActions,
}: NoteCardFormProps) {
  const { settings } = useSettings()
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  // Pending blobs: seeded from prop, updated when user picks a file via upload button.
  const [pendingBlobMap, setPendingBlobMap] = useState<
    Partial<Record<'SentenceAudio' | 'Picture', PendingBlob>>
  >(() => {
    const map: Partial<Record<'SentenceAudio' | 'Picture', PendingBlob>> = {}
    if (pendingBlobs?.SentenceAudio)
      map.SentenceAudio = {
        blob: pendingBlobs.SentenceAudio,
        filename: defaultValues.SentenceAudio,
      }
    if (pendingBlobs?.Picture)
      map.Picture = {
        blob: pendingBlobs.Picture,
        filename: defaultValues.Picture,
      }
    return map
  })

  const form = useForm<NoteFields>({ defaultValues })

  const handlePendingBlob = (
    fieldName: 'SentenceAudio' | 'Picture',
    blob: File,
    filename: string,
  ) => {
    setPendingBlobMap((prev) => ({ ...prev, [fieldName]: { blob, filename } }))
  }

  const handleClear = (fieldName: 'SentenceAudio' | 'Picture') => {
    setPendingBlobMap((prev) => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }

  const onSubmit = async (data: NoteFields) => {
    setUpdateError(null)
    setUpdateSuccess(false)

    // Upload pending blobs to Anki media before updating note fields.
    for (const key of ['SentenceAudio', 'Picture'] as const) {
      const pending = pendingBlobMap[key]
      if (pending) {
        try {
          await storeMediaFileFromBlob(pending.blob, pending.filename, {
            ankiPort: settings.ankiPort,
          })
        } catch (e) {
          setUpdateError(
            e instanceof Error ? e.message : `Failed to upload ${key}`,
          )
          return
        }
      }
    }

    const fields = Object.fromEntries(
      FIELD_ORDER.map((f) => [
        f,
        FILE_FIELDS.has(f)
          ? data[f]
            ? wrapFileValue(f, data[f])
            : ''
          : data[f],
      ]),
    )

    try {
      const result = await ankiRequest(
        'updateNoteFields',
        { note: { id: noteId, fields } },
        { ankiPort: settings.ankiPort },
      )

      if (result.error) {
        setUpdateError(String(result.error))
      } else {
        setUpdateSuccess(true)
        onSuccess?.()
      }
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : 'Update failed')
    }
  }

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
                      handlePendingBlob(
                        fieldName as 'SentenceAudio' | 'Picture',
                        blob,
                        filename,
                      )
                    }
                    onClear={() =>
                      handleClear(fieldName as 'SentenceAudio' | 'Picture')
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
            <span className="text-destructive text-sm">{updateError}</span>
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
  )
}
