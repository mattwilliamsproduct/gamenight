# Home columns and seating

Matt did not like leftover height between Tonight's Table and Start a New Match. He said not to move Recent nights, and to drop the `?home=a/b` flags. Tonight's Table fills the left column down to the bottom of Start a New Match and spends that height on people.

## Rule

Two-column Home starts at 861px (the existing `max-width: 860px` stack). Both cards stretch to the same row height. Extra height on the left grows the single-column seat list (`minmax(52px, 1fr)`), with larger avatars, names, and seat numbers, and a roomier bench and add-player row. Extra height on the right grows the game tiles. Recent nights stays full width below both.

Seating is one player per row: seat number, avatar, name, dealer badge, up/down, remove to on deck, and a drag handle. There is no Edit Seating control. Drag starts from the handle only (`touch-action: none` on the handle). Keyboard: focus the handle, Space to grab, arrows to move, Space to drop, Escape to cancel. An `aria-live` region announces the new seat.

Home reorder only writes the `players` lineup (same `saveData` path as before). It does not change `currentGame.originalRoster` or the live dealer rotation.

Phone stays Table, then Start, then nights. Seat rows stay compact on phone.

## Rook podium

Recent nights uses `BPGRecords.nightPodium`, which calls the same `sortPlayersByTotal` + `competitionPlaces` helpers as Records. Rook has no separate team object: partners share a total, so they share 1st, and the other pair takes the next competition place (usually 3rd). Incomplete nights stay labeled Incomplete with no podium.

## Kill

Dead leftover height between the two Home columns, empty padding inside those cards, Recent nights parked in the left column, or `?home=` flags after Matt picked stretch.
