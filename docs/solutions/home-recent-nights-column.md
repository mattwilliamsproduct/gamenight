# Home columns and seating

Matt wanted Tonight's Table taller, then capped the first step at 15 percent. Do not silently close the rest of the gap.

## Rule

Two-column Home starts at 861px. Columns size to their content (`align-items: start`). Tonight's Table is about 15 percent taller than the compact single-column seat list, and that height goes into bigger seat cards (50px rows, 42px avatars, larger names and seat numbers), not padding or a stretch to match Start a New Match.

Recent nights stays full width below both.

Seating is one player per row: seat number, avatar, name, dealer badge, up/down, remove to on deck, and a drag handle. There is no Edit Seating control. Drag starts from the handle only. Keyboard: focus the handle, Space to grab, arrows to move, Space to drop, Escape to cancel.

Home reorder only writes the `players` lineup. It does not change `currentGame.originalRoster` or the live dealer rotation.

Phone stays Table, then Start, then nights. Seat rows stay compact on phone.

## Kill

Growing Tonight's Table past 15 percent to close the leftover under Start a New Match without Matt asking. Empty padding inside the table card. Recent nights parked in the left column.
