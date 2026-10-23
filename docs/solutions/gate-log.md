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
| 2026-10-23 | #48 | scoring_rules. A new Hand and Foot round is clean × 500 + dirty × 300 + red 3s × 100 + going out once + card points − cards left. Older canasta and three-field saves keep their formulas. | 4 | n/a | fallback | Gate B. Proceed. Cards left is the one subtraction on a new round. Seat picker and the editable dirty rate stay with Matt. |
| 2026-10-23 | #48 | scoring_rules. A new Hand and Foot round is clean × 500 + dirty × 300 + red 3s × 100 + going out once + card points − cards left. Older canasta and three-field saves keep their formulas. | 4 | n/a | fallback | Gate C. Packet filled from check, scorebook, functional, porch-night, and viewport boxes. Stay draft. Do not undraft or merge. |
| 2026-10-23 | #48 | taste_ui. iPad Hand and Foot entry keeps the active side's six inputs and total above a full-width keypad. | 2 | n/a | fallback | Gate B. Proceed. The shared tablet side grid was leaving the keypad in the left column. |
| 2026-10-23 | #48 | taste_ui. iPad Hand and Foot entry keeps the active side's six inputs and total above a full-width keypad. | 2 | n/a | fallback | Gate C. 768×1024 boxes passed, then ipad-entry-keypad.png was rewritten. Stay draft. Do not undraft or merge. |
