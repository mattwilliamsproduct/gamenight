# Home dashboard

Landscape Home is one screen under the nav. Tonight's Table and Start a New Match share that height. Game art grows at 5:7. Start stays at the bottom of its card. Player rows cap at 68px and top-align. Fourteen players scroll inside the list. Phone, portrait, and an open keyboard do not lock the page.

Recent nights is not on Home. History stays in Records. With no live match, unfinished nights show as a slim banner for the most recent one. View all lists the others, each with Resume.

While a match is live, the left card is Current standings from `BPGScorebook.scoreboardStandings`, the same function `renderGame` uses. Rows show place, avatar, name, total, and the dealer. Tapping a row or Resume opens the scoreboard. Seat controls stay off that card. The game cards stay visible. Start opens a confirm that the live match will be saved as unfinished. Cancel changes nothing. Confirm still parks through `parkActiveMatch`, which leaves an in-progress night incomplete: no winner, no completed-night count, no Passport or record change. Resume restores the round, scores, dealer, and Life Preserver fields, including after reload.

Sorting the standings does not write `players`, `originalRoster`, or `dealerOffset`.
