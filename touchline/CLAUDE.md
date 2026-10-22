# Touchline (single-file HTML soccer manager)

Read `HANDOFF.md` first (build/test/wiring/conventions), then the top sections of `DEVELOPER_NOTES.md`.
For the animation overhaul (versions 17–18) follow `ANIMATION_PLAN.md`: it is the step-by-step plan, with the measured baseline, the phase gates and the order of work.

Essentials:
- Build: `python3 build.py` → `dist/touchline.html` and `dist/touchline-standalone.html`. Source in `src/`, concatenated in the order listed in `build.py`; later files override earlier ones. One global scope: extend by wrapping globals in a new file appended to the build, not by rewriting old modules.
- Tests: `npm i playwright` once, then `sh test/run_all.sh` (serial; several suites are timing-sensitive) or `node test/<name>.js`. Run from the project root. `test/browser.js` is known-stale and excluded.
- Never put `//` comments mid-line; much of the code is one long statement per line.
- Match results are deterministic and must stay so: keep `test/sync.js`, `goalcap.js`, `postcap.js` passing after any `engine.js` change. The canvas broadcast never affects results.
- Prefix new CSS classes (global namespace); team colours via `--team*` variables, amber `--accent` only for actions/live.
- Every change: rebuild, run affected suites, take and inspect screenshots (desktop + phone, several themes), add a What's New entry in `MODALS.whatsNew` (`src/ui_v8.js`) and a version section at the top of `DEVELOPER_NOTES.md`, and say plainly what was not verified.
- Keep chat progress to short status lines; no long code dumps.
