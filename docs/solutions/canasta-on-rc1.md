# Canasta on RC1, Rook hide switch

Matt gave the go to preview Hand and Foot on the release candidate as **Canasta**, plus a Rook hide switch. Preview / draft only.

## What landed

- Saved game id stays `Hand and Foot`. The picker, Records, and rules sheet say Canasta.
- Scoring lives in `public/assets/hand-foot-logic.js` as `CANASTA_RULES`: clean 500, dirty 300, sevens 1,500 instead of the clean 500, red 3s 100 each for 1–3 and 200 each from 4 on, going out 100, no all-wild rule, red 3 left in the foot is manual only.
- Rook stays in code. `game-registry.js` marks it `hidden: true`. It appears on `?demo&games=rook`. Saved Rook nights still open.
- Team helpers used by Canasta stay available when Rook is hidden.

## Do not

- Do not rename saved matches to `Canasta`.
- Do not delete Rook.
- Do not apply the new red-3 ladder to an old save that only stored a flat `redThreeEach`.
