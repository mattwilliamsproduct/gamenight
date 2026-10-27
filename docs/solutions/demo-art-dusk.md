# Demo dusk art and logo

Matt asked for better game images and a better logo, then narrowed it to one direction: a quiet back porch at dusk. Subtle, less busy, still recognizable.

## What ships by default

Nothing new. Home tiles stay `public/theme/game-card-*-thumb.jpg`. The nav mark stays `public/theme/back-porch-mark.jpg`. Production (`cardknight.vercel.app`) ignores `?demo`.

## Preview params

On localhost or `*-mattwilliamsproducts-projects.vercel.app`:

- `?demo&art=dusk` — Home picker tiles
- `?demo&logo=dusk` — nav mark
- Combine them. `art` / `logo` without `demo` does nothing.

`scripts/test-demo-art.mjs` locks the no-param path and the six WebP slugs.

## Raster paths

v1 tiles live at `public/assets/art/dusk/<slug>.webp`. A tighter v2 replaces those files in place. Do not rename the slugs.

The attached v1 binaries did not mount in this environment. The committed WebPs reconstruct those six compositions so crop and slugs can be judged. Overwrite the same files with the original rasters or v2.

Slugs match `public/theme/game-card-<slug>-thumb.jpg`: `five-crowns`, `818`, `wizard`, `flip7`, `beat-heat`, `rook`.

Tile CSS: `background-size: cover` and `background-position: 50% 62%`. Subjects sit in the lower middle. Cropping the lantern is fine. Do not letterbox.

## Motifs

- **Five Crowns** — five cards (star, heart, club, spade, diamond) plus a small crown.
- **818** — three cards reading 8, 1, 8. The numerals are the subject, not a title baked over a beach.
- **Wizard** — one hat, one card, one candle.
- **Flip 7** — one 7 flipping off a deck.
- **Beat the Heat** — one chili on a short card fan.
- **Rook** — one bird on a deck, not a chess piece.

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
