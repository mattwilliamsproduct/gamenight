# RC2 launch candidate prove-it

Copy into the PR. Production status: PENDING until the new freeze tag is on the preview.

```
Scenarios opened (gallery ids):
empty-home, home-party, five-crowns-4, five-crowns-late-8, records-book
Phone 390 look (Y/N): Y
Laptop look (Y/N): Y
Commands run + pass/fail:
npm run check (pending final commit)
npx playwright test --config=playwright.functional.config.mjs (pending final commit)
npx playwright test (visual + WebKit) (pending final commit)
Named backend cases:
scripts/test-card-picker.mjs six hidden-Rook faces, no tapstart, no demo seed
scripts/test-demo-seed.mjs shipped page never boots demo-seed
scripts/test-backup.mjs mergeBackup
tests/functional/card-picker.spec.mjs
tests/functional/tablet-entry.spec.mjs
tests/functional/launch-upgrade.spec.mjs
Gap list:
Real Safari on a phone. TV across the room. 1024 Records Overview stacks career stats. Phone Home Start stays below the cards (scroll).
Gate C Noul note (provider fallback): fallback. No Jev run on this freeze.
```
