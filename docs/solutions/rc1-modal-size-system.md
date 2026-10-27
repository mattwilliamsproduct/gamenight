# Shared modal size system

Matt: the past-night scorecard from Recent nights used a sliver of the page, and the Life Preserver wheel had the same leftover-viewport complaint.

One token set, not per-modal max-width hacks:

- `--bp-modal-wide: min(92vw, 1200px)` for scorecards, rules, entry, wheel
- `--bp-modal-form: min(92vw, 40rem)` for settings, picker, audit, add-player
- `--bp-modal-confirm: min(92vw, 28rem)` for dealer, retire, color
- Phone: all three become `calc(100vw - 16px)` with `max-height: calc(100dvh - 16px)`
- Body type at least 16px, buttons at least 44px, page scroll locked while a modal is open

Classes: `bp-modal-panel`, `bp-modal-panel--form`, `bp-modal-panel--confirm`, plus `bp-modal-head` / `bp-modal-body` / `bp-modal-foot`.

The past-night `#scorecard-modal` is the content-heavy case. Sticky name column and header stay on that table. Esc and a Tab trap stay on the top open shell.

Rook results stays a phone bottom sheet and does not opt into the wide panel.
