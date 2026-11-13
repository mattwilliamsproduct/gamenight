# Special-round labels

Matt, 7:03 PM ET: keep the plain stat descriptions. Do not revert them.

Production `39e6b51` says `WHAMMY`, `Nolie`, and `Cami Whammi` on the passport detail Signature Moments cards, and the passport chips say `WHAMMY`, `Nolie`, and `Cami` with the count beside the word.

`7938f55` ("RC4 usability: 1-decimal records, player fills scorecard width, plain passport chips") replaced those with `Only one scored`, `Everyone made bid`, and `Everyone missed`.

`e448ccf` ("Fix tied end-of-match copy and sentence Passport chips") is the commit that produced the words Matt kept:

- Passport chips, from `BPGRecords.formatSpecialChip` in `public/assets/records-logic.js`, rendered on each passport card in `renderProfilesGrid`: `Only player to score, twice`, `Everyone made their bid, once`, `Everyone missed, 3 times`.
- Signature Moments on the open passport (`#detail-special-rounds` via `getSpecialRoundStatsForPlayer` in `public/index.html`): `Only player to score`, `Everyone made their bid`, `Everyone missed`.

The Records screen does not paint a separate WHAMMY row. The chip formatter lives in `records-logic.js` and the passport grid is what shows it. The round modal titles stay `WHAMMY!`, `NOLIE!`, and `CAMI WHAMMI!`, with the same copy as main.
