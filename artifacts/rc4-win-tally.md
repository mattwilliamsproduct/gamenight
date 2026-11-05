# RC4 career-win tally

## The counting rule (plain words)

One counting rule for Passports, Records, wins, win %, streaks, and games. A night counts only when it is finished (completed is not false), the game is on the shelf, totals exist, and at least one stored round exists. Unfinished, incomplete, and reopened-not-completed nights do not count for wins, win %, or games. Assisted nights still count for wins and games; they only skip unassisted best-score records. Every tied winner gets a win. A player marked left early keeps their scores and the game, but is never a winner, even if their total would otherwise win. If that leaves no stored winner, the remaining finishers’ scores decide the winner(s).

Passports, Records, wins, win %, streaks, and games all call `BPGRecords.careerWinTally` / `playerCareerStats` / `eligibleWinners`. There is not a second counter.

Completed nights that count: 23
Career wins sum (every eligible winner, ties included): 29

## Demo left-early night

The remapped demo Rook night (10/20/2026) marks Theo left early. Scores stay Nora 110, Owen 110, Priya 90, Theo 90. Rook is high-score, so the winners stay Nora and Owen. Theo keeps the game and is not a winner. No past demo night had a left-early player who would have won; that case is locked in `scripts/test-records.mjs`.

## Per-player: old Passport vs old tally vs new both screens

Old Passport numbers in **bold screen** cells are what e448ccf Passports actually showed (Nora 14/25, Owen 13/25, Priya 2/25, Theo 4/24). Other old Passport cells replay that page’s sit-and-stored-winners walk on every history row, including unfinished nights, and drop left-early sitters. Old tally is the previous completed-only walk that still trusted stored `winners[]` and counted left-early sitters as games. New wins and games are the same number on Passports and Records.

| Player | Old Passport wins | Old Passport games | Old tally wins | Old tally games | New both screens wins | New both screens games | What was wrong |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nora | **14** | **25** | 11 | 22 | 11 | 22 | Screen Passport 14/25 counted unfinished and in-progress nights as games, and credited extra wins on those open tables. Replayed Passport games 24 included unfinished nights or dropped the Rook left-early sit. |
| Owen | **13** | **25** | 11 | 22 | 11 | 22 | Screen Passport 13/25 counted unfinished and in-progress nights as games, and credited extra wins on those open tables. Replayed Passport games 24 included unfinished nights or dropped the Rook left-early sit. |
| Priya | **2** | **25** | 1 | 22 | 1 | 22 | Screen Passport 2/25 counted unfinished and in-progress nights as games, and credited extra wins on those open tables. Replayed Passport games 24 included unfinished nights or dropped the Rook left-early sit. |
| Theo | **4** | **24** | 3 | 22 | 3 | 22 | Screen Passport 4/24 counted unfinished and in-progress nights as games, and credited extra wins on those open tables. Replayed Passport games 23 included unfinished nights or dropped the Rook left-early sit. Theo left early on Rook: old Passport omitted that game (getRecordedPlayers drops retired); old tally kept the game. New keeps the game and never a win. |
| Felix | 2 | 9 | 2 | 8 | 2 | 8 | Replayed Passport games 9 included unfinished nights or dropped the Rook left-early sit. |
| June | 1 | 4 | 1 | 4 | 1 | 4 | Both old numbers already matched the completed-night rule for this player. |
| Ruby | 0 | 10 | 0 | 9 | 0 | 9 | Replayed Passport games 10 included unfinished nights or dropped the Rook left-early sit. |
| Marco | 0 | 2 | 0 | 2 | 0 | 2 | Both old numbers already matched the completed-night rule for this player. |
| Iris | 0 | 1 | 0 | 1 | 0 | 1 | Both old numbers already matched the completed-night rule for this player. |
| Hugo | 0 | 1 | 0 | 1 | 0 | 1 | Both old numbers already matched the completed-night rule for this player. |

Matching totals alone is not a pass. Each player’s Passport wins and games must equal the tally row, and both screens must render those same two numbers.

| Game | Date | Final scores | Winner(s) | Tied | Assisted | Left early | Counts | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Five Crowns | 10/21/2026 | Nora 9, Owen 11, Priya 15, Theo 17, Ruby 23, Felix 29 | — | no | no | — | no | unfinished |
| Flip 7 Vengeance | 10/18/2026 | Nora 35, Owen 35, Priya 20, Theo 20 | Nora, Owen | yes | no | — | yes | counted |
| Rook | 10/20/2026 | Nora 110, Owen 110, Priya 90, Theo 90 | Nora, Owen | yes | no | Theo | yes | counted |
| Five Crowns | 10/18/2026 | Nora 25, Owen 25, Priya 33, Theo 35, Ruby 47, Felix 68 | Nora, Owen | yes | no | — | yes | counted |
| Wizard | 10/17/2026 | Nora 50, Owen 100, Priya 90, Theo 50, Ruby 80, Felix 120 | Felix | no | no | — | yes | counted |
| 818 | 10/16/2026 | Nora 34, Owen 34, Priya 44, Theo 16, Ruby 45, Felix 47 | Felix | no | no | — | yes | counted |
| Flip 7 Vengeance | 10/15/2026 | Nora 62, Owen 44, Priya 45, Theo 46, Ruby 41, Felix 56 | Nora | no | no | — | yes | counted |
| Beat the Heat | 10/14/2026 | Nora 51, Owen 42, Priya 39, Theo 21 | Theo | no | no | — | yes | counted |
| Five Crowns | 10/12/2026 | Nora 34, Owen 28, Priya 44, Theo 73, Ruby 96 | Owen | no | no | — | yes | counted |
| Wizard | 10/11/2026 | Nora 90, Owen 170, Priya 30, Theo 40, Ruby 110 | Owen | no | no | — | yes | counted |
| 818 | 10/10/2026 | Nora 43, Owen 33, Priya 13, Theo 18, Felix 29 | Nora | no | no | — | yes | counted |
| Flip 7 Vengeance | 10/9/2026 | Nora 67, Owen 57, Priya 63, Theo 52, Ruby 58 | Nora | no | no | — | yes | counted |
| Beat the Heat | 10/8/2026 | Nora 27, Owen 25, Priya 29, Theo 16, June 48 | Theo | no | no | — | yes | counted |
| Five Crowns | 10/5/2026 | Nora 24, Owen 23, Priya 26, Theo 30, Ruby 36, Felix 59, June 96, Marco 93 | Owen | no | no | — | yes | counted |
| Wizard | 10/4/2026 | Nora 70, Owen 100, Priya 70, Theo 60, Ruby 50, Felix 20, June 80 | Owen | no | no | — | yes | counted |
| 818 | 10/19/2026 | Nora 33, Owen 36, Priya 24, Theo 35, Felix 34 | Owen | no | yes | — | yes | counted |
| Hand and Foot | 10/3/2026 | Nora 4577, Owen 4577, Priya 2780, Theo 2780 | Nora, Owen | yes | no | — | yes | counted |
| Five Crowns | 10/28/2026 | Nora 19, Owen 22, Priya 40, Theo 39 | Nora | no | no | — | yes | counted |
| Wizard | 10/27/2026 | Owen 220, Nora 90, Priya 130, Theo 180 | Owen | no | no | — | yes | counted |
| Wizard | 10/26/2026 | June 220, Marco 90, Iris 130, Hugo 180 | June | no | no | — | yes | counted |
| 818 | 10/25/2026 | Priya 181, Nora 110, Owen 110, Theo 120 | Priya | no | no | — | yes | counted |
| Flip 7 Vengeance | 10/24/2026 | Nora 210, Owen 204, Priya 88, Theo 24 | Nora | no | no | — | yes | counted |
| Beat the Heat | 10/23/2026 | Nora 30, Owen 40, Priya 50, Theo 70 | Nora | no | no | — | yes | counted |
| Five Crowns | 10/29/2026 | Nora 7, Owen 14, Priya 14, Theo 17 | — | no | no | — | no | unfinished |
| 818 | 10/30/2026 | Nora 23, Owen 23, Priya 21, Theo 23 | Nora, Owen, Theo | yes | yes | — | yes | counted |
