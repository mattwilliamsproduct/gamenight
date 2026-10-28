# Shared modal size system

Matt: the past-night scorecard from Recent nights used a sliver of the page, and the Life Preserver wheel had the same leftover-viewport complaint.

One token set, not per-modal max-width hacks:

- `--bp-modal-wide: min(92vw, 1200px)` for rules and score entry
- `--bp-modal-leftover-w` / `--bp-modal-leftover-h`: `min(96vw/96vh, 100vw/dvh − 2×gutter)` for past-night scorecards (same leftover idea as the wheel, rectangular so a table can use the laptop/TV)
- `--bp-modal-form: min(92vw, 46rem)` for settings, picker, audit, add-player, Save & End
- `--bp-modal-confirm: min(92vw, 28rem)` for dealer, retire, color
- Phone: leftover, wide, form, and confirm become `calc(100vw - 16px)` with `calc(100dvh - 16px)` height
- Body type at least 16px, buttons at least 44px, page scroll locked while a modal is open

Classes: `bp-modal-panel`, `bp-modal-panel--form`, `bp-modal-panel--confirm`, plus `bp-modal-head` / `bp-modal-body` / `bp-modal-foot`.

The past-night `#scorecard-modal` is the content-heavy case. Sticky name column and header stay on that table. Esc and a Tab trap stay on the top open shell.

Rook results stays a phone bottom sheet and does not opt into the wide panel.

## Inventory (laptop 1024 unless noted)

| Modal | Before | After |
| --- | --- | --- |
| Past-night scorecard | `max-w-5xl` (1024px, 71% at 1440) | leftover fill: ~96% width and height at 1440/1920; near-full sheet on phone |
| Life Preserver wheel | leftover `min(96vw, 100dvh-8px)` | same leftover tokens, 874px square at 1440 |
| Add Player | confirm 412px | form 736px / ≥50% at 1440; near-full sheet on phone; 18px input; 56px suggestion rows |
| Save & End | `max-w-md` ~448px | form 736px |
| Audit log | `max-w-lg` ~512px | form 736px |
| LP picker | `max-w-md` ~448px | form 736px |
| Settings | `max-w-md` ~448px | form 46rem |
| Rules / LP rules | `max-w-5xl` | wide 1200 |
| Score entry | leftover 980px | wide token |
| Dealer / retire / color | `max-w-sm` / `max-w-md` | confirm 28rem |
| Victory / loser | `max-w-lg` | form 40rem |
| Rook results | phone bottom sheet | unchanged |
