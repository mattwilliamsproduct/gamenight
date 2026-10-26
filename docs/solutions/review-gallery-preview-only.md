# Review gallery is preview-only

What this is: a static `/review` page so Matt can browse every Back Porch screen and size instead of hand-testing. Tiles and Open live share one catalog of view ids (`home`, `scorecard-818`, `lifepreserver`, …).

What keeps it off production:

- Source lives in `preview-only/review/`, not in `public/`.
- `npm run build:review` copies it to `public/review/` only when `VERCEL_ENV !== 'production'` and the host is not `cardknight.vercel.app`.
- `middleware.js` 404s `/review` on production and the production alias even if files leak.
- `public/review/` is gitignored. `npm run test:review-gate` fails if git tracks it, if a production emit leaves files, or if the worker template precaches `/review`.

Regeneration: Playwright/Chromium is not reliable inside a Vercel build (no browser system libs). Preview builds emit the HTML/JS catalog. The page lazy-loads each view in an iframe, or a `public/review/shots/` PNG if `npm run review:shots` wrote one. After the RC `?demo&view=<id>` seed lands, Open live and shot capture use those same ids.

What not to repeat: do not commit screenshots or `public/review/` onto a branch that can promote to `cardknight.vercel.app`. Do not add `/review` to `src/service-worker.js`.
