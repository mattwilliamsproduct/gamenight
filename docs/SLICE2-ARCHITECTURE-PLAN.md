# Slice 2: 10-foot TV hierarchy (architecture plan + local preview)

Status: local draft on `slice2-tv-hierarchy-draft`. Not pushed. Waits on Matt's visual sign-off
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
3. **The markup states the fact, and CSS decides the look.** The row builder only adds `scorecard-round-td--exact` (plus `title="Exact bid"`) next to the existing `score-cell-miss`. The new styling all sits under `body.slice2-tv`.
4. **Copy constants, not scattered strings.** `LP_SPIN_COPY` holds the wheel button labels. Each label is defined once.
5. **The fit engine stays the only sizing authority.** The dot is sized from `--scorecard-input-font`, so it scales from iPad to 1080p.

## Next slices (not started)

- **Records → Championship Ledger.** Split `renderHallOfFame()` output into three pure view-models (`podium`, `gameLedger[]`, `shame[]`) from the existing history math. Render each into its own section. On phones, use a `Hall of Fame | Shame & Rivalries` segmented control. Unit-test the view-models in `scripts/test-scorebook.mjs` style.
- **Life Preserver confirm step (needs Matt's call).** Add a `result` state after the wheel settles. Points apply only on `Apply −N to Scorecard`. Undo/audit already exists (`addAuditEntry`). Risk: a closed modal leaves a spin pending. Needs a test in `life-preserver.spec.mjs`.
- **Home "Tonight's Table" seat grid** with one `Edit Seating` entry point that replaces per-row controls.

## Verification (this draft)

- `npm run check`: all unit suites pass.
- `npx playwright test --project=laptop-chromium --project=tv-1080p-chromium`: 91 passed, 48 skipped, 0 failed (same as the baseline before the change). WebKit iPad wasn't run on this box.
- Visual before/after at 1920×1080: `/workspace/bpg-audit/slice2-app-preview/wizard-10-1080p-{before,after}.png`.

## Found along the way

`npm run build` on this box rewrites `public/assets/fonts.css` and drops the `Score Sign` @font-face, which the score inputs use for minus signs. It also rewrites `app-utilities.css` and `sw.js`. Those build outputs were reverted and are not part of this draft. Before the next production build, someone should check why `copy-vendor-assets.mjs` drops that face.
