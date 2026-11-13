# Porch mat

Matt, 2026-11-13. The family's table is a blue poker mat. Home should feel like that mat, not a flat swatch and not a wood page. Draft PR #90 only. Do not port this into #86.

Matt, 2026-11-13 evening, replaced the navy and the cube band: the surface is a blue felt, mid royal blue (`--felt-base` #1f4f9a), with a faint repeating card-suit diamond lattice (hearts, spades, clubs, diamonds) that shows toward the edges and fades to near-plain felt in the center. The heavy geometric frame is gone. Every felt knob lives in the `--felt-*` tokens at the top of `porch-ledger.css`, and `--felt-layers` is the one background every screen uses (`porch-felt-suits.svg` 1.3 KB, `porch-felt-noise.svg` 0.6 KB). The Home mat is that same felt seen through the panel, with one quiet `--mat-stitch` line. `--deck-shadow` is the lift under every deck. The lattice stays quieter than the decks.

Tonight's Table, the score sheet, and score entry stay ivory. The page behind them is the same felt. Numbers are read on ivory. A short score sheet ends at the last row, so the navy shows under it. On a phone, Spin ready sits under the name so the avatar and the name stay the same size on every row. That is a skin choice. #86 keeps the badge beside the name. The skin does not set the score-pad grid. A game with no minus keeps #86's bottom row, `k0 k0 k0 next`.

Every deck has a light rim. The selected deck keeps the #86 teal rim (`#0a5c54`, 6px, on top of the art) and adds an ivory halo so that rim still reads on navy. Action teal is `#11786c` so the button clears 3:1 on the navy and the label stays above 4.5.

No casino type, chips, printed card slots, glossy green, or a spotlight. The only suits are the faint felt lattice. The demo bar uses `--mat-bar`.
