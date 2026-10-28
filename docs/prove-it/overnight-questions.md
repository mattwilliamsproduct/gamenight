# Overnight inspection (expert questions + rubric)

Inspection checklist only. Not permission for 50 improvements. Answers from this pass. Untested stays UNVERIFIED.

Legend: OK / FOUND-BUG / DECISION / UNVERIFIED

## Plan-revision extras

| Question | Answer | Evidence |
| --- | --- | --- |
| Older night / profiles / backup / records survive? | OK (automated) | `docs/prove-it/fixtures/older-night-from-main.json` built with `origin/main` backup.js. `npm run test:older-night` 3/3. Playwright `older-night.spec.mjs` passed. Rook stays Rook. |
| Canasta variant, team vs player, entry, corrections, completion, records? | UNVERIFIED tonight beyond existing unit/functional files | `scripts/test-hand-foot.mjs` on `npm run check`. Functional pack running. |
| Historical Rook identity preserved (hide switch does not hide past nights)? | OK (automated) | game-registry + older-night merge + Records card title Rook. |
| Interrupted entry: refresh / Table / modal / double Submit / reopen? | UNVERIFIED | data-integrity pack exists; not fully re-walked this hour. |
| Real phone: long names, 8 players, retired, large totals, negatives, 200% text, keyboard? | UNVERIFIED | rc1-acceptance covers 8-player enter/correct/resume at 5 sizes. 200% / keyboard still UNVERIFIED. |
| First-timer: Table vs End vs Scratch without experimenting? | FOUND-BUG then fixed | Save & End and Actions were in a `display:none` banner. Parked on the board bar (`c47d12e`). Table title: leaves without ending. Save & End: writes Records. Scratch (discard) stays in Actions. Physical look still PENDING. |

## Expert bank (skim)

| # | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 1 | What is this / what to tap first? | UNVERIFIED on empty production home | Isolated demo has one primary: Enter Round 11. Production empty home is the normal table/start grid. Sample persist on empty home is DECISION (off). |
| 1 | Sample night on empty home? | DECISION | Not offered on production. `/?demo&view=demo-path` only. |
| 3 | Fix a wrong score; totals obvious? | OK (automated + 390 strip) | June 12→0, 50→38, Theo loses first. Records June 38. `demo-path.spec.mjs`. |
| 3 | Refresh mid-demo persists? | OK isolation | Isolated session does not write `gn_*`. Personal Wizard night left on disk. |
| 5 | Hierarchy / clipping on demo card? | FOUND-BUG (header) then fixed | "Round 12 of 11" after the last hand. Clamped when match is over (`facb8d1`). Board bar is tight on 390 (Table / Actions / Save & End wrap). Not a redesign. |
| 8 | 90s demo shows judgment? | OK path exists | Link, fixture, taps in `docs/prove-it/demo-path.md`. Timed ~6s automated; human walk still PENDING. |

## Rubric F

All 14 remain OPEN. See `docs/decisions-for-matt.md`. Nothing in F was changed.
