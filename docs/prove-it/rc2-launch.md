# RC2 launch candidate prove-it

Copy into the PR. Production status: PENDING.

```
Scenarios opened (gallery ids):
home-party, five-crowns-late, records-book, demo-path (test inject), empty-home
Phone 390 look (Y/N): Y
Laptop look (Y/N): Y
Commands run + pass/fail:
npm run check pass
npx playwright test --config=playwright.functional.config.mjs 159 passed
npx playwright test (visual + WebKit) see report
Named backend cases:
scripts/test-demo-seed.mjs shipped page never boots demo-seed
scripts/test-records.mjs 1 night
scripts/test-backup.mjs mergeBackup
scripts/test-older-night.mjs older-format Rook save
tests/functional/launch-upgrade.spec.mjs
Gap list:
Real Safari on a phone. TV across the room. Matt visual polish on Home tiles.
Gate C Noul note (provider fallback): fallback. No Jev run on this freeze.
```
