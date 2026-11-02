# Phone 8-player score entry roster

What broke: on 375x667 (and later seats on 390x844) the score-entry keypad hid most of an 8-player roster. `#score-entry-rows` grew to the full seat list while the parent clipped it, so `scrollScoreEntryActiveIntoView` had nothing to scroll. About two or three rows stayed on screen.

What fixed it: on phone only, the roster list is the scrollport (`flex: 1 1 0; overflow-y: auto`). Short 8-player phones also get a shorter keypad and 40px rows so at least four rows can sit above the keypad on first open. The blank-score helper stays visible in the leftover band under the roster. The active row still scrolls into that lane. iPad landscape and laptop stay two-column / managed-fit.

What not to repeat: do not make `#score-entry-rows` `height: auto` on phone when the parent is the clip. Do not shrink the 1024 keypad to solve a phone stack. Do not hide `#score-entry-unconfirmed` to buy a fourth roster row. The helper sits in the leftover band under the roster.
