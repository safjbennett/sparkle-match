# Sparkle Match ✨

A magical match-3 game made for one very specific 7-year-old. Single self-contained HTML file — no build step, no dependencies, fully offline once loaded.

## Features

- **4 themes**: Unicorn Meadow, Mermaid Lagoon, Winter Wonder, Fairy Garden
- **Fairy garden home screen** with animated butterflies and floating flowers
- **Procedural fairy music** synthesized live in the browser (no audio files)
- **No fail state** — running out of moves shows a gentle "try again"
- **PWA-ready** — can be added to iPhone home screen and run full-screen offline
- **localStorage** for best score and theme preference
- All art is emoji, all audio is Web Audio synthesis, all logic is one file

## Deploy to Vercel from GitHub

1. Create a new GitHub repo and drop `index.html` (and optionally this README) into the root.
2. Push to GitHub.
3. On vercel.com, **Add New Project → Import** the repo.
4. Framework preset: **Other** (Vercel auto-detects static HTML).
5. Build command: leave blank. Output directory: leave blank (root).
6. Click **Deploy**. Done — Vercel serves `index.html` at the root.

That's it. No `package.json`, no `vercel.json`, no build step needed.

## Add to iPhone home screen

After deploying:

1. Open the Vercel URL in Safari on the iPhone.
2. Tap **Share** → **Add to Home Screen** → name it "Sparkle Match".
3. The icon appears on the home screen and launches full-screen, no Safari chrome.
4. Works offline once it's been opened once.

## Files

- `index.html` — the game (deploy this)
- `sparkle-match.html` — identical copy with the original filename

## Customizing

All themes, symbols, level scaling, and music live in `index.html`. Search for `THEMES`, `MELODY`, `goalForLevel`, or `TOAST_WORDS` to tweak.
