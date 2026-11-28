# RC2 look fixes after 0251

Matt rejected `rc2-candidate-20261029-0251` on the shots.

iPad 1024 score entry used managed-fit `flex: 1 1 0` plus a 280px keypad column, so four rows collapsed into one strip and the keypad sat in half the modal. Tablet landscape now stacks readable name / total / score rows and gives the keypad the leftover width.

Scorecard row-fit capped names at ~42px and avatars at 64px, and the 4-seat player column is no longer 40vw. Totals stay the hero so R1-R11 can fit at 1440.

Life Preserver available is a labeled LP chip. Dealer is the D on the avatar, not a boxed name. Avatar rings are hairline. Settings body scrolls and the close X stays inside the panel. The panel keeps a min-height so Text Size stays on screen. On short phones the body shrinks and the foot (device line, Backup, Restore) stays fully visible. Records plurals and a hidden Rook ledger row are in `records-logic.js`.
