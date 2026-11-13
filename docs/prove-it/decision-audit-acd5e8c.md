# Decision audit

Screen SHA: `acd5e8cf7c8be25b086797dac0b6bda4a0d7b9a2` (`acd5e8c`).

The shots were taken of that tree. This file is committed after it, so the branch head that contains the audit is one commit later. Every check below is EMULATOR (Playwright WebKit at 1024x768 and 390x844, plus Chromium functional tests). There is no real device in this run. Do not read a PASS as a physical iPad or phone.

Shots live in `docs/prove-it/cb/` with the `acd5e8c-` prefix. Tie placement was not edited.

A later steer wins. Where that happened, the row names what it replaced.

## Counts on this head

| Column | PASS | NOT DONE | UNRESOLVED |
| --- | --- | --- | --- |
| CODE | 39 | 1 | 3 |
| SCREEN | 24 | 16 | 4 |
| INTERACTION | 26 | 16 | 4 |

A cell that is only partly shown counts as NOT DONE. The one CODE miss is the Canasta team picker, which still uses dropdowns. NOT DONE is listed at the bottom. Implemented and not re-shot on this SHA is NOT DONE in SCREEN or INTERACTION.

## CB

| Item | CODE | SCREEN | INTERACTION | What happened |
| --- | --- | --- | --- | --- |
| (a) Remove 00 from score entry. Parity does not put it back. `pace-delete-keys` asserts Skip. | PASS. `syncScoreEntryPad` writes Skip on a plain pad. `docs/solutions/bm-entry-and-parity.md` says the Nov 12, 4:12 PM ET spec overrides `bffd216`. `tests/functional/pace-delete-keys.spec.mjs` asserts Skip. | PASS. `acd5e8c-entry-footer-8-1024.png`, `acd5e8c-entry-footer-8-390.png`, `acd5e8c-entry-three-states-1024.png`, `acd5e8c-entry-three-states-390.png`. | PASS. EMULATOR. Five Crowns, Flip 7, and Beat the Heat open with Skip and `0 & Next`. Chromium `pace-delete-keys` passed. | Bid and trick pads still show `00`. That is the later BZ #10 rule, and it supersedes any reading that Skip replaces 00 on every pad. |
| (b) Card edge on top of the art. Selected stays stronger. | PASS. `.s2-card-frame::after` inset ring, z-index 4, in `public/assets/card-picker.css` and `public/assets/slice2.css`. | PASS. Flip 7 unselected, Flip 7 selected, and Wizard selected, at 1024 and 390. | PASS. EMULATOR. Unselected ring 3px `rgb(154, 136, 116)`. Selected ring 6px `rgb(10, 92, 84)`. No Selected label. Chromium card-picker passed. | Supersedes a border drawn under the cover. |
| (d) Readable game name by each cover. | PASS. `public/assets/slice2.js` renders `.s2-game-name`. Landscape frame height leaves a name row. | PASS. The six card shots show the names. | PASS. EMULATOR. Measured names include Flip 7, Five Crowns, and Wizard. |  |
| (e) Flip 7 says it plays to 200. | PASS. `public/assets/game-registry.js` line is `Highest total wins. Plays to 200.` | PASS. Flip 7 card shots. | PASS. EMULATOR. Start summary read `Flip 7 · 4 players · Plays to 200` at 1024 and 390. | Supersedes Open match, and the Oct 29 uncertain finish. The 200 rule is not inside `completionFromSavedRules`. |
| (f) Late player confirms the starting score. Name errors are inline. | PASS. `submitAddPlayerMidGame` shows the ceiling, then commits on the second press. Comma and empty names use `showPlayerNameWriteError`. | PASS. `acd5e8c-late-join-confirm-1024.png`, `acd5e8c-late-join-confirm-390.png`, `acd5e8c-name-error-1024.png`, `acd5e8c-name-error-390.png`. | PASS. EMULATOR. Ava 10 and Ben 21. Sam starts at 16. Roster becomes Ava, Ben, Sam. `Bo,Cat` shows `Use one name. Commas are not allowed.` | Other alerts remain (lineup empty, merge, screenshot). Those are outside this name path. |
| (g) Popup headings are sentence case and a readable size. | PASS. The kicker override in `public/index.html` sets Nunito, 1.05rem, `text-transform: none`. | PASS. The late-join frames show Mid-Game Add. | PASS. EMULATOR. Computed style at 1024 and 390: `Mid-Game Add`, transform none, 16.8px, Nunito Sans. |  |
| (h) Plain settings labels. Restore text behind How restore works. | PASS. Labels are Match moments and On this device. `#how-restore-works` wraps the long copy. | PASS. `acd5e8c-settings-1024.png`, `acd5e8c-settings-390.png`, and the restore frames. | PASS. EMULATOR. Both sizes found the two labels and the disclosure. Opening it showed the restore copy. | Proposed wording, now in the UI: Animations & Flow becomes Match moments. This device becomes On this device. App Management and the tiny Appearance kicker are gone. That removal is BZ #1. This rename supersedes deleting those two labels. |
| (j) No em dash in a sentence. | PASS for sentences in the loaded app. Blank cells still use `—`. | NOT DONE. No frame walks every sentence. | PASS as a grep, not a visual pass. | See the dash report below. |
| (k) No `(house rule)` on a label. | PASS. None found on a label. | NOT DONE. No dedicated frame. | PASS as a grep of `public/`. | None touched. The only hit is a comment in `public/assets/hand-foot-logic.js`. |
| (l) Unusual score offers Fix it and It's fine, save anyway. | PASS. `showUnusualScoreConfirm` in `public/index.html`. | PASS. `acd5e8c-unusual-1024.png`, `acd5e8c-unusual-390.png`. | PASS. EMULATOR. Both sizes read `You entered 2,500. Is that correct? Fix it It's fine, save anyway`. | Supersedes Edit and Use score. `scripts/preview-rc4-items.mjs` still expects `/Use score/`. That script is not on `npm run check`. |
| (m) Column hints are plain words. | PASS. The hint text is `Round N is off to the left.` or `Rounds A through B are off to the left.` | PASS at 390. The 1024 frame is an empty hint because those rounds fit. | PASS. EMULATOR. 390 read `Rounds 1 through 7 are off to the left.` 1024 hint was empty. | Supersedes `← R3–R5`. |

## BV keypad and BW Home

| Item | CODE | SCREEN | INTERACTION |
| --- | --- | --- | --- |
| 1. Skip above Next. Blank stays blank. | PASS | PASS. Three-state frames at 1024 and 390. | PASS. EMULATOR. Skip on Ava left `values.Ava` empty and class `is-skipped`, then advanced. |
| 2. Blank, confirmed 0, and Skip look different. | PASS. `is-skipped`, empty dashed cell, `is-confirmed-zero` check. | PASS. Same three-state frames. Ava says Skip, Ben shows 0 with a check, Cora is an empty box. | PASS. EMULATOR. Same steps as item 1, then `0 & Next` on the next player. |
| 3. `0 & Next` when blank, `Next` when a score exists. | PASS. Plain score pads only. | PASS. Footer frames show `0 & Next` on a blank Flip 7 row. | PASS. EMULATOR. Heat and Flip 7 opened on `0 & Next`. Wizard bids stay `Next`. |
| 4. Minus only where a negative score is legal. | PASS. `playedScoreMustBeNonNegative`. | PASS. Flip 7 pad shows minus. Heat and Five Crowns do not. | PASS. EMULATOR. See the table. |
| 5. Cap message beside the input. | PASS. `showScoreEntryError` appends `.score-entry-cap-note` inside that row's score cell. | PASS for 999. NOT DONE for the Canasta 9,999 wording. | PASS for 999. EMULATOR. Paste `10000` on Flip 7. The cell read `That entry stops at 999.` Frames: `acd5e8c-cap-999-1024.png`, `acd5e8c-cap-999-390.png`. |
| 6. No "Blank scores count as 0". Submit names the missing players. | PASS. Helper is `Skip leaves a score blank.` Submit still uses `Still need:`. | PASS. Footer frames show the short helper. | PASS. EMULATOR. Chromium park-and-next still names the missing player after Skip. |
| 7. Bid pads: report, do not restyle. | PASS. Non-plain pads set the slot to `00`. | PASS. `acd5e8c-wizard-bid-pad.png` shows `00`, no minus, Next. | PASS. EMULATOR. Wizard bids: skip text `00`, minus `none`, next `Next`. 818 bids: the same. |
| 8. Row fit at 3, 4, and 8 players. | PASS. Managed fit plus scroll when 8 rows do not fit at 390. | PASS at 4 and 8. NOT DONE at 3. | PASS at 4 and 8. NOT DONE at 3. |
| BW. No View all. Newest unfinished only. Older nights stay. | PASS. `unfinishedBannerMarkup` has no View all. | PASS. `acd5e8c-home-newest-1024.png`, `acd5e8c-home-newest-390.png`, `acd5e8c-records-older-1024.png`, `acd5e8c-records-older-390.png`. | PASS. EMULATOR. Two unfinished nights. Home banner was Five Crowns round 4 of 11 and no View all. Records listed both as Unfinished with Resume. Ids were not deleted. |

### Minus table

EMULATOR. WebKit, after the modal was opaque.

| Game | Minus | Skip above Next | Interaction | Shot |
| --- | --- | --- | --- | --- |
| Five Crowns | N | Y (Skip) | Y | Three-state frames |
| Beat the Heat | N | Y (Skip) | Y | Retake log. No separate heat frame. |
| Flip 7 | Y | Y (Skip) | Y | `acd5e8c-minus-flip7-pad.png` and the 8-player footer frames |
| Wizard bids | N | N. The slot is `00`. Next stays Next. | Y | `acd5e8c-wizard-bid-pad.png` |
| 818 bids | N | N. The slot is `00`. Next stays Next. | Y | No dedicated frame. Measured in the same probe. |

Five Crowns cannot start with 8 players (seat max is 7). The 8-player fit check uses Flip 7. At 1024 all eight names are on screen. At 390 the list scrolls, and scrolling put Hal inside the list. Helper and the three footer buttons did not overflow at either size. Footer type is Nunito, 18.4px, not condensed, not uppercase. There is no before frame of the old small condensed labels.

The Wizard bid status line is clipped at the right edge of `acd5e8c-wizard-bid-pad.png` (`0 OF 4 BIDS ENTERED · BIDS TOTAL 0 · 1 TRICK T`). The keys were not changed. That clip is NOT DONE.

## BY and BZ

| Item | CODE | SCREEN | INTERACTION |
| --- | --- | --- | --- |
| BY. Soft border, thicker selected border, no Selected label. | PASS. Same ring as CB (b). | PASS. The six card frames. | PASS. Same measurements as CB (b). |
| BZ 1. Remove App Management and tiny Settings headings. | PASS. Those headings are gone. Match moments and On this device stay, per CB (h). | PASS. Settings frames. | PASS. EMULATOR. Labels present. |
| BZ 2. Button reads Apply order, in a readable face. | PASS. Reorder button text is Apply order, Nunito, letter-spacing 0. | NOT DONE. No reorder frame on this SHA. | NOT DONE. Not tapped on this SHA. |
| BZ 3. Canasta team cards, tap to swap. | NOT DONE. Copy says Choose your teams and Tap a player, then someone on the other team to swap. `renderHandFootSetup` still builds `.hf-pair-select` dropdowns. | NOT DONE. | NOT DONE. |
| BZ 4. Live Home keeps the full picker. | PASS. `slice2.js` always renders `.s2-game-grid`. There is no Start another game string. | NOT DONE. No live-match frame on this SHA. | NOT DONE. |
| BZ 5. After the last player, visit skipped seats, then open score review. | PASS. `scoreEntryPlainAdvance`. | PASS at 1024 only. `acd5e8c-entry-back-to-skipped-1024.png`, `acd5e8c-entry-review-1024.png`. NOT DONE at 390. | PASS at 1024. Skip Ava, score Ben and Cora, Next returns to Ava with `reviewing` false, then Next opens review: `Review the scores, then submit.` NOT DONE at 390. |
| BZ 6. Skipped is its own state. | PASS. Same as BV 2. | PASS. Three-state frames. | PASS. EMULATOR. |
| BZ 7. Name by each cover. | PASS. Same as CB (d). | PASS. | PASS. |
| BZ 8. Cap text, including Canasta scores stop at 9,999. | PASS for the strings. Paste uses that Canasta sentence when the cap is 4 digits or more. | PASS for 999. NOT DONE for 9,999. | PASS for 999. NOT DONE for a Canasta paste. |
| BZ 9. Canasta toasts do not say Hand and Foot. | PASS for the three toasts and the labels changed on this head. Stored id stays Hand and Foot. | NOT DONE. No Canasta toast frame. | NOT DONE as a tap. The leftover list is below. |
| BZ 10. Flip 7 card does not say Open match. | PASS. Same as CB (e). | PASS. | PASS. |

## CA type size

| Piece | CODE | SCREEN | INTERACTION |
| --- | --- | --- | --- |
| Instruction and Cancel, Review Scores, Submit Scores are larger and not condensed. They fit at 390 and 1024 with 8 players. | PASS. Nunito, 1.05rem helper, 1.15rem buttons, nowrap. Helper shortened so the line fits. | PASS. `acd5e8c-entry-footer-8-1024.png`, `acd5e8c-entry-footer-8-390.png`. | PASS. EMULATOR. Both sizes: helper overflow false, each button overflow false, font Nunito Sans. |
| Before frames of the old small type. | n/a | NOT DONE. The change landed before a before-capture. | NOT DONE. |

## Earlier Nov 12 decisions, not re-shot on this SHA

These stay in the code. SCREEN and INTERACTION on this SHA are NOT DONE. Prior green CI `43387743937` is `8a5a4ab`, not this head.

| Decision | CODE | SCREEN | INTERACTION |
| --- | --- | --- | --- |
| Canasta is complete at 4 saved rounds. A short or ambiguous legacy night stays uncertain. A game finished in the app is finished. Amendment 11 at 7:13 PM ET supersedes the 5:55 uncertain note. | PASS. Still the scorebook rule. Not edited here. | NOT DONE | NOT DONE |
| User-facing wheel name is Back Porch Wheel. | PASS. `BACK_PORCH_WHEEL` / `life-preserver-logic.js`. | NOT DONE | NOT DONE |
| Flip 7 plays to 200. | PASS. See CB (e). The wheel bullet now says `Flip 7 plays to 200`. | PASS on the picker. NOT DONE for the wheel bullet. | PASS on the picker. NOT DONE for the wheel bullet. |
| Late joiner starts at the ceiling of the seated average. | PASS. See CB (f). | PASS | PASS |
| `<Name> unseated · Undo` | PASS. `public/index.html` sets `${name} unseated · `. | NOT DONE | NOT DONE |
| #20 deferred. | UNRESOLVED. Not re-opened. | UNRESOLVED | UNRESOLVED |
| Recent nights off. | UNRESOLVED. No Recent nights control in `slice2.js`. Not re-shot. | UNRESOLVED | UNRESOLVED |
| Lead toast from a real Canasta pass. One-line Canasta names. Phone nav Player Passports and Settings. Comeback ranked inside each game. Canasta card under the header. Equal phone nav columns. | PASS. Those commits are still under this head. Not edited here. | NOT DONE | NOT DONE |
| Release gate. Friday's build is a progress preview. | UNRESOLVED in the app. The sentence stays in the PR text. | UNRESOLVED | UNRESOLVED |
| Tie placement stays as coded. | PASS. No place-ranking edit in this slice. | UNRESOLVED | UNRESOLVED |

## Dash report

User-facing sentences in `public/index.html`, `public/assets/slice2.js`, `public/assets/scorebook.js`, `public/assets/game-registry.js`, `public/assets/records-logic.js`, and `public/assets/life-preserver-logic.js` do not use `—` or `–` as punctuation.

Left in place on purpose:

- Blank cells, missing records, and empty correction fields use `—` as the neutral placeholder.
- A skipped row's status mark is `–`.

Not on the production screen:

- `public/assets/comeback-logic.js` still has em dashes in its strings. Production does not load that file.
- Comments still use dashes.

## House-rule tags

None removed. None were on a user-facing label. The only `house rule` hit under `public/` is the comment `Matt's house rules` in `public/assets/hand-foot-logic.js`.

## Hand and Foot leftovers

Stored id stays `Hand and Foot`. These visible strings were changed to Canasta on this head: the rules line `Not used in Rook, Beat the Heat, or Canasta.`, the rules quick idea, the Hall of Fame section heading via `displayGameName`, and the fame lines `Canasta: Best Score`, `Canasta: Best Round`, `Canasta: Worst Score`, and `Canasta: Worst Round`.

Still user-facing or fixture copy, not renamed:

- `public/qa/fixtures.mjs` description still says `Canasta (Hand and Foot)`.
- Docs and the gate log keep the historical name. Those rows were not edited.

## NOT DONE

- Canasta team setup is still dropdowns. BZ 3.
- Canasta `scores stop at 9,999` was not shot.
- No 3-player row-fit frame.
- No 390 frame of skipped-player wrap or score review.
- No before frame of the old footer type.
- Apply order was not opened.
- Live Home was not shot with a match already going.
- Wizard bid status line is clipped. Keys were left as they are.
- No real device.
- No new CI id. The last green run is `43387743937` on `8a5a4ab`.
- `scripts/preview-rc4-items.mjs` still expects View all and Use score. It is not on `npm run check`.
- #20, Recent nights, and the Friday sentence were not re-checked in the app.
- Earlier board, toast, nav, and comeback decisions were not re-shot on this SHA.
