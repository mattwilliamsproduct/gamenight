# Places skip, and the board stays page-wide

Tied totals share a place. The next different total skips. Two players at 2nd, then the next score is 4th. `competitionPlaces` in `public/assets/scorebook.js` is the only ranking loop. Home, the live card, history, and Records all call it.

The scoreboard header and the card use the page width. A 4-player table does not make the page narrower. Row height is capped (about 92px on a laptop). Empty space under a short table is expected. Player, Total, and the current round keep their room. Earlier rounds take what is left.

Score and bid entry stops at 999, except Hand and Foot scores, which stop at 9,999. The minus sign does not count. Keypad, typing, and paste reject a larger number. They do not chop it. Inside the cap, an unusual value asks before submit. The floors used here, pending Matt, are Hand and Foot 8000, Five Crowns 200, Wizard 150, 818 20, Flip 7 200, Beat the Heat 30, and 500 otherwise.

Life Preserver best-finish and the late-join start stay on the fast-follow branch. This preview does not add a player to a live match. Tonight's Table and Players (N) seat the next match.

Wheel odds were not changed. The live draw is still 32 help, 3 no change, and 5 setback out of 40.
