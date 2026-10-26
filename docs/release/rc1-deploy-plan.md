# RC1 deploy plan

Do not run this plan until Matt says go. This PR stays draft.

Production host: https://cardknight.vercel.app

## Recoverable backup

1. Copy the current Vercel production Redis blob (`api/sync.js` one-key contract) to a dated hold. Name it with the production deploy id and the date.
2. Export a local `gn_history` / `gn_current` sample from a real porch iPad after that backup, so a rollback has both cloud and a device snapshot.
3. Keep the previous production deployment ready in Vercel. Do not delete it.

## Rollback

1. Instant rollback: promote the previous production deployment in Vercel.
2. If clients already wrote the new skin or Life Preserver auto-apply shape, restore the Redis blob from the dated hold, then hard-refresh the iPads so `sw.js` picks up the older shell.
3. Service worker: production ships `src/service-worker.js` via `npm run build` into `public/sw.js`. A rollback must ship the older worker template so `CACHE_NAME` still uses `back-porch-shell-__BACK_PORCH_RELEASE__` and still deletes other `back-porch-shell-*` caches.
4. Do not rewrite history rows. Assisted flags and `hailMaryUsed` stay as stored.

## Post-deploy smoke

1. Open production on a phone and a TV-distance laptop. Confirm Warm Porch Ledger is the default skin with no `?slice2`.
2. Resume an incomplete match. Confirm the live table was not clobbered.
3. Enter one 818 bid round. Confirm a blank dealer bid that equals the forbidden number is rejected the same as typing 0.
4. Use one Life Preserver. Confirm the result applies immediately, the match is assisted, and a second spin is blocked.
5. Open Records. Confirm Fame / Shame, no old Timeline / HOF / Records tabs, and "Unassisted matches only" only on best-match final scores.
6. If anything fails, roll back. Do not patch production in place on porch night.
