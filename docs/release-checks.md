# Back Porch Release Checks

Run these after UI-affecting work and before a production push:

1. Run `npm run build && npm run check`.
2. Open the built `public` directory at 1280 x 720 and 1024 x 768. Check Home, Profiles, a bid modal, a score-entry modal, the Actions menu, and a completed-match ceremony.
3. On an installed iPad PWA, refresh once after deployment. A later deployment should show the in-app “Fresh version ready” prompt; choose Refresh and confirm the newest version is visible.

The score-entry checks are specifically meant to catch clipped player rows, keypad overlap, hidden menus, and any regression caused by display zoom.
