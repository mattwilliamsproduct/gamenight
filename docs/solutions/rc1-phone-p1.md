# RC1 phone P1s

Matt’s 390 state-shot pass. Same draft. No new taste.

## What broke

- NAME-FIT shrank each overflowing name on its own. Short names stayed at the row-fit max, so Cat looked huge and Megan looked small.
- `#save-indicator` sat bottom-left and covered the last scorecard row and home seat 7. `#slice2-saved` also took a nav slot.
- Phone nav wrapped: Table, Active Match, Records, Profiles / Settings, Saved.
- `fullPage: true` state shots made 390 resume/records look ~175px wide. That was the screenshot scale, not the viewport.
- Wheel copy said `Best help +20` while slices still include modest setbacks. The rule stays. The copy now states the computed min and max.
- Phone Records stacked the podium to one column at 420px and pushed past nights down. Past nights stay on the ledger. The podium keeps the 3-column token layout.

## What not to repeat

- Do not fit scorecard names per row after setting a shared `--scorecard-player-font`. One column, one size.
- Do not put Saved in `#top-nav`. The flash lives top-right, under the nav, never on a seat or name row.
- Do not use `fullPage` shots to judge 390 layout width.
- Do not change Life Preserver slice math to make the header prettier. Negative slices are intended.
