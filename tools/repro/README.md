# Bug repro scripts (from the v4 audit)

Each script reproduces one bug listed in `PLAN-v4.md` section 2. Before the fix, it prints the bad state; after the fix, it should print the good one. Run them from the repo root with:

    NODE_PATH=$(npm root -g) node tools/repro/<script>.cjs

`h.cjs` is the shared harness. It serves the repo on a free port and opens a 400×800 page.

| Script | Bug |
|---|---|
| t1_login | Login reward paid twice on a double tap |
| t2_daily | Daily challenge re-won through Restart (paid again, streak reset) |
| t3_tubes | Old Sand Tubes hint timer rewrites the next level's HUD |
| t4_hintcharge, t4b | Hint charged when no hint is shown |
| t5_blockswin, t5b | Block Garden win lost (and Skip charged) during the win delay |
| t6_spin | Spin prize lost if the app closes mid-spin |
| t7_enter | Enter in a popup presses the last button (erases progress) |
| t8_midnight | A daily won after midnight uses up the next day's |

These scripts are expected to show the bug until Phase 1 fixes it. When fixing, turn each into a PASS/FAIL check (exit code 1 on the bad state).
