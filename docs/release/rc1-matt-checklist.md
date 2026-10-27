# RC1 ready-for-review checklist

Draft only. Do not undraft or merge until Matt says go. Physical iPhone Safari first, then a TV-distance look. Gallery ids: `http://127.0.0.1:4173/?gnqa=1&scenario=<id>`.

Required before undraft or merge: revert the TEMP demo seed commit and confirm `?demo` does nothing.

## Local-only

1. Settings has no porch password. Backup and Restore are easy to find.
2. Copy says: "Scores and history are saved in this browser on this device." Same sentence on Records.
3. Restore copy is honest: it adds missing games and players, keeps finished games, and a live match in the file replaces the table.
4. The loss note is next to Restore: clearing browser data or losing this device can lose history you have not backed up.
5. After a save, the chip says "Saved on this device" and does not cover Dealer copy at 375 or 390.
6. Refresh keeps `gn_history` / `gn_current`. The network log has no `/api/sync`.

## Earlier RC items

1. Home with a live match: Resume is the one obvious primary.
2. Five Crowns entry at 375 and 390 with 8 players: 00 / 0 stay fully on screen and are not covered by Cancel. Cancel + Review share one row. Submit is full width. Names share one scorecard size.
3. Life Preserver on `eight18-porch-lp`: range copy, one spin, applies immediately.
4. Records: Fame / Shame, past nights on the ledger, retired seats show a Retired badge.
5. Rook contract editor at 390 and 1440: nothing clipped. No Exact bid legend. The legend is Wizard / 818 only.
6. Entry and Restore errors are an inline message, not a browser `alert()`.

## Scorecard exit

1. Live scorecard has `← Table` at every size. It goes Home without ending the match. Unfinished score-entry drafts survive Table → Records → Resume and Table → Settings → Resume.
2. iPhone standalone (no browser back) can leave on Table and return on Resume.
3. Save & End is an outlined secondary. If the match is unfinished, confirm explains that ending writes current standings to Records and clears the live table. Cancel changes nothing. Table never opens this confirm.
4. Phone: Table + match identity on one row. Enter Round is the primary. Actions and Save & End stay secondary. History is Audit Log inside Actions. Tablet and up can show an Audit Log header shortcut.
5. Life Preserver header control reads `Life Preserver · N eligible` only when someone can spin. Hidden otherwise. Tablet and up may add one short line (who can spin, one spin per player). Explanation stays in Actions / How it works.

## Life Preserver wheel

1. The drawn wheel is mostly helpful (green). Color is by benefit, not by sign: negatives are green in Five Crowns.
2. Range copy is `Best: … · Worst: …` and matches the commit line. Small bad slices stay.

Kill the release if a keypad key is clipped, a name is cut off, a spin can be taken twice, or any device hits `/api/sync`.
