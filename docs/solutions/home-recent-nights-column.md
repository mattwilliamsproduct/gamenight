# Home column options (preview)

Matt did not like the leftover height between Tonight's Table and Recent nights at laptop width. He framed the fix as Tonight's Table needing to line up with Start a New Match. Two options sit behind preview flags so he can pick. The default Home stays unstretched, nights full width.

## Rule

Two-column Home starts at 861px (the existing `max-width: 860px` stack).

- Default (no `home` param): columns size to their content (`align-items: start`). Recent nights stays full width below.
- `?demo&home=a`: both cards stretch to the same row height. Extra height on the left grows the seat list and pins Add Player to the bottom of the card. Extra height on the right grows the game tiles. Recent nights stays full width below.
- `?demo&home=b`: Recent nights moves into the left column under Tonight's Table as a compact list. Start a New Match spans both left rows so the columns end even.

`cardknight.vercel.app` ignores `home=`. The flags need `?demo` on localhost or a preview host, same as dusk art.

Seating is one player per row: seat number, avatar, name, dealer badge, up/down, remove to on deck, and a drag handle. There is no Edit Seating control. Drag starts from the handle only (`touch-action: none` on the handle). Keyboard: focus the handle, Space to grab, arrows to move, Space to drop, Escape to cancel. An `aria-live` region announces the new seat.

Home reorder only writes the `players` lineup (same `saveData` path as before). It does not change `currentGame.originalRoster` or the live dealer rotation.

Phone stays Table, then Start, then nights.

## Rook podium

Recent nights uses `BPGRecords.nightPodium`, which calls the same `sortPlayersByTotal` + `competitionPlaces` helpers as Records. Rook has no separate team object: partners share a total, so they share 1st, and the other pair takes the next competition place (usually 3rd). Incomplete nights stay labeled Incomplete with no podium.

## Kill

Shipping A or B as the default before Matt picks. Empty padding inside a stretched card. An Edit Seating extra step when the list can move in place.
