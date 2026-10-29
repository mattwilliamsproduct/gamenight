# RC2 look fixes after 1400

Matt rejected `9c27ce3` / `rc2-candidate-20261029-1400` on the shots. Leave that tag in place.

Saved sat `nowrap` beside the Tonight's Table title in a 348–360px Home column, so the pill clipped to `DEVIC` at 1440 and poked past the card at 390. Park it under the title, `max-width: 100%`, with real inset.

The 1440/1024 scorecard reserved NOW only as `+1` in the column divisor. `table-layout: fixed` then poured leftover width into R1–R5 and clipped `R6 · NOW`. Reserve the NOW min-width, pin `--scorecard-now-col`, and shrink round columns if NOW still kisses the wrap. Do not hide another oldest hand once NOW is on screen. `f5cfaa9` used the same `+1` divisor, so this is the same leftover-width clip, not a card-picker regression.

1024 tablet entry painted `#score-entry-context` coral (`#a9513d` / `--bp-coral`), which reads as an error. Use `--s2-muted` at a readable size. Hide SCORE/Blank on the 8-player compact cells. Dealer/dusk teal insets on non-active rows have no stated meaning; only the active row stays accented.

Hall of Shame avatars at 1440 were 28px next to 36px ledger marks. They are 40px from 1100px up.
