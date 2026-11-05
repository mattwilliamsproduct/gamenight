# RC4 usability

Matt reviewed `2745bfa` on a laptop with `/?demo=try`. These are the standing traps from that pass.

## Scorecard width

Do not hug the card to `max-content` after Round 1, and do not stretch it to the viewport before Round 1. The card keeps `min(90rem, calc(100% - 2.5rem))` on laptop and stays the same width before and after the first hand. Phone stays full width. Column fit still happens inside the card.

## Nine-seat wrap

A second-column wrap of Tonight's Table at ~9 seats did not reproduce at 2, 3, 4, 8, 9, or 10 seats across 1440, 1280, 1024, 390, and 375. Seats stay one column. The ninth seat can sit below the fold. Do not "fix" a wrap that is not there.

## Passport filter

One meaning: the filter scopes the stats. Every number on Passports becomes that game only. Players with no games of that type are left out, with a leftover note. Label the scope in the UI. Do not leave career-wide games/wins/rate on a filtered card.

## Demo records

Sample records must be computed by the real records functions from seeded games. Incomplete nights do not count until finished. Assisted nights follow the existing book rules. Do not plant headline numbers.

## Safari

A Playwright walkthrough is not a real-phone Safari check. Leave that pending for Matt.
