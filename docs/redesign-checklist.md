# Redesign handoff checklist

Opus writes this plan. Grok does not edit CSS until all four fields below are filled in the PR.

Porch Club design still waits for Matt's visual sign-off. This checklist does not replace that stop.

The prove-it packet still applies after the CSS lands. Phone 390 and laptop looks go in `docs/prove-it-packet.md`, not in a fifth field here.

## Density

Say the reading order. Say where the dealer chip sits relative to the letters. Say that totals and the last entered number stay readable at iPad, laptop, and 1080p. Fitting may shrink type. It may not ellipsize.

## NAME-FIT

Say which name must stay whole, and on which fixture. The dealer control hugs the glyphs. It does not ellipsize the name.

## Kill criteria

Name what fails the slice. Write the failures, not a pep line. Typical kills already in taste: a truncated name, a keypad covering a row, Actions clipped by the match banner, type shrunk until a name is a hint.

## Gallery ids

Name the `QA_SCENARIOS` keys the CSS must be checked against. Add a scenario in `public/qa/fixtures.mjs` when none covers the slice. Open each id at `http://127.0.0.1:4173/?gnqa=1&scenario=<id>`.

## Template

```
Density:
NAME-FIT:
Kill criteria:
Gallery ids:
```
