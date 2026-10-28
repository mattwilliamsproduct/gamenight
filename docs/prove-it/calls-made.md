# Calls made on the rc1-records draft

One row per product or taste call. Grok Bot audits these in the morning. Revert a call by `git revert <sha>`. Escalate only what Matt's goals cannot settle.

Cite rubric item ids. Section F is not decided here.

| Date | Call | Rubric | What changed | Before | After | SHA | Revert |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | REVERT first-click sample persist | A (temp demo removed before release); plan revision: onboarding/sample-data that writes a user's book is decision-list; E 90s demo is isolated `?demo` only | Reverted `f4090d5` (sample-night.js + empty-book persist docs). Discarded the uncommitted welcome card that called `saveData` on an empty book. | n/a | n/a | `af4be85` | `af4be85` |
