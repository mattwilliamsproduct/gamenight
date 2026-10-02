# J-137 — Grok 4.7 smarter-now rethink

Back Porch Games is a human scorekeeper. People play. The app tracks the card. Specs: [product-spec.md](product-spec.md), [tech-spec.md](tech-spec.md). This note is the code sweep against those bars. No app behavior was changed.

This file plus those two specs are the canonical docs set (PR #47). PR #46 (J-138 Sol) should be closed, not merged. Unique Sol findings that survived a re-read of `main` are in [Also from J-138 Sol](#also-from-j-138-sol). `origin/main` was still `a18a52e` on 2026-10-02, so this branch did not need a rebase.

## Rec

1. **PORCH-MEMORY.** Make `npm run build` emit the worker that is already committed. `src/service-worker.js` still precaches Turbo and drops Life Preserver. Vercel builds from that template.
2. **LP-VISIBLE.** The spin is inside the total and absent from the grid, including history. Paint it on the hand it followed. Do not load Turbos to do that.
3. **SHARED-PLACE.** The path replay already shares places. The live card, history list, and profiles number ties by row. Use the path’s loop.
4. **ROW-ADDS.** One merge helper. Bench drag, rename-merge, and a unique rename currently rewrite different fields, so a merged name can keep the points and lose the bids.
5. **Do not merge the open PR pile.** #35 is already fixed on `main`. #22 and #37 are older than the wheel’s return. #44 is an unsigned theme. #43 is the CI worth rebasing.

## Was

A prior pass that read filenames and open PRs would still believe:

- Draft #35 is the live Michelle bug. NAME-FIT is already implemented and tested (`54eb926`, PR #40, dealer-chip assertions in `tests/visual/app.visual.spec.mjs`).
- Hail Mary and Life Preserver are two features, or Turbos are current because `test:comeback` runs. The page stubs Turbo (`applyComebackAndNotify` at `public/index.html` 9689–9691) and `scripts/verify-production-assets.mjs` 39–41 forbids loading `comeback-logic.js`.
- `public/sw.js` is what production serves. `scripts/copy-vendor-assets.mjs` 54–56 overwrites it on every build from `src/service-worker.js`.
- The live card and the path replay share a rank function. They do not.
- Splitting the 16,464-line `index.html` is the first move. The first move is one implementation per invariant below.

## Now — code sweep

Measured against [tech-spec.md](tech-spec.md) on `main` (`a18a52e`).

### LP-VISIBLE — the total moves and the row does not show why

The wheel writes a real round and then every scorecard throws that round away.

- `spinWheel` pushes `{ round: 0, hailMaryBonus: true, scores: { [player]: adj } }` at `public/index.html` 10996.
- `recomputeGameTotals` (8656–8664) adds `round.scores` and legacy `round.comeback`, so the Total is right.
- Live columns come from `getRecordChaseRoundEntries` (13554–13557), which drops `hailMaryBonus`. History does the same in `openScorecard` (15477–15490). Rook’s own table does it again (11841–11843).
- The only extra painted on a cell is `r.comeback` (13842–13849 and 15491–15494). New games never set `comeback`, because `applyComebackAndNotify` (9689–9691) returns `[]` and is still called from all three submit paths (14674, 14723, 14742).
- `buildMatchPlacePath` (12205) also skips the bonus, then picks winners from full totals (12227–12229). The chart’s last dot can disagree with the standing the spin just created.

This was written this way because Turbo extras lived on the scoring round (`round.comeback`) and the wheel was stored as a fake round so it would fall out of hand counts. When the wheel came back, the cell painter was left on the Turbo field and the filter that hides bonus rounds was left in place. Both halves are locally reasonable. Together they hide the only adjustment the porch argues about.

`renderGame` also pays for eligibility twice. Line 13712 calls `syncCurrentLifePreserverHolds`, which offers every player. The row builder then calls `isHailMaryEligible` again per player (13785), which offers them a second time. The badge was added beside the hold list instead of reading the hold list.

### SHARED-PLACE — three rankers, one of them correct

The spec is competition ranking: equal totals share a place, the next total skips.

- `buildMatchPlacePath` (12214–12222) does that. It is the only place that does.
- The live card sorts with a bare subtraction and no tie rule (`renderGame` 13714–13716), then prints `ri + 1` (13788–13790). Two players on the same score become 6 and 7.
- `sortPlayersByTotal` (12177–12181) breaks ties with `localeCompare`, so history and profiles order ties alphabetically and still number them 1, 2, 3 via `findIndex` (`getProfileSummary` 10215, history rows 15438–15439).
- Portrait sorts a third way (13945) and shows a podium, which is fine, but it is another copy of “who is ahead.”

This was written less carefully than it could be because each screen grew its own `sort` inside the HTML template. The path replay needed shared places to draw lines, so it got a real loop. The scorecard only needed a row index, so it never learned the rule.

### ROW-ADDS — formulas and merges were copied instead of called

What works: `recomputeGameTotals` is the total. Undo (14770–14808) removes the last scoring round plus any spins after it and gives those spins back through `releaseRemovedLifePreservers`. Mid-game join writes the catch-up on the last scoring round and flags `joinBonus` (14844–14852). 818’s formula is a function, `calculate818Score` (8741–8745), and the dealer-bid block is shared by the modal and by `submitRound`.

What does not:

- Wizard’s formula is inlined once, at 14671 (`20 + 10 × actual` or `−10 ×` the miss). There is no `calculateWizardScore`. A second editor cannot reuse it.
- Editing a past cell writes `round.scores[player]` directly (15249) and, if Turbo were loaded, would resync `comeback` (15250). It does not touch `bids` / `actuals`. The miss styling (13834–13840) still comes from bid versus actual. A corrected Wizard cell can show a miss dot on a number the table typed on purpose. ROW-ADDS holds for the total. The cell’s explanation does not.
- Rook’s made/set math lives only inside `submitRookRound`. The loop at 11762–11766 walks the table, checks the target, and does nothing. The real confirm is 11771–11777, after recompute. The empty loop is what you get from patching a function in place.
- Names are merged three different ways.
  - Unique rename, `renamePlayerEverywhere` (10719), moves roster, rounds, `hailMaryUsed`, and holds.
  - Rename onto an existing person, `mergePlayerRecords` (10807–10826), adds totals and moves `scores` / `bids` / `actuals` / `comeback`. It leaves `hailMaryUsed`, holds, `originalRoster`, `retired`, and the live match on the deleted name.
  - Bench drag, `dropMerge` (11229–11240), only adds totals, winners, and `r.scores`. Bids and actuals stay behind, so an 818 or Wizard exact-rate record lies after a drag-merge. The comment at 10685 says this is the same flow as `mergePlayerRecords`. It is not.

This was written less efficiently than it could be because each call site hand-listed the keys it remembered that week. Life Preserver fields were added to rename and not to either merge.

### PORCH-MEMORY — the build ships a different app than git shows

- Committed `public/sw.js` 8–13 precaches `life-preserver-logic.js`.
- `src/service-worker.js` 8–14 precaches `comeback-logic.js` and also `apple-touch-icon.png`, and omits Life Preserver.
- `scripts/copy-vendor-assets.mjs` 54–56 is what `npm run build` runs. `vercel.json` sets that as `buildCommand`.
- `verify-production-assets.mjs` checks the script tag and never reads the template. `comeback-logic.js` is still on disk, so `cache.addAll` succeeds. The bad shell does not fail the install.

Online, the page requests Life Preserver and the network-first worker caches it after the first fetch. A cold cache, or the next agent reading the template, still has the Turbo shell.

Cloud memory is one Redis string (`api/sync.js` 3 and 85, `SET` with no revision). `schedulePorchPush` (10152–10155) writes the entire backup 2.5 seconds after a save. `mergeCloud` (`public/assets/backup.js` 133–141) throws away the remote live match whenever this device has one, and the following PUT publishes that choice. Two iPads scoring at once violate PORCH-MEMORY. One iPad is fine.

Match ids are `Date.now()` (`createSavedMatchSnapshot` 11254). Merge dedupes on that id (`backup.js` 117–121). Two saves in the same millisecond collapse into one history row.

History’s subtitle uses `h.rounds.length` (15446). That count includes Life Preserver rounds, so a finished 11-hand Five Crowns with a spin reads as 12 rounds. LP-VISIBLE says the spin is not a hand. The list treats it as one.

### NAME-FIT — met, and expensive because the CSS is two themes

The dealer chip hugs the label (`button.dealer-name-indicator` and `.dealer-player-label`, 2381–2436 and again 3606–3625). `fitScorecardPlayerNames` (13296–13329) measures uppercase text and shrinks only a name that overflows the cell. Tests cover Michelle. Draft PR #35 should be closed, not merged.

The fitter exists because the theme was pasted twice. A block labeled `BACK PORCH GAMES: COHESIVE MOCKUP PASS` starts at line 4399 and again at 5400. The following thousand lines differ in about 160 places. Later rules win. A chip fix in the first copy is not the rule the browser uses. That is why name layout became a canvas measurement on every scorecard paint (`scheduleScorecardColumnTrimAll` 13470, called from `renderGame` 13915) instead of one CSS rule.

### Hot path — the scorecard is rebuilt as a string, and Player Pace scans history per row

`renderGame` (13651) recomputes totals, syncs holds, sorts, and assigns `innerHTML` for the whole head and body (13749, 13861). Then it paints portrait (13909) and schedules a column trim that reads layout. For eight players this is acceptable. It was written this way because the page never grew a scorecard model, so every feature appends to the string.

Player Pace is the part that will not stay acceptable. `renderRecordChasePanel` (13640–13641) calls `getRecordChaseMetric` per player. Each call runs `getRecordChaseHistory` (13569–13574), which filters all of `gn_history`, then scans that list twice for best and worst (13604–13605). Eight players means eight full history walks on every scorecard paint, including after every round. This was written less efficiently than it could be because the Best / Avg / Worst cells were dropped into the row template as if they were labels. They are queries. One pass over history per paint, keyed by player, is the same data.

`persistJsonIfChanged` (9023–9047) already avoids rewriting an unchanged JSON string, and history is deferred two seconds during a live match (9092–9098). That part is doing the right work. The cloud push is not: it still ships the whole backup on the same cadence.

`computeHeadToHead` (15505–15532) is an active-player × opponent walk over every match, cached only while a match is open. Profiles with no live match recompute it on every open. Fine at porch size. Same pattern as Player Pace: a statistic living inside a renderer.

### Wrong abstractions

- **Two score engines.** `life-preserver-logic.js` is the live pure module. `comeback-logic.js` is a parallel copy (same `SUPPORTED_GAMES`, its own 818 ladder, its own recovery math) that the page must not load. `EIGHT18_ROUND_TRICKS` is declared in `index.html` 8715, `life-preserver-logic.js` 5, and `comeback-logic.js` 5. Wizard’s `floor(60 / n)` length is likewise copied in `getMaxRounds` inside the Life Preserver file (87–94) and `snapshotGameMaxRounds` (8798–8804). They match today. They will drift the first time someone edits one.
- **Turbo vocabulary left on the live path.** CSS classes `scorecard-turbo-slot`, `has-comeback`, and `score-cell-comeback`, plus the rules modal at 8180–8202, still describe a feature the shell rejects. `comebackChip` is hardcoded to `''` (13784). The slot is still emitted (13824). The next “just show the extra” patch will wire the stub back up, which reopens the bet PR #34 closed.
- **Rook is a second app inside `renderGame`.** `renderGame` returns early into `renderRookGame` (13666–13672). Place, columns, and round submit do not share the other games’ helpers. That is why `detectRoundWhammy` bails out for Rook with a TODO (9739–9741) and why Rook’s target check got an empty loop beside the real one.
- **Render mutates the match.** `renderGame` calls `recomputeGameTotals` (13684) and `syncCurrentLifePreserverHolds` (13712). Painting can change `lifePreserverHeld` and `totals`. A refresh before the next `saveData` loses the hold update. Holds belong on the submit / undo / join boundary, with render only reading them.

### Missing versus the spec, and what is not missing

| Invariant | On `main` |
| --- | --- |
| NAME-FIT | Holds. Close #35. |
| ROW-ADDS for a normal submit | Holds, via `recomputeGameTotals`. |
| ROW-ADDS after a name merge | Fails for drag-merge and rename-merge. |
| LP-VISIBLE | Fails on live and history cards. |
| SHARED-PLACE | Fails except path replay. |
| DISPUTE | Audit log works (`addAuditEntry` 8988, `openAuditLog` 9000). Lines are inserted as HTML without `escapeHtml` (9007–9008), and the live name cell interpolates the name the same way (13821–13823). `escapeHtml` exists and is used for suggestions. A name with markup becomes markup. |
| PORCH-MEMORY for one device | Holds, including refresh of `gn_current`. |
| PORCH-MEMORY for two devices | Fails. Last PUT wins. |
| Built worker matches loaded scripts | Fails. See above. |
| Closest Finish To 66 | Still a Records card (16200), fed by a winner’s heat against the 66 loss line (15902–15913). The product bar does not ask for this trophy. Beat the Heat’s real end is `endScore: 66` (8794) and `hasReachedEndScore` (8688–8694). |

House rules that look like bugs and are not, until Matt says otherwise:

- Wizard does not block a dealer bid that makes the bids sum to the tricks. 818 does (`get818DealerBidInfo` 14178).
- 818 cannot undo a locked bid. Wizard can (`isWizardBidLockUndoAvailable` 14056).
- WHAMMY / Nolie / Cami do not fire for 818, Beat the Heat, or Rook (`detectRoundWhammy` 9747–9753, `detectNolieForRound` 9778).

### Open PRs against this sweep

| PR | Sweep result |
| --- | --- |
| #35 chip hug | Already on `main`. Close. |
| #37 LP honesty | Do not merge. The LP-VISIBLE and merge-metadata gaps are real. The branch is older than #38–#42, which changed name fit and the 818 cap. |
| #22 records | Do not merge. Only the Closest-to-66 removal is still a valid ticket, and it should be a new patch. |
| #43 functional CI | Rebase and land. `main` has no `.github/` workflows. The check would have caught a script-tag regression and still would not catch the worker template. T1 adds that. |
| #44 Porch Club | Park. Another theme pass on top of the two that already diverge at lines 4399 and 5400. |
| #45 shared places | Cherry-pick SHARED-PLACE. Review its Life Preserver cell against LP-VISIBLE separately. Do not change the “strictly behind 1st” cap in the same patch. |

The neighbor Life Preserver form is still outside this repo. Publishing it is not a code change.

## Next

### T1 — Worker matches the page (PORCH-MEMORY)

`src/service-worker.js` `APP_SHELL` lists `life-preserver-logic.js` and does not list `comeback-logic.js`. `npm run build` output matches. `verify-production-assets.mjs` fails when the template and the script tags disagree.

### T2 — Show the spin (LP-VISIBLE)

Last scoring cell shows the adjustment (`40 −30`, `0 +40`). Hidden columns mark Total. Undo clears it. Hand counts, Player Pace, WHAMMY, `rounds.length` on the history card, and per-round Hall of Fame walks (`calculateAllTimeRecords` at 15922) ignore `hailMaryBonus`. One Playwright or unit assertion on the cell text, plus one record assertion that a spin is not best/worst round. `comeback-logic.js` stays unloaded.

### T3 — One place function (SHARED-PLACE)

Live card, history list, and profile rank call the same loop as `buildMatchPlacePath` 12214–12222. A tied Wizard fixture shows `4` and `4`, then `6`. The Life Preserver cap is untouched.

### T4 — One merge (ROW-ADDS)

`dropMerge` and `mergePlayerRecords` call one helper. Scores, bids, actuals, `hailMaryUsed`, holds, roster, and retired flags move. The live match is included when that name is in it. A node test covers a Wizard round plus a Life Preserver bonus.

### T5 — Functional CI (#43) plus the worker check

`npm run check` and the small laptop pack on current `main`. Screenshot baselines stay local.

### T6 — Player Pace scans history once

`renderRecordChasePanel` stops calling `getRecordChaseHistory` per player. One walk of `gn_history` per paint, then a lookup. Same Best / Avg / Worst numbers.

### T7 — Drop Closest Finish To 66

Remove the card and the calculator at 15902–15913 and 16200. Leave the other Beat the Heat cards. Do not reopen #22.

### Later, not this sweep

- Cloud revision so a stale PUT cannot replace a newer scorebook. The same slice should apply profile-only pulls, refuse to replace a live match on file import without a confirm, and flush the cloud timer on page hide. See the J-138 notes below.
- Delete the Turbo modal, the empty `comebackChip` slot, and the second theme pass only as their own changes, after T2, so a cleanup does not move the scorecard.
- Rook WHAMMY only after team rounds are specified.
- 818 bid-lock undo, and Wizard’s dealer-bid law, only if the table asks.

## Also from J-138 Sol

Folded from PR #46 (`cursor/j-138-sol-rethink-8620`, files `docs/J-138-*`) on 2026-10-02. Re-checked on `main`. Already covered above and not repeated: the worker template, invisible Life Preserver cells, row-index places, three merge paths, duplicated theme CSS, unloaded Turbo engine, no PR CI, Closest Finish To 66, and `Date.now()` history ids.

### Verified, and now part of the bar

1. **Records treat a spin as a played round.** `calculateAllTimeRecords` builds `scoringRounds` by skipping `hailMaryBonus` (`public/index.html` 15920–15921) and then walks every `h.rounds` entry (15922–15951) without that skip. A Five Crowns subtraction or a Wizard bonus can become best or worst round. `joinBonus` is excluded. The spin is not. LP-VISIBLE now says per-round records ignore it. T2 includes this, not only the scorecard cell.

2. **Cloud pull drops anything that is not a new player or finished game.** `pullPorchCloud` merges, then applies `next` only when `added.games || added.players` (10109–10120). An avatar, a lineup edit, or a remote live match with no new history row is computed and thrown away. Profile merge inside `mergeBackup` never even increments `added`.

3. **File import replaces the live match. Cloud pull does not.** `mergeBackup` (`public/assets/backup.js` 94–96) takes `incoming.currentGame` whenever the key exists, including `null`. `importBackupText` (10024–10028) and `applyMergedBackup` (9988) write that over tonight’s match and alert “Merged.” `mergeCloud` (133–141) deletes the remote live match when this device already has one. Same word “merge,” two behaviors. PORCH-MEMORY now requires a confirm before a file replaces a live match.

4. **Page hide flushes the iPad and not the cloud.** `visibilitychange` and `pagehide` (9186–9204) call `flushPendingSave` and `_persistGamenightState`. `schedulePorchPush` (10152–10155) is a 2.5s timer with no hide flush. A score can be local and still miss the other iPad if the page closes inside that window.

5. **`hailMaryUsed` and the bonus round can disagree.** Eligibility trusts the name list (`life-preserver-logic.js` around 684). The points live on a `hailMaryBonus` round (`index.html` 10996). A backup can say used with no points, or the reverse. The tech spec now treats the round as the fact and the list as a cache.

6. **Rook writes storage before totals.** `submitRookRound` calls `saveData` at 11759, then `recomputeGameTotals` at 11769. The empty target loop at 11762–11766 still does nothing. The confirm uses the recomputed totals. `gn_current` on disk can keep the previous totals until a later save. The next `renderGame` repairs the screen. It does not repair the blob already scheduled for cloud from the earlier `saveData` if that payload was snapshotted before recompute. The in-memory push 2.5s later usually sees the new totals. The ordering is still wrong.

7. **The live match has no id.** `commitGameStart` (11322) sets name, roster, and rounds. It does not set a match id, revision, or timestamp. Finished rows use `Date.now()` (11254). Two devices cannot tell “same night, newer copy” from “different night.” Sol’s schema sketch (typed adjustments, `schemaVersion`, conditional PUT, 409) is a later extraction, not this contract. Do not start that migration inside a docs PR.

### Read, and not adopted

- **Do not rebase PR #35.** Sol’s J-138B still treats Michelle’s chip as open. NAME-FIT already holds on `main` (#38, #40, and the dealer-geometry tests). Close #35.
- **Do not add an 818 bid-lock undo or a Wizard dealer-bid ban** unless the table asks. Sol’s product draft says both bid/trick games can unlock. This spec keeps Wizard-only undo and 818-only dealer law.
- **Do not add a join confirmation dialog as a new feature** in this docs set. Sol wants the catch-up average and Wizard length change explained before `submitAddPlayerMidGame` (14823–14866). Current behavior applies them immediately. Leave that as a product question for Matt, not a silent requirement.
- **Do not merge #46 to archive the Sol files.** Merging it would land a second product spec, a second tech spec, and a second rethink beside these. The unique notes are here. Close #46 after this fold.
