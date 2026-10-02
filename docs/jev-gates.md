# Jev gates

House rules for Gate B and Gate C. The log format lives in `docs/solutions/gate-log.md`. The packet they judge lives in `docs/prove-it-packet.md`.

Prefer Gateway `typesafe-ai/jev` when that provider is proven. Until then, use provider `fallback` and judge conservatively. A thin packet fails. Do not invent a Noul score. Do not buy Gateway credits from this doc.

A classifier never undrafts or merges. Matt says undraft or merge for an app or product PR. That includes a high score.

## Gate B

Record the choice and the gnarliness before the slice is called done.

Choice is one of `clear_cut_bug`, `taste_ui`, `scoring_rules`, `docs_os`, or `needs_matt`.

Gnarliness is an integer from 1 to 5. That integer is the score column. Name the invariants, the files, and any open taste call in the action column. Provider `fallback` still picks a choice and a gnarliness. Do not raise the score to look clearer than the slice is.

`needs_matt` stays with Matt. A classifier does not take that call.

## Gate C

Judge the filled prove-it packet.

- Provider `jev` must report Noul greater than or equal to 0.95. Below 0.95, do not use ready-to-test language. Fix the packet or the slice and call again.
- Provider `fallback` writes `n/a` for Noul. Say the conservative judgment in the action column. Do not write 0.95 to fill the cell.

Ready-to-test language still waits on a filled packet either way.

## Log every call

Append one row to `docs/solutions/gate-log.md` for every Gate B or Gate C call. Do not rewrite old rows.

Columns, in order:

`date`, `task id`, `choice`, `score`, `noul`, `provider`, `action`

- **date.** `YYYY-MM-DD`.
- **task id.** The stamp or PR, for example `T1` or `#60`.
- **choice.** The Gate B approach. Repeat it on a Gate C row so the line stands alone.
- **score.** Gate B gnarliness, 1 through 5.
- **noul.** Gate C Noul from `jev`, or `n/a` on fallback.
- **provider.** `jev` or `fallback`.
- **action.** What you did because of the call. Proceed, stop, or conservative fallback.

Provider stays `fallback` on new rows until Gateway `typesafe-ai/jev` is proven.
