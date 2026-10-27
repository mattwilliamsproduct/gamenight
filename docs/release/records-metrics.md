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
| Exact / missed bids | Stored bid vs actual on a played Wizard or 818 round (`classifyBidAccuracy`). Missing bid or actual is unknown. | Same count lists every name. | Career exact rate needs 10 Wizard bids. | No. |
| Zero bids hit | Wizard bid 0 and actual 0 on a played round. | Same count lists every name. | Empty if none. | No. |
| Rook bids won / sets | Player was bidder or partner. Made vs set uses `rookMade` / `rookMadeIt`. | Same count lists every name. | Empty if none. | No. |
| Last-place finishes | Shared last place on a completed match, same numeric compare as the scorecard. | Same count lists every name. | Shown as 0. | No. |
| Last-place streak | Consecutive completed matches finishing last, in id order. | Same streak lists every name. | Shown as 0. | No. |
| Win / loss streak | Consecutive completed matches won or not won, in id order. | Same streak lists every name. | Shown as 0. | No. |
| Head-to-head | Who finished ahead in a shared completed match. Pair names stay alphabetical; `aWins` belongs to `a`. | Even when counts match. | Needs 5 shared matches to appear. | No. |
| Life Preserver adjustment | Sum of stored `hailMaryBonus` scores for that player. | n/a | Hidden when no spins remain in history. | n/a |
| Places gained after a spin | Place before the bonus round minus place after that same bonus. A later win is not credited to the wheel. | n/a | Hidden when no spins remain. | n/a |
| Comeback extras | Only when a match stored `round.comeback`. Halftime-deficit stories stay off without that data. | Same value lists every name. | Hidden when no stored extras exist. | No. |

Closest Finish To 66 stays computed and stays off the board. Reaching 66 ends Beat the Heat as a loss.
