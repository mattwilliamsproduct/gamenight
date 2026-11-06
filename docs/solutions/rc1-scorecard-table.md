# Scorecard Table exit

What broke: Slice 2 hides `#top-nav` on the live card, and Actions had no Home. On iPhone standalone, Save & End was the only exit.

What fixed it: `← Table` on the board bar calls `leaveMatchToTable()`. That saves any open score-entry draft, goes Home, and never opens Save & End. Resume restores the draft. Save & End is an outlined secondary and confirms when the match is unfinished. Phone History lives in Actions. Tablet and TV keep Audit Log on the board bar.

What not to repeat: do not send Table through `endGame()`. Do not put a settings gear on the scorecard; Table is the route to Settings, Records, and Profiles. Do not wrap `Js Wild` mid-word, and keep 3-digit totals inside the Total column at 375/390.
