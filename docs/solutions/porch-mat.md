# Porch mat

Matt, 2026-11-13. The family's table is a blue poker mat. Home should feel like that mat, not a flat swatch and not a wood page. Draft PR #90 only. Do not port this into #86.

The picker is the mat. The center is plain `--mat-felt`. `--mat-felt-texture` is a band on the outer edge only, about 44px at a laptop and 16px on a phone, and it stops before the decks. `--mat-stitch` is the ivory line between that band and the plain center. `--deck-shadow` is the lift under every deck. Swap those four when the surface changes.

Tonight's Table, the score sheet, and score entry stay ivory. The page behind them is the same calm navy, without the cube tile. Numbers are read on ivory. A short score sheet ends at the last row, so the navy shows under it. On a phone, Spin ready sits under the name so the avatar and the name stay the same size on every row. That is a skin choice. #86 keeps the badge beside the name. The skin does not set the score-pad grid. A game with no minus keeps #86's bottom row, `k0 k0 k0 next`.

Every deck has a light rim. The selected deck keeps the #86 teal rim (`#0a5c54`, 6px, on top of the art) and adds an ivory halo so that rim still reads on navy. Action teal is `#11786c` so the button clears 3:1 on the navy and the label stays above 4.5.

No casino type, chips, suit icons, printed card slots, glossy green, or a spotlight. The demo bar uses `--mat-bar`.
