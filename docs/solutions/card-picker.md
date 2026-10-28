# Home card picker

Matt's Home picker is seven upright 5:7 card backs. The cards speak for themselves.

## What landed

- One shared `.s2-card-frame`: same 5:7 box, 10px radius, max 220px. Faces are exact 5:7 webps (`scripts/fit-card-faces.py`) drawn with `object-fit: cover`. No under-card labels.
- The frame does not carry `s2-art-*`. Old porch/tropical tile backgrounds stay off the picker.
- Faces live in `public/assets/cards/*.webp`. Select, then Start.
- iPad landscape 1024×768 and TV 1920×1080 are the primary layouts (landscape iPad mirrored to TV). Portrait and phone must not break.
- 1024 is 4+3. Cards fill their cells up to 220px. Start stays on screen. No dead band under the cards.
- Tonight's Table rows keep their natural height. The table scrolls when the list is long. The seat grid never shrinks behind chips and never uses `1fr` rows.
- Home Saved chip says `✓ Saved` and sits in Tonight's Table so it never covers Game Instructions.

## Do not

- Do not put labels back under the cards.
- Do not reintroduce `?demo&tapstart=1`.
- Do not use fixed 220px columns that overflow the Start panel.
- Do not let theme thumbs or dusk tiles show through beside a card face.
- Do not shrink seat rows with `1fr` so they overlap, or flex-shrink the seat grid so seated people hide behind chips.
