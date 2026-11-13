# Sentence case, and names that do not split

Matt's readable regular-width footer buttons apply to every copy of that control.

## What changed

The shared button, kicker, progress, and name rules in `public/index.html` were Londrina Solid with `text-transform: uppercase`. That is what turned Teams, Back, Start match, Apply order, the score subhead, the progress pill, and Ann/Bo/Cy/Dee into small condensed capitals. Those rules are now Nunito, weight 800, letter-spacing 0, and `text-transform: none`.

The Wizard and 818 progress line is a short sentence, for example `1 of 4 bids in · total 0 · 1 trick`. On a 390px phone it stays within two lines.

A phone name stays on one line. A long single word shrinks or ellipsizes. It does not break mid-word. Avatars stay at the readable phone cap. The dealer D is a small corner badge, not a cover over the face. The current-round header wraps as `This round` so the phone edge does not clip it to `This`.

The phone bottom nav sizes each button to its words. Player Passports stays one line at 13px or larger.

The teams modal is opened only from `startGame('Hand and Foot')`. Opening it over a different live game hides that board. A shot of the modal sits on a Canasta match, so the header reads Canasta.

Next is tall on every score pad. It covers the 1-2-3 row and the 0 row. On a pad with no minus, 0 spans columns 1-3 and Next is column 4. View Pace uses the same readable size as the other board controls and is not clipped.

## Kept uppercase

Scorecard column headers stay uppercase: Player, Total, and the round marks (`R1`). Celebration titles stay WHAMMY!, NOLIE!, and CAMI WHAMMI!. The dealer mark stays the letter D.

## Do not

- Do not put Londrina or `text-transform: uppercase` back on shared buttons, kickers, progress, or player names.
- Do not split a name mid-word to make room for Spin ready.
- Do not shrink a phone avatar until the dealer mark covers the face.
- Do not give the phone bottom nav equal columns that wrap Player Passports.
- Do not open the teams modal for a game other than Canasta.
- Do not leave an empty cell beside the wide 0. Next fills that cell.
- Do not clip the View Pace label.
