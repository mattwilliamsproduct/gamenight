# Phone scoreboard reach

Matt, 2026-11-07, on the RC4 phone scoreboard (`?demo=try`, Resume, mid-match Five Crowns). Two bugs in one pass, plus the header row he called out a few minutes later. Draft PR #85 only.

## Acceptance

- On a phone, every seated player on the live scoreboard can be reached. The demo Resume table ends at Marco. June is not the last visible rank with nowhere to go.
- The app nav (Table, Records, Profiles, Settings) stays visible and tappable on that phone scoreboard, including when the visual viewport is shorter than the layout viewport (Chrome with extra bottom chrome).
- The player list scrolls when the seats do not fit. A sticky header and a bottom nav may share the screen with that list.
- Phone only, one row, in this order: Home, Enter Score, Actions, Save & End. Home is the back control that used to read Table. They fit and stay tappable at 390 and 375. Labels stay whole. The row does not wrap. The phone nav still says Table. That is the app nav, not this back control.
- Laptop and iPad keep the current header, including `Enter Round N Scores` (or Bids / Tricks / Heat). Home drop-equal-heights stays as shipped in `3ef5477`.

## Anti-acceptance

- Bottom nav still missing, or the list still stops partway with no scroll.
- Clipping with overflow hidden, or a 100vh / 100dvh shell that ignores a shorter visual viewport.
- Hiding players, changing the demo cast, or shrinking rows until they happen to fit, as the fix.
- Truncating the four phone controls, or wrapping them back onto two rows.
- Changing the desktop or iPad header.
- Reverting Home. Start stays on screen at 1440×900 and 1280×800 for 0/4/8/9 seated.
- Undraft, merge, or a production deploy.

## What was wrong

`html` is `position: fixed; height: 100%; overflow: hidden`. On a phone active match, `#game-screen` was `max-height: 100dvh; overflow: hidden`, and `.landscape-only` was `overflow: hidden`, while `.scorecard-table-wrap` did not scroll. The Try a demo bar is fixed and pads the page, so a 100dvh game screen runs past the visible bottom. `#top-nav` is `display: none` for the whole active match, so the app nav is gone on the scoreboard. `100dvh` does not track a visual viewport that is shorter than the large viewport.

The phone header (`max-width: 767px`) stacked the board bar and wrapped `.s2-board-actions`, so the back control sat with the title, Enter Round N Scores and Actions shared a row, and Save & End wrapped. `enterLabel()` always used the long round label. There is no existing shorter label that means the same thing. Phone uses `Enter Score` (Bids / Tricks stay `Enter Bids` / `Enter Tricks` because those phases are a different action). Matt named the phone back control Home. Desktop and iPad keep `← Table` because that string is shared in the markup and the phone label is applied only under 760px.

## What fixed it

On a phone active match the app shell is fixed to the visual viewport (`visualViewport`, falling back to `100dvh`) and padded under the Try a demo bar. The scorecard wrap scrolls. `#top-nav` is shown at the bottom of that shell (Table, Records, Profiles, Settings). The four header controls are one grid row. Rows still size to the visible remainder, and they stop shrinking at 44px so a shorter viewport scrolls instead of clipping. Standings updated sits in the hint strip under that row (`--bp-board-bottom`), so the shorter header does not drop the toast onto the first total.

Later correction (2026-11-08): the back control says Home at iPad and laptop sizes too. It sits with the other actions so it does not indent the title. It still calls `leaveMatchToTable()`. See [rc4-ipad-landscape.md](rc4-ipad-landscape.md).
