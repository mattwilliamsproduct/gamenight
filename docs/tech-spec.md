# Back Porch Games — tech spec

The product bar is [product-spec.md](product-spec.md). This file is the contract the code is measured against. Where `main` misses an invariant, the gap is recorded in [J-137-grok-4.7-rethink.md](J-137-grok-4.7-rethink.md), not relaxed here.

## Shape

One static site. `public/` is the deploy. `npm run build` writes CSS, vendor copies, and `public/sw.js`. Vercel serves `public/` and the function in `api/sync.js`.

| Piece | Role |
| --- | --- |
| `public/index.html` | Shell, theme, and the match state machine. |
| `public/assets/life-preserver-logic.js` | Pure Life Preserver rules. Loaded in production. |
| `public/assets/backup.js` | Pure backup merge. Loaded in production. |
| `public/assets/comeback-logic.js` | Old Turbo rules. Must not load. Kept so old `round.comeback` rows stay defined. |
| `api/sync.js` | One Redis document for the porch. |
| `src/service-worker.js` | The worker template. The build copies it over `public/sw.js`. |

There is no framework and no per-player account. State is `localStorage` on the iPad plus the optional cloud blob.

## Invariants

### NAME-FIT

- Player names render as text. The dealer control hugs the glyphs (`max-content` on the label, transparent button).
- Fitting may shrink the font. It may not ellipsize.
- A name of “Michelle” at the Five Crowns and late-Wizard fixtures stays fully inside the player cell at laptop and 1080p widths.

### ROW-ADDS

- `totals[player]` equals the sum of `round.scores[player]` over every round, plus any legacy `round.comeback[player]`.
- A Life Preserver adjustment is one of those `round.scores` entries. It is not a second total.
- `joinBonus` marks catch-up points. Records and Player Pace skip those cells. The live total still includes them.
- Wizard points for a submitted round are `20 + 10 × tricks` on an exact bid, otherwise `−10 × |bid − tricks|`. Wizard can return from scoring to bidding before the round is submitted. 818 uses the same two phases and has no unlock. That difference is intentional until the table asks for it.
- 818 points are tricks taken, plus 10 when bid equals tricks. The dealer bid that would make the table sum equal the tricks in play is rejected. Wizard does not apply that dealer law.
- Five Crowns, Flip 7, and Beat the Heat store the number the table typed.
- Rook: other team counters = configured hand total − bid-team counters. Made bid: each partner scores the team total. Set: each partner scores `−bid`. The other side scores its counters.
- Undo removes the last scoring round and any Life Preserver rounds that followed it, then recomputes.

### LP-VISIBLE

- One rescue. UI copy says Life Preserver. Persisted fields may still be named `hailMaryBonus`, `hailMaryUsed`, `lifePreserverHeld`.
- Games: 818, Wizard, Five Crowns, Flip 7. Off for Rook and Beat the Heat. Minimum 4 active players. One spin per player per match.
- The best legal result stays strictly behind 1st by at least one scoring step (1 point, or 5 in games that step by 5).
- 818’s largest helpful slice is about two made bids (+20), and still behind 1st.
- The spin is stored as `{ round: 0, hailMaryBonus: true, scores }`. It counts in the total. It does not count as a hand, a Player Pace round, a WHAMMY input, or a path-replay step.
- The scorecard shows the adjustment on the scoring hand it followed, including history and Share Receipt. If that column is hidden, a mark sits beside Total.
- Undo of the surrounding scoring round returns the spin to unused.

### SHARED-PLACE

- Sort by total (low wins or high wins per game). Equal totals share the best place in that run. The next different total skips (`1, 2, 2, 4`).
- Live scorecard, history list, profile rank, and path replay use that rule. Tie order under the same place may follow seat order. It must not invent a lower place.
- Life Preserver still may not land on a tie for 1st. Sharing 2nd is allowed.

### DISPUTE

- Every submit, edit, spin, undo, join, retire, and scratch appends an audit line on the live match.
- The audit log is readable from Actions during the match.
- Past cells can be corrected. After a correction, ROW-ADDS still holds.

### PORCH-MEMORY

- `gn_current` is enough to resume the live match after a refresh, including bids, drafts, Rook phase, and Life Preserver holds.
- History merge is by match `id`. A merge never double-counts a match and never drops a match whose id is new.
- Two devices with the porch password converge on the union of finished games.
- A push from a device that has not seen the latest cloud copy does not destroy the other device’s live match or newer finished games.
- The service worker that `npm run build` emits precaches the scripts the page actually loads, including Life Preserver, and does not precache Turbo.

### Names and builds

- Shelf labels may say Flip 7. Stored game name is `Flip 7 Vengeance`.
- Home-screen short name is Back Porch. Manifest name is Back Porch Games.
- Cloud sync runs only on `cardknight.vercel.app`.
- `npm run check` fails if `index.html` loads `comeback-logic.js`, and fails if the worker template disagrees with the scripts the page loads.

## Data the match must round-trip

`currentGame` and each history snapshot carry:

- `name` / `game`, `originalRoster`, `currentRound`, `maxRounds`, `rounds`, `totals`
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
