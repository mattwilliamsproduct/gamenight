# Slice 2 phone scorekeeper and #59 ports

What broke: Warm Porch Ledger (`?slice2`) already passed the five-size clip sweep, but the phone keypad still sat on top of most roster rows. Flag-off draft #59 had three phone fixes that Slice 2 did not inherit.

What fixed it (flag-on only):

- Phone entry keeps the roster in a scroll lane and the keypad below it, so rows stay reachable.
- Toasts wrap inside 90vw on phones (`#59` toast commit). Shared toast CSS lives under `html.slice2-tv`.
- Scorecard names that fit the cell but overflow the name slot now shrink (`#59` NAME-FIT early-exit). Slice 2 still shrinks when the slot width is 0.
- `#59`'s one-line `#roster-count` chip is flag-off home only. Slice 2 already replaced that chip; the seated heading now stays on one line and the panel head wraps instead.

What not to repeat: do not restyle the ledger or change Life Preserver auto-apply. Do not port #59 welcome / sample-night / link-preview work onto this branch. Do not hide the selected player on a short phone without a named indicator — scroll the SELECTED roster row into view and outline it; keep a compact one-line `Scoring: Name` if it fits without pushing 00/0 off screen. On a 375-tall phone, stack Cancel + Review on one row and keep Submit full-width so the last keypad row stays fully tappable.
