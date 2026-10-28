# Calls made on the rc1-records draft

One row per product or taste call. Grok Bot audits these in the morning. Revert a call by `git revert <sha>`. Escalate only what Matt's goals cannot settle.

Cite rubric item ids. Section F is not decided here.

| Date | Call | Rubric | What changed | Before | After | SHA | Revert |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | REVERT first-click sample persist | A (temp demo removed before release); plan revision: onboarding/sample-data that writes a user's book is decision-list; E 90s demo is isolated `?demo` only | Reverted `f4090d5` (sample-night.js + empty-book persist docs). Discarded the uncommitted welcome card that called `saveData` on an empty book. | n/a | n/a | `af4be85` | `af4be85` |
| 2026-10-28 | Park Save & End and Actions on the board bar | B Scorecard nav; C no clipped menus; understandability of Table vs End vs Scratch | Move existing End + Actions into `.s2-board-actions`. Wording titles only. Scratch behavior unchanged. | hidden in `display:none` banner | visible beside Enter | `c47d12e` | |
| 2026-10-28 | Isolated `?demo&view=demo-path` last-hand walk | E 90s demo; A temp demo; decision-list sample persist stays off | Near-finished Five Crowns, June 12→0 flips first, then complete. No `gn_*` write. | n/a | `docs/prove-it/demo-path.md` | `d279298` | |
| 2026-10-28 | Isolated demo hides the device-save chip; clamp finished header to last real round | C honest save indicator; C header one line | `__GN_DEMO_SKIP_PERSIST` hides "Saved on this device" so it cannot contradict the sample banner. Finished Five Crowns no longer reads "Round 12 of 11". | 390-02-mistake (12 of 11) | demo strip after `facb8d1` | `facb8d1` | |
| 2026-10-28 | Interrupted-entry coverage for Table-and-back and double Submit | D tonight's match survives; plan-revision interrupted-entry check | New Playwright cases only. No scoring change. | n/a | n/a | `79c80f5` | |
| 2026-10-28 | Board Table / Enter min-height 40→44 | C tap targets; 2b one-hand phone | Existing board-bar buttons already visible; only the 40px floor moved to 44. No copy or scoring change. | `phone-conditions/demo-board-390-before.png` | `phone-conditions/demo-board-390-after.png` | `ed52eb4` | |
| 2026-10-28 | Keep Player + Total on the 390 card at 200% type | C no clip; NAME-FIT on screen, not only in-cell | Row-fit uses the visible remainder. Phone Slice 2 applies fit-row heights, a vw Player floor, and a real name-slot width. Board chrome type is px-capped. | `phone-conditions/demo-path-390-200pct-before.png` | `phone-conditions/demo-path-390-200pct-after.png` | `7c7c80b` | |
| 2026-10-28 | Emoji name no longer crashes the roster | C no throw on add; 4e emoji path | `getAvatarFallback` uses the first code point, not `charAt(0)`. | n/a | `edge-states` emoji seat | `79fed74` | |
| 2026-10-28 | Keep Scratch (discard) on the phone Actions menu | C no clip; leave vs end vs discard | Pin `#actions-menu` `position:fixed` so `#game-screen` overflow cannot cut the last item. Item floor 44px. | `discard-actions-375-before.png` / `390-before` | `discard-actions-375-after.png` / `390-after` + phone-conditions | `4a2f666` | |
| 2026-10-28 | Keep all four names above Match Complete on 375 | C no clip; demo-path money frame | Row-fit subtracts the complete banner. Phone name/total caps. Tighter banner padding. | `complete-375-before.png` / `390-before` | `complete-375-after.png` | `95513b5` | |
| 2026-10-28 | Show four-digit Canasta totals in entry | C no clip; large totals | Widen the entry Total column and stop ellipsizing the value. 3695/1430 stay whole. | `canasta-entry-375-before.png` / `1440-before` | `canasta-entry-375-after.png` / `1440-after` | pending | |
