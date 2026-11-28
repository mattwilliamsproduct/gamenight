# Decision audit

Screen SHA: `fca3a75a33bcc925b6fb913558bcc50ce4b912eb` (`fca3a75`).

The shots were taken of that tree. This file is committed after it, so the branch head that contains the audit is one commit later. Every check below is EMULATOR. Pad frames are Playwright WebKit screenshots of the score-entry panel. The Spin ready frame is a WebKit screenshot of the scoreboard at 390x844. Chromium functional tests cover the same pads and the badge at 390 and 375. There is no real device in this run.

Shots live in `docs/prove-it/cc/` with the `fca3a75-` prefix. Tie placement was not edited. Blank-bid scoring was not edited.

A full-page capture of an open modal composites the scorecard through the sheet. The pad pictures are the panel itself. Hit-testing on the live page puts the 0 key on top of the scorecard.

## Counts on this head

| Column | PASS | NOT DONE | UNRESOLVED |
| --- | --- | --- | --- |
| CODE | 8 | 1 | 0 |
| SCREEN | 8 | 1 | 0 |
| INTERACTION | 8 | 1 | 0 |

These counts are CC and CD only. Older H–Y rows stay in `docs/prove-it/decision-audit-acd5e8c.md` and were not all re-shot on this SHA.

## Pad table

| Pad | Minus | Bottom row | 00 key |
| --- | --- | --- | --- |
| Five Crowns score | Hidden | 0 spans the row | None |
| Beat the Heat score | Hidden | 0 spans the row | None |
| Flip 7 score | Shown, spans two cells | 0 stays one cell | None |
| Wizard bid and trick | Hidden | 0 spans the row. Skip and Delete stay | None |
| 818 bid and trick | Hidden | 0 spans the row. Skip and Delete stay | None |
| Cell numpad | Minus stays on the 4-5-6 row | 0 spans three cells | None |
| Round correction | No minus key | 0 spans the two cells beside backspace | None |

Measured on the screen SHA: Five Crowns and Heat 0 is 354px wide and 123px tall, the same height as the 7 key (112px wide). Flip 7 0 is 112px and the minus is 233px. Wizard and 818 0 at 1024 is 354×119 against a 112×119 seven. At 390 the bid 0 is about 238×42 against a 77×42 seven.

## CC

| Item | CODE | SCREEN | INTERACTION | What happened |
| --- | --- | --- | --- | --- |
| 1. Phone score boxes and the progress line stay inside the sheet at 8, 3, and 4 players. | PASS. Phone rows use `minmax(0, 1fr) minmax(72px, 92px)` and 12px of scrollbar clearance. | PASS. EMULATOR. `fca3a75-entry-8-390.png`, `fca3a75-entry-3-390.png`, `fca3a75-entry-4-390.png`. | PASS. EMULATOR. Flip 7 cell right 340 vs panel 372. Five Crowns and Heat cell right 346 vs panel 372. Progress right 359. Overflow false. |  |
| 2. When there is no minus, 0 fills the bottom row. Flip 7 keeps 0 and a wide minus. | PASS. `.score-entry-plain.score-entry-no-minus` and `.hf-no-minus` use `k0 k0 k0`. | PASS. EMULATOR. `fca3a75-zero-span-crowns-1024.png`, `fca3a75-zero-span-heat-1024.png`, `fca3a75-flip7-minus-1024.png`. | PASS. EMULATOR. Crowns and Heat 0 is wider than 2.4× the 7 key and within 12px of its height. Flip 7 0 stays under 1.6×. Chromium `pace-delete-keys` passed. |  |
| 3. Wizard bid status line stays inside the sheet. | PASS. The progress line wraps. | PASS. EMULATOR. `fca3a75-wizard-bid-1024.png`, `fca3a75-wizard-bid-390.png`. | PASS. EMULATOR. “0 of 4 bids entered · Bids total 0 · 1 trick this round” at 1024, progress right 978 vs panel 993, overflow false. | CD removes the 00 key this row used to keep. |
| 4. Canasta teams are tap-to-swap cards. | PASS. `renderHandFootSetup` has no pair dropdown. | PASS. EMULATOR. `fca3a75-teams-1024.png`, `fca3a75-teams-swapped-1024.png`, `fca3a75-teams-390.png`. | PASS. EMULATOR. Title “Choose your teams”. No “Pick who sits together”. Tap Bo then Cy goes Ann, Cy, Bo, Dee. Dealer roster stays Ann, Bo, Cy, Dee. |  |
| 5. Remaining frames on this SHA: cap note, 3-player fit, 390 review, footer type, Apply order, live Home, Recent nights off, note 20 deferred, nav, board, toast, comeback. | PASS for the behaviors already on this branch. | PASS. EMULATOR. `fca3a75-cap-9999-390.png`, `fca3a75-cap-9999-1024.png`, `fca3a75-entry-3-390.png`, `fca3a75-review-390.png`, `fca3a75-footer-before-reconstructed-1024.png`, `fca3a75-footer-after-1024.png`, `fca3a75-footer-after-390.png`, `fca3a75-apply-order-1024.png`, `fca3a75-apply-order-390.png`, `fca3a75-live-home-1024.png`, `fca3a75-live-home-390.png`, `fca3a75-live-home-picker-1024.png`, `fca3a75-recent-nights-off-1024.png`, `fca3a75-note20-banner-deferred-1024.png`, `fca3a75-nav-top-390.png`, `fca3a75-nav-bottom-390.png`, `fca3a75-canasta-board-1024.png`, `fca3a75-canasta-board-390.png`, `fca3a75-toast-lead-1024.png`, `fca3a75-toast-lead-390.png`, `fca3a75-comeback-by-game-1024.png`, `fca3a75-comeback-by-game-390.png`. | PASS. EMULATOR. Cap note “Canasta scores stop at 9,999.” sits on the active field. Review context “Review the scores, then submit.” Live Home shows Start another game and hides the grid until that button is tapped. Recent nights is absent. Toast “Cat & Mike take the lead!” Comeback rows keep Wizard 100 and Canasta 180. | The footer-before frame is a reconstructed Londrina style, not an older SHA. Note 20 is still deferred and was not built. The Apply order control’s HTML is “Apply order”; the shared button style renders it as APPLY ORDER. |
| 6. Preview script no longer expects View all or Use score. | PASS. `scripts/preview-rc4-items.mjs`. | PASS. No screen. The script is a CLI check. | PASS. The script no longer matches View all or Use score. It is not on `npm run check`. |  |
| 7. CI on the final head. | NOT DONE until the run for the audit head finishes. The screen SHA is `fca3a75`. |  |  | Do not treat an older green run as this head. |

## CD

| Item | CODE | SCREEN | INTERACTION | What happened |
| --- | --- | --- | --- | --- |
| 1. No 00 key on any pad. Bid and trick pads use the same no-minus layout. A blank bid stays a blank bid. | PASS. `syncScoreEntryPad` always labels the slot Skip. `#custom-numpad` has no 00 button and its 0 spans three cells. `applyScoreEntryKey` ignores a `00` token in every mode. `validateEntries` is unchanged: a Wizard blank bid is missing, and an 818 blank bid becomes 0 only there. | PASS. EMULATOR. `fca3a75-wizard-bid-1024.png`, `fca3a75-wizard-bid-390.png`, `fca3a75-818-bid-1024.png`, `fca3a75-818-bid-390.png`. | PASS. EMULATOR. Skip on a blank Wizard bid leaves `''`. The next 0 key stores `'0'`. Skip on a blank 818 bid leaves `''`. Chromium `pace-delete-keys` and `rc3-acceptance` passed. `npm run check` passed, including the blank-bid golden. | Grep of the app for a 00 key is clean. Remaining `00` strings are guards that refuse the token (`handFootTypeInto`, `numpadPress`, `applyScoreEntryKey`). The round-correction pad has no 00 key. |
| 2. Spin ready stays fully inside the player cell at 390 and 375, for 4 and 8 players, including a long name, and does not cover the score. | PASS. Under 760px the badge stays on the same row, to the right of the name. Duke, Brick, and Linda stay one line. A longer name wraps inside its slot. Other rows do not wrap. | PASS. EMULATOR. `fca3a75-spin-ready-390.png` shows Duke on one line with Spin ready to the right of the name, Alexandria wrapped inside the name slot with Spin ready still to the right, and Linda with Spin used. The badges sit beside the totals and do not cover them. | PASS. EMULATOR. Chromium `bs-surfaces` keeps the badge to the right of Duke, Brick, and Linda at 1024 and 390. Chromium `spin-ready-badge` passed at 390 and 375 for 8 players and for Duke, Alexandria, Linda, and Vikki. Every badge’s right edge is inside the player cell and not past the score cell. Alexandria stays fully inside the cell. | The saved picture is 390. 375 is the same check without a separate picture. |

## NOT DONE

- No physical iPad or phone. Every look above is EMULATOR.
- CI for the audit head is not claimed here.
- Note 20, the top banner, stays deferred and was not built.
- Older decision rows in `decision-audit-acd5e8c.md` were not re-shot on `fca3a75`.
- The Apply order button still picks up the shared uppercase button style, so the screen reads APPLY ORDER.
