# RC2 QA deep links

`cursor/rc2-qa-links` only. Never merge this branch onto `cursor/rc2-launch` or main. The freeze at `6500992` / `rc2-candidate-20261029-1605` stays untouched.

This branch uses the exact `6500992` application code. Only `public/qa/*`, tests, and docs may differ. `public/index.html`, `public/assets/*`, `api/*`, and `vercel.json` stay byte-identical to the freeze.

`?gnqa=1&scenario=qa-*` hydrates a fictional porch book in this tab. Gallery chrome stays hidden. `qa-*` sets `__GN_DEMO_SKIP_PERSIST` so dummy data does not write `gn_*`. Dummy data is not Matt's personal book.

Batch 1 links live in `QA_LINKS` (`public/qa/fixtures.mjs`). Extra surfaces (Records panes, Shame scroll, Life Preserver) are opened from `public/qa/gallery.mjs` using existing page APIs. Batch 2 adds more ids on the same branch.
