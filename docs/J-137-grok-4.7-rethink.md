# J-137 — Grok 4.7 smarter-now rethink

Back Porch Games (`gamenight`) is a human scorekeeper. People play Five Crowns, Wizard, 818, Flip 7, Beat the Heat, and Rook. The app keeps the card, the Life Preserver wheel, and the porch memory. It does not play.

Read with [product-spec.md](product-spec.md). No app behavior was changed for this pass.

## Rec

1. **Fix the service worker before the next production deploy.** `npm run build` rewrites `public/sw.js` from `src/service-worker.js`. The template still precaches `comeback-logic.js` and leaves out `life-preserver-logic.js`. The worker committed on `main` is the right shell. Vercel runs that build (`vercel.json`), so the file in git is not the file that ships. Online play still fetches Life Preserver, which is why this has been quiet. A cold offline shell can boot without the wheel engine, and the precache keeps teaching the next agent that Turbos are live.
2. **Close draft PR #35. Do not restyle Michelle again.** The wide dealer chip and the clipped name were fixed on `main` in #38 (`54eb926`) and #40. `tests/visual/app.visual.spec.mjs` already asserts the chip fills the button and that Michelle’s glyphs fit. Spot-check Hand of 7 on the iPad once, then close the draft.
3. **Show the Life Preserver on the scorecard.** The spin is inside the total and invisible on the grid. Store format stays a `hailMaryBonus` round so it is not a fake hand. Paint the adjustment on the hand it followed.
4. **Share place numbers when totals match.** The live badge is the row index. The post-game path already does competition ranking (`4` and `4`, then `6` and `6`). Use that rule on the live card. Cherry-pick that idea from draft PR #45. Leave its “a tie for first counts as taking first” wheel change until Matt says so.
5. **Stop merging the open PR pile.** #22, #35, and #37 are from the Turbo / early-Life-Preserver weeks and will fight current `main`. #44 is an unsigned visual redesign. #43 (functional CI, no snapshot matrix) is the one process PR worth rebasing and landing.

## Was

Assumptions a Grok 4.6-era pass, or a pass that only read open PRs and filenames, would still be carrying:

- **PR #35 is the live Michelle bug.** It is a draft from 22 Aug 2026, before the chip-width and name-fit merges. The button is already `max-content` and the green box sits on `.dealer-player-label`. Merging #35 now risks a CSS fight with rules that already pass.
- **Hail Mary and Life Preserver are two products, or Turbos replaced the wheel.** There is one rescue. The UI says Life Preserver. The save format says `hailMaryBonus`, `hailMaryUsed`, and `authorizeHailMary()`. Turbos shipped, then PR #34 took them off the table. `applyComebackAndNotify` is an empty stub. `scripts/verify-production-assets.mjs` fails the build if `index.html` loads `comeback-logic.js`.
- **Comeback tests passing means Turbos are the product.** `npm run check` still runs `scripts/test-comeback.mjs` (about 660 lines) and the visual Turbo specs. That protects old `round.comeback` rows. It does not mean the wheel should go away again.
- **The open PRs are a backlog you can merge.** #22 and #37 predate the Life Preserver return and the later wheel calibration (#42) and layout fixes (#38–#41). #44 says do not merge. #45 mixes a real rank bug with a scorecard display change and a rules change about tying for first.
- **`public/sw.js` is what production serves.** `scripts/copy-vendor-assets.mjs` overwrites it on every `npm run build` from `src/service-worker.js`. `npm run check` never builds, and it never diffs the template against the script tags. Reading the committed worker and calling the shell healthy is the miss.
- **The live scorecard and the path replay share a place rule.** Only `buildMatchPlacePath` shares places. `renderGame` prints `ri + 1` after a sort that breaks ties by name.
- **Closest Finish To 66 was already removed.** It is still calculated and still a Records card. Draft #22 tried to drop it and should not be merged to do that.
- **The next architecture move is splitting the 16k-line `index.html`.** The debt that causes wrong fixes is the second score engine and the two stacked theme passes. A file split does not help Thursday’s table.
- **The README is the spec.** It was one line, “CardKnight · Game Night Scorekeeper.” The product name on the device is Back Porch.

## Now

What is actually true on `main` (`a18a52e` and the open PR list as of 22 Sep 2026).

### The table is in good shape

Six games, a focused score-entry modal, mid-game join with Wizard length resync, Beat the Heat auto-end at 66, Rook target confirm, audit log, file backup, and a single porch cloud. Life Preserver eligibility, hold-for-this-scoring-period, and the 818 +20 cap have unit tests. Visual coverage exists for iPad, laptop, and 1080p, and it is intentionally local because the snapshot matrix flakes.

There are no GitHub issues. The backlog is open PRs plus porch memory.

### Real bugs

**1. Build emits the Turbo service worker.**

| File | What it says |
| --- | --- |
| `src/service-worker.js` lines 8–14 | Precache includes `./assets/comeback-logic.js` and omits Life Preserver. |
| `public/sw.js` lines 8–13 | Precache includes `./assets/life-preserver-logic.js`. This is the shell you want. |
| `scripts/copy-vendor-assets.mjs` lines 54–56 | `npm run build` replaces `public/sw.js` from the template. |
| `vercel.json` | `buildCommand` is `npm run build`. |
| `scripts/verify-production-assets.mjs` lines 39–41 | Guards the script tag. Does not read the worker template. |

`comeback-logic.js` is still in the repo, so `cache.addAll` succeeds. The failure is silent.

**2. Life Preserver points are in the total and missing on the grid.**

- Spin pushes `{ round: 0, hailMaryBonus: true }` at `public/index.html` around line 10996.
- `recomputeGameTotals` (around 8652) adds that score, so the Total is right.
- Round columns drop those rounds (`getRecordChaseRoundEntries`, around 13554).
- Cells only render `r.comeback` (around 13842). New games never set `comeback`, because `applyComebackAndNotify` (around 9689) returns `[]`.
- `buildMatchPlacePath` (around 12205) also skips the bonus round, then colors winners from full totals. The path’s last point can disagree with the standing the spin just created.

PR #37 and PR #45 both try to draw the adjustment. They are different patches on an old base. Take the behavior, not the branch: show the number on the previous scoring cell, keep the bonus out of hand counts, and add one Playwright assertion.

**3. Ties are numbered by row.**

`sortPlayersByTotal` (around 12177) orders equal totals by name. The live badge is `ri + 1` (around 13788). Two players on the same score get 6 and 7. `buildMatchPlacePath` (around 12214) already assigns both the best place and skips. History ranks and profile ranks use `findIndex` the same way as the live card.

**4. Two merge implementations, both incomplete.**

- Rename of a unique name (`renamePlayerEverywhere`, around 10719) rewrites roster, rounds, `hailMaryUsed`, and holds.
- Rename onto an existing name calls `mergePlayerRecords` (around 10807). That adds totals and moves score keys. It does not rewrite `hailMaryUsed`, holds, `originalRoster`, or the live match.
- Bench drag (`dropMerge`, around 11229) is a third, thinner copy: totals, winners, and `r.scores` only. Bids and actuals stay on the deleted name, so 818 and Wizard exact-rate records lie after a drag-merge. The comment that says this is the same flow as `mergePlayerRecords` is false.

**5. Closest Finish To 66 is still a trophy for a loss.**

`hasReachedEndScore` ends Beat the Heat at 66. The Records page still has Closest Finish To 66 (`renderRecordsPage` around 16200), fed by winner heat versus 66 (around 15902). Ice rounds, coolest game, and closest margin are the cards that match the rules.

**6. One cloud key, last write wins.**

`api/sync.js` stores a single Redis string. `pushPorchCloud` PUTs the whole backup. There is no revision. `mergeCloud` in `backup.js` drops the remote live match when this device already has one, then the following push writes that choice back for everyone. Fine for one iPad. Risky when two devices score at once.

### Tech debt that will create the next wrong fix

- **Unloaded Turbo engine.** `public/assets/comeback-logic.js`, the Turbo modals around line 8180, a pile of `.comeback` / `.scorecard-turbo-slot` CSS, QA fixtures, and `test:comeback` all describe a feature the shell is required to keep off. A future “just wire the script back up” patch reintroduces the bet Matt already rejected.
- **Two theme passes in one file.** `public/index.html` is 16,464 lines. A “COHESIVE MOCKUP PASS” starts at line 4399 and again at line 5400. The next thousand lines are not the same sheet (about 160 differing lines). Later rules win. A chip fix in the first pass can be overwritten by the second. That is why Michelle generated three PRs.
- **Dead Rook loop.** `submitRookRound` (around 11762) walks players against the target and does nothing. The real confirm runs after `recomputeGameTotals` a few lines later. Harmless, and a good sign the function has been patched in place too many times.
- **No CI on `main`.** No `.github/` workflows. PR #43 proposes `npm run check` plus a small laptop Playwright pack, and it correctly leaves the screenshot matrix local.
- **Naming.** Home-screen title Back Porch, manifest “Back Porch Games,” host `cardknight.vercel.app`, repo `gamenight`, old README CardKnight. Cloud sync only turns on for the CardKnight host (`canPorchCloud`).

### Wrong bets

- Rebuilding Turbos, or a “smarter” automatic extra, as the Grok upgrade. The porch chose the wheel.
- Treating Life Preserver neighbor feedback as a repo task. The Google Form was filled and not published. It is not in this codebase. Publish it outside the app.
- Merging PR #44 to “modernize” the porch. It is a night-theme preview and it says not to ship until Matt signs it. Scorecard name-fit math is easy to break with a font change.
- Adding AI bids or an opponent. Out of product.
- Splitting `index.html` before the worker, the invisible spin, and shared places are done.

### Open PRs

| PR | State | Do this |
| --- | --- | --- |
| [#35](https://github.com/mattwilliamsproduct/gamenight/pull/35) Hug Five Crowns name chips | Draft | Close. Superseded by #38 and #40. |
| [#37](https://github.com/mattwilliamsproduct/gamenight/pull/37) Life Preserver and scorebook honesty | Open | Do not merge. Rebase only if a hunk is still true: merge metadata, cloud revision, showing the spin. Wheel caps and name fit moved on in #38–#42. |
| [#22](https://github.com/mattwilliamsproduct/gamenight/pull/22) Records / extras / first toast | Draft | Do not merge. Steal only the Closest-to-66 removal, as a new patch. |
| [#43](https://github.com/mattwilliamsproduct/gamenight/pull/43) Functional tests and PR CI | Open | Rebase onto current `main` and land. |
| [#44](https://github.com/mattwilliamsproduct/gamenight/pull/44) Porch Club redesign | Open | Park until Matt signs the preview. |
| [#45](https://github.com/mattwilliamsproduct/gamenight/pull/45) Shared places | Draft | Cherry-pick shared places. Review the Life Preserver cell separately. Ask before changing “cannot tie for 1st.” |

## Next

Tickets for this week. Acceptance is the test, not a redesign.

### T1 — Ship the worker you think you ship

Edit `src/service-worker.js` so `APP_SHELL` lists `./assets/life-preserver-logic.js` and does not list `comeback-logic.js`. Run `npm run build`. Confirm generated `public/sw.js` matches. Extend `scripts/verify-production-assets.mjs` so `npm run check` fails when the template and the `index.html` script tags disagree.

Done when a fresh build precaches Life Preserver and the check fails if someone points the template back at Turbos.

### T2 — Close the Michelle draft

Comment on #35 that #38 and #40 landed the chip and the name fit, point at the dealer-geometry assertions in `tests/visual/app.visual.spec.mjs`, and close it. One iPad look at Five Crowns with Michelle dealing. No new CSS.

### T3 — Life Preserver mark on the card

After a spin, the last scoring cell shows the adjustment the way a human can add (Five Crowns `40 −30`, Wizard `0 +40`). Hidden columns leave a mark by Total. Undo removes the mark and restores the hold. Hand count, Player Pace, and WHAMMY still ignore the bonus round.

Done when a unit or Playwright check covers the cell text and `npm run test:life-preserver` stays green. Do not load `comeback-logic.js` to get there.

### T4 — Shared places

Live scorecard, history list, and profile rank use the same shared-place loop as `buildMatchPlacePath`. A Wizard fixture with two players on the same total shows the same place and skips the next number.

Done when that assertion exists and the Life Preserver “must stay behind 1st” cap is unchanged.

### T5 — Land functional CI

Rebase the #43 idea: `npm run check` plus the small laptop pack (Wizard mid-game length, Michelle fit, Actions menu, 818 +20, Beat the Heat at 66). Screenshot updates stay a local step, as `docs/release-checks.md` already says.

### T6 — One merge path

`dropMerge` and `mergePlayerRecords` call one helper. A merge moves scores, bids, actuals, `hailMaryUsed`, holds, roster, and retired flags. The live match is included when that name is in it.

Done when a node test merges a Wizard round that has bids and a Life Preserver bonus and both names collapse to the target.

### T7 — Drop Closest Finish To 66

Delete that record card and its calculator. Leave ice rounds, coolest/hottest, closest margin, lopsided, and longest match. New commit on current `main`. Do not reopen #22.

### Explicitly later

- Cloud revision token so a stale iPad cannot clobber a newer scorebook (the useful kernel of #37).
- Publish the Life Preserver neighbor form. Not a code change here.
- Porch Club theme only after a signed preview, with name-fit tests rerun.
- Rook WHAMMY only after team rounds are specified. The TODO at `detectRoundWhammy` is the right brake.

## What a weaker pass would have shipped

A pass that stopped at “PR #35 is open, Turbos have tests, Hail Mary is in the code” would have merged the Michelle draft, re-enabled `comeback-logic.js` because the tests import it, and treated the wheel as legacy. That undoes PR #34 and PR #42 and restarts the chip war #38 already ended.

A pass that trusted `public/sw.js` without running the build would have reported the PWA shell healthy. The build script is the bug.

A pass that called tied places and invisible Life Preserver points “polish” would have missed the two places the porch can see a total lie: the rank badge and the row that does not add up. The path replay already solved places. The total already includes the spin. The bug is that the live card does not use either fact.
