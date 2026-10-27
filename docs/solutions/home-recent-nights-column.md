# Home columns and seating

Matt did not like the white leftover between Tonight's Table and Recent nights at laptop width. He then said not to move Recent nights into the left column. Tonight's Table should fill the left column down to the bottom of Start a New Match, and it should spend that height on people.

## Rule

Two-column Home starts at 861px (the existing `max-width: 860px` stack). Both cards stretch to the same row height. Extra height on the left grows the single-column seat list (`minmax(44px, 1fr)`). Extra height on the right grows the game tiles. Recent nights stays full width below both.

Seating is one player per row: seat number, avatar, name, dealer badge, up/down, remove to on deck, and a drag handle. There is no Edit Seating control. Drag starts from the handle only (`touch-action: none` on the handle). Keyboard: focus the handle, Space to grab, arrows to move, Space to drop, Escape to cancel. An `aria-live` region announces the new seat.

Home reorder only writes the `players` lineup (same `saveData` path as before). It does not change `currentGame.originalRoster` or the live dealer rotation.

Phone stays Table, then Start, then nights.

## Rook podium

Recent nights uses `BPGRecords.nightPodium`, which calls the same `sortPlayersByTotal` + `competitionPlaces` helpers as Records. Rook has no separate team object: partners share a total, so they share 1st, and the other pair takes the next competition place (usually 3rd). Incomplete nights stay labeled Incomplete with no podium.

## Kill

Dead leftover height between the two Home columns, empty padding inside those cards, or an Edit Seating extra step when the list can move in place.
