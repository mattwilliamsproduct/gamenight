# RC1 local-only

Matt’s release is this browser on this device. Same draft. Cloud stays parked.

## What changed

- The porch password UI is gone. `canPorchCloud()` is always false. `pullPorchCloud`, `pushPorchCloud`, and `schedulePorchPush` do not fetch. Boot reads `gn_history` / `gn_current` and leaves `gn_porch_key` alone.
- `api/sync.js` and Redis `gamenight:backup:v1` stay shipped and untouched. No client path GETs, PUTs, or deletes that key.
- Settings and Records say scores are saved in this browser on this device. Backup / Restore are the copy path. Restore copy matches `mergeBackup`, including that a file’s live match replaces the table.
- The save chip says "Saved on this device".
- Entry and Restore errors use `#score-entry-error` / `#backup-inline-msg`. Past-cell errors stay on `#numpad-error`. Do not put those back on `alert()`.
- Retired seats still count in display via `getDisplayPlayers` plus a Retired badge. Win / HOF math still uses `getRecordedPlayers`.
- The Rook contract editor at phone width scrolls inside `#rook-round-panel` so the CTA is not clipped by the locked scorecard shell.
- Do not lock the 390 roster to a fixed rem height. The keypad and the Cancel / Review / Submit footer keep their space first. Three roster rows are leftover space, not a reservation.
- `#slice2-score-legend { display: flex }` beats the `hidden` attribute. Hide Exact bid with `[hidden] { display: none }` and only write that copy for Wizard / 818.

## What not to repeat

- Do not call `/api/sync` from the client on this release.
- Do not delete `gn_porch_key`. Ignore it.
- Do not PUT or DELETE the production Redis blob, and do not rotate Vercel env vars, for a "cleanup".
- Do not tell the host Restore never replaces anything. Exports always send `currentGame`.
