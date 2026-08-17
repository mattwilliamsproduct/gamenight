# Back Porch Release Checks

Run these after UI-affecting work and before a production push:

1. Run `npm run build && npm run check`.
2. Run `npm run test:visual`. It compares Home, scorecards, bid/score entry, Settings, Profiles, the Actions menu, WHAMMY, and Nolie against approved screenshots at iPad, laptop, and 1080p TV sizes.
3. When an intentional visual change is correct, run `npm run test:visual:update`, inspect the changed baselines, then rerun `npm run test:visual`.
4. For manual scenario review, run `npm run qa:gallery` and open `http://127.0.0.1:4173/?gnqa=1`. The gallery only starts on localhost and does not save fixture data.
5. On an installed iPad PWA, refresh once after deployment. A later deployment should show the in-app “Fresh version ready” prompt; choose Refresh and confirm the newest version is visible.

The score-entry checks are specifically meant to catch clipped player rows, keypad overlap, hidden menus, and any regression caused by display zoom.

Comeback UI checks (in `tests/visual/comeback-ui.spec.mjs`) also assert:

- both bottom-half blowout players get chips
- extras sit inside the round-score box, not floating under it
- Best/Worst use the same Bree Serif number font as round scores
- history scorecards include extras so rows still add up
- rename keeps extras on the new name
- score-entry preview matches the clamped extra that will actually apply
