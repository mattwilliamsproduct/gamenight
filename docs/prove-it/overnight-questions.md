# Overnight inspection (expert questions + rubric)

Plan revision wins: this is an inspection checklist, not a license for 50 improvements. Fix only P0/P1 plus clear demo-path defects. Taste/product calls go to `docs/decisions-for-matt.md`. Section F stays OPEN.

Legend: **OK** / **FOUND-BUG** / **DECISION** / **UNVERIFIED**

---

## Plan-revision extras

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| P-older | Older night / profiles / backup / records survive? | OK | Fixture from `origin/main` backup.js. `test:older-night` 3/3. `older-night.spec.mjs` 1/1. Rook stays Rook. |
| P-canasta | Canasta variant, team vs player, entry, corrections, completion, records? | OK; FOUND-BUG then fixed (entry totals) | Sevens 1500 / red 3s 100→200 at 4+. Entry showed 3695 as “3…”. Widened Total column `2740f11`. After: 3695 and 1430 whole on 375/390/1440. |
| P-rook | Historical Rook identity preserved? | OK | Hide switch does not rewrite history. older-night + game-registry + canasta-rook-flag. |
| P-interrupt | Refresh / Table / modal / double Submit / reopen? | OK | `data-integrity.spec.mjs` 24/24. `interrupted-entry.spec.mjs` 2/2. |
| P-phone | Long names, 8 players, retired, large totals, negatives, 200% text, keyboard? | FOUND-BUG then fixed (200%; complete banner; Canasta 3695); OK 44px + 8-player | `phone-conditions.spec.mjs` 8/8. Retired Hank shows RETIRED and drops out of `getRecordedPlayers`. FC negatives rejected. Wizard miss negatives stay on `data-integrity`. OS keyboard UNVERIFIED. |
| P-understand | Table vs End vs Scratch without experimenting? | FOUND-BUG then fixed | Board-bar park `c47d12e`. Scratch was clipped on 375/390; pinned `4a2f666`. End copy distinguishes unfinished. Discard is native `confirm`. Physical PENDING. |

---

## 1. First 10 seconds

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 1a | Stranger tell what this is and what to tap first? | OK on isolated demo and empty-home | Demo: Enter Round 11. Empty home `/?demo&view=empty-home`: Tonight’s Table + Start, no sample CTA. Shot: `edge-states/empty-home-390.png`. Physical cold open PENDING. |
| 1b | One obvious primary on Home? | OK during a live match (Resume). DECISION on empty home | Settled B: Resume is the single primary during an active match. Empty home has Start + add player. Sample CTA off. |
| 1c | First-time user with no history sees a sample night? | DECISION | Not on production. `/?demo&view=demo-path` only. |
| 1d | Logo and title read as a real product? | UNVERIFIED (physical) | Not restyled. Art/logo dusk stays behind `?demo`. |
| 1e | Taps from cold open to first score? | OK on demo (1 tap: Enter). Empty home is add players → pick game → Start → Enter | Demo path designed so completion is the 11th hand. 0-player Start alerts “Add players to the Lineup first!” (`edge-states`). |

## 2. Running a game night

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 2a | Enter a round in shuffle time? | OK | Demo enter-mistake 1.3s automated. Human table still PENDING. |
| 2b | One-hand phone, thumb-reachable? | OK (automated targets) | Primary board controls ≥44px in `phone-conditions.spec.mjs`. Physical PENDING. |
| 2c | Keypad matches number type; negatives where legal? | OK | Custom keypad. Negatives rejected for FC/Flip7/Heat (`data-integrity` P1-05). Wizard/818 miss scores can be negative by formula. |
| 2d | After a round, clear who’s winning? | OK | Demo 390 strip: places + totals update. |
| 2e | TV 10-foot: names + totals largest? | OK layout; DECISION as a couch read | `demo-path-1920-layout.png`: June/Theo/Rosa/Hank and 36/38/52/71 dominate. Board bar is one tight row. Matt judges 10-foot. |
| 2f | Remembers usual players for next night? | OK | Roster + profiles persist locally. `test:local-only`. Cloud off. |

## 3. Mistakes and trust

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 3a | Fix a past score in two taps; totals obvious? | OK | Demo June 12→0, 50→38, first flips. |
| 3b | Undo / confirm where loss is real? | OK | Scratch and Save & End confirm. End copy distinguishes unfinished vs complete. |
| 3c | Accidental end recoverable? | OK confirm; DECISION on undo-end | Confirm on Save & End. No “undo end match”. Recover via Resume only if they Cancel. Once confirmed, night is finished. |
| 3d | Refresh / lock / tab close keeps the live match? | OK on real book; OK isolation on demo | Persist for real books. Isolated demo does **not** persist (labeled). |
| 3e | Records / Fame / Shame agree with history? | OK on demo + records tests | Demo Records June 38. `test:records`. |
| 3f | Blanks, ties, retired, reopened same everywhere? | OK | data-integrity + scorebook + night-podium. Shared places. Incomplete out of completed records. 1-player Five Crowns starts (`edge-states`). Duplicate add keeps one seat. |

## 4. Game logic

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 4a | Five Crowns / Wizard / 818 / Flip 7 / Heat match the spec? | OK | `test:scorebook`, `test:fixture-rules`, `test:data-integrity`, porch-night. |
| 4b | Canasta: sevens 1500 replaces clean 500; red 3s 100 or 200 at 4+; one config? | OK | `HF.CANASTA_RULES.sevensCanastaEach === 1500`. `redThreesScore(3)=300`, `(4)=800`. `test-hand-foot.mjs`. |
| 4c | End conditions shown? | OK | Five Crowns 11 hands. Heat 66. Demo header clamped when over (`facb8d1`). |
| 4d | Trick/contract errors explain the fix? | OK | data-integrity Wizard/818 correction copy. |
| 4e | Property tests for totals/winners/ties/edits? | OK; FOUND-BUG then fixed for emoji add | `test:scorebook` accepts `🔥June`. Avatar `charAt(0)` threw; fixed. `edge-states.spec.mjs` seats the emoji once. |
| 4f | UI-stuck statechart states? | UNVERIFIED | No new statechart walk tonight. |

## 5. Visual quality

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 5a | One hierarchy per screen? | OK on demo card | Totals + places first. Board bar is tight on 390. |
| 5b | Spacing / alignment / no orphans? | FOUND-BUG (header 12 of 11) fixed; board wrap logged | `facb8d1`. 390 bar wraps Table / Actions / Save & End. Not a redesign. |
| 5c | Cream/teal, teal for action? | OK / DECISION on tokens | No token hex changes (F). |
| 5d | Type limited and meaningful? | UNVERIFIED as a redesign | No type scale rewrite. |
| 5e | 375–1920 no clip? | FOUND-BUG then fixed | Matrix 375/390/768/1440/1920 + contact sheets. Scratch clipped on phone Actions (`4a2f666`). Match Complete covered 3rd/4th on 375 (`95513b5`). Canasta entry ellipsized 3695 (`2740f11`). Home tiles below the fold are scroll. |
| 5f | Internal jargon on screen? | OK on demo | “Sample night” / “Save & End” / “Scratch Match (discard)”. “Championship Ledger” is the records title (settled B). “Warm Porch Ledger” not on screen. |
| 5g | Pressed / focus / disabled? | UNVERIFIED | Bonus territory if no blocker. |
| 5h | Design-lead proud? | DECISION | Matt’s morning look. |

## 6. Delight

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 6a | Winner celebration earned? | OK | Victory “June Wins!” on demo. Wheel left out of 90s. |
| 6b | Shame playful not mean? | DECISION | F. Shame on Overview / fun subtitles. |
| 6c | Life Preserver commit-then-spin? | OK (existing) | rc1-acceptance spin path. Odds table not changed (F). |
| 6d | One “oh, nice”? | DECISION | Demo is the correction flip, not the wheel. |

## 7. Performance and robustness

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 7a | Lighthouse mobile? | UNVERIFIED on preview (SSO 302). Local 4173: P **0.59** / A11y **0.84** / BP **1.00**. | Preview requires Vercel SSO. Local fails: `target-size` (12), `meta-viewport` user-scalable, unlabeled inputs. Viewport lock not changed (product). |
| 7b | Wheel jank / layout shift? | OK layout at 5 sizes; jank UNVERIFIED | Matrix LP wheel shots: Spin + How it works in view on 375–1920. Motion jank not measured. |
| 7c | 44px targets, contrast, labels? | OK targets; OK contrast (Lighthouse); labels mixed | Board 44px. Local Lighthouse `color-contrast` 1.00. `label` audit 0 (unlabeled inputs). `target-size` 0 leftover 12. |
| 7d | Console errors on demo path? | OK | `phone-conditions.spec.mjs` pageerror list empty. |
| 7e | Empty home / empty records / first run? | OK | `edge-states.spec.mjs`. Empty records: “Hall of Fame stays empty until a night is saved.” |
| 7f | Storage full / blocked? | FOUND-BUG / DECISION | `persistJsonIfChanged` does not catch `QuotaExceededError`. No toast. Code left alone. Rec on the decision list: catch + keep RAM + toast after gate. |
| 7g | 1 player / emoji / duplicate names? | FOUND-BUG then fixed (emoji); OK 1p + duplicate | Emoji crashed avatar URI. 1-player Five Crowns starts. Second add of the same name stays one seat. |

## 8. Interview lens

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 8a | 90s shows judgment? | OK path exists | Isolated correction walk. Human PENDING. |
| 8b | Visible decisions explainable? | OK | Blank=0, incomplete out of records, pre-spin LP — settled. Not forced as three stories until evidence + Matt. |
| 8c | Unfinished / copied undercut? | FOUND-BUG then fixed | Hidden End/Scratch; “Round 12 of 11”; save-chip vs sample banner. |
| 8d | Honest boundary (directed agents, not the code)? | DECISION / not in the app | Resume line is off until gate. |
| 8e | What a hiring manager asks next? | DECISION | Case study after gate. |

## 9. Subtraction

| Id | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 9a | What to remove? | DECISION | Sample persist already removed. Wheel out of 90s. |
| 9b | Settings that exist because they were easy? | UNVERIFIED | Not audited as a kill list tonight. |
| 9c | Screen a new user never misses? | DECISION | Profiles / Explore depth. Not removed. |

## Rubric F

All 14 remain OPEN. See `docs/decisions-for-matt.md`. Nothing in F was changed.
