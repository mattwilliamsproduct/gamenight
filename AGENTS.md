# AGENTS.md

## What this product is

Back Porch Games is the human scorekeeper for porch game night. People play the cards; the app tracks the table.
Shelf: Five Crowns, Wizard, 818, Flip 7, Beat the Heat, and Rook. Hand and Foot may be in flight on another PR.
Production host: https://cardknight.vercel.app (home-screen name is Back Porch; the repo is `gamenight`).

## Commands

Exact scripts from `package.json`:

- `npm install`
- `npm run build` — `build:styles`, then `build:vendor` (minified CSS, vendor copies, and `public/sw.js`)
- `npm run check` — `check:syntax`, `check:production-assets`, `test:comeback`, `test:life-preserver`, `test:backup`, `test:hand-foot`, then `git diff --check`
- `npm run qa:gallery` — serve `public/` for QA (`node scripts/serve-public.mjs`, localhost port 4173)
- `npm run test:visual` — Playwright
- `npm run test:visual:update` — `playwright test --update-snapshots`

Same checks alone: `npm run check:syntax`, `npm run check:production-assets`, `npm run test:comeback`, `npm run test:life-preserver`, `npm run test:backup`, `npm run test:hand-foot`.

## Architecture

- Static scorekeeper. The app is mainly `public/index.html`, `public/assets/*`, and `api/sync.js`. `npm run build` writes CSS, vendor files, and `public/sw.js`. Vercel serves `public/` plus that function.
- Product bar: `docs/product-spec.md`
- Tech contract: `docs/tech-spec.md`
- Active rethink and findings: `docs/J-137-grok-4.7-rethink.md`
- Release gates: `docs/release-checks.md`

## Hard constraints

- Turbo stays unloaded unless Matt explicitly asks. Production must not load `comeback-logic.js`. `npm run check` still runs the Turbo unit tests so old `round.comeback` history stays defined.
- A cloud revision or sync redesign waits for a named ticket or PR intent. The current contract is one Redis blob with no revision check.
- Features stay inside the PR or slice intent. Canonical product and tech truth stays in `docs/`.
- Prove the change in the real UI (`npm run qa:gallery` scenarios) before calling it ready.
- Prefer the existing stack and patterns. Porch Club design PRs stay blocked without Matt's visual sign-off.
- Game-behavior merges wait for Matt's UI test while that overnight rule is standing.
- Compound after a ship: when you learn something novel, write `docs/solutions/<short-slug>.md` and/or one bullet in this section. The learning does not stay only in chat.
- Hand and Foot on a phone keeps the keypad above the footer. A 390px-wide scorecard keeps all four round columns, and never hides the last one. A side is recorded once, on its side key.

## Verification

Done when the evidence is in the PR before handoff (verify-before-done).

- Run `npm run check` before calling the change ready.
- For UI changes, also run `npm run qa:gallery` and open the relevant scenarios at `http://127.0.0.1:4173/?gnqa=1`. The gallery starts only on localhost and does not save fixture data. When the slice touches places or Life Preserver, open those scenarios (for example Wizard Tied Places and Wizard Life Preserver On The Card).
- When snapshots apply, run `npm run test:visual`. After an intentional visual change, run `npm run test:visual:update`, inspect the baselines, then rerun `npm run test:visual`.
- Put the commands, the scenarios you opened, and the result in the PR before handoff.

## Pointers

- Product spec: `docs/product-spec.md`
- Tech spec: `docs/tech-spec.md`
- J-137 rethink: `docs/J-137-grok-4.7-rethink.md`
- Release checks: `docs/release-checks.md`
- README: `README.md`
- Solution notes: `docs/solutions/README.md`
