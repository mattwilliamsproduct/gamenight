# RC2 launch candidate prove-it

Copy into the PR. Production status: PENDING until the new freeze tag is on the preview.

```
Scenarios opened (gallery ids):
home-party, five-crowns-late, five-crowns-comeback, five-crowns-4, wizard-10, records-book, empty-home
Phone 390 look (Y/N): Y
Laptop look (Y/N): Y
Commands run + pass/fail:
npm run check pass
npx playwright test --config=playwright.functional.config.mjs 161 passed (includes launch-upgrade and 90s rehearsal)
npx playwright test (visual + WebKit) 153 passed, 105 skipped, 0 failed
Named backend cases:
scripts/test-demo-seed.mjs shipped page never boots demo-seed
scripts/test-records.mjs formatPlural and hidden Rook ledger
scripts/test-backup.mjs mergeBackup
scripts/test-older-night.mjs older-format Rook save
tests/functional/launch-upgrade.spec.mjs
tests/functional/rehearsal-90s.spec.mjs
tests/functional/tablet-entry.spec.mjs
Gap list:
Real Safari on a phone. TV across the room. 1024 eight-player entry shows 6 of 8 rows and scrolls. 1024 Home Start sits below the fold with 6 seats. Matt visual polish on Home tiles.
Gate C Noul note (provider fallback): fallback. No Jev run on this freeze.
```
