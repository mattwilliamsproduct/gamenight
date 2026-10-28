# Home card picker

Matt asked for upright literal 5:7 card backs on Home, not the old beach tiles. All seven shelf games show, including Rook.

## What landed

- Faces live in `public/assets/cards/*.webp`. Outer size and ~10px radius are shared. CSS is `public/assets/card-picker.css`.
- Rook is `rook-card.png` (822×1348, even white border). Not the earlier `rook.png`.
- Beat the Heat is `beattheheat-card.png` (1580×2512, Matt's own deck). Not a flame placeholder.
- Both are taller than 5:7 (~0.61 and ~0.63). Fit them with `contain`, centered, on `#fff` so the white card border is the frame. Do not stretch. Do not `cover`.
- Canasta stays `canasta-card.png` → `canasta.webp`.
- Flip 7 is the flat Vengeance box at about 2×. Soft on TV.
- Default: select, then Start under the grid (iPad slip-starts). `?demo&tapstart=1` on localhost or a preview host starts the tapped card.

## Do not

- Do not hide Rook again unless Matt asks.
- Do not upscale Flip 7 past ~2× unless a flat official box-front ≥800px shows up. The theop 3000px 3D pack shot is not a card face.
- Do not apply the 5:7 card faces to Records ledger marks. Scope Home art to `.s2-home-start`.
