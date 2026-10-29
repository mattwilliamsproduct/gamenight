# RC3 defects

Repair pass on `cursor/rc3-candidate` from `6fcb257` (rc2 freeze `5e57d50` plus Try a demo). Audits were re-checked in code. No history rewrite. No Redis or env changes.

## REQUIRED

Broken workflows and obvious layout defects. Do these first. Each row has an interaction check (steps + expected). Automate with Playwright when the flow is UI.

| # | Defect | Where it lives | Interaction acceptance | Automation |
| --- | --- | --- | --- | --- |
| 1 | Home cannot scroll at laptop/tablet widths. `body.home-view` locks overflow, so Start and Recent nights fall off 1280x650 / 1440x700 / large text / iPad. | `index.html` `@media (min-width: 761px) body.home-view`; `card-picker.css` max-height + `overflow: hidden` on Start | Open Home at 1280x720 and 1024x768. Scroll to the bottom. Expected: Tonight's Table, every game card, Start, and Recent nights are reachable. Repeat at largest text. | `tests/functional/rc3-acceptance.spec.mjs` Home scroll |
| 2 | Game cards stay too tall, so selected card + Start sit below the fold. Resume must stay the live-match control. Starting another match must confirm, not overwrite. | `card-picker.css` `--bp-card-max`; `startGame` confirm | With a live match, Home at 1024x768 and 1440x800 shows the selected face and Start without scrolling the Start column. Tap Start: confirm, then the live match parks incomplete. Cancel leaves it on the table. | `rc3-acceptance` Start above fold + confirm; `startGame` already confirms |
| 3 | Wizard bid lock treats blanks as range errors, acknowledges backspace, saves `''`, shows Review Scores during bids, prints `Bids: 2 / 1`, and leaves `-` / `00` on the pad. | `scorebook.js` `validateEntries` / `applyScoreEntryKey` / `scoreEntryStatus`; score-entry modal | Enter an invalid Wizard bid, correct it, lock bids, reopen, and confirm the saved values. Blank is Not entered. 0 is Entered 0 or Confirmed: 0. Missing bids say Still need bids from X. Range copy only for a real out-of-range value. Review Bids during bids. `-` and `00` hidden. | `rc3-acceptance` Wizard bid; unit tests in `test-scorebook.mjs` |
| 4 | Departed players still paint on the live scorecard via `getDisplayPlayers`. History ranks them with finishers. | `renderGame`; `nightStandings` | Tap Out a player. Expected: they leave the live card; a "1 player left early" control lists who; earlier scores and the audit stay; they are out of winning and final-score records. Past nights lists them under Left early, unranked. | `rc3-acceptance` departed; `test-records.mjs` Left early group |
| 16 | Final-score and match-average records count parked or early-ended nights. `isCompletedHistoryMatch` is `completed !== false`. End now writes `completed: true` even before the game's real end. | `calculateAllTimeRecords`; `commitEndGame`; new `isFullGame` | End a Five Crowns night after 3 hands with a better final than the book. Expected: Past nights shows Ended early. Best final / average / closest / lopsided ignore it. Wins and streaks still count the stored winners. A later full 11-hand worse score keeps the record. | `test-records.mjs` early-ended better score; `test-scorebook.mjs` `isFullGame` |

### Item 16 eligibility (per game, stored data only)

Do not guess. Do not rewrite old rows. Do not hide a real low (or high) full-game score.

| Game | Real end | Full game when | Missing `completed` | If unsafe |
| --- | --- | --- | --- | --- |
| Five Crowns | 11 hands (or stored `maxRounds`) | scoring rounds ≥ that count | Derive from stored rounds vs that count | — |
| Wizard | `floor(60/n)` or stored `maxRounds` | scoring rounds ≥ that count | Same | — |
| 818 | 15 rounds or stored `maxRounds` | scoring rounds ≥ that count | Same | — |
| Canasta (`Hand and Foot`) | 4 rounds or stored `maxRounds` | scoring rounds ≥ that count | Same | — |
| Beat the Heat | someone reaches stored `endScore` or 66 | an active total ≥ the line | Derive from stored totals vs 66 | — |
| Rook | someone reaches stored `rookConfig.winTarget` | an active total ≥ that target | If no target is stored, that night is not a full game | Rook final-score rows stay visible when any night has a stored target. Nights without a target are skipped, not guessed at 300. |
| Flip 7 | someone reaches 200 points | an active stored total ≥ 200 (from `totals`, not only `completed === true`) | Derive from stored totals vs 200. `completed === true` alone is not enough. | Category stays up. Nights where every total stays under 200 are not full games (Ended early if completed). |

`completed === false` is Incomplete (Resume). End now before the real end stores `completed: true` and `endedEarly: true`, labeled Ended early, no Resume. Wins and streaks still use `completed !== false`. Tied winners each still get a win.

Final-score / average gates: `bestGame`, `worstGame`, `bestGameByPlayerCount`, `closestMargin`, `mostLopsided`, `closestFinish`, profile best/worst, Pace best/average/worst. Affected rows say **Full games only**. Round records, bid records, wins, and streaks stay on completed nights.

### Counts

When two numbers can differ, the label says what it counted.

- Hall of Fame / Explore: `N completed matches` (`completed !== false`, includes Ended early). When nights saved > completed, subtitle adds `· M nights saved`.
- Nav `Records (M)`: every saved night, including Incomplete.
- Past nights: every saved night, including Incomplete.
- Best final / average / listed final-score comparisons: full games only, plus Unassisted where that already applied.

## OPTIONAL

Land only if done and safe. Otherwise leave open.

| Item | Status | Notes |
| --- | --- | --- |
| 5 / 14 Try a demo | Other agent (`bc-ae3353ef`). Already merged through `6fcb257`. | Do not edit `public/demo/*` except conflicts. |
| 6–13 Past nights + scorecard layout | After required. | ONE `nightCardHtml` for Past nights and Overview Recent results (already shared). One full-width card, bounded aligned standings, no repeated date, compact Overview, Ended early / Left early groups. Strip any `pn=a\|b\|c` (parked on local `cursor/past-nights-options` only). Scorecard: readable names/totals, real porch-cast avatars, do not stretch rows to fill leftover space. |
| 15 Settings retained/removed/missing | After required. | From settings-demo-audit. Docs list, no new Settings features. |
| Shared art catalog | In progress with required if small. | `BPGGames.CARD_FACES` is the one catalog. Home cards and later surfaces read it. |
| 1920x1080 TV look | Full candidate. | Plus 1280x720, 1024x768, 390x844, largest text at each. Matt's device is final. |

## Open treatments

- Flip 7 full games require an active stored total ≥ 200. A completed night where everyone stays under 200 is Ended early and skips final-score records. Matt approved this rule 7:26 PM ET Oct 29.
- Rook nights with no stored `winTarget` are excluded from final-score records. Default 300 is not assumed for old rows.
- `qa-hf-entry` / `qa-retired` stay off this branch unless they already exist here.

## Protect what works (regression)

Confirm or add coverage for:

| Flow | Existing lock | rc3 add |
| --- | --- | --- |
| Score-entry drafts | `tests/functional/scorecard-table.spec.mjs`, `interrupted-entry.spec.mjs` | Keep |
| Historical corrections | `tests/functional/data-integrity.spec.mjs` | Keep |
| Undo | `actions-menu.spec.mjs`, Life Preserver undo tests | Keep |
| Dealer order | visual dealer tests, `rc1-acceptance.spec.mjs` | Keep |
| Departed-player history | `data-integrity` retired 818; `rc1-data` | Live hide + history group |
| Personal vs demo isolation | `tests/functional/try-demo.spec.mjs` | Keep |

## Checkpoint / handoff language

Do not write "Ready for Matt's review". Write **implementation complete; final checks pending** only after the one candidate commit, one preview of that commit, the regression-vs-live table, and the five-minute walkthrough are in the PR.

## 15. Settings retained / removed / missing

Source: `/workspace/back-porch/rc2/settings-demo-audit.md` (PROD `39e6b51`, LAUNCH `5e57d50`, DEMO `c17f52c`). No new Settings features added in rc3.

### Retained (still in Settings)
- Text Size A− / A+ (`adjustUI`, `gn_ui_scale`)
- Lineup Intro, Post-Game Path Replay, Roll for Dealer prefs
- Porch Cloud Save & Sync (password + `/api/sync`) outside demo
- Export Backup File / Import Backup File / Paste & Merge outside demo
- Performance Report (gated by `?gnperf=1`)
- Close chrome (backdrop + ×)

### Removed or never on launch vs older prod
- No separate "About" shell on prod; demo injects About only while sample is on
- No new Settings toggles in rc3

### Missing vs demo audit expectations (documented, not built)
- Settings does not gain a permanent Try a demo entry in this candidate (demo banner Exit / Reset cover that; see item 5)
- Backup / restore / sync stay off while demo is active (hidden + blocked)

### Demo vs live Settings behavior
| Surface | Live | Demo active |
| --- | --- | --- |
| Appearance + animation prefs | On | On (remapped keys) |
| Data Vault / Porch Cloud | On | Hidden and blocked |
| About / sample notice | Absent | Injected by try-demo.js |

## Gate fixture notes (Oct 29 evening)

- **P0-03 / records-assisted-heal:** The unassisted Five Crowns night is a full 11-hand match so `bestGame` qualifies under `isFullGame`. Totals stay Matt 4 / field 10. Reason: final-score records require full games; the old 1-round plain match correctly stopped qualifying after item 16, so the fixture was expanded rather than weakening `isFullGame`.
- **records-labels historical edit:** Full 11-hand Ada/Bea nights with Bea’s fat round 2. Correcting that round to Ada 40 / Bea 0 flips the match to Bea and makes `afterBest` Bea (19) while Ada keeps other nights at 20. Reason: after expanding to full games, a tiny Bea delta could not beat Ada’s remaining bests.
- **P1-05 minus:** Regression vs freeze `5e57d50`. Pending `-` was treated as blank and the next digit replaced the value. `applyScoreEntryKey` now keeps a pending minus when the following key is a digit. Minus stays hidden only for Wizard bids/tricks.
