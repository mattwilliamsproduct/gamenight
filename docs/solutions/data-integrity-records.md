# Bids, historical rounds, and assisted matches

What broke: Wizard and 818 exact bids treated a positive score as a made bid, so an 818 miss that still scored tricks counted as exact, and a legacy round with no bid was invented into the denominator. Historical trick edits followed the live roster, so a retired player fell out and a later joiner fell in. A sticky `assistedMatch` flag stayed true after Undo removed the only Life Preserver. Saving a reopened history row could be resumed onto a table that already had a different match.

What fixed it: `classifyBidAccuracy` reads the stored bid and actual on a played round. Missing either one is unknown. `historicalRoundParticipants` is that round's bids and actuals, in roster order, minus `joinBonus`. 818 dealer law uses that same list and that round's trick count. `syncAssistedMatch` is true only while a bonus round or a legacy `hailMaryUsed` entry remains. A zero-point spin is one of those rounds. `finalizeHistoryCorrection` writes the history row and leaves `gn_current` alone when another match is on the table.

What not to repeat: do not infer a bid from `score > 0` or `score >= 10`. Do not validate a past Wizard or 818 round against `currentRound` or the players sitting there now. Do not treat `assistedMatch: true` as proof after the spin is gone. Do not resume a corrected history row over a different live match.
