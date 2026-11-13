# Legacy history review

Matt's rule (5:55 PM ET) replaces the all-uncertain reading of saved nights. It is the live count.

`legacyCompletion(row)` is the only saved-round classifier. It returns `complete`, `partial`, or `uncertain`, plus a reason. It reads the rounds and totals already on the row. It does not read today's config, and it does not need a `maxRounds` field.

- Five Crowns is complete at 11 saved scoring rounds. Fewer is partial.
- 818 is complete when the saved scoring rounds cover `EIGHT18_ROUND_TRICKS` (15). Fewer is partial.
- Wizard is complete at `floor(60 / players)` for that night's roster. Fewer is partial.
- Beat the Heat is complete only when a seated player reached 66. A left-early 66 does not finish the night. Anything else is uncertain, not partial.
- Flip 7 is a full game when a seated total reached 200 (Matt, Nov 12, 7:10 PM ET). Rook stays uncertain unless that night saved a target and a saved total reached it.
- Canasta (`Hand and Foot`, and a row stored as `Canasta`) is complete at 4 saved scoring rounds (Matt, 7:13 PM ET, amendment 11). A game finished in the app is finished. Fewer than 4 rounds, or an ambiguous row, stays uncertain. A stored finished flag does not finish a short legacy night.

Partial nights stay in history, read Ended early, and stay out of results until Count this result. Uncertain nights keep the original winners, read Needs review, and stay out of recalculated results until confirmed. A partial total never sets a score record or an end-screen score celebration. Tied records share rank 1, 1, 3 and name every tied player. The records line is Matt, 5:25 PM ET. The end-screen celebration line and the shared 1, 1, 3 naming are recommendations, pending Matt. See [ao-provenance.md](ao-provenance.md).

Saved-round rules are already counting. Settings History review summary shows how they differ from the old stored-field rule. Apply writes `gn_legacy_review_seen` only. Counted / not counted / reviewed-at live in `gn_history_review`, keyed by the night id. Neither write rewrites the night. Restore does not clear that side store. A Canasta night with 4 unambiguous rounds counts even when History review is off. A short legacy Canasta night stays uncertain even when the row says finished, unless it is paused.

`node scripts/history-review.mjs` is the same preview for a backup file and for the demo book. It does not write the file.

Still unresolved, and left on current behavior: Rook target, Canasta cards-in-hand, Wizard leave behavior, left-early ranking and last place, and bid-accuracy scope. Canasta length is 4 rounds.

A game's minimum does not disable the next-match seat checkboxes. Start stays off until the minimum is met. The maximum still blocks another seat.
