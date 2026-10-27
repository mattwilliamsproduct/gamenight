# Scorecard Table exit

What broke: Slice 2 hides `#top-nav` on the live card, and Actions had no Home. On iPhone standalone, Save & End was the only exit.

What fixed it: `← Table` on the board bar calls `leaveMatchToTable()`. That saves any open score-entry draft, goes Home, and never opens Save & End. Resume restores the draft. History and Round History / Audit Log were the same modal, so both are now Audit Log.

What not to repeat: do not send Table through `endGame()`. Do not put Settings on the scorecard; Table is the route to Settings, Records, and Profiles.
