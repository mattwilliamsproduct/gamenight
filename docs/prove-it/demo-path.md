# 90-second phone demo path

Isolated preview session. Does not write into a personal book.

## Exact link

`/?demo&view=demo-path`

Allowed hosts: localhost, 127.0.0.1, and `*-mattwilliamsproducts-projects.vercel.app`. `cardknight.vercel.app` ignores `?demo`.

## Fixture

- Gallery / demo id: `demo-path`
- Game: Five Crowns (low score wins), 11 hands
- Table: June, Theo, Rosa, Hank
- State at open: **10 hands in**, next hand is 11 (last)
- Totals: June **38**, Theo **36**, Rosa **52**, Hank **71** (Theo leads)
- History in the session starts empty so an unfinished match is never shown as a completed record

## Taps (same every time)

1. Open the link on a 390×844 phone. Banner reads "Sample night · not saved on this device."
2. Confirm the card: June 38, Theo 36.
3. Enter scores → last hand, in seat order: **12, 5, 8, 4** (June's 12 is the obvious mistake).
4. Totals become June **50**, Theo **41**. Theo still first.
5. Tap June's last-hand cell. Change **12 → 0**.
6. Totals become June **38**, Theo **41**. June is first. Point at June's total.
7. Hand 11 completes Five Crowns. Tap **End Match & See Winner** (or Save & End) → confirm.
8. Open Records. June won with 38. The night is completed.

Leave the wheel out of these 90 seconds.

## Isolation checks

- `localStorage.gn_history` is not written by this session.
- A device that already has a Wizard night keeps that night on disk while the sample runs in memory.
- Refresh without the demo link returns the personal book.

## Playwright

`npx playwright test --config=playwright.functional.config.mjs tests/functional/demo-path.spec.mjs`

Frame strip: `/opt/cursor/artifacts/screenshots/demo-path/390-*.png`
