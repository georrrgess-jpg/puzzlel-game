# Endless Puzzle Pop

An endless puzzle game that runs in the browser — just open `index.html` (no build step).

- **Infinite levels** – every level is generated from its number, so levels never run out and always play the same.
  A different puzzle type is used from one level to the next, and each type gets harder as you go.
- **6 puzzle types** – Lights Out, Sort Tubes, Spin Lock, Slide Tiles, Colour Flood, Echo Pads (memory, with a reverse-order twist at higher levels).
- **Stars** – 1–3 stars per level based on how efficiently you solve it (moves vs. par, or mistakes). Replay for better scores.
- **Coins** – earned for clearing levels, improving stars and 3-star streaks, plus star-milestone chests. Spend them on hints, skips and colour themes in the shop.
- Undo, hints, restart, sound effects, particles, haptics, and progress saved in `localStorage`.

## Touchline (`touchline/`)

A second game lives in `touchline/`: a single-file HTML high-school soccer manager (multi-season careers, seeded match
engine, animated broadcast matches, 36 original mascots). Start with `touchline/HANDOFF.md`, then `touchline/DEVELOPER_NOTES.md`.

```
cd touchline
python3 build.py                   # src/ -> dist/touchline.html and dist/touchline-standalone.html
npm i playwright                   # once; tests drive headless Chromium
sh test/run_all.sh                 # all 36 regression suites, serially
```

Rendered concept boards (`concepts/*.png`), screenshot sheets and `test/logs` are not committed; regenerate them with the
scripts in `touchline/test/` (`concepts7.js`, `mascot_sheet2.js`, ...).
