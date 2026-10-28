# Decisions for Matt (overnight inspection)

Canonical table: [`docs/decisions-for-matt.md`](../decisions-for-matt.md). Section F stays OPEN. Nothing below was shipped as a product lock.

| Id | Question | Recommendation | Why it stays with Matt |
| --- | --- | --- | --- |
| sample-night-prod | Offer “Try a sample night” on a production empty home? | **No** on this candidate. Isolated `/?demo&view=demo-path` only. | Onboarding that writes a user’s book. |
| 3c-undo-end | Undo a confirmed Save & End? | Keep confirm + no undo-end. Recover only if they Cancel. | Destructive action. |
| 2e-tv-couch | Are 1920 names + totals readable from a couch? | Layout holds; you judge the 10-foot read. | Taste. Shot is layout-only. |
| 6b-shame | Shame playful not mean? | Leave Overview / Explore split. | F. |
| 200pct-avatars | Hide scorecard avatars at 200% so June/Theo stay whole words? | Leave avatars. 200% now keeps places + totals + name glyphs in view. | Density vs identity. |
| 9c-profiles | Drop Profiles / Explore for a first-timer? | Leave them. | Subtraction. |
| 7f-quota | Storage full / blocked (`QuotaExceededError`) has no toast; persist throws through. | **No code change on this candidate.** After gate: catch around `localStorage.setItem`, keep RAM state, toast that the browser is out of room. Do not prune history automatically. | Storage path. Plan revision: leave persist/backup compatibility alone. |
| 9b-settings-extras | Kill Lineup Intro, Post-Game Path Replay, or Paste JSON? | Keep them this candidate. Settings already scrolls on 375; Backup/Restore stay. | Subtraction. Easy extras, not blockers. |
