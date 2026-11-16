# Bids, Skip, and ended-early results (Nov 15 test, phase 1)

## Bids and tricks
- Skip moves to the next seat. An entered bid or trick stays. A blank seat is marked Skipped, never checked and never 0.
- Pending is a dashed box with a dash, Skipped is an amber dashed box, entered is a solid box. The running total beside a bid is quiet so a 0 total never reads as a 0 bid.
- A refused Lock bids marks every missing seat Needs bid and shows a boxed alert right above Lock bids.
- Scoring is unchanged: a blank Wizard bid is refused, a blank 818 bid locks as 0, a blank trick counts as 0. Progress says so where it applies.
- Plain score pads (Five Crowns, Flip 7, Beat the Heat) keep their documented rule: Skip leaves a score blank.
- The visible entry box is `.score-entry-value`. The porch-ledger skin styles it with `!important`, so state styles live in `porch-ledger.css`.

## Ended early
- `BPGScorebook.GAME_STATUS_LABELS` holds every status and button word. `gameStatus(match)` returns the label, Counted/Not counted, and `showsWinners`.
- Winners show for a finished game or a counted game. An ended-early game that is not counted shows Not counted, so no winner. Needs review keeps showing its stored winners under the Needs review label, as before (open question for Matt). `eligibleWinners` still derives winners from totals when none are stored, so screens must check `showsWinners`, not the stored list.
- A game with no scored rounds stores `winners: []`, cannot be counted, and reads No rounds played. Old rows saved with every player as a winner still show no winner.
- Count partial result and Stop counting ask first, then toast what changed. Records and Passports repaint.
- The Records nav carries no count. The number mixed counted, uncounted, and unfinished games.
