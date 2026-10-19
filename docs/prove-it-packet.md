# Prove-it packet

Copy this template into the PR before any ready-to-test language. Fill every field. An empty field blocks the post. "Ready", "ready to test", and "ready for Matt" wait on a filled copy.

Gallery scenarios are the UI prove-it surface. Start the gallery with `npm run qa:gallery` and open `http://127.0.0.1:4173/?gnqa=1&scenario=<id>`. The id is a key in `QA_SCENARIOS` inside `public/qa/fixtures.mjs`, for example `five-crowns-name-fit-7`, `wizard-scoring-8`, or `eight18-porch-lp`. The gallery starts only on localhost and does not save fixture data.

A UI change names the ids you opened. If no scenario covers the slice, add one in the same change and name the new id here.

A scoring or sync change names the golden CLI case. Extend `scripts/test-life-preserver.mjs`, `scripts/test-comeback.mjs`, or `scripts/test-backup.mjs`, or add `scripts/test-<slice>.mjs` and wire that script into the `check` script in `package.json`. `npm run check` must run it. A gallery look does not replace that test.

Docs-only work still uses the template. Write `none` for scenarios and backend cases, `N` for the looks, and say why in the gap list.

Gate C uses the filled packet. Record provider `jev` or `fallback` in the last field, and append the same call to `docs/solutions/gate-log.md`. Rules: `docs/jev-gates.md`.

## Template

```
Scenarios opened (gallery ids):
Phone 390 look (Y/N):
Laptop look (Y/N):
Commands run + pass/fail:
Named backend cases:
Gap list:
Gate C Noul note (provider jev|fallback):
```

## Fields

- **Scenarios opened.** Gallery ids, or `none` with a reason. Include the surface when it is not the scenario default, as in `wizard-scoring-8` on `entry-scores`.
- **Phone 390 look.** `Y` or `N`. `Y` means you looked at the changed screen at 390 CSS pixels wide. `N` belongs in the gap list.
- **Laptop look.** `Y` or `N`. `Y` means you looked at the changed screen at a laptop width. `N` belongs in the gap list.
- **Commands run + pass/fail.** Each command and `pass` or `fail`. A code change includes `npm run check`. A snapshot change includes `npm run test:visual`.
- **Named backend cases.** The test or script name that locks the scoring or sync behavior. `none` is allowed only when the diff has no scoring or sync behavior, and the gap list says so.
- **Gap list.** What you did not open. `none` is a filled answer.
- **Gate C Noul note.** Provider `jev` or `fallback`. A `jev` note includes the Noul score. A `fallback` note does not invent a score. See `docs/jev-gates.md`.
