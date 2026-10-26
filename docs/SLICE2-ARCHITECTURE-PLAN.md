# Slice 2: 10-foot TV hierarchy (architecture plan + local preview)

Status: preview branch `slice2-tv-hierarchy-preview`, ported onto current main (`35b564c`). No pull request. Waits on Matt's visual sign-off
(AGENTS.md: Porch Club design PRs and game-behavior merges wait on him).

Design source: `/workspace/bpg-audit/slice2-design-proposals/` (5 proposals, 9 renders, PDF pack).

## What the audit of the live app found

| Proposal item | Live app today | Decision |
| --- | --- | --- |
| Remove `B1·T1` micro-sublines from scoreboard cells | The live trick-game scorecard has no such sublines. Each past round is one score chip. Misses get a rose ring (`.score-cell-miss`). | Nothing to remove. The real noise is the rose ring on every missed bid. |
| Bigger player names and totals | `fitScorecardRows()` already scales names (`rowHeight × 0.66`, up to 116px) and totals (`× 0.62`, up to 110px) to the TV. | Keep the fit engine. Don't hardcode sizes in px. |
| Emerald dot for exact bids, quiet misses | Exact bids have no marker. Misses are loud. | **Done (preview flag).** Adds `scorecard-round-td--exact` and an emerald dot. Removes the miss ring and mutes miss ink. |
| 0–9 keypad in the Historical Round Editor | `openNumpad(player, roundIndex)` already edits past rounds with a full `0–9, 00, −, ⌫` keypad. | Nothing to add. The mock now matches the app. |
| Life Preserver "Spin" / "Apply −20 to Scorecard" | The spin applies automatically when it settles. Buttons read `SPIN THE WHEEL` / `SPINNING…`. | **Copy done (preview flag):** `Spin Wheel` / `Spinning…`. A Result → Apply confirm step would change game behavior. Matt has to decide (see below). |
| Championship Ledger records | `renderHallOfFame()` builds the records view. | Planned for a follow-up slice. See the shape below. |

## Architecture

1. **One opt-in flag, no fork.** `GN_SLICE2_TV` is true with `?slice2` in the URL, or with `localStorage['bpg-slice2-tv']='1'`. It adds `body.slice2-tv`. Production rendering and the approved Playwright baselines don't change until Matt approves. Then we remove the flag and update the baselines in one commit.
2. **Semantic tokens scoped to the flag:** `--s2-exact`, `--s2-total-ink`, `--s2-miss-ink`. They pass WCAG 2.2 AA on `--surface #fffdf9`: exact `#0D6E52` is 6.1:1 and miss ink `#655E57` is 6.3:1.
3. **The markup states the fact, and CSS decides the look.** With the preview flag on, the row builder adds `scorecard-round-td--exact` (plus `title="Exact bid"`) next to the existing `score-cell-miss` path. With the flag off, that class and tooltip are omitted so the scorecard markup matches production. The new styling all sits under `body.slice2-tv`.
4. **Copy constants, not scattered strings.** `LP_SPIN_COPY` is declared beside `GN_SLICE2_TV` and holds the wheel button labels. Each label is defined once. An early Life Preserver reset can read it without a temporal-dead-zone error.
5. **The fit engine stays the only sizing authority.** The dot is sized from `--scorecard-input-font`, so it scales from iPad to 1080p.

## What the Warm Porch Ledger preview adds

Still one flag. `?slice2` (or `localStorage['bpg-slice2-tv']='1'`) adds `html.slice2-tv` and loads `public/assets/slice2.css` plus `public/assets/slice2.js`. Flag off does not request those files.

- **Skin.** Cream paper and a 6px coastal strip replace the resort photo only while the flag is on. Numbers stay tabular.
- **TV scoreboard.** Names and totals use Nunito Sans at weight 800. Those rules carry `!important` and a more specific selector than the production `font-weight: 400 !important` lock, so the heavier weight actually wins. The fit engine still shrinks the size for 8–10 players. Exact bids keep the emerald dot. Misses stay quiet. One header line. Actions are Life Preserver, History, and Enter Round.
- **Home.** Active-match banner, seat pills with one Edit Seating control, the six real games, and recent nights. Phone stacks the cards. No "Roll d20".
- **Entry and history editor.** The existing sheets are restyled. Lock Bids, Review Scores, Next, and the validation stay as they are. Blank scores still count as 0 when Next fills them.
- **Life Preserver.** Ivory rim, teal track, brass dividers, upright labels, pocket widths from the real weights. Spin is about 3 seconds, 80ms when motion is reduced or the gallery is open. The result still applies by itself. There is no confirm step.
- **Records.** Hall of Fame and Hall of Shame read `getHallOfFame()` and `getAllTimeRecords()`. Phones switch them with a segmented control.

Deep links, gallery only: add `&slice2&slice2view=home|entry|editor|wheel|records` to a `?gnqa=1&gallery=0&scenario=` URL. The scoreboard is `&slice2&surface=scorecard`.

## Still Matt's call

- **Life Preserver confirm step.** The mock shows Apply. The spin still applies on its own, because a confirm step would change the game. Undo and the audit log already exist.

## Verification (this preview, on `35b564c`)

- `npm run check` passed on main and on this branch: comeback 34, life preserver 33, backup 4, scorebook 15. No failures.
- `npx playwright test --project=laptop-chromium --project=tv-1080p-chromium`: 86 passed, 42 skipped, 26 failed on both. The sorted failing-test lists are identical. The failures are stale snapshots plus Comeback tests that expect `comeback-logic.js`, which production does not load. Snapshots were not updated.
- Flag off, a 10-player Wizard scorecard has no `slice2-tv` class, no exact-bid class, and the rose miss ring. Flag on (`?slice2`), the class is set, 30 exact bids show the emerald dot and `title="Exact bid"`, misses lose the rose ring, and the page reports no console errors.
- The production lock is `font-weight: 400 !important` on scorecard names and totals. Under the flag, `html.slice2-tv` rules with `font-weight: 800 !important` and Nunito Sans win, so names and totals are heavier. Flag off stays at 400.

## Verification (responsive pass on `cursor/slice2-responsive-5622`)

Flag-on only. No restyle of cream-and-teal. Life Preserver still auto-applies.

- Phone keypad no longer covers roster rows. Gallery: `five-crowns-comeback` + `surface=entry-scores`.
- Selected player stays in the roster scroll (highlighted) and, on 375, a compact `Scoring: Name` label. First visible row is not clipped under the progress bar. 390 uses leftover space for a third roster row.
- `#59` toast wrap and name-slot shrink are ported. `#59` roster-count chip is skipped (Slice 2 already replaced it); seated headings nowrap instead.
- Laptop game cards grow at 1200px+. Phone nav shortens to Table / Records / Profiles.
- `npm run check` and the Slice 2 clip sweep still apply. New Playwright: `phone keypad leaves roster rows reachable`.

## Verification (Warm Porch Ledger pass)

- `npm run check` passed: comeback 34, life preserver 33, backup 4, scorebook 15.
- `npx playwright test --project=laptop-chromium --project=tv-1080p-chromium`: 102 passed, 42 skipped, 26 failed. The failing names match the previous baseline on both projects (17 on laptop, 9 on TV). The 16 new passes are the flag-on tests, eight on each project, including the five-viewport clip check. Snapshots were not updated.
- Flag-on screenshots at 1920×1080 and 390×844: home, scoreboard, score entry, history editor, Life Preserver, and records.
- iPad WebKit (`ipad-landscape-webkit`, 1194×834) ran the same flag-on tests, including the clip sweep, after the system WebKit libraries were installed. They passed.

## Verification (original draft)

- `npm run check`: all unit suites pass.
- `npx playwright test --project=laptop-chromium --project=tv-1080p-chromium`: 91 passed, 48 skipped, 0 failed on the Oct 2 draft base (same as that baseline). WebKit iPad wasn't run on this box. This preview is rebased onto `35b564c`; compare its Playwright counts to a fresh main baseline.
- Visual before/after at 1920×1080: `/workspace/bpg-audit/slice2-app-preview/wizard-10-1080p-{before,after}.png`.

## Found along the way

`npm run build` rewrites `public/assets/fonts.css`. The old vendor script omitted the `Score Sign` @font-face (the heavy Nunito Sans 800 face, limited to dash code points, which score inputs use for minus signs). `scripts/copy-vendor-assets.mjs` now emits that face and refuses to finish if the face or its copied font file is missing. The same build rewrites `app-utilities.css` and `sw.js`; those generated files stay out of this preview commit unless the rebuild itself drops a class the page uses.
