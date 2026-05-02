# Sparkle Match ✨

A magical match-3 game made for one very specific 7-year-old. Pure HTML/CSS/JS with synthesized music — no build step, no framework, runs offline once loaded.

## Features

- **6×6 grid** sized for small fingers
- **Drag or tap** to swap pieces (both work)
- **4 themes**: Unicorn Meadow, Mermaid Lagoon, Winter Wonder, Fairy Garden — each with own symbol set, palette, and music
- **Fairy garden home screen** with floating creatures matched to the chosen theme
- **Power-ups** for big matches:
  - ⚡ **Lightning** — match 4 in a line clears the entire perpendicular row/column
  - 💣 **Bomb** — L/T-shaped match clears a 3×3 area
  - 🌈 **Rainbow Burst** — match 5 in a line clears the whole board, 2× points
- **Animations**: glow + wobble before pop, sparkle trails flying to the score counter, theme-tinted particles, lightning trails through matches, bouncy drops, score popups, screen flash on big combos
- **Synthesized fairy music** — 4 themed tracks (~40s each, looped) generated programmatically, total ~2MB
- **Synthesized SFX** — Web Audio chimes, no audio files for sounds
- **No fail state** — running out of moves shows a gentle "try again"
- **PWA-ready** — Add to iPhone Home Screen for full-screen offline play
- **localStorage** for best score, theme, and audio preferences

## File structure

```
.
├── index.html           ← the game
├── audio/
│   ├── unicorn.mp3      ← Unicorn Meadow music
│   ├── mermaid.mp3      ← Mermaid Lagoon music
│   ├── winter.mp3       ← Winter Wonder music
│   └── fairy.mp3        ← Fairy Garden music
├── generate_music.py    ← (optional) regenerates the music tracks
└── README.md
```

You only need `index.html` and the `audio/` directory to deploy. The Python script is just for regenerating music if you want to.

## Deploy to Vercel from GitHub

1. Create a new GitHub repo and commit `index.html` + the `audio/` folder.
2. Push to GitHub.
3. On vercel.com, **Add New Project → Import** the repo.
4. Framework preset: **Other** (Vercel auto-detects static).
5. Leave build command and output directory blank.
6. **Deploy**.

That's it. Vercel serves `index.html` at the root and `audio/*.mp3` is reachable at `/audio/unicorn.mp3` etc., which is what the game references.

No `package.json`, no `vercel.json`, no build step.

## Add to iPhone home screen

1. Open the Vercel URL in Safari on the iPhone.
2. Tap **Share → Add to Home Screen** → name it "Sparkle Match".
3. The icon appears on the home screen and launches full-screen, no Safari chrome.
4. After the first launch, the audio is cached, so it works offline.

## Swapping in different music

The synthesized tracks are pleasant but if you find better royalty-free tracks (Pixabay Music, OpenGameArt, freesound.org), you can drop them in directly:

1. Find a CC0 / royalty-free MP3 you like, ideally 30–90 seconds long with a clean loop point.
2. Rename it to one of: `unicorn.mp3`, `mermaid.mp3`, `winter.mp3`, `fairy.mp3`.
3. Replace the file in `audio/` and redeploy. The game will pick it up automatically.

Search terms that tend to work: "fairy lullaby", "music box loop", "magical kids", "ambient harp", "underwater calm".

## Regenerating the synthesized music

Requires Python 3, numpy, and ffmpeg:

```bash
pip install numpy
python3 generate_music.py
```

Output goes to `audio/`. Edit the chord progressions, tempos, or melody patterns in the script to taste.

## Customizing the game

Everything game-related lives in `index.html`. Useful search anchors:

- `THEMES` — symbols, gradients, particle types, music file per theme
- `SIZE` — grid size (currently 6)
- `goalForLevel` — level scaling
- `processMatches` — power-up logic (lightning / bomb / rainbow)
- `currentTheme.particles` — what flies out on match
