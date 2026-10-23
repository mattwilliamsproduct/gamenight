# Gate log

Append-only log of Gate B and Gate C calls. Column rules: `docs/jev-gates.md`. One row per call. Do not edit a row after you append it.

Provider is `fallback` until Gateway `typesafe-ai/jev` is proven. Do not invent a Noul score on those rows.

The table starts with a header and one example row. The example is the format. It is not a Gate C pass.

| Date | Task id | Choice | Score | Noul | Provider | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-02 | T1-T8 | docs_os. Docs-only Coding OS pack. No game behavior. | 1 | n/a | fallback | Example row. Gateway typesafe-ai/jev is not proven, so provider is fallback. |
| 2026-10-19 | cache-name-check | docs_os. CI-only CACHE_NAME placeholder/prefix/activate guard. No game behavior. | 1 | n/a | fallback | Gate B. Proceed. One template, one check file T1 already owns. |
| 2026-10-19 | cache-name-check | docs_os. CI-only CACHE_NAME placeholder/prefix/activate guard. No game behavior. | 1 | n/a | fallback | Gate C. Conservative pass. Packet filled. Do not undraft or merge. |
| 2026-10-19 | slice-c-score-guards | docs_os. CI/test guards for scorebook scoring and porch-night. No game behavior. | 2 | n/a | fallback | Gate B. Proceed. Goldens in test-scorebook; one Playwright walk on CI. Gallery hydrate still writes gn_history. |
| 2026-10-19 | slice-c-score-guards | docs_os. CI/test guards for scorebook scoring and porch-night. No game behavior. | 2 | n/a | fallback | Gate C. Conservative pass. Packet filled. Do not undraft or merge. |
| 2026-10-23 | slice1-data-integrity | scoring_rules. One commit boundary for live and historical scores, Option B records, and same-match merge refusal. | 4 | n/a | fallback | Gate B. Proceed. Contracts live in scorebook.js. The page paints and saves. Do not undraft or merge. |
| 2026-10-23 | slice1-data-integrity | scoring_rules. One commit boundary for live and historical scores, Option B records, and same-match merge refusal. | 4 | n/a | fallback | Gate C. Conservative pass. Packet filled in the draft PR. Provider fallback, Noul n/a. Do not undraft or merge. |
| 2026-10-23 | slice1-data-integrity-tighten | scoring_rules. Blank Next stays unentered, incomplete history stays out of the book, and Resume Match saves the table game first. | 3 | n/a | fallback | Gate B. Proceed. Same draft branch. Do not undraft or merge. |
| 2026-10-23 | slice1-data-integrity-tighten | scoring_rules. Blank Next stays unentered, incomplete history stays out of the book, and Resume Match saves the table game first. | 3 | n/a | fallback | Gate C. Conservative pass. Packet updated on the draft PR. Provider fallback, Noul n/a. Do not undraft or merge. |
| 2026-10-23 | slice1-blank-score-is-zero | scoring_rules. Submitted blanks become 0 for scores and tricks, then the trick total is checked. Stored nulls and Rook fields stay explicit. Completed history is `completed !== false`. | 3 | n/a | fallback | Gate B. Proceed. Same draft branch. Do not undraft or merge. |
| 2026-10-23 | slice1-blank-score-is-zero | scoring_rules. Submitted blanks become 0 for scores and tricks, then the trick total is checked. Stored nulls and Rook fields stay explicit. Completed history is `completed !== false`. | 3 | n/a | fallback | Gate C. Conservative pass. Packet updated on the draft PR. Provider fallback, Noul n/a. Do not undraft or merge. |
