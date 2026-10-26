# Back Porch Games — tech spec

The product bar is [product-spec.md](product-spec.md). This file is the contract the code is measured against. Where `main` misses an invariant, the gap is recorded in [J-137-grok-4.7-rethink.md](J-137-grok-4.7-rethink.md), not relaxed here.

## Shape

One static site. `public/` is the deploy. `npm run build` writes CSS, vendor copies, and `public/sw.js`. Vercel serves `public/` and the function in `api/sync.js`.

| Piece | Role |
| --- | --- |
| `public/index.html` | Shell, theme, and the match state machine. |
| `public/assets/life-preserver-logic.js` | Pure Life Preserver rules. Loaded in production. |
| `public/assets/scorebook.js` | Places, Life Preserver marks, name merges, and golden Wizard / 818 / Rook scoring. Loaded in production. |
| `public/assets/backup.js` | Pure backup merge. Loaded in production. |
| `public/assets/slice2.css` / `slice2.js` | Warm Porch Ledger skin. Always loaded and precached. |
| `public/assets/comeback-logic.js` | Old Turbo rules. Must not load. Kept so old `round.comeback` rows stay defined. |
| `api/sync.js` | One Redis document for the porch. |
| `src/service-worker.js` | The worker template. The build copies it over `public/sw.js`. |

There is no framework and no per-player account. State is `localStorage` on the iPad plus the optional cloud blob.

## Invariants

### NAME-FIT

- Player names render as text. The dealer control hugs the glyphs (`max-content` on the label, transparent button).
- Fitting may shrink the font. It may not ellipsize.
- All names in a scorecard column share one size. Shrink for the longest name that needs it. Do not grow a short name past that shared size.
- A name of “Michelle” at the Five Crowns and late-Wizard fixtures stays fully inside the player cell at laptop and 1080p widths.

### ROW-ADDS

- `totals[player]` equals the sum of `round.scores[player]` over every round, plus any legacy `round.comeback[player]`.
- A Life Preserver adjustment is one of those `round.scores` entries. It is not a second total.
- `joinBonus` marks catch-up points. Records and Player Pace skip those cells. The live total still includes them.
- Wizard points for a submitted round are `20 + 10 × tricks` on an exact bid, otherwise `−10 × |bid − tricks|`. Wizard can return from scoring to bidding before the round is submitted. 818 uses the same two phases and has no unlock. That difference is intentional until the table asks for it.
- 818 points are tricks taken, plus 10 when bid equals tricks. The dealer bid that would make the table sum equal the tricks in play is rejected. A blank 818 bid becomes 0, then that same dealer check runs. Wizard blank bids stay invalid. Wizard does not apply that dealer law.
- Five Crowns, Flip 7, and Beat the Heat store the number the table typed. A played-round entry for those games must be a whole number, 0 or higher. Blank and whitespace are rejected before they become 0. Wizard and Rook calculated scores, and Life Preserver adjustments, may be negative.
- Wizard and 818 bids and tricks are whole numbers from 0 through that round's trick count. Wizard's count is the round number. 818's count is the 8-1-8 schedule for that round, not `currentRound`. The same check covers the live submit and a historical correction.
- Rook: other team counters = configured hand total − bid-team counters. Made bid: each partner scores the team total. Set: each partner scores `−bid`. The other side scores its counters.
- Undo removes the last scoring round and any Life Preserver rounds that followed it, then recomputes.

### LP-VISIBLE

- One rescue. UI copy says Life Preserver. Persisted fields may still be named `hailMaryBonus`, `hailMaryUsed`, `lifePreserverHeld`.
- Games: 818, Wizard, Five Crowns, Flip 7. Off for Rook and Beat the Heat. Minimum 4 active players. One spin per player per match.
- The best legal result stays strictly behind 1st by at least one scoring step (1 point, or 5 in games that step by 5).
- 818’s largest helpful slice is about two made bids (+20), and still behind 1st. Most slices help. Some do nothing. A few slightly hurt. The wheel header states the computed slice range (`Spin range −5 to +20`), not only the best help.
- The spin is stored as `{ round: 0, hailMaryBonus: true, scores }`. The UI commits before the wheel moves and applies the landed result immediately. There is no post-spin Apply. `recordLifePreserverSpin` no-ops if that player already used a spin. It counts in the total once. Recomputing totals does not apply it again. It does not count as a hand, a Player Pace round, a per-round Hall of Fame record, a WHAMMY input, a path-replay step, or a Wizard / 818 exact or missed bid. `hailMaryUsed` is a cache of who has spun. A legacy save with that list and no bonus round still counts as assisted. A sticky `assistedMatch: true` with no remaining spin does not.
- A zero-point spin still sets `assistedMatch` and `hailMaryUsed`. Undo removes the bonus rounds that followed the undone hand, releases those players, and recomputes `assistedMatch` from what remains.
- Timeline and history keep the real total and show an Assisted Match badge when a spin remains. Best Game Score, Highest Winning Score, Worst Game Score, and Cleanest Game read unassisted matches only. The label is "Unassisted matches only". An all-assisted shelf says "No unassisted matches yet".
- The scorecard shows the adjustment on the scoring hand it followed, including history and Share Receipt. If that column is hidden, a mark sits beside Total.
- Undo of the surrounding scoring round returns the spin to unused.

### SHARED-PLACE

- Sort by total (low wins or high wins per game). Equal totals share the best place in that run. The next different total skips (`1, 2, 2, 4`).
- Live scorecard, history list, profile rank, and path replay use that rule. Tie order under the same place may follow seat order. It must not invent a lower place.
- Life Preserver still may not land on a tie for 1st. Sharing 2nd is allowed.

### DISPUTE

- Every submit, edit, spin, undo, join, retire, and scratch appends an audit line on the live match.
- The audit log is readable from Actions during the match.
- Past cells for Five Crowns, Flip 7, and Beat the Heat, and past Wizard / 818 rounds, commit once. A valid commit writes the scores or actuals, the derived totals, standings, the audit line, and the saved history row together. An invalid edit, Escape, or Cancel writes nothing. Saving the same values writes no audit line.
- A Wizard or 818 correction edits that round's actuals together. The players are the ones in that round: retired players who played stay in, and anyone who joined later (`joinBonus`) stays out. Each actual is a whole number from 0 through that round's trick count, and the actuals sum to that count. 818 also rejects a dealer bid that would make those players' bids equal the tricks. The live score formulas rewrite `round.scores`. Hit and miss badges follow the new bid and actual.
- If that correction drops a finished threshold match back under the line, and a different match is already on the table (`gn_current`), the corrected row stays in `gn_history` with `completed === false`, `gameOver === false`, and `winners` empty. The live match is not replaced. Timeline badges that row Incomplete. Resume Match asks `Save the game on the table and resume this match?` and parks the live game in history before the swap. An empty table may resume the reopened match.
- Career games, wins, losses, and final-score records skip a history row when `completed === false` (`isCompletedHistoryMatch` keeps a row when `completed !== false`). A legacy row that never stored the flag still counts. Reopen sets `completed` false, so the row is badged Incomplete until it is finished again.
- Wizard and 818 exact-bid records use `classifyBidAccuracy`. The result is exact only when the stored bid and actual are equal, including 0. A missing bid or actual is unknown and stays out of the denominator. `score > 0` is not a bid result. Shelf 818 scores tricks, plus 10 on an exact bid. A stored score of 15 on bid 3 / actual 2, or 0 on bid 0 / actual 0, is a legacy fixture and does not change the bid result. The rule-consistent pair is score 2 for that miss and score 10 for that exact zero.
- A blank ordinary score submits as `0`. The score-entry helper says `Blank scores count as 0`. Next may leave the draft cell empty. `validateEntries` turns a blank `scores` or `tricks` value into `0` and still rejects `NaN`, fractions, and out-of-range numbers. Blank bids stay rejected. Wizard and 818 actuals are normalized first, then the round must total that round's trick count. A stored `null` is not a zero: `historyScoreOrNull` leaves it out of Hall of Fame and all-time records, and a retired player whose bid, actual, and score are all missing stays out of that historical round. Clearing a stored number to blank writes `0`. A locked bid is still labeled `Suggested: N (tap Next to confirm)` until Next or the row check stores `✓ Confirmed: N`. The first digit on an unconfirmed suggestion replaces it. Rook still requires the bidder, bid, trump, called card, partner, and bid-team counters.

### PORCH-MEMORY

- `gn_current` is enough to resume the live match after a refresh, including bids, drafts, Rook phase, and Life Preserver holds.
- History merge is by match `id`. A merge never double-counts a match and never drops a match whose id is new.
- Two devices with the porch password converge on the union of finished games, including profile and lineup edits that add no new match.
- A pull applies that union even when the only changes are avatars, prefs, or a remote live match and this device has no live match. A pull does not replace a live match already on this device.
- A file import does not replace a live local match unless the host confirms. Cloud merge and file merge are allowed to differ only in that confirm.
- Leaving or hiding the page flushes a pending cloud write. Local flush alone is not enough. The save indicator means the local write finished. A failed write is visible.
- A push from a device that has not seen the latest cloud copy does not destroy the other device’s live match or newer finished games.
- The service worker that `npm run build` emits precaches the scripts the page actually loads, including Life Preserver, `slice2.css`, and `slice2.js`, and does not precache Turbo.

### Names and builds

- A rename onto a name that already played the same match is refused. The check looks through the live match and every saved match: roster, retired seats, totals, round scores, bids, actuals, and Rook bidder and partner. Disjoint aliases can still merge. A new unused name renames in place.
- Each match has a stable `gameId`. A legacy row that already has `id` keeps that value as `gameId`. A row with neither gets one id, stored on both fields, on boot before the gallery hydrates. Reload keeps that same id. Saved matches live in `gn_history`. The live table is `gn_current`. `(gameId, currentRound, phase)` is the match cursor. Phase is `wizardPhase`, `eight18Phase`, `rookPhase`, or `scoring`. History buttons pass the id through `jsAttrArg` so a minted id still opens Scorecard, Resume, and Correct.
- Shelf labels may say Flip 7. Stored game name is `Flip 7 Vengeance`.
- Home-screen short name is Back Porch. Manifest name is Back Porch Games.
- Cloud sync runs only on `cardknight.vercel.app`.
- `npm run check` fails if `index.html` loads `comeback-logic.js`, if the worker template disagrees with the scripts the page loads, or if the template `CACHE_NAME` loses `__BACK_PORCH_RELEASE__` or the `back-porch-shell-` prefix.

## Data the match must round-trip

`currentGame` and each history snapshot carry:

- `id` / `gameId`, `name` / `game`, `originalRoster`, `currentRound`, `maxRounds`, `rounds`, `totals`
- `hailMaryUsed`, `lifePreserverHeld`, `lifePreserverHeldRound`
- `retired`, `dealerOffset`, `auditLog`, `currentScoreDrafts`
- Wizard: `wizardPhase`, `currentBids`
- 818: `eight18Phase`, `currentBids`
- Rook: `rookConfig`, `rookPhase`, bid winner, trump, called card, partner, drafts

A round is `{ round, scores, bids?, actuals?, comeback?, joinBonus?, hailMaryBonus?, rook* }`.

`round.comeback` is legacy. New rounds do not grow that object. Readers still add it so old nights stay honest.

## Where a rule is allowed to live

- Scoring formulas, place, and “is this a hand?” are pure functions with unit tests.
- Life Preserver eligibility, caps, and hold updates are pure functions in `life-preserver-logic.js`. The page may only paint and call them.
- Backup merge is pure in `backup.js`.
- `index.html` owns DOM, modals, and when to save. It does not grow a second copy of a formula that already has a function.
- Render paints. It does not decide a new rule. If a render must refresh holds, that refresh is one call whose result the badge reuses.

## Hot path

A round submit on an 8-player table must stay responsive on an iPad. That budget is met by:

- persisting `gn_current` immediately and deferring the history blob while a match is open
- not scanning every past match once per player inside the scorecard paint
- not string-building a second full scorecard for Rook, history, and the live table with three different place rules

The porch does not need a virtual DOM. It does need one scorecard renderer.

## Non-goals

Same as the product spec. In particular: do not load Turbos, do not add accounts, do not split `index.html` until ROW-ADDS, LP-VISIBLE, SHARED-PLACE, and PORCH-MEMORY have a single implementation each.
