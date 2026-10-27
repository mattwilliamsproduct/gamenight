# Back Porch taste

Load this before a feature kickoff. Product rules stay in [product-spec.md](product-spec.md). Tech invariants stay in [tech-spec.md](tech-spec.md). This file is how the porch should look and how an agent judges ready. It is not a second spec.

Production host: https://cardknight.vercel.app. Home-screen name is Back Porch. Repo is `gamenight`. QA gallery is localhost-only (`npm run qa:gallery` at `http://127.0.0.1:4173/?gnqa=1`).

## Likes / kills ledger

Canonical list: [taste-ledger.md](taste-ledger.md). After every durable Matt correction, add one like or one kill bullet the same day in that file and in this section.

### Likes

- A real look at the changed screen before ready. Phone first, then iPad landscape and TV.
- A name stays whole (NAME-FIT). The number just entered and the running total are fully visible on a phone-width check.
- Specs plus prove-it. Open the gallery scenarios that exercise the slice.
- Small reversible slices that lock one invariant.
- Compound after a ship into `AGENTS.md` or `docs/solutions/`.
- Honest gap lists. Say what you did not look at.
- A blank score is a fast zero. Next can leave the cell empty. Submit stores that blank as 0. A stored null for someone who was not in the hand stays null. A suggestion stays labeled until it is confirmed.
- When a match is live, Resume is the single obvious primary. Starting another game says the table match is saved as incomplete.
- Scorecard names in one column share one size. Shrink the column for a long name. Do not grow Cat past Megan.
- Table leaves a live match without ending it. Resume brings back an unfinished entry draft.
- Save & End is an outlined secondary. An unfinished match confirms, and Cancel stays on the scorecard.
- Wheel wedges carry a readable signed number. A Help / No change / Setback legend under the wheel keeps the meaning without color.
- Home game art that is quiet and grown-up: one hero per game, cream/teal/coral, lots of negative space, no baked-in title text. A nav mark that stays a few flat shapes at 32px.
- One player per Home seat row, with drag and small up/down, so Tonight's Table spends its height on people.
- Home spacing options stay behind `?demo&home=a` / `?demo&home=b` until Matt picks. Default stays the current unstretched columns.

### Kills

- Calling ready without opening the real UI.
- Ready-to-test language without a filled [prove-it packet](prove-it-packet.md).
- Overlap, uneven gaps, truncated text, or clipped menus.
- A keypad covering a row, a name cut off, or Actions clipped by the match banner.
- Truncated player names, or a control that no longer hugs the glyphs it labels.
- Porch Club redesign work without Matt's visual sign-off.
- Loading Turbos, or a second rescue beside Life Preserver.
- Durable Matt feedback left only in chat.
- A positive 818 miss, or a round with no stored bid, counted as an exact bid. A Life Preserver flag that stays on after the last spin is undone.
- An unfinished history match still counting as a completed game.
- "Warm Porch Ledger" as a user-facing subtitle.
- A global Unassisted badge, or Shame copy that invents a card cause the book did not store.
- Phone nav wrapping onto a second line, or Saved taking a nav slot.
- Life Preserver header copy that says only the best help while the wheel still has negative slices.
- Saved covering Dealer copy, or a parked chip that stays hidden while `.show` is on.
- Phone nav that runs Table, Records, and Profiles to the edge and drops the settings gear.
- SELECTED PLAYER crowding the Scoring pill on phone entry.
- A porch password or cloud sync control in Settings this release.
- A Saved chip that does not say the write is on this device.
- A browser `alert()` for score-entry or Restore errors.
- Silently dropping retired seats from Records.
- Exact bid chrome on Rook or any game that does not bid.
- A Life Preserver wheel that paints helpful low-score slices red because they are negative.
- A settings gear on the scorecard match header, or phone History sitting outside Actions.
- A Life Preserver result that blanks the wheel, or "points on" for a higher-wins spin.
- A setback callout that clips the + so +10 reads as 10 or as help.
- A pointer knob sitting on the landed callout, or a short-laptop wheel so small that copy overlaps it.
- Six busy beach scenes that blur together, 818 numerals fighting the card title, or a muddy photo logo at nav size.
- Dead leftover height between Tonight's Table and Start a New Match on laptop Home, or empty padding inside those cards instead of seats and game art.
- Edit Seating plus Earlier/Later when the Home list can reorder in place.

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
- Kill: a keypad typing a score while the selected player is off-screen and unnamed.

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
