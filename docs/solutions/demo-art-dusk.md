# Demo dusk art and logo

Matt asked for better game images and a better logo, then narrowed it to one direction: a quiet back porch at dusk. Subtle, less busy, still recognizable.

## What ships by default

Nothing new. Home tiles stay `public/theme/game-card-*-thumb.jpg`. The nav mark stays `public/theme/back-porch-mark.jpg`. Production (`cardknight.vercel.app`) ignores `?demo`.

## Preview params

On localhost or `*-mattwilliamsproducts-projects.vercel.app`:

- `?demo&art=dusk` — Home picker tiles
- `?demo&logo=dusk` — nav mark
- Combine them. `art` / `logo` without `demo` does nothing.

`scripts/test-demo-art.mjs` locks the no-param path.

## Drop-in rasters

Matt is painting the six tiles. Put WebP at `public/assets/art/dusk/<slug>.webp`. The stand-ins are SVG until those files land. After they land, set `html.dataset.bpArtRaster = '1'` (or add the files and switch the CSS) so the tiles use cover-cropped rasters.

Slugs: `five-crowns`, `wizard`, `818`, `flip-7`, `beat-the-heat`, `rook`.

## Motifs (from this repo, not invented box art)

- **Five Crowns** — five crown suits; rummy; 11 hands; low wins.
- **Wizard** — Wizard card / hat; exact-bid tricks.
- **818** — house 8-1-8 bid/trick race. This repo has no published 818 box. The stand-in is an hourglass of cards (wide-narrow-wide). No giant 818 numerals.
- **Flip 7** — flip, bank, bust. One 7 card. The current flamingo is porch decor, not the game.
- **Beat the Heat** — pepper heat; ends at 66. One chili.
- **Rook** — call-your-partner Rook; bird / Rook card. A bird on the rail, not a chess piece.

## Logo

One option: a flat lantern mark (`public/assets/logo/dusk-mark.svg`) plus the existing Pacifico "Back Porch" wordmark. "Games" stays secondary. The mark uses three colors (`#073f3b`, `#f4efe6`, `#e76f51`) so it stays crisp at 32px. The full lockup is `public/assets/logo/dusk.svg`.

Pacifico stays. It is the current nav face. A new display face would be a second taste call.

Honest bar on the SVG stand-ins: they fix the “same beach” problem and drop the baked 818 numerals, but they are flat icons, not finished dusk paintings. Flip 7 / Wizard / Rook / Heat read at 1440. Five Crowns is weaker at 375. 818 is a card fan, not yet an 8-1-8. Do not treat these as the ship art. Wait for the painted WebPs.

## Kill criteria

- A missing `?demo` changes tiles or the logo.
- Baked-in title text on a tile.
- Six scenes that still look like the same beach.
- A mark that turns to mud at 32px or 40px.
- Edits to Life Preserver, the scorecard header, or Records files.

## Density / NAME-FIT / gallery

Density: title stays under the art in the Warm Porch Ledger picker. Art gets a taller crop and no 0.88 fade. NAME-FIT is unchanged (this slice does not touch the scorecard). Gallery: `home-party` for the default Home. Dusk is `?demo&art=dusk` / `?demo&logo=dusk`, not a gallery flag.
