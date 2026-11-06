# Tonight's Table inline seating

Home seating is one player per row. Reorder lives in the list. There is no Edit Seating control.

## Active match

`slice2MoveSeat` writes the Home `players` lineup and saves `gn_players_v2`. It does not write `currentGame.originalRoster` or the live dealer rotation.

When a match is live, the Dealer badge still follows `getCurrentDealerName(currentGame)` (roster plus `currentRound` and `dealerOffset`). Seat numbers on Home update to the new lineup. The scorecard order stays the match roster.

When no match is live, seat 1 is "Deals first."

## Drag and keyboard

Drag starts only from the handle (`touch-action: none`, 8px press). The list body can scroll. Space grabs, arrows preview, Space drops, Escape cancels without saving.

## Kill

Edit Seating plus Earlier/Later, a drag that starts from the row body, or a Home reorder that rewrites a live match roster.
