# First click and the sample night

PR #59. The first thing a stranger sees is the product. Lessons from shipping it:

- **A sandbox is cheaper than a second store.** The sample night swaps the in-memory state and turns off every write at the choke points (`persistJsonIfChanged`, `_persistGamenightState`, `savePref`, the UI-scale writes, `canPorchCloud()`). Exit reloads. Do not add a parallel "demo" storage key or a restore step. A new write path must go through a choke point or check `gnSampleNight`.
- **Phone landscape is a desktop width with no height.** The one-screen lock is `@media (min-width: 761px)` with `height: 100dvh`. At 844×390 it squeezed the scorecard body to a sliver. Below 560px tall, Home and the match release the shell height and let the body scroll (`html` is `position: fixed`, so the body is the scroller). Only release the shell. Forcing `flex: 0 0 auto` on `.scorecard-live-main` (a row-flex child) made the round columns about 200,000px wide.
- **Measure names against the slot, not the cell.** `fitScorecardPlayerNames` returned early when a name ended left of the cell's right edge, but the name slot ends at the cell padding and hides overflow. The dealer pill lost its right edge at 1180px wide. It now also requires the name to fit the slot's available width.
- **Toasts are part of the first click.** A `nowrap` pill pinned at `left: 50%` gets cut off on a 390px phone. Phones wrap it now.
- **Seed demo data for the story.** The first seeds gave one player four wins and two players none, so Records led with a 10-game losing streak. Pick seeds so wins spread around the table, and lock that spread in a test.
- **Render the link preview from the product.** `npm run render:social-card` captures the live sample scorecard. Rerun it after a visual change to the scorecard so the preview never shows an older app.
- **Playwright reuses whatever is on port 4173.** If `npm run qa:gallery` is running from another worktree, the visual suite tests that tree. To compare against `main`, run its server on another port and set `PLAYWRIGHT_BASE_URL`.
