# Porch mat

Matt, 2026-11-13. The family's table is a blue poker mat. Home should feel like that mat, not a flat swatch and not a wood page. Draft PR #90 only. Do not port this into #86.

Matt, 2026-11-13 6:27 PM: the felt is his own felt photo (`visual-reset/matt-blue-felt-reference.png`, 1586x992), not a drawn SVG. It ships as `porch-felt.webp` (91 KB) with a `porch-felt.jpg` fallback (150 KB) and is drawn once at `cover`, centered, on a fixed screen-size layer (`body::after`), so a scrolling phone page does not stretch it. `--felt-base` / `--felt-center` / `--felt-edge` are colors sampled from the photo for fallbacks and the demo bar. The source is 1586px wide, so screens wider than that scale it up slightly; it downsizes at 1440.

Matt, 2026-11-13 6:13-6:28 PM: Home is the f2c81a4 layout (ivory panels with the brass top edge, 360px table, 115px wordmark, six decks three per row with readable names, Rook off the Home picker). On a laptop the table starts at the nav's left edge, Start a new match ends at its right edge, one 16px gap, same top and bottom, felt around them. The roster (seated, then the bench) scrolls inside Tonight's table and stops on a whole row with N more below; Add stays outside it. The felt is only the page behind it; the see-through mat panel, its stitch line, and the 4-over-3 seven-deck grid are gone.

Tonight's Table, Start a new match, the score sheet, and score entry stay ivory. The page behind them is the same felt. Numbers are read on ivory. A short score sheet ends at the last row, so the navy shows under it. On a phone, Spin ready sits under the name so the avatar and the name stay the same size on every row. That is a skin choice. #86 keeps the badge beside the name. The skin does not set the score-pad grid. A game with no minus keeps #86's bottom row, `k0 k0 k0 next`.

Every deck has the f2c81a4 card-picker rim. The selected deck keeps the #86 teal rim (`#0a5c54`, 6px, on top of the art). Action teal is `#11786c` so the button clears 3:1 on the navy and the label stays above 4.5.

No casino type, chips, printed card slots, glossy green, or a spotlight. The only suits are the faint felt lattice. The demo bar uses `--mat-bar`.
