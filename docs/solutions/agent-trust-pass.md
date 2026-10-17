# Agent trust pass

Plan only. No app behavior. Matt decides on undraft or merge of this docs PR, and on merge of draft PR #43.

Goal: shift trust in agent work from written rules toward mechanical enforcement. Inspired by poteto ([the ladder](https://x.com/poteto/status/2111133080526495985)): every time you correct an agent, eliminate the mistake. In order of value:

1. Architecture or data structures that make the mistake unrepresentable.
2. A lint, test, or CI gate that fails the PR.
3. A written rule (`AGENTS.md`, `docs/solutions`).
4. A human catching it in review (last).

pstack names for the same idea: [encode-lessons-in-structure](https://www.skills.sh/poteto/plugins/principle-encode-lessons-in-structure), [prove-it-works](https://github.com/backnotprop/pstack/blob/main/skills/principle-prove-it-works/SKILL.md), [create-verification-skill](https://github.com/backnotprop/pstack/blob/main/skills/create-verification-skill/SKILL.md).

This repo already compounds into markdown (`AGENTS.md` Hard constraints, `docs/solutions/*`, the prove-it packet). That is rung 3. The repeated mistakes below show rung 3 is not holding.

## Step 0 — PR #43 is the CI floor

[Draft PR #43](https://github.com/mattwilliamsproduct/gamenight/pull/43) (`cursor/functional-qa-ci-2963`, tip `5db470a`) adds:

- `.github/workflows/pr-check.yml` — `npm ci`, `npm run check`, Playwright Chromium, `npm run test:functional`. Timeout 15 minutes. Runs on every PR and on push to `main`.
- `playwright.functional.config.mjs` — laptop Chromium 1440×900 only. No screenshot matrix.
- Five functional specs that already exist as visual tests on `main`, extracted so CI can run them without baselines:
  - Wizard 6→7 shortens 10 rounds to 8; a late join does not cut the current round; Five Crowns stays 11 (`tests/visual/midgame-rounds.spec.mjs` today).
  - Michelle’s name fits on Five Crowns and late Wizard (`#38` `54eb926`, `#40` `6446a23`).
  - Actions opens under the button and is not clipped (`#39` `33ad7c3`).
  - Porch 818 Life Preserver offers Cat +20, not a path to 1st (`#42` `7c24d2c`).
  - Beat the Heat stays open below 66 and shows Match Complete at 66+ (`#14`).

`main` still has no `.github/` workflows. `npm run check` is local-only. J-137 T5 already said: land #43, keep screenshot baselines local.

**Disposition.** Matt decides on merge. This plan does not rebase, undraft, or pile onto #43. If #43 is stale against current `main` (`1d355a6`, T1 worker check already landed), the rebase is small: `package.json` on `main` does not yet have `test:functional`. Watch the conflict with #49 (`test:scorebook`) and #62 (`test:record-chase`) if those land first — they all extend `check`.

Until #43 lands, every guard below that says “CI” is a local script plus a hoped-for workflow. After it lands, new `npm run test:*` scripts get a free ride if they are wired into `check`.

## What is already mechanical on `main`

| Guard | What it catches | What it misses |
| --- | --- | --- |
| `check:syntax` | Parse errors in inline `index.html` scripts, LP, backup, `api/sync.js` | Scoring math, DOM, CSS |
| `check:production-assets` | CDN leaks, missing files, Turbo script tag, LP/backup tags, worker `APP_SHELL` vs page vs template (T1, `#57` `1d355a6`) | `CACHE_NAME` placeholder, cache prefix, committed `public/sw.js` treated as prod |
| `test:life-preserver` | Eligibility, 818 +20 cap, holds, undo, copy | Paint on the card, records treating a spin as a hand, merge bookkeeping |
| `test:comeback` | Old `round.comeback` math | Production must not load this file; the test staying green does not mean Turbos are back |
| `test:backup` | Export, v1 import, cloud merge keeps a live local match | File import replacing tonight, profile-only pull drop, hide-flush, revision |
| `git diff --check` | Whitespace conflict markers | Everything else |
| Playwright visual (`tests/visual/*`) | NAME-FIT, Actions, LP wheel, Pace, path replay — local only | Not on CI. Comeback UI specs still assert an unloaded feature (`tests/visual/comeback-ui.spec.mjs`) |
| Gallery fixtures (`public/qa/fixtures.mjs`) | A localhost surface an agent can open | Opening is a written rule. Fixtures do not persist (`serve-public.mjs`) |

Written rules that exist because the table above is thin: almost every Hard constraint in `AGENTS.md` after the Turbo / worker bullets.

## Recurring mistakes

Mined from `git log`, open and merged PRs, Matt’s close notes, and J-137. Human review comments on this repo are mostly Vercel bots plus Matt’s overnight holds. The signal is the same bug coming back as a new draft.

### M1 — Edit the built worker, ship the template

**What happens.** An agent fixes `public/sw.js` (or bumps `CACHE_NAME` there) and leaves `src/service-worker.js` on the Turbo shell. Vercel `buildCommand` is `npm run build`, which copies the template over the committed worker (`scripts/copy-vendor-assets.mjs` 54–56). After the #53 docs merge, production `cardknight.vercel.app/sw.js` shipped `back-porch-shell-c7740f8…` with `comeback-logic.js` and no Life Preserver.

**Citations.** J-137 T1; `#57` `1d355a6` / `664dc90`; `docs/solutions/worker-template-matches-page.md`; #49 bundled the same fix with game behavior and so could not ship it; #53 `c7740f8` is the docs merge that deployed the bad template.

**Also the cache-name half.** Template is `back-porch-shell-__BACK_PORCH_RELEASE__`. Build substitutes `VERCEL_GIT_COMMIT_SHA` / `GITHUB_SHA` / `local-${Date.now()}`. Activate deletes keys that start with `back-porch-shell-`. Agents still commit `public/sw.js` with a hand timestamp (`back-porch-shell-prod-1786902600001` on current `main`). T1’s check compares `APP_SHELL` lists and ignores `CACHE_NAME`. A template that loses the placeholder shares one cache forever; a prefix change leaves old iPad caches in place.

**Current written rule.** “Do not treat the committed `public/sw.js` as what production serves.” “The template must precache the scripts the page loads.”

**Strongest guard.**

- Already on `main` (rung 2): `APP_SHELL` must match the page and must not list Turbo.
- Still missing (rung 2, small): `verify-production-assets.mjs` fails unless the template `CACHE_NAME` contains `__BACK_PORCH_RELEASE__`, the prefix stays `back-porch-shell-`, and activate still filters that prefix. Do not require the committed `public/sw.js` name to match — the next build will rewrite it.
- Do not invent a second worker file. T1 already picked the structure: one template.

**Written rule that becomes redundant.** The “do not edit only `public/sw.js`” paragraph. Keep one sentence in `worker-template-matches-page.md` pointing at the check.

### M2 — Score formulas and merges copied in `index.html`

**What happens.** Each call site lists the keys it remembered that week. Wizard points are inlined at submit (`public/index.html` ~14671). 818 has `calculate818Score`. Rook math lives only in `submitRookRound`, which on `main` still `saveData`s before `recomputeGameTotals`. Three name paths: unique rename moves LP fields; `mergePlayerRecords` keeps bids but drops `hailMaryUsed` / holds / the live match; bench `dropMerge` drops bids and actuals. `EIGHT18_ROUND_TRICKS` is declared in `index.html`, `life-preserver-logic.js`, and `comeback-logic.js`. Wizard `floor(60 / n)` is copied in LP `getMaxRounds` and `snapshotGameMaxRounds`.

**Citations.** J-137 ROW-ADDS / Wrong abstractions; #16 `2425cc0` (apostrophe names, Wizard length, join); #41 `a114585` (mid-game Wizard resync); #42 `b53a853` / `3ac9ee8` / `90790ca` (818 rescue retargeted three times); #49 extracts `public/assets/scorebook.js` + `scripts/test-scorebook.mjs` (places, LP paint helper, one merge); #55 adds `calculateWizardScore` + `scripts/test-bid-trick-score.mjs` and fixes Rook save order.

**Current written rule.** “A scoring or sync change adds or extends a golden CLI test.” “`index.html` does not grow a second copy of a formula that already has a function.”

**Strongest guard.**

- Rung 1, already in flight on #49: one `scorebook.js` for place, “is this a hand?”, name apply, and LP-following-hand. Page paints and calls. Do not start a third module on a new branch.
- Rung 1, leftover after #49: `calculateWizardScore` / Rook made-set / `EIGHT18_ROUND_TRICKS` live in one module. `index.html` reading a local copy fails a check that greps for a second `20 + 10` or a second tricks ladder.
- Rung 2: `scripts/test-scorebook.mjs` (or `test-bid-trick-score.mjs` from #55) wired into `check`. Cases that already exist on #49: shared places including `"140"` vs `140`; merge keeps bids + LP; unique rename; zero spin paints nothing. Add Wizard exact/miss and Rook made/set goldens so the inlined submit cannot drift.
- Do not lock current `main` bugs as the golden. If the test lands before #49, it fails on purpose, or it waits for #49.

**Written rule that becomes redundant.** “Add a golden CLI test when you touch scoring” — the module’s test file is the golden, and `check` runs it. Keep the product formulas in `docs/tech-spec.md`.

### M3 — UI regressions the gallery already knew how to show

**What happens.** Names overflow, the dealer chip does not hug, Actions is clipped by the match banner, the LP wheel overflows on iPad, score pills clip, View Pace expected the wrong number of laptop rounds. Agents call ready without opening `?gnqa=1`. A leftover draft (#35) stayed open after #38 / #40 had already shipped NAME-FIT. Comeback visual specs still describe Turbo chips.

**Citations.** #38 `54eb926`; #39 `33ad7c3` / `9cb9f34`; #40 `6446a23`; #36 `fe23ece`; #30 `f9d344d`; #52 `8415674` / `2677a6f` (View Pace harness left at 2 rounds; the other copy already expected 5); Matt close on #35; taste kills for keypad / NAME-FIT / ready-without-a-look.

**Current written rule.** Open the gallery. Phone 390 then laptop. Fill the prove-it packet. Visual snapshots when they apply.

**Strongest guard.**

- Rung 2, already written: #43’s functional pack for Michelle, Actions, 818 +20, Beat the Heat 66. That is the CI stand-in for “I opened the gallery.”
- Rung 2, after #49: move `shared-place` and `life-preserver-visible` from #49’s visual specs into `test:functional` (the #43 body already says this).
- Rung 2, cheap: a `check` script that fails a UI PR (diff touches `public/index.html` CSS / `public/qa/fixtures.mjs`) when `tests/functional` and the gallery ids in the PR body are both empty. Do not require a screenshot upload.
- Rung 4 stays for taste: density, NAME-FIT on a new theme, Porch Club (#44). Matt’s visual sign-off is not a test.

**Do not** put `npm run test:visual` on CI. Three viewports × snapshot baselines. #43 and J-137 T5 already chose local. #52 shows the harness can drift; that is a reason to keep the logic asserts in functional tests, not a reason to run the matrix on every PR.

**Written rule that becomes redundant.** “A UI change names the gallery scenario” for the five #43 surfaces. Keep it for new surfaces, and keep “phone look” as taste until a phone-width functional project exists.

### M4 — Per-row history walks inside render

**What happens.** `renderRecordChasePanel` calls `getRecordChaseMetric` per player. Each call runs `getRecordChaseHistory`, which filters all of `gn_history` (`public/index.html` 13569–13605). Eight players → eight full walks on every scorecard paint. `computeHeadToHead` is the same pattern on profiles. Agents add a Best / Avg / Worst cell as if it were a label.

**Citations.** J-137 Hot path / T6; #24 `9298e78` (Pace shrunk to Best/Avg/Worst, which made the query look cheap); #52 (Pace column count); #62 `08e3898` (once-scan + `scripts/test-record-chase.mjs`).

**Current written rule.** Tech spec Hot path: “not scanning every past match once per player inside the scorecard paint.”

**Strongest guard.**

- Rung 1, already in flight on #62: `indexRecordChaseHistory` walks once; the panel looks up. Same numbers.
- Rung 2: the #62 golden (`once-scan === legacy`, LP and `joinBonus` excluded). Wire into `check` when #62 lands.
- Rung 2, small, after #62: a check that `getRecordChaseHistory(` does not appear inside `renderGame` / `renderRecordChasePanel`. New per-player walks have to go through the index.

**Written rule that becomes redundant.** The Hot path “do not scan history per player” sentence, once the index is the only caller.

### M5 — Ready language without prove-it

**What happens.** Agents write “ready to test” with an empty packet, skip the gallery, skip `npm run check`, or leave Matt feedback only in chat. Coding OS then added more markdown: #50 `AGENTS.md`, #51 taste, #53 north star, #58 packet / gates / ledger. The packet is a template. Filling it is still cooperation.

**Citations.** `docs/solutions/feedback-compounding.md`; #58 `9f4a029`; #62’s own packet honestly says Phone/Laptop `N` and “did not open qa:gallery”; Matt close on #56 (do not land a second gates essay).

**Current written rule.** Every Hard constraint about prove-it, packets, compounding, and undraft.

**Strongest guard.**

- Rung 2: #43 already fails the PR if `check` is red. That is the command half.
- Rung 2: a `scripts/check-prove-it-packet.mjs` (or a workflow step) that reads the PR body. If the body contains `ready to test` / `ready for Matt` / `Ready to merge`, every packet field must be present and non-empty. Docs-only may write `none` / `N`. Empty field → fail. This encodes “an empty field blocks the post.”
- Rung 2, optional: if the diff touches `public/assets/life-preserver-logic.js`, `public/assets/backup.js`, or a scoring helper, the diff must also touch `scripts/test-*.mjs`. Same idea as “scoring change adds a golden.”
- Rung 4 stays: Matt’s morning click, undraft, merge. A classifier never does those (`docs/jev-gates.md`). Do not try to encode taste.

**Written rule that becomes redundant.** “Empty field blocks the post” and “`npm run check` before ready,” once CI runs both. Keep “Matt says undraft or merge.”

### M6 — Turbo vocabulary on the live path

**What happens.** #18 replaced the wheel with Comeback. #34 (`66fccd5`) brought the wheel back and unloaded `comeback-logic.js`. The page still stubs `applyComebackAndNotify`, still emits `scorecard-turbo-slot`, still has Comeback visual specs and Comeback lines in `docs/release-checks.md`. J-137: the next “just show the extra” patch wires the stub back up.

**Citations.** #18 `3485b79`; #34 `66fccd5`; #55 `01e4d97` (“Stop live visual tests from calling the unloaded Turbo engine”); `verify-production-assets.mjs` 39–41 already forbids the script tag.

**Strongest guard.**

- Already (rung 2): script tag + worker `APP_SHELL` must not list `comeback-logic.js`.
- Rung 2: `test:comeback` stays for old history. Mark Comeback *UI* specs `test.skip` unless a query flag loads Turbo (Matt has not asked). #55 started this.
- Do not delete `comeback-logic.js`. Old `round.comeback` rows still add in `recomputeGameTotals`.

**Written rule that becomes redundant.** “Production must not load `comeback-logic.js`” — the check already says that. Keep “Turbo stays unloaded unless Matt explicitly asks.”

### M7 — Wide PRs, second specs, leftover drafts

**What happens.** #37 tried LP honesty + cloud + PWA in one dirty branch. #46 shipped a second product spec. #49 bundled T1–T4, so the worker fix waited on a morning click. #35 stayed open after the chip was on `main`. Parallel agents edit `index.html` (#48, #49, #55, #62).

**Citations.** Matt comments on #22, #35, #37, #44, #45, #46, #56; J-137 “Do not merge the open PR pile”; goals kill: “A second Cloud Agent thread works the same app PR without an explicit owner switch.”

**Strongest guard.**

- Rung 2, soft: PR body template (this repo has none) with slice id, non-goals, and “do not pile onto #N.” A template is still text. It helps agents start from a shape.
- Rung 1 is the real fix for `index.html` collisions: extract `scorebook.js` / record-chase index so two slices do not both rewrite the 16,464-line file for a helper.
- Rung 4 stays: one owner per app PR; Matt closes leftovers.

**Do not** add another process essay. #56 was closed as a narrower Jev draft after #58 landed.

### M8 — Cloud last-write-wins (later)

**What happens.** One Redis key, no revision. Pull drops profile-only updates. File import can replace tonight. Hide flushes local storage and not the 2.5s cloud timer. Match ids are `Date.now()`.

**Citations.** #33 `39e4c87`; #37 (too wide; Matt hold); J-137 PORCH-MEMORY and J-138 Sol notes; `scripts/test-backup.mjs` covers only “cloud merge keeps a live local match.”

**Strongest guard, when a named ticket exists.** Tech spec already says the redesign waits. When it starts: revision on the blob (rung 1), then goldens in `test-backup.mjs` for profile-only pull, import confirm, hide-flush (rung 2). Do not start that in this pass.

## Ranked proposals

Effort is a size, not a calendar. **Mistakes** is how often this class has already shipped or nearly shipped.

| Rank | Guard | Rung | Size | Mistakes | Depends on |
| --- | --- | --- | --- | --- | --- |
| 0 | Merge #43 as-is (or rebase onto `1d355a6`, then merge) | 2 | Already written. Rebase is a `package.json` conflict watch. | Every local-only `check` miss; NAME-FIT / Actions / 818 +20 / BTH / Wizard length regressions | Matt |
| 1 | `CACHE_NAME` placeholder + prefix in `verify-production-assets.mjs` | 2 | ~20 lines in a file T1 already owns | M1 cache-name / stale PWA half | None. Docs-adjacent; no game behavior |
| 2 | Land #49’s `scorebook.js` + `test-scorebook.mjs` (not a rewrite) | 1 then 2 | Already drafted. Game behavior. Morning click. | M2 places, merge, LP-as-hand-count; M7 `index.html` collisions | Matt UI test |
| 3 | Wizard / Rook / 818 goldens in `check` | 2 | One `scripts/test-scorebook.mjs` or extend #55’s bid-trick file | Inlined Wizard `20+10`, Rook save-before-recompute | Prefer after #49 / #55 so goldens match the helper |
| 4 | Project verification check + skill (below) | 2 | One functional “porch night” spec + `.cursor/skills/verify-back-porch/` | M3 / M5 “I didn’t drive the app” | #43 for CI; skill can land docs-only |
| 5 | Prove-it body lint when ready-language is used | 2 | One small script + a workflow step that reads the PR body | M5 empty packets | #43 workflow, or a sibling job |
| 6 | After #49: `shared-place` + `life-preserver-visible` into `test:functional` | 2 | Move two specs #49 already wrote | M2 / M3 paint and ties | #43 + #49 |
| 7 | Land #62 once-scan + `test-record-chase.mjs`; ban per-row walks in render | 1 then 2 | Already drafted | M4 | Matt on #62 |
| 8 | Skip Comeback UI specs unless Turbo is loaded | 2 | `test.skip` / query flag | M6 wiring the stub | Fits on #55; do not open a third Turbo PR |
| 9 | Scoring-file diff must touch `scripts/test-*.mjs` | 2 | ~30-line check | M2 / M5 “forgot the golden” | After #43 so CI runs it |
| 10 | PR body template (slice, non-goals, packet) | 3 | New `.github/PULL_REQUEST_TEMPLATE.md` | M7 shape; still text | None |

**Do not do in this pass.** Visual snapshot CI. Cloud revision. Splitting `index.html` as a project. A second product spec. Buying Jev. Undraft or merge of any app PR.

## Project verification check

pstack’s `/create-verification-skill` is the generator. This section is the Back Porch instance, so the next agent does not invent a second harness.

### What it is

Two pieces, one proof:

1. **`npm run test:porch-night`** — one Playwright functional file, laptop Chromium 1440×900, same server as the gallery (`node scripts/serve-public.mjs`, `http://127.0.0.1:4173`). Wired into `check` after #43, or into `test:functional` as the last spec.
2. **`.cursor/skills/verify-back-porch/`** — agent-facing Launch / Doctor / Drive / Evidence / Cleanup plus a feature map. Generated, then proved once (launch, doctor, drive one feature, keep the evidence). No app code.

The skill tells an agent how to drive. The npm script is what CI and `check` believe.

### What it runs

A single night, not the snapshot matrix. Each step uses a real `QA_SCENARIOS` id and the same `?gnqa=1` hydrate the gallery already uses. Gallery stays localhost-only and does not write fixtures into the porch book.

| Step | Scenario | Prove |
| --- | --- | --- |
| 1 | `home-party` | Home renders. Six seated names visible. |
| 2 | `wizard-scoring-8` | Bid pills visible. Totals equal `sum(round.scores)` for a named player (ROW-ADDS). |
| 3 | `five-crowns-name-fit-7` | “Michelle” has no ellipsis and stays inside `.scorecard-player-name` (NAME-FIT). |
| 4 | `eight18-porch-lp` | Cat’s wheel why-line contains `+20`. Max slice is 20. Duke is not eligible. No Turbo chip. |
| 5 | `beat-the-heat-close` then `beat-the-heat-over` | Close stays a live card. Over shows Match Complete. |
| 6 | `postgame-race` | Path replay mounts. After #49, also assert shared places `4, 4, 6, 6` on the live card / history for the tied-Wizard fixture. Until then, do not assert the broken row-index places. |
| 7 | Refresh after step 2 | `localStorage.gn_current` still parses to the same game name and roster (PORCH-MEMORY, one device). |

Do not call production Redis. Do not load `comeback-logic.js`. Do not write gallery data.

### How long

- Local, deps already installed: about 45–90 seconds.
- CI (after #43’s `playwright install --with-deps chromium`): about 2–4 minutes on top of `npm run check`. Keep the job under the existing 15-minute timeout.
- Full `npm run test:visual` (iPad WebKit + laptop + 1080p, snapshots): 10+ minutes, local only. Not this check.

### How it fails

Named `expect` on the row above, plus Playwright’s failure screenshot under `test-results/functional`. The job prints the scenario id. A timeout means the gallery did not set `document.body.dataset.gnQaReady`. A ROW-ADDS failure prints expected vs actual totals. A NAME-FIT failure prints the computed style / bounding boxes, not a screenshot diff.

If the check cannot start the gallery (port 4173 busy, `serve-public.mjs` missing), it fails in setup. It does not skip.

### What this does not prove

Phone 390, iPad landscape WebKit, TV 1080p, two-iPad cloud, file import confirm, Porch Club, Hand and Foot (#48), taste. Those stay Matt or a later named slice.

## Written rules that shrink

Once the matching guard is on `main` and in CI, delete or shrink the Hard constraint. The instruction is the symptom.

| Today’s text | After |
| --- | --- |
| Run `npm run check` before ready | CI on #43. Packet lint if they still typed “ready.” |
| Scoring change adds a golden CLI test | `scorebook` / bid-trick tests + optional scoring-file-diff check |
| UI change names a gallery id | Functional pack covers the five #43 ids; new surfaces still name one |
| Do not edit only `public/sw.js` | `APP_SHELL` + `CACHE_NAME` checks |
| Production must not load Turbo | Already a check; keep the “unless Matt asks” exception |
| Do not scan history per player | #62 index + render lint |
| Empty packet field blocks the post | Body lint |
| App PRs stay draft until Matt | Stays written. Not a test. |
| Compound into `docs/solutions` the same day | Stays written. Judgment. |
| Porch Club waits for visual sign-off | Stays written. Taste. |

Do not add new Hard constraints for any row in the ranked table. If a slice lands a guard, the follow-up is subtraction from `AGENTS.md`, not another bullet.

## Suggested slice order (after Matt’s #43 call)

Docs or check-only, no game behavior:

1. This plan (this PR).
2. `CACHE_NAME` check (tiny follow-up, same T1 file).
3. `.cursor/skills/verify-back-porch/` generated and proved. Still no game JS.
4. `test:porch-night` on a branch that already has #43, or as a follow-up commit on #43 if Matt wants it in the same CI PR.
5. Prove-it body lint as a workflow step beside #43.

Game behavior, already drafted, Matt’s morning click:

6. #49 scorebook (T2–T4). Then move place + LP-visible into `test:functional`.
7. #62 once-scan (T6).
8. #55 honesty / Wizard helper / Turbo test skip, if still needed after #49.
9. #61 Closest-to-66 (T7). Not a trust-pass item; listed so it is not forgotten.

## Out of scope

- Changing `public/`, `api/`, `src/`, or `scripts/` in this PR.
- Undraft or merge of #43, #49, #55, #61, #62, or this PR.
- Replacing `docs/product-spec.md` or `docs/tech-spec.md`.
- A cloud revision.
- Hand and Foot (#48) or Porch Club (#44).
