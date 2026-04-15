# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

TextHooker is a Japanese language learning tool. It connects via WebSocket to a local text-hook server (port 2333), displays hooked text alongside machine translations, plays Japanese TTS audio via a local VOICEVOX engine, and can capture screenshots and save audio to the desktop — all to aid mining vocabulary cards.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

No test suite exists yet.

## External Dependencies (must be running locally)

| Service | Address | Purpose |
|---|---|---|
| Text hook server | `ws://localhost:2333/api/ws/text/origin` | WebSocket source of hooked text |
| Translation API | `http://127.0.0.1:2333/api/translate?text=...` | Machine translation |
| VOICEVOX TTS engine | `http://127.0.0.1:50021` | Japanese TTS synthesis (speaker `14`) |

## Architecture

```
app/
  page.tsx          — root page; composes TextDeck + AudioPlayer + Screenshot
  deck.tsx          — "use client"; core UI: WebSocket listener, message list, MessageCard
  layout.tsx        — root layout; injects ThemeSync and theme-init script
  theme-sync.tsx    — syncs OS dark/light preference via .dark class
  globals.css       — Tailwind v4 + shadcn theme (oklch tokens, dark mode vars)
  api/
    messages/route.ts      — GET (list) / POST (append) messages
    messages/[id]/route.ts — DELETE a message by id
    tts/route.ts           — POST: proxies to VOICEVOX, returns audio/wav
    save-file/route.ts     — POST (multipart): writes blob to ~/Desktop

components/
  audioplayer.tsx   — TTS playback; two modes: standalone panel or compact inline button
  mine-button.tsx   — one-click: screenshot + TTS download + copy translation to clipboard
  screenshot.tsx    — captures a window via getDisplayMedia, saves JPEG to desktop
  clipboard.tsx     — copy-to-clipboard button
  ui/button.tsx     — shadcn Button with extra size variants: icon-xs, icon-sm, icon-lg

lib/
  message-data.ts   — MessageData interface { id, original, translation, timestamp }
  message-store.ts  — file-based persistence; reads/writes data/messages.json
  media-utils.ts    — formatFilename, saveToDesktop (via /api/save-file), captureScreenshot
```

### Data flow

1. `deck.tsx` on mount: fetches persisted messages from `/api/messages`, then opens a WebSocket to the hook server.
2. On each WS message: fetches translation, POSTs the new `MessageData` to `/api/messages` (persisted to `data/messages.json`), then updates React state.
3. Delete: calls `DELETE /api/messages/:id`, removes from state on success.
4. TTS: `AudioPlayer` and `MineButton` both POST to `/api/tts` which proxies to VOICEVOX.
5. File saves: all blobs (WAV, JPEG) are sent via `saveToDesktop()` → `POST /api/save-file` → written to `~/Desktop`.

## Key Patterns

- **All API routes** set `export const runtime = "nodejs"` at the top.
- **Client components** always declare `"use client"` as the first line.
- **Styling**: Tailwind v4 utility classes for layout/theming; inline `React.CSSProperties` objects for per-element overrides (see `deck.tsx`). Both coexist — don't consolidate them without reason.
- **Button sizes**: use the custom variants `icon-xs`, `icon-sm`, `icon-lg` defined in `components/ui/button.tsx` rather than raw sizing classes.
- **Screenshot must be called first inside a user-gesture handler** — `getDisplayMedia` requires an active user gesture and will throw `NotAllowedError` otherwise (see `mine-button.tsx`).
- **Timestamps** use `en-GB` locale with `Asia/Shanghai` timezone: `new Date().toLocaleString("en-GB", { timeZone: "Asia/Shanghai" })`.
- **`cn()` helper** from `lib/utils.ts` combines `clsx` + `tailwind-merge` — use it for conditional Tailwind classes.
