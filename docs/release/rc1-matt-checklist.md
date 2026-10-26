# RC1 ready-for-review checklist

Draft only. Do not undraft or merge until Matt says go. Physical iPhone Safari first, then a TV-distance look. Gallery ids: `http://127.0.0.1:4173/?gnqa=1&scenario=<id>`.

## Local-only

1. Settings has no porch password. Backup and Restore are easy to find.
2. Copy says: "Scores and history are saved in this browser on this device." Same sentence on Records.
3. Restore copy is honest: it adds missing games and players, keeps finished games, and a live match in the file replaces the table.
4. The loss note is next to Restore: clearing browser data or losing this device can lose history you have not backed up.
5. After a save, the chip says "Saved on this device" and does not cover Dealer copy at 375 or 390.
6. Refresh keeps `gn_history` / `gn_current`. The network log has no `/api/sync`.

## Earlier RC items

1. Home with a live match: Resume is the one obvious primary.
2. Five Crowns entry: 00 / 0 stay on screen at 375. Names share one scorecard size.
3. Life Preserver on `eight18-porch-lp`: range copy, one spin, applies immediately.
4. Records: Fame / Shame, past nights on the ledger, retired seats show a Retired badge.
5. Rook contract editor at 390 and 1440: nothing clipped.
6. Entry and Restore errors are an inline message, not a browser `alert()`.

Kill the release if a keypad key is clipped, a name is cut off, a spin can be taken twice, or any device hits `/api/sync`.
