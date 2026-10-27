# Demo dusk art and logo

Matt asked for better game images and a better logo, then narrowed it to one direction: a quiet back porch at dusk. Subtle, less busy, still recognizable.

## What ships by default

Nothing new. Home tiles stay `public/theme/game-card-*-thumb.jpg`. The nav mark stays `public/theme/back-porch-mark.jpg`. Production (`cardknight.vercel.app`) ignores `?demo`.

## Preview params

On localhost or `*-mattwilliamsproducts-projects.vercel.app`:

- `?demo&art=dusk` — Home picker tiles
- `?demo&logo=dusk` — nav mark
- Combine them. `art` / `logo` without `demo` does nothing.

`scripts/test-demo-art.mjs` locks the no-param path and the five mapped dusk tiles plus the Canasta comparison tile. Rook is not in the dusk map.

## Raster paths

v2 tiles live at `public/assets/art/dusk/<slug>.webp`. Later passes replace those files in place. Do not rename the slugs.

The five mapped v2 binaries did not mount in this environment. Those committed WebPs reconstruct the tighter frames so crop and slugs can be judged. Overwrite the same files with the original rasters.

Mapped slugs: `five-crowns`, `818`, `wizard`, `flip7`, `beat-heat`. `canasta.webp` is sheet-only: cream heart stack (hand) and a teal back (foot). The official 960×540 attachment did not mount at `back-porch/art/dusk-v2/canasta.webp`; the committed file reconstructs that frame at the same cover crop. Rook keeps `public/theme/game-card-rook-thumb.jpg`.

Tile CSS: `background-size: cover` and `background-position: 50% 55%`. Wizard is `50% 46%` so the hat tip stays in the crop. Cropping the small lamp is fine. Do not letterbox.

## Motifs

- **Five Crowns** — five cards (star, heart, club, spade, diamond) plus a small crown.
- **818** — three cards reading 8, 1, 8. The numerals are the subject, not a title baked over a beach.
- **Wizard** — one hat, one card, one candle.
- **Flip 7** — one 7 flipping off a deck.
- **Beat the Heat** — one chili on a short card fan.
- **Canasta** — two small stacks on the porch table: a cream heart face (hand) and a teal back (foot). Not a picker game on this branch.
- **Rook** — keeps the current beach thumb. No dusk Rook on this branch.

## Logo

On-brand pick is mark-2: a flat teal rocking chair plus a coral card. The hand-built SVG is `public/assets/logo/dusk-mark.svg`. The light variant for dark fields is `public/assets/logo/dusk-mark-light.svg`. The earlier lantern SVG stays at `public/assets/logo/dusk-mark-lantern.svg` for the compare sheet only. The lockup is `public/assets/logo/dusk.svg`: chair mark, Pacifico "Back Porch", small secondary "Games".

Pacifico stays. It is the current nav face. A new display face would be a second taste call.

## Kill criteria

- A missing `?demo` changes tiles or the logo.
- Baked-in title text on a tile (818 numerals as the card subject are the motif, not a title overlay).
- Six scenes that still look like the same beach.
- A mark that turns to mud at 32px or 40px.
- Edits to Life Preserver, the scorecard header, or Records files.
- Renaming the dusk WebP slugs so a v2 cannot drop in.

## Density / NAME-FIT / gallery

Density: title stays under the art in the Warm Porch Ledger picker. Art gets a taller crop and no 0.88 fade. NAME-FIT is unchanged (this slice does not touch the scorecard). Gallery: `home-party` for the default Home. Dusk is `?demo&art=dusk` / `?demo&logo=dusk`, not a gallery flag.
