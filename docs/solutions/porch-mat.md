# Porch mat

Matt, 2026-11-13. The family's table is a blue poker mat. Home should feel like that mat, not a flat swatch and not a wood page. Draft PR #90 only. Do not port this into #86.

Matt, 2026-11-13 evening, replaced the navy and the cube band, then sent a felt reference (5:44 PM): the surface is a textured blue felt with visible grain, a soft lighter center (`--felt-center`) that falls to a darker vignette (`--felt-edge`) at the edges and corners, and a faint card-suit diamond lattice (hearts, spades, clubs, diamonds, one per diamond) that lives only in the outer band and fades to nothing in the middle (`--felt-calm` / `--felt-reveal`). The heavy geometric frame is gone. Every felt knob lives in the `--felt-*` tokens at the top of `porch-ledger.css`, and `--felt-layers` is the one background every screen uses (`porch-felt-suits.svg` 1.3 KB, `porch-felt-noise.svg` 0.6 KB). Phones get smaller diamonds and a wider calm middle. The lattice stays quieter than the decks.

Matt, 2026-11-13 6:13 PM: Home is the f2c81a4 layout exactly (ivory panels with the brass top edge, 360px table, 115px wordmark, six uncaptioned decks three per row, Rook off the Home picker). The felt is only the page behind it; the see-through mat panel, its stitch line, and the 4-over-3 seven-deck grid are gone.

Tonight's Table, Start a new match, the score sheet, and score entry stay ivory. The page behind them is the same felt. Numbers are read on ivory. A short score sheet ends at the last row, so the navy shows under it. On a phone, Spin ready sits under the name so the avatar and the name stay the same size on every row. That is a skin choice. #86 keeps the badge beside the name. The skin does not set the score-pad grid. A game with no minus keeps #86's bottom row, `k0 k0 k0 next`.

Every deck has the f2c81a4 card-picker rim. The selected deck keeps the #86 teal rim (`#0a5c54`, 6px, on top of the art). Action teal is `#11786c` so the button clears 3:1 on the navy and the label stays above 4.5.

No casino type, chips, printed card slots, glossy green, or a spotlight. The only suits are the faint felt lattice. The demo bar uses `--mat-bar`.
