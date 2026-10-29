# Records metrics

Definitions for the restored Records book. The same rules live as comments in `public/assets/records-logic.js`. Do not compare raw points across different games.

| Metric | Definition | Ties | Too little data | Unassisted only |
| --- | --- | --- | --- | --- |
| Career wins | Completed matches (`completed !== false`) where the player is in `winners`. | All names with the same win count stay listed. | Shown as 0. | No. Assisted matches still count. |
| Games played | Completed matches the player sat. Reopened rows (`completed === false`) are out. | Same count lists every name. | Shown as 0. | No. |
| Win rate | `wins / games`, printed as `45% · 9 of 20`. Leaders need 5 completed matches. | Same rate lists every eligible name. | Below 5 games the fraction still prints on a career row; it cannot lead. | No. |
| Best / worst final score | Stored match total for that game only. Low-score games treat lower as better. | Same value lists every name. | Empty: "No qualifying history". All-assisted shelf: "No unassisted matches yet". | Yes. |
| Cleanest game | Average of played scoring-round scores in one unassisted match. | Same average lists every name. | Needs played scoring rounds. | Yes. |
| Best / worst single round | One played scoring-round score. Life Preserver rounds are out. | Same value lists every name. | Empty if none. | No. |
| Exact / missed bids | Stored bid vs actual on a played Wizard or 818 round (`classifyBidAccuracy`). Missing bid or actual is unknown. Single-match exact rate needs 5 classified bids in that match. | Same count lists every name. | Career exact rate needs 10 Wizard bids. One-match rate needs 5 bids. | No. |
| Zero bids hit | Wizard bid 0 and actual 0 on a played round. | Same count lists every name. | Empty if none. | No. |
| Rook successful bids / sets | Player was bidder or partner. Made vs set uses `rookMade` / `rookMadeIt`. The old "Rook bids won" row counted failed bids too and stays hidden. | Same count lists every name. | Empty if none. | No. |
| Last-place finishes | Shared last place on a completed match, same numeric compare as the scorecard. | Same count lists every name. | Shown as 0. | No. |
| Last-place streak | Consecutive completed matches finishing last, in id order. | Same streak lists every name. | Shown as 0. | No. |
| Win / stretch without a win | Consecutive completed matches won, or consecutive completed matches not won, in id order. The non-win run is labeled Longest stretch without a win. | Same streak lists every name. | Shown as 0. | No. |
| Head-to-head | Who finished ahead in a shared completed match. Pair names stay alphabetical; `aWins` belongs to `a`. | Even when counts match. | Needs 5 shared matches to appear. | No. |
| Life Preserver adjustment | Sum of stored `hailMaryBonus` scores for that player in one completed match's game. Incomplete nights are out. Totals stay per game. | n/a | Hidden when no completed spins remain. | n/a |
| Places gained after a spin | Place before the bonus round minus place after that same bonus, measured immediately after the spin. A later win is not credited to the wheel. | n/a | Hidden when no completed spins remain. | n/a |
| Comeback extras | Only when a match stored `round.comeback`. Halftime-deficit stories stay off without that data. | Same value lists every name. | Hidden when no stored extras exist. | No. |

Closest Finish To 66 stays computed and stays off the board. Reaching 66 ends Beat the Heat as a loss.

## Name mapping

Primary labels are the claim. Fun subtitles sit on two Shame rows only. Ledger and Fame stay professional.

| Old name | New primary | Subtitle | Definition |
| --- | --- | --- | --- |
| Most Wins All Time | Career wins |  | Completed matches in `winners`, with games played beside the count. |
| Best Win Rate (Min 5) | Win rate |  | `wins / games`, printed as `45% · 9 of 20`. Leaders need 5 games. |
| Most Games Played | Most matches |  | Completed matches the player sat. |
| Dead Last Derby / Bronze Medal | Most last-place finishes |  | Shared last place, same numeric compare as the scorecard. |
| The Disaster Award | Worst final score · Five Crowns |  | Highest unassisted Five Crowns total. |
| The Crash and Burn | Highest single-round score | Crash and Burn | Highest played scoring-round score. Life Preserver rounds are out. |
| The 818 Brick | Worst final score · 818 |  | Lowest unassisted 818 total. Retired as a primary label. |
| The Meltdown | Worst final score · Beat the Heat | Meltdown | Highest unassisted Beat the Heat total. |
| The Overconfident | Most missed bids · Wizard |  | Stored Wizard bid vs actual classified missed. |
| The Invisible Man | Most games without a win |  | Hidden on Records this pass. |
| The Slow Learner | Most consecutive last-place finishes |  | Consecutive completed last-place finishes, in id order. |
| The Sharp Shooter | Best career exact-bid rate · Wizard |  | Exact Wizard bids / Wizard bids. Needs 10 bids. Lives under Bid accuracy, not Shame. |
| The Comeback Kid | Wins from a stored-halftime deficit |  | Hidden until the stored comeback extras are verified. |
| The Streaker | Longest winning streak |  | Consecutive completed wins, in id order. Lives under Streaks, not Shame. |
| Wizard: The Clairvoyant | Most exact bids in one match · Wizard |  | Max exact Wizard bids in one match. |
| Wizard: Zero-Bid Specialist | Most zero bids hit · Wizard |  | Wizard bid 0 and actual 0. |
| Cleanest Game | Cleanest game |  | Average scoring-round score in one unassisted match. |
