# RC2 launch candidate prove-it

Copy into the PR. Production status: PENDING until Matt approves deploy. This freeze is `rc2-candidate-20261029-1605` on `cursor/rc2-launch`. Old tags `rc2-candidate-20261029-0251`, `rc2-candidate-20261029-0423`, `rc2-candidate-20261029-1400`, and `rc2-candidate-20261029-1505` stay put.

```
Scenarios opened (gallery ids):
empty-home, empty-records, home-party, five-crowns-4, five-crowns-late, five-crowns-late-8, records-book
Phone 390 look (Y/N): Y
Laptop look (Y/N): Y
Commands run + pass/fail:
npm run check pass
npx playwright test --config=playwright.functional.config.mjs 173 passed, 0 failed, 0 skipped
npx playwright test (visual + WebKit) 153 passed, 105 skipped, 0 failed
npx playwright test --config=playwright.porch-night.config.mjs 2 passed, 0 failed, 0 skipped
Named backend cases:
scripts/test-card-picker.mjs six hidden-Rook faces, no tapstart, no demo seed
scripts/test-demo-seed.mjs shipped page never boots demo-seed; no BPGDemoLiveGame / bootDemoSeedIfRequested / BPG_LP_TABLE
scripts/test-demo-art.mjs demo-art not shipped; CARD_FACES still work
scripts/test-backup.mjs mergeBackup
scripts/test-older-night.mjs older-format Rook save
tests/functional/life-preserver.spec.mjs ?lp=proposed removed, live help stays current 0.80
tests/functional/scorecard-table.spec.mjs late NOW is R11 Now and not clipped
tests/functional/tablet-entry.spec.mjs 1024 headline 3-col, 390 muted 3 rows, no leftover teal
tests/functional/launch-upgrade.spec.mjs
tests/functional/rehearsal-90s.spec.mjs
tests/functional/older-night.spec.mjs
Gap list:
Real Safari on a phone. TV across the room. Phone Home Start stays below the cards (scroll). 390 Records headline stacks (phone).
Gate C Noul note (provider fallback): fallback. No Jev run on this freeze. Conservative pass. Do not undraft or merge.
```

## Isolated walks

Clean first use: `empty-home` and `?wipe=1`. Copy says add a name, pick a game, tap Start. No sample CTA. `?demo` writes nothing.

Populated path: Playwright `rehearsal-90s` plus gallery `five-crowns-4` / `five-crowns-late` / `home-party` / `records-book`. Upgrade path: `launch-upgrade` and `older-night` restore a prior-format book.

`?lp=proposed` is removed, not harmless. It used to switch live Life Preserver math to the proposed table. The page always uses current.

## Look order

1440, then 1024 landscape, then 390. Final-commit shots live under `/opt/cursor/artifacts/screenshots/rc2-final3/` and `artifacts/screenshots/rc2-final3/`.
