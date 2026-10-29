# Back Porch taste

Load this before a feature kickoff. Product rules stay in [product-spec.md](product-spec.md). Tech invariants stay in [tech-spec.md](tech-spec.md). This file is how the porch should look and how an agent judges ready. It is not a second spec.

Production host: https://cardknight.vercel.app. Home-screen name is Back Porch. Repo is `gamenight`. QA gallery is localhost-only (`npm run qa:gallery` at `http://127.0.0.1:4173/?gnqa=1`).

## Likes / kills ledger

Canonical list: [taste-ledger.md](taste-ledger.md). After every durable Matt correction, add one like or one kill bullet the same day in that file and in this section.

### Likes

- Matt's 12:23 PM ET go to preview Canasta (Hand and Foot) on the RC1 picker, with house rules in one `CANASTA_RULES` object and Rook hidden unless `?demo&games=rook`.
- Full two-line Canasta team names (`Megan &` / `Matt`) with no ellipsis, and the dusk Canasta tile used in both art sets until Matt picks a beach tile.
- Add Player, Save & End, Audit, and the LP picker use the form modal token (`clamp(46rem, 62vw, 58rem)`), 18px inputs, and 56px suggestion rows.
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
- A Life Preserver wheel that reads like roulette: labels live inside every slice, and rare outcomes get several small segments instead of one sliver.
- A Life Preserver modal that uses the leftover viewport so the wheel and slice numbers can get big. Use Your One Spin stays on screen.
- A Life Preserver that reads as a roulette bowl: narrow pockets, numbered rim, frets, turret, and a ball that settles.
- A cute cream/teal toy roulette: equal-ish pockets that stay accurate-ish, a chunky numbered ring, and a ball that lands on the locked amount.
- Scorecard places read as 1st, 2nd, 3rd in a real pill, not a faint 24px number.
- Modals use most of the viewport from one shared size system. Scorecards go wide. Phone sheets stay reachable.
- Home game art that is quiet and grown-up: one hero per game, cream/teal/coral, lots of negative space, no baked-in title text. A nav mark that stays a few flat shapes at 32px.
- One player per Home seat row, with drag and small up/down, so Tonight's Table spends its height on people.
- Tonight's Table fills the left Home column down to Start a New Match. Extra height goes into seat cards, not padding.
- Recent nights carry a small place podium from the same ranking helper as Records, not a second story.
- Canasta dusk is a cream heart stack and a teal back (hand and foot), sheet-only until Matt puts it on the shelf.
- A leftover Standings updated toast leaves when the screen changes. Records is not a second scorecard toast.
- One saved night reads `1 night`.
- The dealer chip hugs the letters and stays a dealer mark, not a selected state. The candy-stripe 4th is Life Preserver available.
- `?demo` does nothing on the shipped app. Sample fixtures stay in Playwright.

### Kills

- Calling ready without opening the real UI.
- Ready-to-test language without a filled [prove-it packet](prove-it-packet.md).
- Overlap, uneven gaps, truncated text, or clipped menus.
- A place badge so small Matt cannot see the number.
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
- `1 nights` on a single saved night.
- Standings updated still sitting on Records after Save & End.
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
- Life Preserver labels outside the pie, callout pills, or leader lines.
- A Life Preserver card that stays a small 280px tile on a laptop or TV while the screen around it is empty.
- A Life Preserver that still looks like a pie chart with extra wedges.
- A 4-digit Canasta cell that clips to `322(`, or 2-team rows stretched to ~135px with 120px avatars.
- `Megan` clipped to `Mega` on a 390 Canasta card.
- Add Player as a 412px chip on a laptop, or a tiny card on a phone.
- Canasta Each clean / Each dirty / Each red 3 chips on Five Crowns or Wizard entry.
- A casino-slick Life Preserver bowl, or a header chip that force-feeds the first eligible spin.
- Six busy beach scenes that blur together, 818 numerals fighting the card title, or a muddy photo logo at nav size.
- Dead leftover height between Tonight's Table and Start a New Match on laptop Home, or empty padding inside those cards instead of seats and game art.
- Edit Seating plus Earlier/Later when the Home list can reorder in place.
- A second ranking function for Recent nights, or a podium on an Incomplete night.
- Adding Canasta to the game registry or Home picker from this art pass.
- Reconstructing a dusk tile when the approved raster is in hand. Drop the file in byte-for-byte.

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
