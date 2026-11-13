# Decision audit

Screen SHA: `e71a2a5282e781ebb68b3f711985a85d0b9d96ef` (`e71a2a5`).

The shots were taken of that tree. This file is committed after it, so the branch head that contains the audit is one commit later. Every check below is EMULATOR. Playwright WebKit at 1024x768 and 390x844. There is no real device in this run.

Shots live in `docs/prove-it/cc/` with the `e71a2a5-` prefix. Blank-bid scoring was not edited. `comeback-logic.js` is not loaded. `mergeCloud` and `api/sync.js` were not edited. This environment did not call `/api/sync`.

A full-page capture of an open modal composites the page through the sheet. Rook setup and Porch Cloud pictures are the panel. The Comeback Extra Records picture is the two book rows.

## Uppercase kept

- Scorecard headers Player, Total, and round marks such as R1 stay uppercase.
- The phone header “This round” is sentence case, wraps, and is fully inside its cell on the 8-player card (scroll size equals client size).
- Celebration titles stay WHAMMY!, NOLIE!, and CAMI WHAMMI!.
- The dealer mark stays D.

## Counts on this head

| Column | PASS | NOT DONE | UNRESOLVED |
| --- | --- | --- | --- |
| CODE | 7 | 1 | 0 |
| SCREEN | 7 | 1 | 0 |
| INTERACTION | 7 | 1 | 0 |

These counts are CE and CF. Older rows stay in `docs/prove-it/decision-audit-fca3a75.md`.

## CE

| Item | CODE | SCREEN | INTERACTION | What happened |
| --- | --- | --- | --- | --- |
| 1. Shared buttons and labels are sentence case, regular width, and readable. Names stay as typed. | PASS. Shared button and kicker rules in `public/index.html` use Nunito, weight 800, letter-spacing 0, and `text-transform: none`. | PASS. EMULATOR. `e71a2a5-wizard-bid-390.png`, `e71a2a5-teams-1024.png`, `e71a2a5-apply-order-1024.png`. | PASS. EMULATOR. Context “Round 1 of 15 · Log bids”. Progress “1 of 4 bids in · total 0 · 1 trick” on 2 lines at 390. Teams, Singles, Back, and Start Match are sentence case. Apply order reads “Apply order”. | Column headers listed above stay uppercase. |
| 2. Next is tall on every pad, including Five Crowns and Beat the Heat. View Pace is readable. | PASS. Plain and bid Next use `grid-row: 3 / span 2`. View Pace is 0.95rem Nunito. | PASS. EMULATOR. `e71a2a5-zero-span-crowns-1024.png`, `e71a2a5-zero-span-heat-1024.png`, `e71a2a5-entry-4-390.png`, `e71a2a5-wizard-bid-390.png`, `e71a2a5-view-pace-1024.png`. | PASS. EMULATOR. Five Crowns Next is 255px against a 123px seven, and the 0 bottom matches Next. At 390 Next is 88px against a 42px seven. View Pace is 15.2px and not clipped. | The 390 Heat frame is a full-page composite. The height check is the measurement. |
| 3. A long single name does not split. Avatars stay readable. The dealer D sits on the corner. “This round” is fully visible. Phone nav keeps Player Passports on one line. | PASS. Phone names are nowrap and ellipsis. The phone avatar is not forced to 20px. The dealer badge is 0.8rem on the corner. Nav buttons are `width: auto` at 13px. | PASS. EMULATOR. `e71a2a5-spin-ready-390.png`, `e71a2a5-nav-bottom-390.png`. | PASS. EMULATOR. Alexandria ellipsizes as Alex… with Spin ready inside the cell. Chromium `spin-ready-badge` and `phone-scoreboard-reach` passed. The 8-player “This round” header scroll size equals its client size. |  |
| 4. The teams modal is Canasta, over a Canasta board. | PASS. `openHandFootSetupModal` returns when a different game is pending, and it hides a non-Canasta board. | PASS. EMULATOR. `e71a2a5-teams-1024.png`, `e71a2a5-teams-390.png`. The board line behind the sheet is Canasta · Round 1 of 4. | PASS. EMULATOR. Before Start Match, tapping Bo then Cy goes Ann, Cy, Bo, Dee. Reopening the modal draws the default pairs again. | Names are Ann, Bo, Cy, and Dee as typed. |

## CF parity

| Feature | vs `39e6b51` | CODE | SCREEN | INTERACTION |
| --- | --- | --- | --- | --- |
| Rook | Restored. Targets stay 300, 500, and 1000. The stored default is 300. More than 6 players still gets the existing confirm. The seventh card has its own row. | PASS. `hidden: false` in the registry and the records list. `seatLimit` still requires 4. | PASS. EMULATOR. `e71a2a5-rook-picker-1024.png` shows the Rook card. `e71a2a5-rook-setup-1024.png` and `e71a2a5-rook-setup-390.png` show 300, 500, and 1000. | PASS. EMULATOR. Opening the modal leaves `_rookSetupConfig.winTarget` at 300. The painted highlight is cleared because `[onclick*="winTarget,300"]` does not match `winTarget',300`. That selector is the same on `39e6b51` and was not changed. |
| Comeback Extra | Matches production. The engine stays unloaded. The score cell paints `round.comeback`. The two Records lines render when that history exists. | PASS. `verify-production-assets` still fails if the page loads `comeback-logic.js`. `scripts/test-records.mjs` covers the two labels. | PASS. EMULATOR. `e71a2a5-comeback-extra-1024.png` and `e71a2a5-comeback-extra-390.png` show Ada’s +20 on round 1. `e71a2a5-comeback-extra-records-1024.png` and `e71a2a5-comeback-extra-records-390.png` show both lines. | PASS. EMULATOR. Fictional Ada and Bea. The cell text is +20. The biggest line’s large figure is “20 extras” because `formatStatValue` already treats a Comeback Extra title as a count. That formatter is the one `39e6b51` uses for the same title. The detail line reads “+20 extra”. |
| Porch Cloud | Client restored. `mergeCloud` is unchanged. Key `gn_porch_key`. Endpoint `/api/sync`. Header `x-porch-key`. The gate is the live host and not QA. A Try demo sample cannot use the gate. | PASS. `scripts/test-local-only.mjs` and `tests/functional/porch-cloud-stub.spec.mjs`. `api/sync.js` was not edited. | PASS. EMULATOR. `e71a2a5-porch-cloud-1024.png` and `e71a2a5-porch-cloud-390.png` show the password field, Save & Sync, and the preview sentence. | PASS. EMULATOR. `canPorchCloud()` is false on localhost. A stubbed pull and push used GET then PUT `/api/sync` with `x-porch-key: stub-porch` after `fetch` was replaced. The browser made no real `/api/` request. |

## NOT DONE

- No physical iPad or phone. Every look above is EMULATOR.
- CI for the audit head is not claimed here.
- The Rook target buttons do not stay highlighted after the modal opens. The stored target is 300. The selector was left as it is on `39e6b51`.
- Older decision rows in `decision-audit-fca3a75.md` were not all re-shot as a new table. The frames named above were taken on `e71a2a5`.
