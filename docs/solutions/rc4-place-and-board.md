# Places skip, and the board stays page-wide

Tied totals share a place. The next different total skips. Two players at 2nd, then the next score is 4th. `competitionPlaces` in `public/assets/scorebook.js` is the only ranking loop. Home, the live card, history, and Records all call it.

The scoreboard header and the card use the page width. A 4-player table does not make the page narrower. Row height is capped (about 92px on a laptop). Empty space under a short table is expected. Player, Total, and the current round keep their room. Earlier rounds take what is left.

Score and bid entry stops at 999, except Hand and Foot scores, which stop at 9,999. The minus sign does not count. Keypad, typing, and paste reject a larger number. They do not chop it. Inside the cap, an unusual value asks before submit. The floors used here, pending Matt, are Hand and Foot 8000, Five Crowns 200, Wizard 150, 818 20, Flip 7 200, Beat the Heat 30, and 500 otherwise.

Late join is on this branch. See `docs/solutions/late-join-start.md`. Life Preserver best-finish stays on the fast-follow branch.

Wheel odds were not changed. The previous 40-pocket plan was 32 help, 5 no change, and 3 setback. The live plan turned 2 of those no-change pockets into setbacks. It is now 32 help, 3 no change, and 5 setback. Nothing was added.

Settings, Quick reference, and the other content dialogs use one large shell: about 94% of the width and 92% of the height. Short confirms stay as wide as their content, with the same large type. Life Preserver status on the card reads `LP · Available`, `LP · Used`, or `LP · Not yet`, so the line fits on an 11-round board.
