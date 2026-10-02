# Back Porch taste

Load this before a feature kickoff. Product rules stay in [product-spec.md](product-spec.md). Tech invariants stay in [tech-spec.md](tech-spec.md). This file is how the porch should look and how an agent judges ready. It is not a second spec.

Production host: https://cardknight.vercel.app. Home-screen name is Back Porch. Repo is `gamenight`. QA gallery is localhost-only (`npm run qa:gallery` at `http://127.0.0.1:4173/?gnqa=1`).

## Prefer

- A real look at the changed screen before ready. Phone first, then iPad landscape and TV.
- Clean hierarchy: what just happened, the totals, the next action.
- Readable labels. A name stays whole (NAME-FIT). The number just entered and the running total are fully visible on a phone-width check.
- Specs plus prove-it. Open the gallery scenarios that exercise the slice.
- Small reversible slices that lock one invariant.
- Compound after a ship into `AGENTS.md` or `docs/solutions/`.
- Honest gap lists. Say what you did not look at.

## Avoid

- Calling ready without opening the real UI.
- AI-slop layout: overlap, uneven gaps, truncated text, clipped menus.
- Scope creep, or a second product/tech essay that competes with the canonical docs.
- Cheerleading. Write kill criteria instead.
- Porch Club redesign work without Matt's visual sign-off.
- Loading Turbos, or inventing a second rescue beside Life Preserver.

## Mobile

- Prefer: a phone pass first (labels readable, nothing clipped). Scoring still happens on iPad landscape or the TV.
- Avoid: treating portrait as the scorecard. Portrait is a podium. Rotate back for the card.
- Kill: keypad covering a row, a name cut off, Actions clipped by the match banner.

## Density / typography

- Prefer: one obvious reading order. The dealer chip hugs the letters. Totals and the last entered number stay readable at the iPad, laptop, and 1080p fixtures.
- Avoid: shrinking type until a name or score is a hint. Fitting may shrink. It may not ellipsize.
- Kill: truncated player names, or a control that no longer hugs the glyphs it labels.

## Motion

- No standing motion system in this file.
- Prefer: if the wheel or a total update already moves, the number that changed stays readable through the motion.
- Avoid: new decorative motion that delays the next score.

## Copy voice

- Prefer: porch-table English. People play. The app keeps score. UI says Life Preserver. The spin is not a hand.
- Avoid: a second Hail Mary feature. That string is the save format, not a button.
- Avoid: Flip 7 Vengeance on the shelf. The shelf says Flip 7.

## Empty / error / loading

- Prefer: a failed write is visible. The save indicator means the local write finished, not that the other iPad has it.
- Prefer: file import asks before replacing tonight's live match.
- Avoid: gallery fixtures that save into the porch book. `npm run qa:gallery` starts only on localhost and does not persist fixture data.

## Ship bar notes

- App changes need visual plus backend prove-it: `npm run check`, the gallery scenarios you opened, and `npm run test:visual` when snapshots apply. Put that evidence in the PR.
- Game-behavior merges wait for Matt's morning click while that overnight rule is standing.
- Docs-only OS (taste, AGENTS.md pointers, spec edits with no game behavior) may merge without that click.
- Showcase bar: a stranger with an empty book is a first-class user. See [porch-resume-showcase-bar.md](porch-resume-showcase-bar.md) for the first-click path, the kill list, and the slice order.
