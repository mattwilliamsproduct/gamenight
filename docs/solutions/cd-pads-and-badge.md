# No 00 key, and Spin ready stays in the cell

Matt's standing rule is that a decision about a control applies to every copy of that control.

## What changed

The `00` key was a typing shortcut. The first press on a clean field stored the string `"00"`, which parses as the integer 0. A blank bid is not that string. `scoreEntryValueIsBlank` is only `''`, `'-'`, or `'+'`.

Removing the key does not change how a blank is recorded:

- A Wizard blank bid stays missing. Submit still rejects it.
- An 818 blank bid still becomes 0 only inside `validateEntries`.
- Next on a blank trick still writes `'0'`. Next on a blank bid does not.
- Pressing `0` still records a zero bid.

`applyScoreEntryKey` ignores a `00` token in every mode, so a leftover caller cannot write one. Two presses of `0` can still produce the string `"00"`, and that still parses as 0.

Bid and trick pads use the same no-minus grid as the score pads: Delete, Skip, Next, and 0 across the bottom row. Skip on a bid clears the field to `''` and moves on. It does not store 0. The cell numpad and the round-correction pad also have no `00` button. The round-correction 0 already fills the two cells beside backspace.

## Spin ready

On a phone the player column is `min(11.5rem, 42vw)`. A nowrap name plus a nowrap badge pushed `Spin ready` into the score column. Under 760px the name on a badge row may wrap, and the badge stays at the right of that cell. It does not paint over the score. Full names stay visible. Other rows do not wrap.

## Do not

- Do not put a `00` key back on any pad.
- Do not make a blank Wizard bid into 0.
- Do not change the 818 blank-bid path in `validateEntries`.
- Do not ellipsis the player name to make room for the badge.
