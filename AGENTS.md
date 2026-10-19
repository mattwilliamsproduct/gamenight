# AGENTS.md

## What this product is

Back Porch Games is the human scorekeeper for porch game night. People play the cards; the app tracks the table.
Shelf: Five Crowns, Wizard, 818, Flip 7, Beat the Heat, and Rook. Hand and Foot may be in flight on another PR.
Production host: https://cardknight.vercel.app (home-screen name is Back Porch; the repo is `gamenight`).

## Commands

Exact scripts from `package.json`:

- `npm install`
- `npm run build` — `build:styles`, then `build:vendor` (minified CSS, vendor copies, and `public/sw.js`)
- `npm run check` — `check:syntax`, `check:production-assets`, `test:comeback`, `test:life-preserver`, `test:backup`, then `git diff --check`
- `npm run qa:gallery` — serve `public/` for QA (`node scripts/serve-public.mjs`, localhost port 4173)
- `npm run test:visual` — Playwright
- `npm run test:visual:update` — `playwright test --update-snapshots`

Same checks alone: `npm run check:syntax`, `npm run check:production-assets`, `npm run test:comeback`, `npm run test:life-preserver`, `npm run test:backup`.

## Architecture

- Static scorekeeper. The app is mainly `public/index.html`, `public/assets/*`, and `api/sync.js`. `npm run build` writes CSS, vendor files, and `public/sw.js`. Vercel serves `public/` plus that function.
- Product bar: `docs/product-spec.md`
- Taste: `docs/taste.md`
- Taste ledger: `docs/taste-ledger.md`
- Goals and non-goals: `docs/goals-nongoals.md`
- Tech contract: `docs/tech-spec.md`
- Active rethink and findings: `docs/J-137-grok-4.7-rethink.md`
- Release gates: `docs/release-checks.md`
- Prove-it packet: `docs/prove-it-packet.md`
- Jev gates: `docs/jev-gates.md`

## Hard constraints

North star: crush requirements so one-shots get better every correction.

- Turbo stays unloaded unless Matt explicitly asks. Production must not load `comeback-logic.js`. `npm run check` still runs the Turbo unit tests so old `round.comeback` history stays defined.
- The worker that Vercel ships is `src/service-worker.js` copied over `public/sw.js` by `npm run build`. That template must precache the scripts the page loads (`life-preserver-logic.js`, `backup.js`) and must not list `comeback-logic.js`. `npm run check` fails if they disagree. Do not treat the committed `public/sw.js` as what production serves after a build.
- A cloud revision or sync redesign waits for a named ticket or PR intent. The current contract is one Redis blob with no revision check.
- Features stay inside the PR or slice intent. Canonical product and tech truth stays in `docs/`.
- Before a multi-step coding kickoff, load `docs/product-spec.md`, `docs/taste.md`, `docs/taste-ledger.md`, `docs/goals-nongoals.md`, this file, and `docs/solutions/` (including `docs/solutions/README.md`). Load the builder-taste-profile skill when it is available.
- Coding OS: on a feature request, do not wait for Matt to ask for a spec or a Notion card. Kick off, write or update product and tech spec stubs, create or update Matt HQ open actions, and compound durable feedback the same day. He is in the loop only for taste, kill, merge, and a short summarized spec review when the slice is non-trivial. Undraft or merge of an app or product PR still needs his explicit go.
- Roles: Matt owns ideas, taste, feedback, and validation. Agents own expert implementation on Back Porch. Periodically review this repo for bugs, tech debt, and performance. Fix obvious no-tradeoff items in draft PRs. Taste tradeoffs get a short note for Matt. App or product undraft and merge still need his explicit go.
- App and product PRs stay draft and sidelined until Matt says undraft or merge. Docs-only OS edits with no game behavior may merge.
- Never claim ready without prove-it evidence: `npm run check`, plus a gallery or UI look when the change is UI. Non-UI work needs backend-prove-it. Put the evidence in the PR.
- A filled prove-it packet is required before ready-to-test language. Copy `docs/prove-it-packet.md` into the PR and fill every field. An empty field blocks the post.
- A UI change names the gallery scenario it opened, or adds one, at `http://127.0.0.1:4173/?gnqa=1&scenario=<id>`. The id is a key in `QA_SCENARIOS` (`public/qa/fixtures.mjs`). Gallery scenarios are the UI prove-it surface.
- A scoring or sync change adds or extends a golden CLI test on `npm run check`. Extend `scripts/test-life-preserver.mjs`, `scripts/test-comeback.mjs`, or `scripts/test-backup.mjs`, or add `scripts/test-<slice>.mjs` and wire it into the `check` script. A gallery look does not replace that test.
- An Opus redesign plan includes density, NAME-FIT, kill criteria, and gallery ids in `docs/redesign-checklist.md` before Grok edits CSS.
- Goals and non-goals for Back Porch live in `docs/goals-nongoals.md`. The Notion skim copy is https://app.notion.com/p/3ed168f4c917810793f0fcd336e2fabc. Git stays the contract.
- After every durable Matt correction, add one like or one kill bullet the same day in `docs/taste-ledger.md` and in the ledger section of `docs/taste.md`.
- Gate B records the choice and the gnarliness. Gate C records Noul on the filled packet. Append every call to `docs/solutions/gate-log.md` using the columns in `docs/jev-gates.md` (`date`, `task id`, `choice`, `score`, `noul`, `provider`, `action`). Provider is `jev` or `fallback`. A classifier never undrafts or merges.
- Prefer the existing stack and patterns. Porch Club design PRs stay blocked without Matt's visual sign-off.
- Game-behavior merges wait for Matt's UI test while that overnight rule is standing.
- After any durable Matt correction, or a novel lesson from a ship, compound the same day into `docs/solutions/<short-slug>.md` and/or `docs/taste.md` and/or `docs/taste-ledger.md` and/or one bullet in this section. Never leave durable feedback only in chat.

## Verification

Done when the evidence is in the PR before handoff (verify-before-done).

- Run `npm run check` before calling the change ready.
- For UI changes, also run `npm run qa:gallery` and open the relevant scenarios at `http://127.0.0.1:4173/?gnqa=1&scenario=<id>`. The gallery starts only on localhost and does not save fixture data. When the slice touches places or Life Preserver, open the scenarios that exercise them (for example `postgame-race` and `eight18-porch-lp`). Name those gallery ids in the prove-it packet. Add a scenario when none covers the slice.
- When snapshots apply, run `npm run test:visual`. After an intentional visual change, run `npm run test:visual:update`, inspect the baselines, then rerun `npm run test:visual`.
- Put a filled `docs/prove-it-packet.md` in the PR before handoff. That packet is where the commands, the gallery ids, the backend cases, and the gap list go.

## Pointers

- Product spec: `docs/product-spec.md`
- Taste: `docs/taste.md`
- Taste ledger: `docs/taste-ledger.md`
- Goals and non-goals: `docs/goals-nongoals.md` (Notion skim: https://app.notion.com/p/3ed168f4c917810793f0fcd336e2fabc)
- Tech spec: `docs/tech-spec.md`
- J-137 rethink: `docs/J-137-grok-4.7-rethink.md`
- Release checks: `docs/release-checks.md`
- Prove-it packet: `docs/prove-it-packet.md`
- Jev gates: `docs/jev-gates.md`
- Gate log: `docs/solutions/gate-log.md`
- Redesign checklist: `docs/redesign-checklist.md`
- README: `README.md`
- Solution notes: `docs/solutions/README.md`
