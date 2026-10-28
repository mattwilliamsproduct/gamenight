# Home card picker

Matt's Home picker is seven upright 5:7 card backs. The cards speak for themselves.

## What landed

- One shared `.s2-card-frame`: same 5:7 box, 10px radius, max 220px. Art is `contain` on a matched fill. No under-card labels.
- Faces live in `public/assets/cards/*.webp`. Select, then Start.
- iPad landscape 1024×768 and TV 1920×1080 are the primary layouts (landscape iPad mirrored to TV). Portrait and phone must not break.
- The 4-up grid stays inside Start a New Match with even gutters. Cards grow to fill the start column down to the Start bar so 1024 has no dead band.
- Home Saved chip says `✓ Saved` and sits top-left so it never covers Game Instructions.

## Do not

- Do not put labels back under the cards.
- Do not reintroduce `?demo&tapstart=1`.
- Do not use fixed 220px columns that overflow the Start panel.
- Do not stretch Rook, Heat, or 818. Contain them in the shared frame.
