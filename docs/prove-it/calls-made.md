# Calls made on the rc1-records draft

One row per product or taste call. Grok Bot audits these in the morning. Revert a call by `git revert <sha>`. Escalate only what Matt's goals cannot settle.

Cite rubric item ids. Section F is not decided here.

| Date | Call | Rubric | What changed | Before | After | SHA | Revert |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | REVERT first-click sample persist | A (temp demo removed before release); plan revision: onboarding/sample-data that writes a user's book is decision-list; E 90s demo is isolated `?demo` only | Reverted `f4090d5` (sample-night.js + empty-book persist docs). Discarded the uncommitted welcome card that called `saveData` on an empty book. | n/a | n/a | `af4be85` | `af4be85` |
| 2026-10-28 | Park Save & End and Actions on the board bar | B Scorecard nav; C no clipped menus; understandability of Table vs End vs Scratch | Move existing End + Actions into `.s2-board-actions`. Wording titles only. Scratch behavior unchanged. | hidden in `display:none` banner | visible beside Enter | `c47d12e` | |
| 2026-10-28 | Isolated `?demo&view=demo-path` last-hand walk | E 90s demo; A temp demo; decision-list sample persist stays off | Near-finished Five Crowns, June 12→0 flips first, then complete. No `gn_*` write. | n/a | `docs/prove-it/demo-path.md` | `d279298` | |
