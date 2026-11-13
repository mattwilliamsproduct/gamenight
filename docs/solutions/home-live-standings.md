# Home dashboard

Landscape Home is one screen under the nav. Tonight's Table and Start a New Match share that height and end 16px above the viewport. Game art stays 5:7 and shrinks with the card. Start and Add Player stay at the bottom of their cards, fully on screen. Player rows cap at 52px and top-align. Eight players fit at 1194x834 and 1440x900. Fourteen scroll inside the list. The page itself does not scroll. Phone, portrait, and an open keyboard do not lock the page.

The shell used to be shorter than the dashboard. `body` keeps `pb-24` (96px) and the demo bar pads `html` by 42px, so `#home-screen` ended around 780px in an 834px viewport. The dashboard height was `100dvh` minus `#home-screen`'s top, which made `.s2-home` taller than the screen that clips it. Start, Add Player, and the last row were sliced even when their layout boxes were still inside `innerHeight`. The fix sizes `.bp-app-shell` to `100dvh - --bp-shell-top - 16px`, clears that bottom padding only on landscape Home, and lets `.s2-home` fill `#home-screen`.

Recent nights is not on Home. History stays in Records. With no live match, unfinished nights show as a slim banner for the newest one, with Resume. Older unfinished nights stay on Past nights, marked Unfinished, with Resume. Home does not list them.

While a match is live, the left card is Current standings from `BPGScorebook.scoreboardStandings`, the same function `renderGame` uses. Rows show place, avatar, name, total, and the dealer. Tapping a row or Resume opens the scoreboard. Seat controls stay off that card. The right card is a small Start another game button. It reveals the game cards. Start still opens a confirm that the live match will be saved as unfinished. Cancel changes nothing. Confirm still parks through `parkActiveMatch`, which leaves an in-progress night incomplete: no winner, no completed-night count, no Passport or record change. Resume restores the round, scores, dealer, and Life Preserver fields, including after reload.

Sorting the standings does not write `players`, `originalRoster`, or `dealerOffset`.
