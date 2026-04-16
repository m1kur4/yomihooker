# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

TextHooker is a Japanese language learning tool. It connects via WebSocket to a local text-hook server (port 2333), displays hooked text alongside machine translations, plays Japanese TTS audio via a local VOICEVOX engine, and integrates with Anki via AnkiConnect to aid vocabulary card mining.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

No test suite exists yet.

## External Dependencies (must be running locally)

All addresses are configured in `lib/config.ts`.

| Service | Config key | Default address | Purpose |
|---|---|---|---|
| LunaTranslator (text hook) | `config.lunatranslator.wsUrl` | `ws://localhost:2333/api/ws/text/origin` | WebSocket source of hooked text |
| LunaTranslator (translate) | `config.lunatranslator.translateUrl` | `http://127.0.0.1:2333/api/translate` | Machine translation |
| VOICEVOX TTS engine | `config.voicevox.url` / `config.voicevox.speaker` | `http://127.0.0.1:50021`, speaker `14` | Japanese TTS synthesis |
| AnkiConnect | `config.ankiConnect.url` | `http://127.0.0.1:8765` | Anki note read/write via `/api/anki` proxy |

## Database

- **Engine**: SQLite via Prisma 7 + `@prisma/adapter-libsql` (Wasm-based, no native binary)
- **File**: `data/data.db` (gitignored; not committed)
- **Schema**: `prisma/schema.prisma` — `Deck` and `Message` models
- **Config**: `prisma/config.ts` — uses `defineConfig` (Prisma 7); `datasource.url` points to `../data/data.db`
- **Migrations**: `prisma/migrations/` — committed to git; apply with `npx prisma migrate deploy --config ./prisma/config.ts`
- **Seed**: `npx prisma db seed --config ./prisma/config.ts` — reads `data/decks.json` + `data/decks/{id}/messages.json` to populate a fresh db
- **Connection**: `lib/prisma.ts` — singleton `PrismaClient` using `PrismaLibSql({ url })` adapter; URL from `DATABASE_URL` env var (set in `.env`)
- **`serverExternalPackages`** in `next.config.ts` prevents Turbopack from bundling `@prisma/client`, `@prisma/adapter-libsql`, `@libsql/client`, and `prisma` — required for correct runtime behavior

## Architecture

```
app/
  page.tsx            — root page (server component); fetches decks, renders DeckGrid
  deck.tsx            — "use client"; WebSocket listener, message list (newest-first, top 10
                         visible, older messages in a Collapsible), MessageCard
  layout.tsx          — root layout; injects ThemeSync, theme-init script, and Navbar
  theme-sync.tsx      — syncs OS dark/light preference via .dark class
  globals.css         — Tailwind v4 + shadcn theme (oklch tokens, dark mode vars)
  [deckId]/
    page.tsx          — per-deck page (server component); Breadcrumb + TextDeck
  anki/
    page.tsx          — Anki page; fetches latest added note and renders NoteCard
  api/
    decks/route.ts                      — GET (list) / POST (create) decks
    decks/[id]/route.ts                 — PATCH (update) / DELETE a deck
    decks/[id]/cover/route.ts           — POST: saves cover image to public/covers/
    decks/[id]/messages/route.ts        — GET (list) / POST (append) messages for a deck
    decks/[id]/messages/[msgId]/route.ts — DELETE a message by id
    tts/route.ts                        — POST: proxies to VOICEVOX, returns audio/wav
    save-file/route.ts                  — POST (multipart): writes blob to ~/Desktop
    anki/route.ts                       — POST: proxies to AnkiConnect (avoids CORS)

components/
  navbar.tsx           — sticky top nav; contains nav links + AudioPlayer + Screenshot
  deck-grid.tsx        — home page deck grid; DeckCard (200×200, cover, hover DropdownMenu),
                         AddDeckButton (Dialog), RenameDialog
  audioplayer.tsx      — TTS playback; two modes:
                         • compact (inline icon-sm button, panel floats above)
                         • non-compact (icon button in navbar, panel drops below with text input)
                         Progress bar uses shadcn Slider; volume uses shadcn Progress (click to set)
  mine-button.tsx      — on click: captures screenshot + TTS audio + opens Anki dialog
  screenshot.tsx       — captures a window via getDisplayMedia, saves JPEG to desktop
  clipboard.tsx        — copy-to-clipboard button
  note-card.tsx        — fetches latest Anki note, renders NoteCardForm
  note-card-form.tsx   — reusable shadcn form for viewing/editing an Anki note's fields;
                         used by both NoteCard (anki page) and MineButton (dialog)
  ui/button.tsx        — shadcn Button with extra size variants: icon-xs, icon-sm, icon-lg
  ui/collapsible.tsx   — shadcn Collapsible (used in deck.tsx for older messages)
  ui/dialog.tsx        — shadcn Dialog
  ui/form.tsx          — shadcn Form primitives (wraps react-hook-form)
  ui/input.tsx         — shadcn Input
  ui/label.tsx         — shadcn Label
  ui/progress.tsx      — shadcn Progress (used for volume display in AudioPlayer)
  ui/slider.tsx        — shadcn Slider (used for audio progress bar in AudioPlayer)
  ui/textarea.tsx      — shadcn Textarea

lib/
  config.ts          — external service addresses (LunaTranslator, VOICEVOX, AnkiConnect)
  prisma.ts          — Prisma singleton; PrismaLibSql adapter; reads DATABASE_URL from env
  deck-data.ts       — Deck interface { id, name, cover?, createdAt }
  deck-store.ts      — Prisma-based CRUD: readDecks, createDeck, updateDeck, deleteDeck
  message-data.ts    — MessageData interface { id, original, translation, timestamp }
  message-store.ts   — Prisma-based: readMessages, appendMessage, deleteMessageById
  anki-connect.ts    — ankiRequest(), storeMediaFileFromBlob(); shared AnkiConnect helpers
  media-utils.ts     — fetchTtsBlob, audioFilename, screenshotFilename,
                       captureScreenshotAsBlob, saveToDesktop, formatFilename

prisma/
  schema.prisma      — Deck + Message models (SQLite, no url in datasource — Prisma 7)
  config.ts          — defineConfig with datasource.url and migrations.seed
  seed.ts            — seeds data.db from legacy JSON files
  migrations/        — migration history; commit to git
```

### Data flow

1. `deck.tsx` on mount: fetches persisted messages from `/api/decks/{deckId}/messages`, then opens a WebSocket to the hook server. WebSocket is scoped to the current deck (effect depends on `deckId`).
2. On each WS message: fetches translation, POSTs the new `MessageData` to `/api/decks/{deckId}/messages` (persisted to SQLite), then updates React state with the DB-assigned id.
3. Delete: calls `DELETE /api/decks/{deckId}/messages/{msgId}`, removes from state on success.
4. TTS: `AudioPlayer` fetches via `fetchTtsBlob()` → `/api/tts` → VOICEVOX. `MineButton` uses the same helper.
5. File saves: blobs (WAV, JPEG) are sent via `saveToDesktop()` → `POST /api/save-file` → written to `~/Desktop`.
6. Anki integration: all AnkiConnect calls go through `/api/anki` (server-side proxy) to avoid browser CORS. `ankiRequest()` in `lib/anki-connect.ts` is the single entry point.

### Mine button flow

1. Click → `captureScreenshotAsBlob()` starts immediately (must be first — user gesture required for `getDisplayMedia`).
2. TTS fetch (`fetchTtsBlob`) and Anki note fetch (`findNotes` + `notesInfo`) run in parallel.
3. Both blobs uploaded to Anki media via `storeMediaFileFromBlob()`.
4. SentenceFurigana gets the message translation appended as a new line (skipped if already present).
5. Dialog opens with `NoteCardForm` pre-populated; Cancel closes, Update calls `updateNoteFields`.

### NoteCardForm field order

`Expression` → `Sentence` → `SentenceFurigana` → `SentenceAudio` → `Picture`

`SentenceAudio` and `Picture` are read-only filename displays with an upload button; editable text fields use shadcn `Textarea`.

### File naming conventions

| Helper | Pattern | Used for |
|---|---|---|
| `audioFilename(ts)` | `audio_<formatted-ts>.wav` | TTS audio saved to desktop or Anki media |
| `screenshotFilename(ts)` | `screenshot_<formatted-ts>.jpg` | Screenshot saved to desktop or Anki media |

## Key Patterns

- **All API routes** set `export const runtime = "nodejs"` at the top.
- **Client components** always declare `"use client"` as the first line.
- **Styling**: Tailwind v4 utility classes for layout/theming; inline `React.CSSProperties` objects for per-element overrides (see `deck.tsx`). Both coexist — don't consolidate them without reason.
- **Button sizes**: use the custom variants `icon-xs`, `icon-sm`, `icon-lg` defined in `components/ui/button.tsx` rather than raw sizing classes.
- **Screenshot must be called first inside a user-gesture handler** — `getDisplayMedia` requires an active user gesture and will throw `NotAllowedError` otherwise (see `mine-button.tsx`).
- **External service addresses** live in `lib/config.ts` — never hard-code service URLs/ports in source files; always reference `config.*`.
- **AnkiConnect is proxied** — never call `http://127.0.0.1:8765` directly from client code; use `ankiRequest()` which goes through `/api/anki` to avoid CORS.
- **File fields in NoteCardForm** (`SentenceAudio`, `Picture`) store only the filename in the form; `wrapFileValue()` re-wraps them into Anki's expected format (`[sound:…]` / `<img src="…">`) on submit.
- **Timestamps** use `en-GB` locale with `Asia/Shanghai` timezone: `new Date().toLocaleString("en-GB", { timeZone: "Asia/Shanghai" })`.
- **`cn()` helper** from `lib/utils.ts` combines `clsx` + `tailwind-merge` — use it for conditional Tailwind classes.
- **Prisma adapter**: `PrismaLibSql` (from `@prisma/adapter-libsql`) takes a `Config` object `{ url }` directly — do NOT pass a pre-created `@libsql/client` Client instance.
- **`serverExternalPackages`**: Prisma + libsql packages must be listed in `next.config.ts` to prevent Turbopack from bundling them incorrectly.
- **Message IDs**: assigned by the database (autoincrement) — never generate client-side IDs for messages. The POST response returns the created `MessageData` with the DB-assigned `id`.
