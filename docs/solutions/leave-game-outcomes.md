# Leave game and saved outcomes

Matt's rule (5:25 PM ET, after the 5:23 outcome rule): one Leave game action. Save for later, End game now, or Keep playing. The header, the Actions item, the game-over button, and starting another game while one is live all open that choice.

Save for later stores `outcome: 'paused'`. It keeps the scores and stays resumable. It does not ask about wins.

End game now stores `finished` when the row's own maxRounds, endScore, or Rook `winTarget` is already met. No count question. Flip 7 Leave also treats a seated total of 200 or more as finished, even when that night did not store `endScore`. A Flip 7 that was played and stayed under 200 asks Count this result, and the copy says it ended before 200. That Leave check is `leaveFinishState`. It does not change `completionFromSavedRules`, so a review-off history row with no stored Flip 7 target stays uncertain. If another game's saved rule is missed, or no rule is stored, the only extra question is Count this result. Yes stores `countResult: true` on `ended_early` or `uncertain`. No stores the same outcome with `countResult` false.

`countsForTallies` is wins, games played, win rate, win streak, losing streak, last place, and head-to-head. `countsForScoreMagnitude` is finished only. Counting the winner does not make the partial total a best score, worst score, personal best, or average.

Do not classify old nights from today's Flip 7 or Rook target. `maxRounds` 999 is the open sentinel, not a round count. Canasta's id is `Hand and Foot`. The title is Canasta. Four rounds is the config copied onto a new save, not a fact already stored on the main-format fixture.

A device that has not applied History review summary still uses only the rule stored on the row. After that summary is shown and applied, `legacyCompletion` may count Five Crowns, 818, Wizard, and Beat the Heat from the rounds and totals already saved. It still does not invent a Flip 7 or Rook target, and it does not treat Canasta's 4-round config as history. See [legacy-history-review.md](legacy-history-review.md).

The phone row is four columns, so the header reads Leave. The dialog and the Actions item read Leave game.
