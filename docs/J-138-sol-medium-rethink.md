# J-138 — Sol medium rethink of Back Porch Games

**Decision snapshot:** 2026-09-22  
**Scope:** independent repository/product review; documentation only  
**Product:** a human game-night scorekeeper. People play the cards and enter results; the app does not supply AI players.

Normative requirements now live separately in:

- `docs/J-138-product-spec.md`
- `docs/J-138-technical-spec.md`

The sweep below was performed after writing those contracts and measures current `main` against them.

## Recommendation first

1. **Make the build safe before adding product surface.** Fix and test the service-worker source mismatch: `src/service-worker.js` caches the retired `comeback-logic.js` and omits `life-preserver-logic.js`, while the committed generated `public/sw.js` does the opposite. `npm run build` regenerates the latter from the former. Acceptance: a clean build keeps Life Preserver in `public/sw.js`, does not add Comeback, and an offline smoke test can open a saved match and the Life Preserver rules.
2. **Land a small correctness train, not the large stale branch.** Rebase or recreate the Michelle name-chip fix from PR #35, then take the tied-place behavior from PR #45 as a separate change. Do not merge PR #37 wholesale: it is dirty, touches 45 files, carries stale screenshot churn, and mixes sync, persistence, scorebook, PWA, and Life Preserver behavior.
3. **Put functional smoke tests in required CI.** PR #43 is clean and already covers five porch-table regressions. Rebase it after the two correctness fixes and make its focused Chromium suite a required PR check. Keep the full visual matrix as release/manual coverage until its known flakes are removed.
4. **Choose one public comeback contract.** Today the shipped mechanic is **Life Preserver**; “Hail Mary” survives only in internal state/function names; automatic **Comeback/Turbo** code and tests remain but production intentionally does not load it. Preserve backward-compatible data reads, but write and document one canonical term before tuning odds or adding more comeback UX.
5. **Pause game expansion and redesign.** Validate score entry, undo/edit, finish, resume, and multi-device recovery for the six existing modes before merging PR #44 or adding games. The unpublished Life Preserver neighbor Google Form is external research, not a repository deliverable; publish/collect it separately before changing the mechanic.

## SMART-NOW

### Specific

Protect a full game-night loop for the existing roster of games:

`choose people → choose game → enter every round → recover from a mistake/reload → finish → trust the winner and saved scorecard`

The immediate target is not more delight layers. It is that one human can keep score on an iPad or laptop without losing, duplicating, or mis-ranking a match.

### Measurable

The next release candidate should meet all of these:

- `npm run build && npm run check` passes from a clean checkout.
- A focused functional suite runs on every PR and covers at least one complete normal score flow, one bid/trick flow, Rook setup/score, undo, match finish, and reload/resume.
- A build assertion proves the generated worker caches the scripts actually loaded by `public/index.html`.
- Michelle fits in the Five Crowns seven-player fixture at supported text sizes.
- Equal totals show equal places everywhere places are shown.
- Two simulated cloud clients cannot silently overwrite different active matches; a conflict must be blocked or explicitly resolved.
- Life Preserver status and a used spin survive reload, undo correctly, and never enter first place.

### Achievable

Most needed work already exists in focused PRs or isolated modules:

- PR #35 has the name-chip approach and visual fixture.
- PR #43 has a focused PR CI suite.
- PR #45 has competition-ranking tests and implementation.
- `public/assets/life-preserver-logic.js` and `public/assets/backup.js` are already CommonJS-testable.

The work should be recreated as narrow, current-main changes rather than recovered by merging PR #37.

### Relevant

At a real table, trust is the product. A premium theme, records, animations, and rescue-wheel tuning have little value if a name clips, tied standings disagree, an undo removes the wrong adjustment, or another device overwrites the live match.

### Time-boxed: NOW

For this week's release train, complete only the tickets in **Concrete tickets for this week** below. Defer visual rebranding and new game modes until the release gate is green and the Life Preserver feedback form has usable responses.

## Code sweep against the specifications

### Correctness and data integrity

1. **P0 — A production build can remove shipped Life Preserver logic from the offline shell.** `public/index.html:8420-8422` loads `life-preserver-logic.js`, and the committed `public/sw.js:1-12` caches it. However, editable `src/service-worker.js:1-12` caches `comeback-logic.js` instead. `scripts/copy-vendor-assets.mjs:55-57` regenerates `public/sw.js` from that stale template on every build. This violates the technical spec's source/output parity and offline requirements. The production check at `scripts/verify-production-assets.mjs:15-48` verifies files and page scripts but never inspects the worker's app-shell list.

2. **P0 — Cloud sync can silently overwrite another device's match.** `api/sync.js:78-86` performs an unconditional Redis `SET` of the entire backup. The client PUT at `public/index.html:10135-10148` sends no document revision or expected revision. This is the wrong abstraction for multi-device durability: a shared mutable blob has been treated like a backup file rather than a concurrent document.

3. **P1 — The last local change may never reach cloud when the page closes.** Local pending writes flush on visibility loss and page hide at `public/index.html:9186-9205`, but the cloud push remains a 2.5-second timer (`public/index.html:10152-10155`). There is no page-hide cloud flush or send-on-exit path. Local recovery reduces data-loss risk, but the cloud status can lag while appearing connected.

4. **P1 — Cloud pull discards valid change classes.** `pullPorchCloud` applies merged state only when `added.games || added.players` (`public/index.html:10109-10120`). A profile/avatar-only update, lineup reorder, preference change, or remote active match with no new player/game is ignored. This misses the product spec's field-complete synchronization requirement.

5. **P1 — Manual import can silently replace a live local match.** `mergeBackup` selects incoming `currentGame` whenever that property exists (`public/assets/backup.js:87-98`), and `applyMergedBackup` assigns it directly (`public/index.html:9983-9989`). The import UI says “Merged” but offers no keep-local/use-imported decision. This violates the explicit active-match preservation contract.

6. **P1 — Life Preserver totals do not reconcile in saved scorecards.** A spin is stored as a hidden `hailMaryBonus` round at `public/index.html:10993-11005`. The history scorecard deliberately skips those rounds and only displays `round.comeback` extras (`public/index.html:15476-15497`). Therefore a saved row can show visible cells whose sum differs from Total. PR #45 contains a proposed display fix, but main does not meet the reconcilable-score requirement.

7. **P1 — Life Preserver bonus rounds leak into records calculations.** The records pass derives `scoringRounds` at `public/index.html:15920`, but then iterates every `h.rounds` entry at `15922` without skipping `hailMaryBonus`. A Life Preserver adjustment can be considered a Five Crowns best/worst round, a Wizard/818 round score, or another per-round record. This is a concrete correctness bug, not only structural debt.

8. **P1 — History reports the wrong number of played rounds after a Life Preserver.** `renderHistoryList` prints `h.rounds.length` at `public/index.html:15442-15446`, although Life Preserver adjustments are encoded as additional rounds. The UI can claim one more round than humans played.

9. **P1 — Used-state has two sources of truth.** Eligibility trusts `game.hailMaryUsed` (`public/assets/life-preserver-logic.js:680-686`), while the actual adjustment is a bonus round (`public/index.html:10993-11005`). Corrupt or legacy data can say “used” without an adjustment, or contain an adjustment without the flag. The spec's typed adjustment should become the durable fact; a derived used set can be a cache.

10. **P1 — Equal totals receive unequal displayed ranks.** Live and history rendering use loop position (`public/index.html:13783-13790` and `15435-15440`), while Life Preserver uses sorted `indexOf` (`public/assets/life-preserver-logic.js:153-164, 702-708`). This violates competition ranking and can make rank explanations dependent on alphabetical tie-breaking. PR #45 addresses this but remains a draft and includes a second concern.

11. **P1 — Player-controlled strings are inserted through raw `innerHTML`.** Examples include audit details (`public/index.html:9000-9011`), avatar alt/source markup (`9269-9274`), Rook partner names and previews (`11556-11567`, `11655-11677`), history rows (`15435-15455`), and historical scorecards (`15484-15498`). Some other call sites correctly use `escapeHtml`, so the policy is inconsistent. In a household app this is primarily a DOM-integrity bug, but imported backups or names containing markup can also execute injected HTML.

12. **P2 — Match identity is not stable enough for merge semantics.** Finished records use `Date.now()` as ID (`public/index.html:11252-11270`); active matches have no ID, revision, or timestamps (`11317-11339`). `backup.js:116-125` merges history solely by ID. Two independent devices cannot distinguish “same match, newer revision” from “different match,” and an ID collision would silently discard an incoming record.

### Wrong or incomplete abstractions

13. **Game rules are configuration in one place and conditionals everywhere else.** The `configs` map at `public/index.html:8789-8796` captures only emoji, score direction, and finish shape. The same file contains 77 direct game-name branches for entry modes, validation, scoring, rules, rendering, records, and special features. This was written less efficiently than it could be because the game definition is data only for the easiest fields; behavior remains distributed across the app shell. A scorer/validator definition per game would remove repeated dispatch and make the supported-game contract testable.

14. **A special adjustment is modeled as a fake round.** `hailMaryBonus` rounds force filters into undo, scorecards, records, joins, and pacing (`public/index.html:9216, 10345, 11842, 12205, 13556, 14061, 14772, 15478, 15920`). This was written less efficiently than it could be because one storage shortcut requires every consumer to remember a negative condition. A typed adjustment with an owner period matches the technical spec and prevents omission bugs.

15. **Mid-game catch-up rewrites all prior rounds.** `submitAddPlayerMidGame` adds the new player to every old score map, puts the entire catch-up average into the last scoring round, and flags every period with `joinBonus` (`public/index.html:14835-14855`). This makes an administrative adjustment look like played history and creates special-case record filtering. A separate typed join adjustment would preserve immutable rounds and make receipts explainable.

16. **Rename/merge logic encodes every schema field manually.** `renamePlayerEverywhere` spans history, active state, bids, actuals, special metadata, and Rook references (`public/index.html:10719-10802`). New player-keyed fields are easy to omit. Worse, `mergePlayerRecords` (`10807-10825`) and drag/drop `dropMerge` (`11229-11241`) are separate implementations: the latter migrates only totals, winners, and round scores, omitting bids, actuals, join metadata, Comeback metadata, profiles, and Rook identity references. The same user action therefore has path-dependent results.

17. **Resume reconstructs state ad hoc instead of normalizing one schema.** `resumeMatch` manually copies generic and per-game fields (`public/index.html:12604-12630`), startup validates only `name` and `originalRoster` (`8776-8780`), and import/cloud have separate application paths. This was written less efficiently than it could be because normalization is repeated at call sites rather than centralized. It is also why malformed/legacy combinations survive.

18. **Totals are both persisted state and repeatedly recomputed derived state.** `recomputeGameTotals` overwrites totals from rounds at `public/index.html:8653-8665`; `renderGame` invokes it on each render at `13651-13685`; many commands also invoke it explicitly. This is safe for some drift but expensive and semantically unclear. In Rook, `saveData()` even occurs before recomputation (`11757-11770`), leaving localStorage temporarily/stably stale until a later render or save. Commands should produce the next canonical totals once, and normalization should verify them on load.

19. **The app shell contains an exact duplicated theme block.** The “COHESIVE MOCKUP PASS” begins at both `public/index.html:4399` and `5400`; selectors, variables, comments, and rules repeat for roughly 1,000 lines. This was written less efficiently than it could be because an entire override pass was appended twice. It increases parse/download cost and makes cascade ownership ambiguous. Remove it only in a dedicated, screenshot-verified cleanup—not as drive-by work.

20. **Presentation and domain mutation are inseparable.** `submitRound` (`public/index.html:14626-14754`) reads DOM inputs, validates, scores, mutates state, writes audit events, persists, renders, emits haptics/sound, and triggers celebrations. `submitRookRound` does the same separately (`11688-11778`). This blocks fast domain tests and makes browser tests carry correctness responsibilities. The command boundary in the technical spec is the appropriate incremental seam.

21. **Dead Comeback/Turbo architecture overstates test confidence.** `public/index.html:9689-9693` makes apply/preview no-ops, `public/index.html:8420-8422` does not load the engine, and `scripts/verify-production-assets.mjs:38-41` rejects loading it. Yet `public/assets/comeback-logic.js` is 794 lines, `scripts/test-comeback.mjs` has 49 tests, and multiple visual specs still target Comeback. This was written less efficiently than it could be because retired behavior remains in the default verification path rather than an archive/experiment boundary.

### Missing behavior and test coverage versus spec

22. **No required PR CI exists on main.** There is no `.github/workflows` file. PR #43 adds a focused workflow, but current repository guarantees depend on a person running `docs/release-checks.md`.

23. **Rook has surface coverage, not scoring-contract coverage.** `tests/visual/app.visual.spec.mjs:1076-1097` proves all six games can reach their first scoring surface, and rename coverage touches Rook identity. There is no automated full Rook bid/call/partner/score/target/undo/resume flow.

24. **Cloud protocol is effectively untested on main.** `scripts/test-backup.mjs:55-73` checks only that a local live match survives `mergeCloud` while history is unioned. It does not execute `api/sync.js`, stale writers, profile-only pulls, active-match conflicts, page-hide behavior, malformed payloads, or storage failures.

25. **Build tests miss the failure they are named to prevent.** `check:production-assets` proves required files exist and page references are correct but not that `npm run build` leaves a coherent worker. There is no clean-build diff assertion or offline browser test.

26. **Golden-path coverage is fragmented.** Beat the Heat has a strong finish ceremony test, and Wizard/818 have several entry/resume cases, but there is no required matrix covering simple entry, bid/trick, and Rook through submit → reload → undo/edit → finish → history reconciliation.

27. **Storage failures are not a product state.** Several localStorage accessors swallow errors (`public/index.html:8433-8434, 8525-8534, 10055-10065`), while core persistence can throw from `localStorage.setItem` (`9038-9047`). The save flash occurs after the persistence path, but there is no durable error UI or recovery instruction. The technical spec requires “saved” to mean persisted and failures to be visible.

28. **The product contract for open-ended Flip 7 is implicit.** `configs` uses `maxRounds:999` (`public/index.html:8793-8795`) and there is no target setting, so the host must manually finish. That is acceptable if intentional, but it needs explicit in-product copy; otherwise it is a missing configurable finish condition.

29. **The house rule for mid-game joins is applied without informed confirmation.** The UI asks for a name, then automatically assigns the bottom-half average and may shorten Wizard (`public/index.html:14823-14866`). The product spec requires showing those consequences before mutation.

30. **Accessibility escaping and identity are inconsistent.** Some score-entry labels use `escapeHtml` (`public/index.html:14410-14429`), while shared avatar markup writes raw `alt="${name}"` (`9269-9274`) and several name buttons write raw text into HTML. A single safe element/template helper should enforce text/attribute encoding and reduce repeated markup.

## Product bar

Back Porch Games is good enough to put on the porch table when:

- **Glanceable:** player, total, place, dealer, round/hand, and scoring phase are readable at table distance.
- **Fast:** a scorekeeper can enter a full table without horizontal hunting or repeated modal setup.
- **Forgiving:** drafts survive accidental navigation/reload; undo and score edit have predictable scope; destructive actions confirm what will be lost.
- **Correct:** the app enforces each supported game's structural constraints, computes scores consistently, handles ties consistently, and never lets a rescue mechanic decide first place.
- **Durable:** the live match is local-first, works offline after installation, and can be backed up without another device silently replacing it.
- **Explainable:** unusual adjustments appear on the scorecard and in the audit trail, with plain-language rules available at the point of use.
- **Human:** all bids, tricks, card outcomes, and scores come from players. No AI opponent, referee, or generated move advice is in scope.

## Supported games: current contract

The source of truth is currently the `configs` map and rules copy in `public/index.html` (around lines 8,789 and 10,173).

| Game | Win/finish | Entry model | Life Preserver |
| --- | --- | --- | --- |
| Five Crowns | Lowest after 11 hands (3 through 13 cards) | Enter each player's leftover-card score | Supported after enough scored hands |
| Wizard | Highest after `floor(60 / original player count)` rounds | Lock bids, then enter tricks; app computes exact/miss score | Supported |
| 818 | Highest after the 8→1→8 sequence | Lock legal bids, then tricks; app awards actual tricks +10 when exact | Supported |
| Flip 7 Vengeance | Highest; open-ended/manual finish | Enter each player's resolved round score | Supported |
| Beat the Heat | Lowest when any player reaches 66 heat | Enter heat gained each round | Not supported |
| Rook | Highest to configured target; call-your-partner variant | Bid winner/amount, trump/called card, teams, counters | Not supported |

Notes:

- “Flip 7 Vengeance” depends on the table's house-card effects; the app records resolved points, not card play.
- Rook is a specific call-your-partner implementation, not a promise to support every Rook ruleset.
- Adding a player mid-game uses a bottom-half-average catch-up and can change Wizard's remaining match length (`public/index.html`, around 14,812). This is a house rule and should be surfaced as such.

## Core flow specs

### 1. Normal scoring

1. The host builds tonight's lineup from known players and chooses a game.
2. Starting a new game while one is active must explicitly save/close the current match first.
3. The app snapshots the game length and roster, requests wake lock when available, and saves locally.
4. For Five Crowns, Flip 7, and Beat the Heat, the host enters resolved round scores.
5. For Wizard and 818, the host locks bids, can unlock them before scoring, then enters tricks; the app computes points. 818 prevents the dealer's forbidden total bid.
6. Rook uses its separate bid → trump/call → team result flow.
7. Every submitted scoring round updates totals, standings, audit history, local persistence, and eligible Life Preserver state.
8. The host can edit or undo with a clear scope. Undo restores the most recent scoring round and any dependent rescue adjustment, not unrelated history.
9. At the natural endpoint—or on an explicit manual finish for open-ended games—the app saves one history record, includes all tied winners, releases wake lock, and offers a receipt/run-it-back flow.

Acceptance:

- Reload at every phase restores the same roster, round, bids/drafts, totals, and special adjustments.
- A scorecard total can be reconciled from visible scoring rounds and labeled adjustments.
- Retired and mid-game-added players do not corrupt records or winner selection.

### 2. Hail Mary terminology and compatibility

There is no separate user-facing Hail Mary flow on current `main`. Commit history shows Hail Mary was renamed to Life Preserver; current UI says Life Preserver, while persisted properties such as `hailMaryUsed`, bonus-round flags such as `hailMaryBonus`, and functions such as `authorizeHailMary` remain for compatibility (`public/index.html`, around 10,908 and 13,515).

Product decision:

- **Canonical public name:** Life Preserver.
- **Legacy read contract:** continue accepting `hailMaryUsed` and `hailMaryBonus` until a versioned migration exists.
- **New writes:** a future migration should write neutral/canonical fields such as `lifePreserverUsed` and `specialAdjustment`, while still reading old backups.
- **Do not expose a second “Hail Mary” board** unless product explicitly defines behavior distinct from Life Preserver. If Matt uses “Hail Mary board” conversationally, treat it as the predecessor/current rescue board pending confirmation.

Automatic Comeback/Turbo is also not a current shipped flow: `applyComebackAndNotify` and score-entry preview are no-ops, `public/index.html` does not load `comeback-logic.js`, and the production-asset check explicitly rejects loading it. Decide to delete/archive that dead path or deliberately relaunch it; do not tune it accidentally through tests.

### 3. Life Preserver

1. Supported only for 818, Wizard, Five Crowns, and Flip 7.
2. It opens only after the game's minimum scoring period and only for an active trailing player ordinary play is unlikely to rescue.
3. Eligibility and wheel size depend on current totals, remaining opportunities, recent volatility, and game-specific caps (`public/assets/life-preserver-logic.js`).
4. Eligible players get a Life Preserver affordance on their place badge and can open an explanation before spinning.
5. At spin completion, eligibility is rechecked. The applied result is capped against the live state.
6. Helpful results may improve the player to second but must remain strictly behind first. Harmful and zero outcomes are allowed.
7. The result is persisted once, shown as a labeled score adjustment, included in the audit log, and marked used.
8. Undoing the scoring round that owns the adjustment releases that use; unrelated undo does not.

Acceptance:

- A stale open wheel cannot apply after the game state changes.
- A tie for first counts as first and is disallowed.
- Spin state, displayed totals, receipt/history, records exclusions, backup, and cloud copy agree.
- The wheel never appears for Rook or Beat the Heat.

## Non-goals

- AI opponents, automated card play, move recommendations, or replacing the human scorekeeper.
- A universal rules engine for every house variant.
- Real-time collaborative score entry by multiple devices in this MVP.
- Public accounts, social network, matchmaking, or online multiplayer.
- More games before current flows pass the release gate.
- Merging a visual redesign merely because the preview is polished.
- Treating unpublished neighbor feedback as validated product evidence.

## Architecture survey

### Runtime shape

- Static, installable PWA deployed from `public/` (`vercel.json`).
- One 16,464-line `public/index.html` contains nearly all markup, duplicated/overridden styling, state, navigation, game logic, and rendering.
- Extracted pure-ish modules:
  - `public/assets/life-preserver-logic.js` — eligibility, sizing, copy, hold/used helpers.
  - `public/assets/backup.js` — backup serialization and merge.
  - `public/assets/comeback-logic.js` — retired/not-loaded automatic Turbo engine.
- `api/sync.js` is a password-gated whole-backup GET/PUT over one Redis key.
- `src/service-worker.js` is a build template; `public/sw.js` is generated output.
- State is mostly browser globals plus several localStorage keys; `gn_current` is the live-match recovery anchor.

### Test shape

- Node tests heavily cover Life Preserver (53 tests) and the retired Comeback engine (49 tests), with 4 basic backup tests.
- Playwright visual/behavior specs cover many scorecard fixtures at iPad, laptop, and TV sizes.
- Main has no checked-in PR workflow; PR #43 adds one.
- Rook has fixture/start/rename coverage but no complete scoring correctness test.
- Cloud sync has no test on main. PR #37 contains a proposed test and concurrency design, but it is not merged.

### README/documentation

`README.md` is two lines and does not explain setup, architecture, supported games, persistence, test commands, or deployment. `docs/release-checks.md` is the only prior product-facing engineering document and describes manual/visual release checks.

## Bugs, debt, and missing features

### P0/P1 correctness and recovery

1. **Build can regress offline Life Preserver.** `src/service-worker.js` caches Comeback and omits Life Preserver; `public/sw.js` currently caches Life Preserver. `scripts/copy-vendor-assets.mjs` regenerates `public/sw.js` from the stale source during every build. `scripts/verify-production-assets.mjs` checks that the file exists, not that the generated cache matches loaded scripts.
2. **Cloud sync is last-writer-wins over one shared blob.** `api/sync.js` does unconditional `SET`; `public/index.html` schedules whole-state PUTs. Two devices can overwrite each other's live game or history without a revision conflict.
3. **Cloud pull ignores profile-only and active-game-only changes.** `pullPorchCloud` applies `next` only when `added.games || added.players`; avatar/profile updates or a remote current match alone are not applied (`public/index.html`, around 10,109). This is explicitly among the unmerged concerns in PR #37.
4. **Life Preserver bookkeeping fixes are stranded in a dirty mega-PR.** PR #37 addresses undo, records, joins, receipts, backup, sync, and PWA behavior but conflicts with main and mixes nearly 1,000 added lines plus screenshot updates. Its claims should become isolated regression tickets, not be assumed fixed.

### Visible bugs

5. **Michelle's Five Crowns name chip remains open.** PR #35 is still open, draft, and dirty. It targets the chip wrapping/empty-space defect and includes a seven-player fixture; recreate/rebase the focused fix.
6. **Tied places are row positions, not shared rank.** The live board renders `ri + 1`, and rescue helpers use sorted `indexOf`; equal totals can show different places and affect rank language. PR #45 is a clean draft with competition-ranking work but also bundles Life Preserver display changes; split or review deliberately.
7. **Records semantics are unsettled.** PR #22 remains a draft about removing “closest to 66,” half-crediting extras, and first-high toasts. Product should decide the record contract before taking its implementation.

### Structural debt

8. **The app shell is the integration boundary.** A change to one game can touch rendering, storage, history, records, celebrations, and responsive layout in the same file. Extract by seam only when making a tested feature change; a broad rewrite is too risky.
9. **Dead feature mass distorts confidence.** Around 794 lines of Comeback engine and 49 unit tests pass even though production refuses to load it. Green tests therefore overstate shipped-path coverage.
10. **Generated/source drift is not guarded.** The current worker discrepancy is one example. Build output should be deterministic, and CI should fail on a post-build diff or validate semantic parity.
11. **Backup validation is shape-light.** Both `backup.js` and `api/sync.js` accept broad object shapes. There is no versioned schema migration, size bound, per-field validation, or corruption recovery contract.
12. **Security model is household-only.** One porch password stored in localStorage gates a shared Redis blob. That is reasonable for a private MVP but not an account/security boundary and should be documented as such.

### Missing product decisions/features

13. Decide whether open-ended Flip 7 should have a configurable target/end condition rather than only manual finish.
14. Surface mid-game join catch-up and Wizard rescheduling as explicit house-rule confirmation.
15. Add a recovery choice when local and cloud active matches differ: keep this device, use cloud, or export both.
16. Publish the already-completed Life Preserver neighbor form, collect responses, and summarize findings outside this repo before altering eligibility/odds.

## Where Sol may see differently from a Grok-centric pass

This review was done from `main`, open PR state, and executable paths without relying on J-137 conclusions.

- **Product taste:** prioritize “quietly trustworthy score sheet” over more spectacle. The repo already has confetti, WHAMMY/Nolie/Cami celebrations, records, pace views, receipts, and a major theme proposal. More delight is lower leverage than a visibly reconcilable score.
- **Architecture:** do not start with a framework rewrite. The monolith is costly, but the first useful boundaries are domain functions, a versioned state schema, and end-to-end tests. Rewrite risk is higher than incremental extraction risk for a porch app with many house rules encoded in behavior.
- **Risk:** cloud overwrite and generated-worker drift outrank styling debt. Both can lose or disable trusted game-night behavior and are insufficiently covered on main.
- **UX:** do not present Hail Mary, Turbo, and Life Preserver as three features. Current production presents one rescue mechanic; internal legacy names and dead modules should not dictate the customer model.
- **Scope:** six supported modes are already enough for MVP. Deepen the Golden Path and recovery semantics before broadening the shelf.
- **PR strategy:** avoid “merge the biggest fix pack.” PR #37 contains useful research but its breadth, conflicts, and stale baselines make it a specification source, not a safe integration unit.

## Next MVP slices

1. **Trustworthy table:** Michelle fit, tie-aware rankings, explicit adjustment display, focused functional CI.
2. **Resilient night:** service-worker parity, reload/resume tests, versioned backup normalization, conflict-safe cloud writes.
3. **Rules clarity:** canonical Life Preserver terminology, house-rule labels for joins/variants, concise supported-game matrix in product/help docs.
4. **Evidence-led polish:** publish and synthesize the Life Preserver form; then decide odds/copy. Separately review the Porch Club theme against real table readability before merging.
5. **Maintainable scoring core:** extract one tested scorer at a time (Wizard/818 first, then Rook), leaving UI behavior unchanged.

## Concrete tickets for this week

### J-138A — Offline shell parity (P0)

- Update the worker template to cache Life Preserver, not Comeback.
- Add a check comparing scripts loaded by `index.html` with required worker app-shell scripts.
- Run build and assert generated `public/sw.js` does not drift.
- Add one offline installed-PWA smoke scenario.

### J-138B — Five Crowns name fit (P1)

- Recreate/rebase only PR #35's rendered-text chip sizing and fixture.
- Verify Michelle at 7 players on iPad landscape, laptop, and 1080p TV, including supported text-size controls.
- Do not bundle theme work.

### J-138C — Tie-aware standings (P1)

- Extract one competition-rank helper for high- and low-score games.
- Use it in live scorecard, profiles/history, and Life Preserver explanations/safety checks.
- Cover `1, 2, 3, 4, 4, 6, 6` and ties for first.
- Split the unrelated “show Life Preserver extra in last cell” portion of PR #45 into its own review.

### J-138D — Required functional CI (P1)

- Rebase PR #43 after J-138A–C.
- Add complete score/finish smoke cases for one simple-entry game, Wizard or 818, and Rook.
- Require build/check plus laptop Chromium on pull requests.
- Keep full screenshot matrix in the documented release gate.

### J-138E — Cloud conflict safety spec/test (P1)

- Give each active match a stable ID and updated revision.
- Make PUT conditional on the last-seen server revision.
- On conflict, do not merge two live matches automatically; preserve/export both and ask which wins.
- Test profile-only pulls, remote-active-only pulls, stale writer rejection, and page-hide flush.
- Mine PR #37 for cases, but implement against current main in reviewable slices.

### J-138F — Rescue vocabulary decision (P2)

- Confirm with Matt that “Hail Mary board” means the feature now called Life Preserver.
- Keep legacy field reads, document them, and stop introducing new Hail Mary names.
- Decide whether to remove/archive automatic Comeback/Turbo or restore it as a separately approved feature.
- Publish the external neighbor feedback form; no code dependency.

## Open PR disposition

| PR | Status observed | Recommendation |
| --- | --- | --- |
| #35 — Michelle/name chip | Open draft, dirty | Rebase/recreate narrowly; high user-visible value |
| #37 — Life Preserver/shared scorebook | Open, dirty, very broad | Do not merge wholesale; convert claims into isolated tests/tickets |
| #43 — functional tests + CI | Open, clean | High leverage; rebase after correctness fixes and land |
| #44 — Porch Club redesign | Open, clean | Hold for product/readability review after trust gate |
| #45 — tied places + LP display | Open draft, clean | Split or deliberately review two concerns; land ranking first |
| #22 — records changes | Open draft | Require product decision on records semantics first |

There are no open GitHub issues, so these PRs and this document currently carry the backlog.

## Release gate

Do not call the next build porch-ready until:

- the generated worker parity check passes;
- focused functional CI is green;
- Michelle and tied places are verified;
- one full match per scoring family can be completed and resumed;
- local/cloud conflict behavior cannot silently discard an active match;
- Life Preserver terminology and adjustment visibility are internally consistent.

