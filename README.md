# Vibe Riding — World Chain

An interactive 3D web experience with a permanent chain of user-created worlds.

## Features

- Space environment with clickable nebula + warp transition
- Explorable Bauhaus-style 3D world with ambient beat
- Hidden ritual puzzle (beacon sequence) to unlock the harmony chamber
- **World Chain**: After reaching harmony, create your own world via text prompt
- **"Es kann nur einen geben"**: First-come-first-served locking — only one user can create at a time
- Prompt-driven world generation (colors, moods, shapes, density)
- Browse and navigate through all created worlds

## Run

```bash
npm install
npm start
```

Open http://localhost:4180

## Architecture

- **Frontend**: Three.js + vanilla JS (ES modules)
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3) — worlds + creation lock
- **World Generator**: Keyword-based prompt parser → Three.js scene parameters

## How It Works

1. Drift through space, find and click the nebula 4 times
2. Warp into the Bauhaus world
3. Complete the beacon ritual (click beacons in the right order) to unlock the chamber
4. Enter the harmony room
5. After 5 seconds, press **C** (or tap on mobile) to create your world
6. Describe your world in a text prompt — colors, mood, shapes
7. Your world is permanently added to the chain
8. Navigate between worlds using the chain bar at the bottom
