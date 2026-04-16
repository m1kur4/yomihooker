'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { Deck } from '@/lib/deck-data'

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiPatch(id: number, body: object) {
  const res = await fetch(`/api/decks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<Deck>
}

async function apiDelete(id: number) {
  await fetch(`/api/decks/${id}`, { method: 'DELETE' })
}

async function uploadCover(id: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`/api/decks/${id}/cover`, {
    method: 'POST',
    body: form,
  })
  const data = (await res.json()) as { cover: string }
  return data.cover
}

// ── DeckCard ──────────────────────────────────────────────────────────────────

function DeckCard({
  deck,
  onRename,
  onCoverChange,
  onDelete,
}: {
  deck: Deck
  onRename: (id: number, name: string) => void
  onCoverChange: (id: number, cover: string) => void
  onDelete: (id: number) => void
}) {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const cover = await uploadCover(deck.id, file)
    onCoverChange(deck.id, cover)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  return (
    <div
      className="group border-border bg-muted relative h-[200px] w-[200px] cursor-pointer overflow-hidden rounded-xl border transition-shadow hover:shadow-lg"
      onClick={() => router.push(`/${deck.id}`)}
    >
      {/* Cover */}
      {deck.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deck.cover}
          alt={deck.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="from-muted to-muted-foreground/20 h-full w-full bg-gradient-to-br" />
      )}

      {/* Bottom name bar */}
      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2">
        <p className="truncate text-sm font-semibold text-white">{deck.name}</p>
      </div>

      {/* More button — shown on hover */}
      <div
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="secondary">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRename(deck.id, deck.name)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => coverInputRef.current?.click()}>
              Change Cover
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(deck.id)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden cover file input */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleCoverFile(e)}
      />
    </div>
  )
}

// ── AddDeckButton ─────────────────────────────────────────────────────────────

function AddDeckButton({ onCreate }: { onCreate: (deck: Deck) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const deck = (await res.json()) as Deck

      if (coverFile) {
        const cover = await uploadCover(deck.id, coverFile)
        deck.cover = cover
      }

      onCreate(deck)
      setOpen(false)
      setName('')
      setCoverFile(null)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-[200px] w-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors"
      >
        <Plus className="size-8" />
        <span className="text-sm font-medium">New Deck</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Deck name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
              autoFocus
            />
            <div>
              <p className="text-muted-foreground mb-1.5 text-sm">
                Cover image (optional)
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!name.trim() || isCreating}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── RenameDialog ──────────────────────────────────────────────────────────────

function RenameDialog({
  deckId,
  initialName,
  onClose,
  onSave,
}: {
  deckId: number | null
  initialName: string
  onClose: () => void
  onSave: (id: number, name: string) => void
}) {
  const [name, setName] = useState(initialName)

  const handleSave = async () => {
    if (!name.trim() || deckId === null) return
    const updated = await apiPatch(deckId, { name: name.trim() })
    onSave(deckId, updated.name)
    onClose()
  }

  return (
    <Dialog open={deckId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Rename Deck</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── DeckGrid ──────────────────────────────────────────────────────────────────

export function DeckGrid({ initialDecks }: { initialDecks: Deck[] }) {
  const [decks, setDecks] = useState<Deck[]>(initialDecks)
  const [renaming, setRenaming] = useState<{
    id: number
    name: string
  } | null>(null)

  const handleRename = (id: number, name: string) => setRenaming({ id, name })

  const handleRenameSave = (_id: number, newName: string) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === _id ? { ...d, name: newName } : d)),
    )
  }

  const handleCoverChange = (id: number, cover: string) => {
    setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, cover } : d)))
  }

  const handleDelete = async (id: number) => {
    await apiDelete(id)
    setDecks((prev) => prev.filter((d) => d.id !== id))
  }

  const handleCreate = (deck: Deck) => {
    setDecks((prev) => [...prev, deck])
  }

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onRename={handleRename}
            onCoverChange={handleCoverChange}
            onDelete={(id) => void handleDelete(id)}
          />
        ))}
        <AddDeckButton onCreate={handleCreate} />
      </div>

      <RenameDialog
        key={renaming?.id ?? 0}
        deckId={renaming?.id ?? null}
        initialName={renaming?.name ?? ''}
        onClose={() => setRenaming(null)}
        onSave={handleRenameSave}
      />
    </>
  )
}
