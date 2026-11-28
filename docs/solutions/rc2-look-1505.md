# RC2 look fixes after 1505

Matt rejected `8c13910` / `rc2-candidate-20261029-1505` on the shots and the commit. Leave that tag in place.

Temporary demo-loading still shipped: `public/assets/demo-seed.mjs` (TEMP header), `bootDemoSeedIfRequested`, `window.BPGDemoLiveGame`, and `demo-art.mjs` / `demo-art.css`. Delete them. Tests inject fixtures from `tests/helpers`. Card faces stay on `CARD_FACES` and `card-picker.css`. `?lp=proposed` was a live scoring switch, not harmless. It is removed from the page. Proposed amounts stay in unit tests via `options.table`.

1024 Records Overview stacked CAREER WINS / WIN RATE / WIN STREAK because `@media (max-width: 1100px)` forced `.s2-headline` to one column. iPad landscape is the primary device. Keep three columns through 1024. Stack only at phone (`max-width: 760px`).

1440 late scorecard clipped `R11 · Now` to `R11 · NOV`. Drop the middle dot (`R11 Now`) and allow the header to wrap at 761px and up. Phone stays `R11`.

390 entry kept the coral `HAND OF 8 · LOG SCORES` subtitle and hid the third row under Scoring. Mute `#score-entry-context` on every Slice 2 sheet. Keep the list from eating the keypad (`flex: 1 1 0`, 4px row pad) so three full rows sit above the scoring bar at 390x844. A leftover fourth-row sliver is covered by the Scoring chrome (`z-index` plus a cream lift), not painted under the bar.

1024 8-player leftover teal on Mike was the dealer `border-color` (`--blue-border`), not the inset shadow 1505 hid. Non-active rows, including dealer, use the hairline only. Active stays the accent.
