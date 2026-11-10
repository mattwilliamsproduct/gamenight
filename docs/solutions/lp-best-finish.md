# Life Preserver best finish

A helpful Life Preserver bars that player from winning the match. The score stays the spun total. Zero and setback do not bar the win. The spin by itself does not.

`ruleset: best-finish-2nd` is stamped when a match starts. Nights without it keep the old raw-score winner. `BPGScorebook.matchStandings` is the only order for the scoreboard, the winner screen, history, and Passport wins. `STANDINGS_TIE_RANKING` is `competition` (1, 1, 3). Flip that one constant for dense 1, 1, 2.

The wheel odds are unchanged. A single spin still cannot be sized past 1st. Later scoring can put the rescued player ahead on the raw total. The bar stays while a helpful adjustment is on the night. Undo removes that adjustment and restores eligibility. The spin stays used. A correction that keeps a helpful adjustment leaves the player ineligible. Setting eligibility back by hand does not stick: the next standings read derives it from the bonus rounds.

If every finisher took help, the night says "No champion tonight." That is the default until Matt changes it. Best-score records still skip any assisted night, including a zero spin. That gate is not the win bar.
