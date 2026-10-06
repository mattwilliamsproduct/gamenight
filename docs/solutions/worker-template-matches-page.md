# Worker template matches the page

What broke: `npm run build` copies `src/service-worker.js` over `public/sw.js`. The committed worker already precached Life Preserver. The template still listed `comeback-logic.js` and omitted `life-preserver-logic.js`. Vercel runs that build. After the #53 docs merge, production `https://cardknight.vercel.app/sw.js` shipped the Turbo shell (`back-porch-shell-c7740f8…`).

What fixed it: put Life Preserver on the template, drop Turbo from the precache, and make `verify-production-assets.mjs` fail when the template, the built worker, and the page script tags disagree.

What not to repeat: editing only `public/sw.js`, or bundling this build-correctness fix inside a game-behavior PR that waits for a morning click. The next main deploy will ship whatever is in the template.
