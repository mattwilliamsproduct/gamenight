# RC1 bonus addendum

Branched from freeze tag `rc1-candidate-20261028-0538` (`a653174` docs / `c4841e3` app).  
Draft PR: #77. **Do not fold into #73 unless Matt asks.**

Frozen candidate stays PR #73. Pin: `gamenight-7voetuyns-mattwilliamsproducts-projects.vercel.app`.

Bonus app head: `bcc63f4`. Docs may sit on a later sha; they do not change the app.

## Landed

| SHA | Problem | Benefit | Verify | Before / after |
| --- | --- | --- | --- | --- |
| `f8ee3ac` | Standings updated sat on Rosa/Hank totals after the freeze park | Toast in the header band, misses totals | phone-conditions toast vs totals | freeze strip 03–04 vs bonus `03-corrected` |
| `a929a71` | Toast still on Records frame 05 | `clearToasts()` on `navigateTo` | phone-conditions “toast leaves when Records opens”; reshot 05 | `bonus-fixes/before/05-records-{390,375}.png` / `after/05-records-{390,375}.png` and rehearse `05-records.png` |
| `3ea2375` | Ledger said `1 nights` | `formatNightCount` → `1 night` / `N nights` | `test-records` golden 0/1/2/11 | same 05 pair: “1 nights” → “1 night” |
| `7942378` + `20c6adf` | 390 frame 01 R9/R10/R11 cells clipped | Now column shares leftover width; keep one past hand on phone | phone-conditions 375+390 round cells | `before/01-open-390.png` (R9–R11 squeezed) / `after/01-open-390.png` (R10+R11 readable) |
| `bcc63f4` | Keeping that last past hand left Mike’s +40 on a 43px cell | Park LP on Total when the followed cell is under 44px | `life-preserver-visible` 5/5 | same park-on-Total rule, floor matches the phone round column |

## Dealer on frame 01 (no CSS change)

Hank’s outlined name pill is the **dealer chip**, not leftover focus.

- Header: `Dealer: Hank`
- `button.dealer-name-indicator` + `.dealer-player-label` emerald inset ring
- Avatar `D` badge (`scorecard-dealer-avatar-badge`)
- `nameFocused: false` in the probe
- Taste already says the dealer chip hugs the letters. Adding the word “dealer” next to Hank would fight NAME-FIT, so the chip stayed as-is.

The outlined/dashed **4th** is `.scorecard-life-preserver-rank` (Life Preserver available candy-stripe), plus `.is-place-rest`. Not `:focus`. Not the dealer mark.

Before/after: `bonus-fixes/before/01-open-{390,375}.png` and `after/01-open-{390,375}.png`. The pill and 4th stripe are unchanged; 390 after only drops R9 so the last-hand cells read.

## Not landed / candidate

- **1440 past-night + End match look like small centered boxes.** End match already uses the form token (`min(92vw, 46rem)`) — taste like and `rc1-modal-size-system`. Past-night already uses `--bp-modal-wide` and `modal-size.spec.mjs` asserts ≥80% width at 1024/1440. Making End match wheel-wide would break the form/confirm/wide split. Height fill is more than modal sizing. **Leave on the candidate list; no bonus CSS.**
- Laptop look of the bonus toast
- Fold-in to the frozen candidate

## Verify on this branch (`bcc63f4`)

- `npm run check` pass
- `test:functional` **153/153** (toast-dismiss case added)
- `phone-conditions` 13/13
- `demo-path` 2/2 (inside functional)
- `life-preserver-visible` 5/5
- `test:porch-night` 2/2
- Demo rehearse 390×3 + 375×3, all June 38 / Theo 41, frame 05 toast-free, “1 night”

Strips: `/opt/cursor/artifacts/screenshots/demo-rehearse-bonus/strip-390x844.png` and `strip-375x667.png`.  
Frame 05 prove-it: `/opt/cursor/artifacts/screenshots/bonus-fixes/after/05-records-390.png` and `05-records-375.png`.

## Preview

Pinned bonus app (`bcc63f4`, GitHub deployment 7382362075): `gamenight-biidur5p2-mattwilliamsproducts-projects.vercel.app`  
Not the git-branch alias. SSO 302. Earlier toast-only pin `gamenight-47taq5jg2-...` is stale.

## Status

Bonus still open until ~9:15 AM ET if more small items land. These two requested items (toast dismiss + dealer diagnosis) are in. Candidate tag untouched.
