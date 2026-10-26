# RC1 deploy plan

Do not run this plan until Matt says go. This PR stays draft.

Production host: https://cardknight.vercel.app

Cloud sync is off this release. Do not touch production Redis or Vercel env vars. Do not PUT, DELETE, or rotate `GN_SYNC_PASSWORD`. `#37` stays parked.

## Recoverable backup

1. Leave the production Redis blob (`gamenight:backup:v1` via `api/sync.js`) untouched.
2. Optional read-only copy: GET the existing cloud save once and write it to a dated file named with the production deploy id and the date. Never write or delete the key.
3. Export a local `gn_history` / `gn_current` sample from a real porch iPad, so a rollback has a device snapshot.
4. Keep the previous production deployment ready in Vercel. Do not delete it.

## Rollback

1. Instant rollback: promote the previous production deployment in Vercel.
2. Do not restore or rewrite the Redis blob. This release does not write it.
3. Service worker: production ships `src/service-worker.js` via `npm run build` into `public/sw.js`. A rollback must ship the older worker template so `CACHE_NAME` still uses `back-porch-shell-__BACK_PORCH_RELEASE__` and still deletes other `back-porch-shell-*` caches.
4. Do not rewrite history rows. Assisted flags and `hailMaryUsed` stay as stored.

## Post-deploy smoke

1. Open production on a phone and a TV-distance laptop. Confirm Warm Porch Ledger is the default skin with no `?slice2`.
2. Settings has no porch password. Backup and Restore are visible. The page says scores are saved in this browser on this device.
3. Resume an incomplete match. Confirm the live table was not clobbered.
4. Enter one 818 bid round. Confirm a blank dealer bid that equals the forbidden number is rejected the same as typing 0.
5. Use one Life Preserver. Confirm the result applies immediately, the match is assisted, and a second spin is blocked.
6. Open Records. Confirm Fame / Shame, the local-storage sentence, and "Unassisted matches only" only on best-match final scores.
7. Confirm the browser network log makes no `/api/sync` calls.
8. If anything fails, roll back. Do not patch production in place on porch night.
