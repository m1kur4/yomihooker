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

## Architecture

```
app/
  page.tsx          — root page; renders TextDeck
  deck.tsx          — "use client"; WebSocket listener, message list (newest-first, top 10
                       visible, older messages in a Collapsible), MessageCard
  layout.tsx        — root layout; injects ThemeSync, theme-init script, and Navbar
  theme-sync.tsx    — syncs OS dark/light preference via .dark class
  globals.css       — Tailwind v4 + shadcn theme (oklch tokens, dark mode vars)
  anki/
    page.tsx        — Anki page; fetches latest added note and renders NoteCard
  api/
    messages/route.ts      — GET (list) / POST (append) messages
    messages/[id]/route.ts — DELETE a message by id
    tts/route.ts           — POST: proxies to VOICEVOX, returns audio/wav
    save-file/route.ts     — POST (multipart): writes blob to ~/Desktop
    anki/route.ts          — POST: proxies to AnkiConnect (avoids CORS)

components/
  navbar.tsx           — sticky top nav; contains nav links + AudioPlayer + Screenshot
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
  message-data.ts    — MessageData interface { id, original, translation, timestamp }
  message-store.ts   — file-based persistence; reads/writes data/messages.json
  anki-connect.ts    — ankiRequest(), storeMediaFileFromBlob(); shared AnkiConnect helpers
  media-utils.ts     — fetchTtsBlob, audioFilename, screenshotFilename,
                       captureScreenshotAsBlob, saveToDesktop, formatFilename
```

### Data flow

1. `deck.tsx` on mount: fetches persisted messages from `/api/messages`, then opens a WebSocket to the hook server.
2. On each WS message: fetches translation, POSTs the new `MessageData` to `/api/messages` (persisted to `data/messages.json`), then updates React state.
3. Delete: calls `DELETE /api/messages/:id`, removes from state on success.
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
