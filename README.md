# Chrono

A minimal desktop Timer / Stopwatch / Alarm / Session utility, built as a static
Next.js app so it can be dropped straight into a Tauri shell.

## Running it

```bash
npm install
npm run dev        # local dev server at http://localhost:3000
npm run build       # produces a static site in ./out
npm run start        # serves ./out locally, so you can sanity-check the real build
```

`npm run build` is a **static export** (`output: 'export'` in `next.config.mjs`) —
`./out` is a plain folder of HTML/CSS/JS with no server required. That's the
folder Tauri should point at.

## Assets you still need to add

**Sounds** — drop these exact filenames into `public/sounds/` and they'll be
picked up automatically, no code changes needed:

| File | Used for |
|---|---|
| `public/sounds/complete.mp3` | Timer finished **and** Session finished (intentionally shared) |
| `public/sounds/alarm.mp3` | Alarm ringing |
| `public/sounds/session-transition.mp3` | Session switching between work ↔ break |
| `public/sounds/button.mp3` | UI click feedback |

Until these exist, the app runs fine — sound playback just silently no-ops.

**Fonts** — already included:
- `public/fonts/SquareSansSerif7-Regular.ttf` — base UI font
- `public/fonts/Clocker-Medium.ttf` — big digit displays only (Timer/Stopwatch/Alarm/Session)

⚠️ Double-check the license on both before shipping the `.exe`. The Rylone font
that was originally requested turned out to be demo-only; Clocker replaced it,
but if it came from a trial/demo package the same concern applies — confirm
you have a license that covers distribution before release.

## Wiring this into Tauri

1. From this project's root (or a parent folder), run:
   ```bash
   npm create tauri-app@latest
   ```
   or, if you already have a Rust/Tauri project, skip to step 2.

2. In `src-tauri/tauri.conf.json`, point the frontend at this project's build output:
   ```json
   {
     "build": {
       "frontendDist": "../desktop-timer/out",
       "devUrl": "http://localhost:3000",
       "beforeDevCommand": "npm run dev --prefix ../desktop-timer",
       "beforeBuildCommand": "npm run build --prefix ../desktop-timer"
     }
   }
   ```
   Adjust the relative paths to match wherever you place this folder relative
   to `src-tauri/`.

3. `npm run tauri dev` for a live dev loop, `npm run tauri build` for the final `.exe`.

No further config should be needed — asset paths in the export are root-relative
(`/fonts/...`, `/_next/...`), which is exactly what Tauri expects when it serves
`frontendDist` as the app's root.

## What's persisted vs. session-only

Saved to `localStorage` (survives a refresh/relaunch): Timer's set duration,
the full Alarm list, Session's work/break/rounds config, theme choice, and all
sound settings.

**Intentionally not persisted**: any *live, in-progress* state — a running
countdown, an active session's current phase/round, the Stopwatch's elapsed
time. Refreshing mid-timer resets to idle rather than trying to reconstruct
where you were. If you'd rather the Stopwatch or an in-progress Session
survive a refresh too, that's a small, isolated change — just ask.

## Keyboard behavior in editable fields

Every duration field (Timer edit, Alarm add/edit, Session config) supports:
- Click/tab in → full value auto-selected, so typing immediately overwrites it
- `Enter` → commits the value
- `Escape` → discards changes and exits editing, same as clicking Cancel
