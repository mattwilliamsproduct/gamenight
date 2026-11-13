# 90-second laptop demo path

Isolated Playwright profile. The app no longer boots sample data from `?demo`.

## How to open it

Use `tests/helpers/inject-book.mjs` (`openTestView(page, 'demo-path')`) or the rehearsal spec. `/?demo` is a no-op.

## Fixture

- Gallery / test id: `demo-path`
- Game: Five Crowns (low score wins), 11 hands
- Table: June, Theo, Rosa, Hank
- State at open: 10 hands in, next hand is 11 (last)
- Totals: June 38, Theo 36, Rosa 52, Hank 71 (Theo leads)
- History in the session starts empty so an unfinished match is never shown as a completed record

## Taps (same every time)

1. Open the injected last-hand table on laptop 1440x900 (phone 390 still works).
2. Confirm the card: June 38, Theo 36.
3. Enter scores, last hand, in seat order: 12, 5, 8, 4 (June's 12 is the obvious mistake).
4. Totals become June 50, Theo 41. Theo still first.
5. Tap June's last-hand cell. Change 12 to 0.
6. Totals become June 38, Theo 41. June is first. Point at June's total.
7. Hand 11 completes Five Crowns. Tap Leave game, then End game now. A finished night does not ask whether to count the result.
8. Open Records. June won with 38. The night is finished.

## Park and start another

Home can start the next game while one is still live. That opens the same Leave game choice.

1. Save for later keeps the table match unfinished and resumable. It does not ask about wins. The next game starts.
2. End game now finishes the table match first. If it has not reached its saved finish, Count this result is the only extra question.
3. Keep playing closes the choice and leaves the live match as it was.

Shots from the Leave game check: `/opt/cursor/artifacts/screenshots/leave-game/`.

Leave the wheel out of these 90 seconds.

## Isolation

A fresh browser profile holds the night. `?demo` does not write over a personal book on the same origin.
