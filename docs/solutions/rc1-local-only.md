# RC1 local-only

Matt’s release is this browser on this device. Same draft. Cloud stays parked.

## What changed

- The porch password UI is gone. `canPorchCloud()` is always false. `pullPorchCloud`, `pushPorchCloud`, and `schedulePorchPush` do not fetch. Boot reads `gn_history` / `gn_current` and leaves `gn_porch_key` alone.
- `api/sync.js` and Redis `gamenight:backup:v1` stay shipped and untouched. No client path GETs, PUTs, or deletes that key.
- Settings and Records say scores are saved in this browser on this device. Backup / Restore are the copy path. Restore copy matches `mergeBackup`, including that a file’s live match replaces the table.
- The save chip says "Saved on this device".

## What not to repeat

- Do not call `/api/sync` from the client on this release.
- Do not delete `gn_porch_key`. Ignore it.
- Do not PUT or DELETE the production Redis blob, and do not rotate Vercel env vars, for a "cleanup".
- Do not tell the host Restore never replaces anything. Exports always send `currentGame`.
