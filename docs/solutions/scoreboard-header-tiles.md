# Scoreboard header, tiles, and Life Preserver cells

## What changed

The live header is one row. From 761px it shows the existing Back Porch wordmark, a hairline, then the game and round, then Home, Actions, and Enter Scores. The app nav is hidden on this screen, so the wordmark lives here and does not fight the sticky nav. Save & End is the last Actions item, under End the night, and it still opens the existing confirm.

Entered scores, including 0, use `is-entered`. Ordinary tiles are `#e8e3da`. The leader row is `#d5ebe3`. Digits stay `#0c2824` at the same size as the other round scores. A Life Preserver cell uses that tile. The stack is `height: auto` with padding, so the base score and the signed blue adjustment both sit inside the cell. The current-round dash has no pill. The current column keeps its pale band. Total stays the large number on the mint column.

## Also on this pass

Home rows are tall enough for the name and Deals first. `goHome()` and `paintNav()` call `updateNavButton()`, so the Active Match pill matches `currentGame`. Each game's Start button uses `BPGGames.seatLimit`. Five Crowns is 1 to 7. Canasta is 2 to 6. Rook is 4 to 6. Wizard, 818, Flip 7, and Beat the Heat have no maximum. The sticky nav keeps its radius, opaque cream, inset, and shadow while scrolling. A fixed green line sits under the demo bar.

## Do not

Do not shrink the score type to make the adjustment fit. Do not put Save & End back on the header row. Do not cap Wizard at the layout test's 14 seats.
