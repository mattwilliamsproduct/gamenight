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

## Next slices (not started)

- **Records → Championship Ledger.** Split `renderHallOfFame()` output into three pure view-models (`podium`, `gameLedger[]`, `shame[]`) from the existing history math. Render each into its own section. On phones, use a `Hall of Fame | Shame & Rivalries` segmented control. Unit-test the view-models in `scripts/test-scorebook.mjs` style.
- **Life Preserver confirm step (needs Matt's call).** Add a `result` state after the wheel settles. Points apply only on `Apply −N to Scorecard`. Undo/audit already exists (`addAuditEntry`). Risk: a closed modal leaves a spin pending. Needs a test in `life-preserver.spec.mjs`.
- **Home "Tonight's Table" seat grid** with one `Edit Seating` entry point that replaces per-row controls.

## Verification (this preview, on `35b564c`)

- `npm run check` passed on main and on this branch: comeback 34, life preserver 33, backup 4, scorebook 15. No failures.
- `npx playwright test --project=laptop-chromium --project=tv-1080p-chromium`: 86 passed, 42 skipped, 26 failed on both. The sorted failing-test lists are identical. The failures are stale snapshots plus Comeback tests that expect `comeback-logic.js`, which production does not load. Snapshots were not updated.
- Flag off, a 10-player Wizard scorecard has no `slice2-tv` class, no exact-bid class, and the rose miss ring. Flag on (`?slice2`), the class is set, 30 exact bids show the emerald dot and `title="Exact bid"`, misses lose the rose ring, and the page reports no console errors.
- Current main locks scorecard names and totals with `font-weight: 400 !important` (Londrina Solid and Score Sign). The Slice 2 weight and letter-spacing rules do not override that, so those computed weights stay 400. Totals still take the Slice 2 ink. The dot and the quiet miss do apply.

## Verification (original draft)

- `npm run check`: all unit suites pass.
- `npx playwright test --project=laptop-chromium --project=tv-1080p-chromium`: 91 passed, 48 skipped, 0 failed on the Oct 2 draft base (same as that baseline). WebKit iPad wasn't run on this box. This preview is rebased onto `35b564c`; compare its Playwright counts to a fresh main baseline.
- Visual before/after at 1920×1080: `/workspace/bpg-audit/slice2-app-preview/wizard-10-1080p-{before,after}.png`.

## Found along the way

`npm run build` rewrites `public/assets/fonts.css`. The old vendor script omitted the `Score Sign` @font-face (the heavy Nunito Sans 800 face, limited to dash code points, which score inputs use for minus signs). `scripts/copy-vendor-assets.mjs` now emits that face and refuses to finish if the face or its copied font file is missing. The same build rewrites `app-utilities.css` and `sw.js`; those generated files stay out of this preview commit unless the rebuild itself drops a class the page uses.
