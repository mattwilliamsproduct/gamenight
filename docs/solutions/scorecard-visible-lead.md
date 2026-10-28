# Scorecard lead stays on the phone at large type

What broke: at 200% root type on a 390 board, row-fit sized rows from `wrap.clientHeight` (the table’s own height) and the phone never applied `scorecard-fit-rows` heights (`min-width: 761px` only). The player name slot collapsed to 0. The screenshot showed Total / R11 and a 36, with June off the viewport.

What fixed it: row-fit uses the on-screen remainder under the wrap. Slice 2 on a phone keeps a vw floor on Player, a vw cap on Total, a real width on the name slot, and applies the fit-row height. Board chrome type is px-capped so Enter stays one line.

What not to repeat: do not treat “the name fits its cell” as “the name is on screen.” Do not let `min-width: 0` on the identity-total Player column win at 200%. Fit-rows CSS that only lives in a 761px query does not run on a phone.
