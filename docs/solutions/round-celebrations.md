# Round celebrations

WHAMMY, Nolie, and Cami Whammi stay on the live score entry path. The modal opens from a submitted round. A direct `showWhammyModal` call is not the proof.

WHAMMY is the only player who scored well. On Five Crowns that is one zero and everyone else above zero. Nolie is the whole table doing well: Wizard bids that match the tricks taken, every Five Crowns score at zero, or every Flip 7 score above zero. Cami Whammi is Wizard and Flip 7 only. Wizard requires every seated player to have a bid and a trick count, and every bid to miss. Flip 7 requires every score to be zero or less. Five Crowns, Beat the Heat, 818, and Rook do not fire Cami. A Five Crowns round of all zeros is Nolie.

`shouldSuppressRoundCelebration` is true when that round number is the saved maximum and the maximum is not 999. The final Wizard or Five Crowns round still saves. It does not open the celebration. Flip 7's maximum is 999, so a Flip 7 round is not suppressed that way.

The modal card keeps `bp-modal-panel`. At 1024x768 the card, the title, the copy, the score rows, and Respect stay inside the viewport. Chromium and WebKit emulator shots from real score entry are in `docs/prove-it/round-celebrations/`, tagged `0593201`. They are not a physical iPad.

Passport and Records special-round words stay the plain sentences. See [special-round-labels.md](special-round-labels.md). The modal titles stay WHAMMY, Nolie, and Cami Whammi.
