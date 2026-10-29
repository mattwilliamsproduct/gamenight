# RC2 launch candidate prove-it

Copy into the PR. Production status: PENDING until Matt approves deploy. This freeze is `rc2-candidate-20261029-1505` on `cursor/rc2-launch`. Old tags `rc2-candidate-20261029-0251`, `rc2-candidate-20261029-0423`, and `rc2-candidate-20261029-1400` stay put.

```
Scenarios opened (gallery ids):
empty-home, empty-records, home-party, five-crowns-4, five-crowns-late, five-crowns-late-8, records-book
Phone 390 look (Y/N): Y
Laptop look (Y/N): Y
Commands run + pass/fail:
npm run check pass
npx playwright test --config=playwright.functional.config.mjs 171 passed, 0 failed, 0 skipped
npx playwright test (visual + WebKit) 153 passed, 105 skipped, 0 failed
npx playwright test --config=playwright.porch-night.config.mjs 2 passed, 0 failed, 0 skipped
Named backend cases:
scripts/test-card-picker.mjs six hidden-Rook faces, no tapstart, no demo seed
scripts/test-demo-seed.mjs shipped page never boots demo-seed
scripts/test-backup.mjs mergeBackup
scripts/test-older-night.mjs older-format Rook save
tests/functional/card-picker.spec.mjs Saved chip inset
tests/functional/scorecard-table.spec.mjs NOW inside wrap, late card all hands
tests/functional/tablet-entry.spec.mjs muted subtitle, no SCORE/Blank overlap, no leftover teal
tests/functional/launch-upgrade.spec.mjs
tests/functional/rehearsal-90s.spec.mjs
tests/functional/older-night.spec.mjs
Gap list:
Real Safari on a phone. TV across the room. 1024 Records Overview stacks career stats. Phone Home Start stays below the cards (scroll).
Gate C Noul note (provider fallback): fallback. No Jev run on this freeze. Conservative pass. Do not undraft or merge.
```

## Isolated walks

Clean first use: `empty-home` and `?wipe=1`. Copy says add a name, pick a game, tap Start. No sample CTA. `?demo` writes nothing.

Populated path: Playwright `rehearsal-90s` (Theo/June last hand, June 12 to 0, June wins at 38) plus gallery `five-crowns-4` / `five-crowns-late` / `home-party` / `records-book`. Upgrade path: `launch-upgrade` and `older-night` restore a prior-format book.

## Look order

1440, then 1024 landscape, then 390. Final-commit shots live under `/opt/cursor/artifacts/screenshots/rc2-final2/`.
