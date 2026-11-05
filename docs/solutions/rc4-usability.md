# RC4 usability

Matt reviewed `2745bfa` on a laptop with `/?demo=try`. These are the standing traps from that pass.

## Scorecard width

The live card and the match header share `min(62rem, calc(100% - 2.5rem))` (~992px) on laptop. The visible table fills that card before and after Round 1. Do not hug the table to `max-content`, do not stretch the card to the viewport, and do not measure only the card box. The player column takes leftover width. Total and round columns stay fixed. Do not leave a blank or tinted trailing band. Two-digit late-game chips size to the fitted cell; do not lock them to a 50px token that overflows a 45px column, and do not reserve 60px per hand if that hides R1. Displayed records, passport, and scorecard numbers use at most one decimal place. Passport chips are one-line sentences (`Only player to score, twice`, `Won the last 3 matches`). A four-way tie is a shared night: no loser is named. A tied last place says share last. A tied win names every winner. Phone stays full width.

## Nine-seat wrap

A second-column wrap of Tonight's Table at ~9 seats did not reproduce at 2, 3, 4, 8, 9, or 10 seats across 1440, 1280, 1024, 390, and 375. Seats stay one column. The ninth seat can sit below the fold. Do not "fix" a wrap that is not there.

## Passport filter

One meaning: the filter scopes the stats. Every number on Passports becomes that game only. Players with no games of that type are left out, with a leftover note. Label the scope in the UI. Do not leave career-wide games/wins/rate on a filtered card.

## One counting rule

Passports, Records, wins, win %, streaks, and games share `BPGRecords.careerWinTally`. Finished nights only. Every tied winner gets a win. Unfinished, incomplete, and reopened-not-completed nights are out of wins, win %, and games. A left-early player keeps their scores and the game, never the win. The remapped demo Rook night marks Theo left early; winners stay Nora and Owen. See `artifacts/rc4-win-tally.md`.

## Demo records

Sample records must be computed by the real records functions from seeded games. Incomplete nights do not count until finished. Assisted nights follow the existing book rules. Do not plant headline numbers.

## Safari

A Playwright walkthrough is not a real-phone Safari check. Leave that pending for Matt.
