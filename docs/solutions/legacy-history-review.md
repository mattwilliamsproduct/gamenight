# Legacy history review

Matt's rule (5:55 PM ET) replaces the all-uncertain reading of saved nights. It does not turn on by itself.

`legacyCompletion(row)` is the only saved-round classifier. It returns `complete`, `partial`, or `uncertain`, plus a reason. It reads the rounds and totals already on the row. It does not read today's config, and it does not need a `maxRounds` field.

- Five Crowns is complete at 11 saved scoring rounds. Fewer is partial.
- 818 is complete when the saved scoring rounds cover `EIGHT18_ROUND_TRICKS` (15). Fewer is partial.
- Wizard is complete at `floor(60 / players)` for that night's roster. Fewer is partial.
- Beat the Heat is complete only when a saved total reached 66. Anything else is uncertain, not partial.
- Flip 7 and Rook are uncertain unless that night saved a target and a saved total reached it. Do not default Flip 7 to 200.
- Canasta (`Hand and Foot`, and a row stored as `Canasta`) is uncertain no matter the round count. Do not use `maxRounds: 4`.

Partial nights stay in history, read Ended early, and stay out of results until Count this result. Uncertain nights keep the original winners, read Needs review, and stay out of recalculated results until confirmed. A partial total never sets a score record or an end-screen score celebration. Tied records share rank 1, 1, 3 and name every tied player.

The device keeps the stored-rule classifier until Settings shows History review summary and the reader applies it. Apply writes `gn_legacy_review_seen` only. Counted / not counted / reviewed-at live in `gn_history_review`, keyed by the night id. Neither write rewrites the night. Restore does not clear that side store.

`node scripts/history-review.mjs` is the same preview for a backup file and for the demo book. It does not write the file.

Still unresolved, and left on current behavior: Rook target, Flip 7 target and negative rounds, Canasta cards-in-hand, Canasta rounds, Wizard leave behavior, left-early ranking and last place, Canasta places, and bid-accuracy scope.

A game's minimum does not disable the next-match seat checkboxes. Start stays off until the minimum is met. The maximum still blocks another seat.
