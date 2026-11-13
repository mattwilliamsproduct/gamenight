# Porch mat

Matt, 2026-11-13. The family's table is a blue poker mat. Home should feel like that mat, not a flat swatch and not a wood page. Draft PR #90 only. Do not port this into #86.

The picker is the mat. `.s2-home-start` is clear. The six decks sit on the calm center (`--mat-felt`). `--mat-felt-texture` is the quiet cube tile, masked to the edge. `--mat-stitch` is one ivory inset line. `--deck-shadow` is the lift under every deck. Swap those four when the surface changes.

Tonight's Table, the score sheet, and score entry stay ivory. The page behind them is the same calm navy, without the cube tile. Numbers are read on ivory. A short score sheet ends at the last row, so the navy shows under it. On a phone, Spin ready stays on the right of the name, which is #86's placement.

Every deck has a light rim. The selected deck keeps the #86 teal rim (`#0a5c54`, 6px, on top of the art) and adds an ivory halo so that rim still reads on navy. Action teal is `#11786c` so the button clears 3:1 on the navy and the label stays above 4.5.

No casino type, chips, suit icons, printed card slots, glossy green, or a spotlight. The demo bar uses `--mat-bar`.
