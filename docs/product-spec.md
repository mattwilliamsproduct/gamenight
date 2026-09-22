# Back Porch Games — product spec

Humans play. The app keeps score, explains the rescue, and remembers the porch. It is not an opponent, a card engine, or a rules lawyer for every house variant.

Production name on the home screen is **Back Porch**. The Vercel host is still `cardknight.vercel.app`. The repo is `gamenight`.

## Product bar

A game night on the iPad (landscape) or the TV succeeds when these are true. The ids are the contract in [tech-spec.md](tech-spec.md). A change is done when the invariant holds and a test locks it.

1. **NAME-FIT.** A name fits its cell. Michelle stays whole, and the dealer chip hugs the letters.
2. **ROW-ADDS.** A logged round changes the total by exactly the number that was entered, and the row still adds up after an edit, an undo, or a mid-game join.
3. **LP-VISIBLE.** A Life Preserver changes the total and the scorecard shows where those points came from. The spin is not a hand.
4. **SHARED-PLACE.** Tied scores share a place. The next distinct score skips ahead. The same rule is used on the live card, history, profiles, and the path replay.
5. **DISPUTE.** The table can finish, undo, and reopen a dispute from the audit log without a laptop.
6. **PORCH-MEMORY.** Tonight's match survives a refresh. Finished games survive a second iPad through the porch cloud, without one live match erasing another.

Portrait is a podium, not the scoring surface. Rotate back for the card.

## Supported games

The shelf is the six buttons in `public/index.html` (`startGame`). Scoring math lives in that file. Life Preserver math lives in `public/assets/life-preserver-logic.js`.

| Game | Wins | Length | What the app calculates | What a human enters |
| --- | --- | --- | --- | --- |
| Five Crowns | Low score | 11 hands (3 cards through 13) | Nothing about melds. The entered penalty is the round score. | Unmelded-card total |
| Wizard | High score | `floor(60 / players)`, shortened if someone joins | Exact bid: `20 + 10 × tricks`. Miss: `−10` per trick off the bid. | Bid, then tricks |
| 818 | High score | 15 rounds: 8-7-6-5-4-3-2-1-2-3-4-5-6-7-8 | Tricks taken, plus 10 for an exact bid. Dealer may not bid the number that makes the table total equal the tricks. | Bid, then tricks |
| Flip 7 | High score | Open. No finish line. | Nothing about flips or busts. | Banked round score |
| Beat the Heat | Low heat | Ends when anyone reaches 66 | Match-over when any active total is ≥ 66. Lowest total wins. | Heat for the round |
| Rook | High score | Until the chosen target (300 / 500 / 1000), then a confirm to end | Other team's counters = hand total − bid team's counters. Made bid: each partner scores the team total. Set: each partner loses the bid amount. The other side scores its counters. | Bid winner, amount, trump, called card, partner, bid-team points |

House notes already in the rules cards (`gameRulesText`):

- Wizard does **not** block the dealer from making bids sum to the tricks. 818 does. Leave Wizard that way unless the porch asks.
- Flip 7 Vengeance is the stored name. The shelf says Flip 7.
- Rook needs 4 players. 4–6 is the usual table; more than 6 asks for a confirm.
- Life Preserver needs 4 active players and is off for Rook and Beat the Heat.

## Core flows

### Score a round

1. Home: On Deck → Tonight's Table → a game card.
2. Optional dealer roll and lineup intro (Settings; dealer roll defaults off).
3. Wizard and 818: lock bids, then submit tricks. The header shows bids or tricks against the round size. Wizard can undo a bid lock before tricks are submitted. 818 cannot. Leave that alone unless the table asks.
4. Five Crowns, Flip 7, and Beat the Heat: one number per active player.
5. Rook: bid winner and amount, trump and called card, partner, then bid-team points. Save & Next Round.
6. Totals recompute from every round, including a Life Preserver round and any leftover `comeback` extra on old history (`recomputeGameTotals`).
7. Save & End writes a history snapshot. Beat the Heat reaches Match Complete at 66. Rook asks to end when someone crosses the target. Wizard, 818, and Five Crowns complete when the round counter passes the length.

Mid-game join: the new player gets the average of the current losing half, written onto the last scoring round, with `joinBonus` on every earlier round so records ignore the catch-up. Wizard length resyncs from the new headcount and never shrinks below the round you are on.

Head Back to Shore retires someone. Their row stays. They stop scoring and stop qualifying for a Life Preserver.

### Life Preserver (the wheel; stored as Hail Mary)

One feature, two names. The wheel, the Actions item, and the copy say **Life Preserver**. The save format still says Hail Mary: `hailMaryBonus` on a synthetic round, `hailMaryUsed` for who has spun, `authorizeHailMary()` to open the wheel.

Who can spin (`getLifePreserverOffer`):

- Game is 818, Wizard, Five Crowns, or Flip 7. Not Rook. Not Beat the Heat.
- At least 4 active players. Not retired. Not already spun. Match still going.
- Not in 1st. 2nd can qualify if they are also too far back.
- Enough scoring rounds have been played (4, or about a quarter of a Wizard match, at least 3).
- The hole behind 1st is wider than one ordinary catch-up, and the recovery load is high. 818 uses a stricter load (0.55) because the swing that matters is a made bid (+10), not the shared trick points. Flip 7 uses about two and a half strong banks.
- Once it unlocks, the hold lasts this scoring period even if someone else spins first. The next submitted scores rebuild the list.

What the wheel may do:

- Five Crowns subtracts. The other three games add.
- The best slice cannot match or pass 1st. The player stays at least one scoring step behind.
- 818's biggest help is about two made bids (+20), not a ticket to 1st. That calibration is on main (`rescue` path in `life-preserver-logic.js`, shipped in PR #42).
- Some slices are small help, some are 0, some are a small setback.
- One spin per player per match. Undo of a later round gives the spin back if that undo removes the bonus round.

The spin is stored as its own round: `{ round: 0, hailMaryBonus: true, scores: { Name: adjustment } }`. It is inside the total. It is excluded from round columns, Player Pace, round records, WHAMMY / Nolie / Cami, and the place-over-time path.

### Hail Mary

There is no second bonus. "Hail Mary" in code, tests, and old history is the Life Preserver spin. Do not design a separate Hail Mary button.

### Turbos / Comeback

Automatic per-round extras (the "Turbo" chips) were the replacement for the wheel, then the wheel came back and Turbos were taken off the table (PR #34). Production must not load `comeback-logic.js`. `applyComebackAndNotify` returns nothing. `npm run check` still runs the Turbo unit tests so old history that contains `round.comeback` keeps a defined meaning: `recomputeGameTotals` still adds those extras.

### After the match

History, Hall of Fame, Records, and Profiles read `gn_history`. The post-game path replay plots place after each scoring round and already shares places when totals match. Share Receipt and the audit log are the dispute tools.

WHAMMY, Nolie, and Cami Whammi are round celebrations for Wizard, Five Crowns, and Flip 7 only. 818, Beat the Heat, and Rook do not fire them. Rook has an explicit note to wait on team-round edge cases.

### Memory

- This iPad: `localStorage` (`gn_current`, `gn_history`, `gn_players_v2`, `gn_all_players`, profiles, UI scale).
- File backup: export / import, merge by match id (`public/assets/backup.js`).
- Porch cloud: only on `cardknight.vercel.app`, one shared password (`x-porch-key`), one Redis value `gamenight:backup:v1` (`api/sync.js`). A pull keeps the local live match when this device already has one. A push replaces the whole cloud blob. There is no revision check.

## Non-goals

- AI opponents, suggested bids, or playing the cards.
- A second rescue system beside Life Preserver. Turbos stay unloaded.
- Enforcing official Wizard dealer-bid law unless the porch asks.
- Publishing the Life Preserver neighbor Google Form. That form is outside this repo.
- The Porch Club night redesign (PR #44) until Matt signs the preview.
- Splitting `public/index.html` as a project of its own. Fix the stacked theme CSS when a visual bug requires it. Do not boil the ocean first.
- Per-player accounts. One porch, one password, one scorebook.

## Known bugs

Confirmed on `main` as of the J-137 read. Details and PR disposition are in [J-137-grok-4.7-rethink.md](J-137-grok-4.7-rethink.md).

1. **The next Vercel build precaches the wrong script.** `npm run build` rewrites `public/sw.js` from `src/service-worker.js`, which still lists `comeback-logic.js` and omits `life-preserver-logic.js`. The committed worker is the right shell. The build throws it away.
2. **A Life Preserver changes the total and leaves no mark on the card.** Columns skip `hailMaryBonus` rounds. Cells only print `round.comeback`, which new games never write.
3. **Tied players get consecutive places** on the live scorecard (`1, 2, 3, 4, 5, 6, 7` when the last four are two ties). The path replay already uses shared places (`4, 4, 6, 6`).
4. **Merging two names drops Life Preserver bookkeeping**, and the bench drag-merge does not even use the same function as rename-merge. Bids and actuals can be left behind on the drag path.
5. **Closest Finish To 66 is still a trophy.** Reaching 66 ends Beat the Heat as a loss. The card records a winner's heat against that line.
6. **Two iPads can overwrite one cloud blob.** Puts are last-write-wins on a single key.

Michelle's dealer chip and full name were fixed on main (PRs #38 and #40). Draft PR #35 is leftover from before those merges.

## Next slices

Do these in order. Each one is a small, testable change. Leave the open redesign and the Turbo engine alone.

1. Make `src/service-worker.js` precache `life-preserver-logic.js`, and make `npm run check` fail if the template and the script tags disagree.
2. Paint the Life Preserver adjustment on the hand it followed (and beside Total when that column is hidden). Keep it out of scoring-round counts.
3. Use the path-replay place rule on the live scorecard, history, and profiles.
4. Land functional PR checks (the idea in PR #43) on current main. Keep screenshot baselines local.
5. One merge function for bench-drop and rename-merge, including `hailMaryUsed`, holds, bids, and actuals.
6. Remove the Closest Finish To 66 card in its own change. Do not revive PR #22 to do it.
