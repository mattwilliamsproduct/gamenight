# RC1 visual 57: per-test class

Chromium run: 57 failed / 61 passed / 54 skipped. WebKit not run. Baselines not refreshed. Classes are P0/P1 (fix), obsolete test, test-environment problem, genuine P2.

The original Slice 2 26 are the 13 stale screenshot names on laptop and TV. All 26 are in this table. Comeback tests from that same era are now skipped obsolete (in the 54), not in the 57.

| # | Project | Test | Cause | Class |
| --- | --- | --- | --- | --- |
| 1 | laptop | app.visual `actions-menu` | snapshot vs old skin | obsolete test |
| 2 | tv | app.visual `actions-menu` | snapshot vs old skin | obsolete test |
| 3 | laptop | app.visual `five-crowns-blowout` | snapshot vs old skin | obsolete test |
| 4 | tv | app.visual `five-crowns-blowout` | snapshot vs old skin | obsolete test |
| 5 | laptop | app.visual `five-crowns-comeback` | snapshot vs old skin | obsolete test |
| 6 | tv | app.visual `five-crowns-comeback` | snapshot vs old skin | obsolete test |
| 7 | laptop | app.visual `five-crowns-score-entry-8-players` | snapshot vs old skin | obsolete test |
| 8 | tv | app.visual `five-crowns-score-entry-8-players` | snapshot vs old skin | obsolete test |
| 9 | laptop | app.visual `home-setup` | snapshot vs old skin | obsolete test |
| 10 | tv | app.visual `home-setup` | snapshot vs old skin | obsolete test |
| 11 | laptop | app.visual `nolie-8-players` | snapshot vs old skin | obsolete test |
| 12 | tv | app.visual `nolie-8-players` | snapshot vs old skin | obsolete test |
| 13 | laptop | app.visual `profiles-yearbook` | snapshot vs old skin | obsolete test |
| 14 | tv | app.visual `profiles-yearbook` | snapshot vs old skin | obsolete test |
| 15 | laptop | app.visual `settings-over-active-match` | snapshot vs old skin | obsolete test |
| 16 | tv | app.visual `settings-over-active-match` | snapshot vs old skin | obsolete test |
| 17 | laptop | app.visual `whammy-8-players` | snapshot vs old skin | obsolete test |
| 18 | tv | app.visual `whammy-8-players` | snapshot vs old skin | obsolete test |
| 19 | laptop | app.visual `wizard-bid-entry-10-players` | snapshot vs old skin | obsolete test |
| 20 | tv | app.visual `wizard-bid-entry-10-players` | snapshot vs old skin | obsolete test |
| 21 | laptop | app.visual `wizard-scorecard-10-players` | snapshot vs old skin | obsolete test |
| 22 | tv | app.visual `wizard-scorecard-10-players` | snapshot vs old skin | obsolete test |
| 23 | laptop | app.visual `wizard-scorecard-early-8-players` | snapshot vs old skin | obsolete test |
| 24 | tv | app.visual `wizard-scorecard-early-8-players` | snapshot vs old skin | obsolete test |
| 25 | laptop | app.visual `wizard-scorecard-scoring-8-players` | snapshot vs old skin | obsolete test |
| 26 | tv | app.visual `wizard-scorecard-scoring-8-players` | snapshot vs old skin | obsolete test |
| 27 | laptop | app.visual `five-crowns-scorecard-4-players` | name-height heuristic vs shared NAME-FIT | obsolete test |
| 28 | tv | app.visual `five-crowns-scorecard-4-players` | name-height heuristic vs shared NAME-FIT | obsolete test |
| 29 | laptop | app.visual `record-chase-preview keeps real player history and aligned metrics` | View Pace panel gone | obsolete test |
| 30 | tv | app.visual `record-chase-preview keeps real player history and aligned metrics` | View Pace panel gone | obsolete test |
| 31 | laptop | app.visual `view-pace-switch-is-compact-and-controls-pace-and-rounds-with-accessible-runtime-state` | View Pace retired | obsolete test |
| 32 | tv | app.visual `view-pace-switch-is-compact-and-controls-pace-and-rounds-with-accessible-runtime-state` | View Pace retired | obsolete test |
| 33 | laptop | app.visual `late eight-player five crowns shows five rounds beside Best Avg Worst` | View Pace retired | obsolete test |
| 34 | tv | app.visual `late five-crowns totals stay centered and names stay whole` | clicked removed View Pace toggle | obsolete test |
| 35 | laptop | app.visual `beat-the-heat pace still opens the best finished scorecard` | View Pace leftover | obsolete test |
| 36 | tv | app.visual `beat-the-heat pace still opens the best finished scorecard` | View Pace leftover | obsolete test |
| 37 | laptop | app.visual `navigation and match header ignore scorecard text-size zoom` | getComputedStyle on removed toggle | obsolete test |
| 38 | tv | app.visual `navigation and match header ignore scorecard text-size zoom` | getComputedStyle on removed toggle | obsolete test |
| 39 | laptop | app.visual `active scorecard columns and panels stay geometrically aligned` | old nav/banner gap vs hidden banner | obsolete test |
| 40 | tv | app.visual `active scorecard columns and panels stay geometrically aligned` | old nav/banner gap vs hidden banner | obsolete test |
| 41 | laptop | app.visual `all six game types reach their first scoring surface` | timeout on old Start Match control | test-environment problem |
| 42 | tv | app.visual `all six game types reach their first scoring surface` | timeout on old Start Match control | test-environment problem |
| 43 | laptop | app.visual `score-entry avatars stay ready when the connection drops` | timeout on old entry chrome | test-environment problem |
| 44 | tv | app.visual `score-entry avatars stay ready when the connection drops` | timeout on old entry chrome | test-environment problem |
| 45 | laptop | app.visual `starting another game preserves and resumes Wizard and 818 entry state` | snapshot of old entry/park path | test-environment problem |
| 46 | tv | app.visual `starting another game preserves and resumes Wizard and 818 entry state` | snapshot of old entry/park path | test-environment problem |
| 47 | laptop | app.visual `five-crowns first round uses compact avatar-led player identities` | expects MEGAN uppercase; Slice 2 is sentence case | obsolete test |
| 48 | tv | app.visual `five-crowns first round uses compact avatar-led player identities` | expects MEGAN uppercase; Slice 2 is sentence case | obsolete test |
| 49 | laptop | beat-the-heat `auto-ends at 66 and continues through winner, loser, and metrics` | timeout on old victory/metrics chrome | test-environment problem |
| 50 | laptop | beat-the-heat `stays open below 66 heat` | old visible chrome | test-environment problem |
| 51 | laptop | life-preserver `Actions menu explains how this game awards a Life Preserver` | two Life Preserver buttons (board + menu) | test-environment problem |
| 52 | laptop | life-preserver `wheel uses dynamic point values and stores a bonus round` | expected `Best help`; copy is now spin range | obsolete test |
| 53 | laptop | records `Hall of Fame and Shame include 818, Beat the Heat, and Comeback extras` | timeout on retired Timeline tabs | obsolete test |
| 54 | laptop | slice2 `phone keypad leaves roster rows reachable` | 390 third roster row | genuine P2 |
| 55 | tv | slice2 `phone keypad leaves roster rows reachable` | 390 third roster row | genuine P2 |
| 56 | laptop | slice2 `slice2 surfaces do not clip` | old `?slice2` / surface fork | test-environment problem |
| 57 | tv | slice2 `slice2 surfaces do not clip` | old `?slice2` / surface fork | test-environment problem |

Counts: obsolete 40, test-environment 15, genuine P2 2, P0/P1 0. 40+15+2+0=57.

Original 26: rows 1-26. Covered.
