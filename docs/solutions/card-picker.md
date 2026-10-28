# Home card picker

Matt's Home picker is seven upright 5:7 card backs. The cards speak for themselves.

## What landed

- One shared `.s2-card-frame`: same 5:7 box, 10px radius, max 220px. Faces are exact 5:7 webps (`scripts/fit-card-faces.py`) drawn with `object-fit: cover`. No under-card labels.
- The frame does not carry `s2-art-*`. Old porch/tropical tile backgrounds stay off the picker.
- Faces live in `public/assets/cards/*.webp`. Select, then Start.
- Rook and Beat the Heat defaults are the edge-filled 5:7 faces. Pads use background only (teal clover / Heat field). Do not stretch. The frame radius is the only corner.
- Five Crowns is a designed 700×980 SVG raster (`five-crowns.svg` → `five-crowns.webp`), drawn from Matt's photo: purple lattice, gold-edged band, stepped gold-and-red FIVE CROWNS mark with one jeweled crown, no copyright. Do not retouch the photo.
- iPad landscape 1024×768 and TV 1920×1080 are the primary layouts (landscape iPad mirrored to TV). Portrait and phone must not break.
- Columns first, then cards. Tonight's Table is 348–360px at 1024 so first names stay whole. The seven 5:7 cards take leftover space (4+3). The Start bar stays inside Start a New Match.
- Tonight's Table rows keep their natural height. The table scrolls when the list is long. Four seated shows every chip. The seat grid never shrinks behind chips and never uses `1fr` rows.
- Home Saved chip says `✓ Saved` and sits in Tonight's Table so it never covers Game Instructions.

## Do not

- Do not put labels back under the cards.
- Do not reintroduce `?demo&tapstart=1`.
- Do not use fixed 220px columns that overflow the Start panel.
- Do not let theme thumbs or dusk tiles show through beside a card face.
- Do not put the old padded Rook / Beat the Heat faces back. Solid-color side pads and source-card white corners are a kill; extend the pattern instead of stretching.
- Do not retouch or straighten Matt's Five Crowns photo. The picker face is the designed SVG.
- Do not shrink seat rows with `1fr` so they overlap, or flex-shrink the seat grid so seated people hide behind chips.
