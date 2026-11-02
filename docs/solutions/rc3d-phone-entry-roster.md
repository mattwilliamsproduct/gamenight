# Phone 8-player score entry roster

What broke: on 375x667 (and later seats on 390x844) the score-entry keypad hid most of an 8-player roster. `#score-entry-rows` grew to the full seat list while the parent clipped it, so `scrollScoreEntryActiveIntoView` had nothing to scroll. About two or three rows stayed on screen.

What fixed it: on phone only, the roster list is the scrollport (`flex: 1 1 0; overflow-y: auto`). Short 8-player phones also get a shorter keypad and 40px rows so at least four rows can sit above the keypad on first open. The blank-score helper sits as the first child of `.score-entry-side` (above Scoring), not inside `.score-entry-layout`. That flex column has overflow hidden/auto and clips the helper's ink even when the box is in the leftover band. The active row still scrolls into that lane. iPad landscape and laptop keep the helper in the header.

What not to repeat: do not make `#score-entry-rows` `height: auto` on phone when the parent is the clip. Do not shrink the 1024 keypad to solve a phone stack. Do not hide `#score-entry-unconfirmed` to buy a fourth roster row. Do not park the helper inside `.score-entry-layout` on phone. A DOM-visible box there is not painted text.
