# Home card picker

Matt's Home picker is seven upright 5:7 card backs. The cards speak for themselves.

## What landed

- Faces live in `public/assets/cards/*.webp`. Shared outer size, 10px radius, max 220px wide (TV).
- No name or rule line under the cards. Accessible names stay on `aria-label`. The Start bar still says `Five Crowns · 6 players · 11 rounds`.
- Select, then Start. There is no tap-to-start flag.
- Rook (`rook-card.png`, 822×1348), Beat the Heat (whitened `beattheheat-card.png`, 1580×2512), and 818 (cleaned `818-card.png`, 1424×2078) are taller than 5:7: `contain` on `#fff`.
- Canasta is the approved vector `canasta-card.png` (1500×2100, exact 5:7, bigger type).
- Flip 7 is the flat Vengeance box. Five Crowns and Wizard are the approved portraits.

## Do not

- Do not put labels back under the cards.
- Do not reintroduce `?demo&tapstart=1`.
- Do not stretch Rook, Heat, or 818.
