# rc3 candidate vs live (wt-main)

| Ref | Path / SHA | Role |
| --- | --- | --- |
| LIVE | `/workspace/back-porch/wt-main` @ `39e6b51` | What cardknight runs from main |
| FREEZE | `5e57d50` | Launch freeze the repair started from |
| RC3 | `/workspace/back-porch/wt-rc3` branch `cursor/rc3-candidate` | Local repair candidate (no push) |

Compared by reading both trees and the rc3 defect list. No prod deploy. No dashboard links.

## What rc3 keeps from live

- Same palette and approved card art paths under `public/assets/cards/`.
- Same game registry ids and winLow rules.
- Settings controls that live already has (text size, lineup intro, path replay, dealer roll, Porch Cloud, export/import) still present outside demo.
- History storage shape unchanged for departed players (item 4: hide from active card and placements; do not purge scores or rewrite stored nights).
- Score entry still uses Next/accept. With bid/trick Entered status (deferAck), a dirty typed seat also confirms when you move to another seat so P0-01 stays green; untouched prefills stay Entered until Next.

## What rc3 repairs that live still shows as broken or rough

| Area | Live (wt-main) | RC3 |
| --- | --- | --- |
| Home at short laptop / large type | Easy to clip Start / game pick | Home scrolls; panels size to content; smaller game cards so Start stays with the pick |
| Wizard keypad | Minus / 00 clutter; digit order can confuse after hide | Digits 7–9 / 4–6 / 1–3 / 0; impossible inputs omitted |
| Bid progress | Confirmed-only style progress | Entered 0 counts toward "N of M bids entered" |
| Bid copy | Compact codes like `Bids 1/1 (exact)` / `BID 1/1` | Plain words: bids add up to N of M tricks; header uses entered count |
| Departed players | Still in active placements / winning path on older builds | Hidden from active scorecard; "1 player left early" disclosure; Left early group on historical cards |
| Demo chrome | Can cover Settings; Records count can stale at 16 vs 17 | Exit demo / Reset demo above page; Records count refreshes after sample load |
| Scorecard fit | Expand-to-fill can leave tall rows / dead strip | Row height capped; names stay readable |
| Actions menu | Small type on TV | 18px/52px @1024, 22/56 TV, 17/48 phone |
| Table exit | Easy to bury in Actions on some builds | Dedicated Table control kept visible |
| Past nights | Two-column cards; date repeated under day heading | One full-width card; date only on day heading; same card on Overview |
| Explore / Profile jargon | Variance / Favorite / WHAMMY / Nolie | Steadiest scores; Most played; All scored; Everyone hit bid |
| Flip 7 full games | completed flag only | Active stored total ≥ 200 (Matt 7:26 PM) |
| Final-score records | Count early-ended nights | Full games only; wins/streaks still count Ended early |
| Nav vs Explore counts | One number, unclear | Nav `Records (N)` = nights saved; Explore subtitle = completed matches, with `· M nights saved` when they differ |

## Score-entry behavior vs freeze / live (bd48128–8f6c6bc)

Freeze `5e57d50` and live acknowledge on the first digit and replace the whole field when `!acknowledged`. That breaks two rc3 needs:

1. **P1-05 minus regression.** Freeze treated pending `-` as blank, so the next digit replaced and turned `-5` into `5`. RC3 keeps the sign when the following key is a digit (`5d58d17`). Minus stays hidden only for Wizard bids/tricks.
2. **Entered vs Confirmed for bids/tricks (item 3).** RC3 keeps `acknowledged` false while typing (`deferAck`) so status can show Entered 0 until Next. That would have made every later digit hit the replace branch. `bd48128` / `ca67c04` add a per-seat **dirty** flag: first digit still replaces a prefill; later digits append; pending minus still becomes `-N`.

| Commit | User-visible change vs live/freeze | Keep? |
| --- | --- | --- |
| `5d58d17` pending minus | Typing `-` then `5` on Five Crowns / Flip 7 / Beat the Heat stores `-5`, not `5` | Yes — listed P1-05 |
| `bd48128` append under deferAck | After the first typed digit on bids/tricks, further digits append (33 not stuck at last digit) | Yes — needed once deferAck exists for item 3 |
| `ca67c04` dirty flag | Prefill still replaces on the first key; after that digits append; dirty tracked per seat | Yes — same reason |
| `df59dd9` confirm on leave | Switching seats auto-confirmed the previous value | Superseded by 8f6c6bc |
| `8f6c6bc` dirty-only leave confirm | Untouched prefills stay Entered; dirty typed values confirm when leaving the seat | Yes — needed so P0-01 (typed then moved on ⇒ complete) still holds under deferAck |

Net vs live: Next/accept still confirms. Extra: pending minus keep-sign on scores; dirty-aware replace-then-append for bid Entered status; leave-seat confirms only dirty typed seats (live instead acknowledged on first digit).

## Risks / open deltas (not claimed fixed)

- Full visual parity of every Records tile vs live art direction is not re-audited tile-by-tile in this pass.
- L16-style life-preserver codes were not found as user-facing profile labels in this tree; only WHAMMY/Nolie badges were rewritten.
- Live still has older scorecard chrome; merging rc3 is a product decision, not done here.
- No signed-out prod smoke on cardknight (blocked until Matt's go).
- WebKit visual project needs host libs (`libgstgl`, etc.) on this box; Chromium covers the gate.

## How to re-check locally

```bash
cd /workspace/back-porch/wt-rc3
npm run check
npx playwright test --config=playwright.functional.config.mjs
npx playwright test --config=playwright.porch-night.config.mjs
npx playwright test # visual chromium
# Final shots under /workspace/back-porch/rc3/shots/final/
```
