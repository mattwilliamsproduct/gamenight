# Canasta on RC1, Rook hide switch

Matt gave the go to preview Hand and Foot on the release candidate as **Canasta**, plus a Rook hide switch. Preview / draft only.

## What landed

- Saved game id stays `Hand and Foot`. The picker, Records, and rules sheet say Canasta.
- Scoring lives in `public/assets/hand-foot-logic.js` as `CANASTA_RULES`: clean 500, dirty 300, sevens 1,500 instead of the clean 500, red 3s 100 each for 1–3 and 200 each from 4 on, going out 100, no all-wild rule, red 3 left in the foot is manual only.
- Rook stays in code. `game-registry.js` marks it `hidden: true`. It appears on `?demo&games=rook`. Saved Rook nights still open. `?demo&view=game&game=rook&games=rook` still opens the Rook table.
- TEMP-demo `?demo&view=game&game=hand-and-foot` opens an in-progress Canasta scorecard (two teams, two rounds, sevens + 4 red 3s).
- Team helpers used by Canasta stay available when Rook is hidden.
- The 8-player Five Crowns keypad Next-corner failures also fail on RC1 `7a1b1a6` in this environment, so they are not a Canasta-branch regression.
- Live four-round Canasta scorecards keep R1–R4 on a 390-wide table. RC1 trim still applies to longer history cards. Phone entry uses a 3-column grid so the sevens field and round total stay above the keypad. End Match goes through RC1 Save & End.
- Score cells never clip. 4-digit and 5-digit totals fit at 375 / 390 / 1024 / 1440. Two-team rows skip TV fit-row stretch so they keep Five Crowns density. Team identity is two overlapped avatars plus a two-line name (`Megan &` / `Matt`) with no ellipsis.
- Picker tile art uses `public/assets/art/dusk/canasta.webp` in both the default and dusk art sets, cover-cropped. From `slice2.css` the URL is `./art/dusk/canasta.webp` (`../art/` 404s). A beach-style Canasta tile is a Matt taste call.
- Canasta rules open from slice2 Game Instructions and from in-game Actions. The sheet title is Canasta.
- `.hf-rate-bar { display:grid }` beats Tailwind `.hidden`. Keep `.hf-rate-bar.hidden { display: none !important; }` so Five Crowns and Wizard entry never show Canasta rate chips.

## Do not

- Do not rename saved matches to `Canasta`.
- Do not delete Rook.
- Do not apply the new red-3 ladder to an old save that only stored a flat `redThreeEach`.
- Do not let a same-match player merge add Hand and Foot points. RC1 refuses that merge (Wizard / Life Preserver safety). Rename still moves `handFootParts`. A merge from a night that does not already have the target name still moves the parts once.
