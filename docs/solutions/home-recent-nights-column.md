# Home columns and seating

Matt dropped the 15 percent cap. Tonight's Table fills the left column down to the bottom of Start a New Match. Extra height goes into seat cards, not padding.

## Rule

Two-column Home starts at 861px. Both cards stretch to the same row height (`align-items: stretch`, `height: 100%`, flex column). Extra height on the left grows the seat list (`flex: 1`, `minmax(50px, 1fr)`), with 44px avatars and larger names and seat numbers. Extra height on the right grows the game tiles. Recent nights stays full width below both.

Seating is one player per row: seat number, avatar, name, dealer badge, up/down, remove to on deck, and a drag handle. There is no Edit Seating control. Drag starts from the handle only. Keyboard: focus the handle, Space to grab, arrows to move, Space to drop, Escape to cancel.

Home reorder only writes the `players` lineup. It does not change `currentGame.originalRoster` or the live dealer rotation.

Phone stays Table, then Start, then nights. Seat rows stay compact on phone.

## Kill

Dead leftover height between the two Home columns, empty padding inside those cards, or a 15 percent cap after Matt dropped it.
