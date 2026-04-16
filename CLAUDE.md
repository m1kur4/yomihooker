# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

TextHooker is a Japanese language learning tool. It connects via WebSocket to a local text-hook server, displays hooked text alongside machine translations, plays Japanese TTS audio via VOICEVOX, and integrates with Anki via AnkiConnect to aid vocabulary card mining.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

No test suite exists yet.

## External Dependencies (must be running locally)

All ports are configured in `config.toml`.

| Service        | Default port | Purpose                                   |
| -------------- | ------------ | ----------------------------------------- |
| LunaTranslator | 2333         | WebSocket text hook + machine translation |
| VOICEVOX       | 50021        | Japanese TTS synthesis                    |
| AnkiConnect    | 8765         | Anki note read/write                      |

## Configuration (`config.toml`)

`config.toml` at the project root is the single source of truth for service ports. It has two sections:

- **Active settings** (`[lunatranslator]`, `[voicevox]`, `[anki_connect]`) — written by the in-app settings UI
- **Reset targets** (`[defaults.lunatranslator]`, `[defaults.voicevox]`, `[defaults.anki_connect]`) — never overwritten by the UI; edit manually to change what "Reset defaults" restores

`lib/read-config.ts` handles server-side read/write via `smol-toml`. `app/layout.tsx` (server component) reads the file on each render and passes `initialSettings` and `defaultSettings` as props to `SettingsProvider`.

The settings UI (gear icon in navbar) calls `PATCH /api/config` on save, which rewrites the active sections of `config.toml` while preserving `[defaults.*]`.

## Settings Context (`lib/settings-context.tsx`)

`SettingsProvider` is a required wrapper (mounted in `app/layout.tsx`) that exposes:

- `settings` — current in-memory values (seeded from `initialSettings` prop)
- `defaultSettings` — reset targets (from `[defaults.*]` in TOML)
- `setSettings(s)` — updates state + writes to `config.toml` via API

Client components read ports via `useSettings()`. URL helpers `lunaWsUrl(port)` and `lunaTranslateUrl(port)` build LunaTranslator URLs from the port.

API routes (`/api/tts`, `/api/anki`) call `readConfigFile()` for their fallback ports. Clients can override per-request via the `voicevoxPort`/`speaker` body fields (TTS) or `X-Anki-Port` header (Anki).

## Database

- **Engine**: SQLite via Prisma 7 + `@prisma/adapter-libsql` (Wasm-based, no native binary)
- **File**: `data/data.db` (gitignored)
- **Schema**: `prisma/schema.prisma` — `Deck` and `Message` models
- **Config**: `prisma/config.ts` — uses `defineConfig` (Prisma 7); `datasource.url` points to `../data/data.db`
- **Schema sync**: no migrations — use `npx prisma db push --config ./prisma/config.ts` after any schema change
- **Seed**: `npx prisma db seed --config ./prisma/config.ts` — reads legacy `data/decks.json` + `data/decks/{id}/messages.json`
- **Connection**: `lib/prisma.ts` — singleton `PrismaClient` with `PrismaLibSql({ url })` adapter; URL from `DATABASE_URL` env var

## Architecture

```
app/
  layout.tsx          — server component; reads config.toml, wraps tree in SettingsProvider
                         + DeckStatsProvider, injects ThemeSync + Navbar
  page.tsx            — home; fetches decks, renders DeckGrid
  deck.tsx            — "use client"; WebSocket listener, message list (newest-first, top 10
                         visible, older in Collapsible), MessageCard
  [deckId]/page.tsx   — per-deck server page; Breadcrumb + TextDeck
  anki/page.tsx       — Anki page; renders NoteCard
  api/
    config/route.ts                       — PATCH: writes active settings to config.toml
    decks/route.ts                        — GET / POST decks
    decks/[id]/route.ts                   — PATCH / DELETE a deck
    decks/[id]/cover/route.ts             — POST: saves cover image to public/covers/
    decks/[id]/messages/route.ts          — GET / POST messages
    decks/[id]/messages/[msgId]/route.ts  — DELETE a message
    tts/route.ts                          — POST: proxies to VOICEVOX, returns audio/wav
    save-file/route.ts                    — POST (multipart): writes blob to ~/Desktop
    anki/route.ts                         — POST: proxies to AnkiConnect (avoids CORS)

components/
  navbar.tsx           — sticky top nav; app name (links home), Anki nav link,
                         AudioPlayer, Screenshot, StatsButton (HoverCard), SettingsPopover
  deck-grid.tsx        — home page deck grid; DeckCard, AddDeckButton, RenameDialog
  audioplayer.tsx      — TTS playback; compact mode (floats above button) or
                         non-compact/navbar mode (drops below, includes text input)
  mine-button.tsx      — screenshot + TTS + Anki dialog on click
  note-card-form.tsx   — reusable form for Anki note fields; used by NoteCard and MineButton
  ui/button.tsx        — shadcn Button + custom sizes: icon-xs, icon-sm, icon-lg

lib/
  settings-context.tsx — AppSettings type, SettingsProvider, useSettings(), lunaWsUrl(),
                         lunaTranslateUrl()
  read-config.ts       — readConfigFile(), writeConfigFile(), configFileToSettings(),
                         configFileToDefaults(); server-only (uses fs + smol-toml)
  deck-stats-context.tsx — DeckStatsProvider, useDeckStats(); tracks total char count
                           for the active deck (shown in navbar StatsButton HoverCard)
  anki-connect.ts      — ankiRequest(action, params, {ankiPort?}),
                         storeMediaFileFromBlob(blob, filename, {ankiPort?})
  media-utils.ts       — fetchTtsBlob(text, {voicevoxPort?, speaker?}),
                         captureScreenshotAsBlob(), saveToDesktop(), filename helpers
  prisma.ts            — Prisma singleton; PrismaLibSql adapter
  deck-store.ts        — readDecks, createDeck, updateDeck, deleteDeck
  message-store.ts     — readMessages, appendMessage, deleteMessageById
```

### Data flow

1. `deck.tsx` on mount: fetches persisted messages from `/api/decks/{deckId}/messages`, then opens a WebSocket to `lunaWsUrl(settings.lunatranslatorPort)`. The effect re-runs if the port changes.
2. On each WS message: fetches translation, POSTs `MessageData` to persist it, updates React state with the DB-assigned id. Also calls `setCharCount` to keep the navbar stats current.
3. TTS: `fetchTtsBlob(text, { voicevoxPort, speaker })` → `POST /api/tts` → VOICEVOX.
4. Anki: `ankiRequest(action, params, { ankiPort })` → `POST /api/anki` (server proxy, avoids CORS).

### Mine button flow

1. Click → `captureScreenshotAsBlob()` **must fire first** — `getDisplayMedia` requires the active user gesture.
2. TTS fetch and Anki note fetch run in parallel.
3. Blobs uploaded to Anki media via `storeMediaFileFromBlob()`.
4. SentenceFurigana gets translation appended (skipped if already present).
5. `NoteCardForm` dialog opens pre-populated.

## Key Patterns

- **All API routes** set `export const runtime = "nodejs"` at the top.
- **Client components** always declare `"use client"` as the first line.
- **`serverExternalPackages`** in `next.config.ts`: `@prisma/client`, `@prisma/adapter-libsql`, `@libsql/client`, `prisma`, `smol-toml` — required to prevent Turbopack bundling them.
- **Styling**: Tailwind v4 utility classes + inline `React.CSSProperties` for per-element overrides. Both coexist in `deck.tsx` — don't consolidate without reason.
- **Button sizes**: use `icon-xs`, `icon-sm`, `icon-lg` from `components/ui/button.tsx`.
- **AnkiConnect is proxied** — never call port 8765 directly from client; always use `ankiRequest()`.
- **Prisma adapter**: `PrismaLibSql` takes `{ url }` Config directly — do NOT pass a pre-created `@libsql/client` instance.
- **Message IDs**: assigned by the DB (autoincrement) — never generate client-side IDs.
- **Timestamps**: `new Date().toLocaleString("en-GB", { timeZone: "Asia/Shanghai" })`.
- **NoteCardForm file fields** (`SentenceAudio`, `Picture`): store bare filename in form state; `wrapFileValue()` re-wraps to `[sound:…]` / `<img src="…">` on submit.
