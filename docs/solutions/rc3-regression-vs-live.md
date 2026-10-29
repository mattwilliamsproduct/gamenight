# rc3 candidate vs live (wt-main)

| Ref | Path / SHA | Role |
| --- | --- | --- |
| LIVE | `/workspace/back-porch/wt-main` @ `39e6b51` | What cardknight runs from main |
| RC3 | `/workspace/back-porch/wt-rc3` branch `cursor/rc3-candidate` @ `17eae07` | Local repair candidate (no push) |

Compared by reading both trees and the rc3 defect list. No prod deploy. No dashboard links.

## What rc3 keeps from live

- Same palette and approved card art paths under `public/assets/cards/`.
- Same game registry ids and winLow rules.
- Settings controls that live already has (text size, lineup intro, path replay, dealer roll, Porch Cloud, export/import) still present outside demo.
- History storage shape unchanged for departed players (item 4: hide from active card and placements; do not purge scores or rewrite stored nights).

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

## Risks / open deltas (not claimed fixed)

- Full visual parity of every Records tile vs live art direction is not re-audited tile-by-tile in this pass.
- L16-style life-preserver codes were not found as user-facing profile labels in this tree; only WHAMMY/Nolie badges were rewritten.
- Live still has older scorecard chrome; merging rc3 is a product decision, not done here.
- No signed-out prod smoke on cardknight (blocked until Matt's go).

## How to re-check locally

```bash
cd /workspace/back-porch/wt-rc3
npx playwright test tests/functional/rc3-acceptance.spec.mjs tests/functional/try-demo.spec.mjs
# Final shots under /workspace/back-porch/rc3/shots/final/
```
