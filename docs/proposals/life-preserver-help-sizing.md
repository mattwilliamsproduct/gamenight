# Life Preserver help sizing

Comparison only. Live reward math stays 45/30/5/12/8. Wheel visuals stay equal-ish 40 pockets. The Proposed wheel is TEMP behind `?demo&lp=proposed`.

## Spec

- **Current:** 45% small / 30% medium / 5% big / 12% no change / 8% setback. Amounts from one strong remaining unit, then clamped.
- **Proposed:** gap to 1st. 30% really good / 45% good / 10% no change / 15% small setback. No separate small-help category.
- **Band pick:** good uses three discrete pockets at 20 / 30 / 40% of the current gap to 1st, equally likely (15% each). Really good uses 45 / 55 / 65%, equally likely (10% each). After equal pockets collapse to the same rounded amount, those shares add.
- **Rounding:** floor to the game increment (Five Crowns, Wizard, and Flip 7 in 5s; 818 in 1s), then apply caps. Flooring can land a hair under the band; the printed pocket is still that rounded amount.
- **Caps, in order:** 65% of the gap to 1st, then the per-game max, then never tie or pass the current leader. One spin per player. Existing eligibility stays. Outcome is locked before the animation. Assisted-match records policy unchanged. No late-game boost.
- **Per-game max help:** Five Crowns 75, Wizard 60, Flip 7 40, 818 20.
- **Setbacks (Proposed):** small, per game, not gap-scaled. Five Crowns 5 and 10, Wizard 5 and 10 (cap 15), Flip 7 5, 818 1 and 2 (cap 4).
- **Leapfrog:** this candidate still lets a rescue reach 2nd and only blocks matching 1st (the leader rule). A stricter "cannot pass 3rd" leapfrog is not applied. The 65% blocked column flags the best-help pocket when a cap cuts the raw 65% value. The leapfrog-to-3rd note says whether that extra cap would cut a 65% rescue, so Matt can keep or relax it.
- **Already in the top 3:** 2nd and 3rd still use the gap to 1st. If that gap is smaller than one increment, Proposed falls back to one increment of modest help.
- **Ties:** the current leader score is the tied 1st score. A spin still cannot match it. Tied non-leaders share a place the same way the scorecard does (two 4ths, then 6th).
- **Layout fixture only:** a 20/55/10/15 split still relayouts the wheel in tests. It is not live and not the TEMP Proposed wheel.

Remaining-round model for end-of-game top-3: Five Crowns hands score `5 × 0..10`; 818 rounds score a made bid 62% of the time (`+10` plus 0-5 tricks) otherwise 0-4; Wizard and Flip 7 add `5 × (2..7)` per remaining round (Flip 7 models 3 more banks). Same model for Current and Proposed.

## Tables

### Five Crowns early · Dee cooked after 4 hands

Player **Dee**. Gap to 1st 52, gap to 2nd 48, gap to 3rd 42, now 5th. Rounds left: 7.

Not eligible (recovery-load).

### Five Crowns middle · Dee 40 behind 1st

Player **Dee**. Gap to 1st 40, gap to 2nd 32, gap to 3rd 25, now 5th. Rounds left: 4.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 25 |
| Largest setback | 10 | 10 |
| Odds of help | 80.1% | 75.0% |
| Average help (when it helps) | 8.2 | 13.9 |
| Average help as % of gap to 1st | 20.5% | 34.7% |
| Odds of a setback | 8.2% | 15.4% |
| Average setback (when it hurts) | 7.5 | 7.5 |
| Expected net (incl. zeros and setbacks) | 6.0 | 9.3 |
| Best / typical / worst rank | 4 / 5 / 5 | 4 / 5 / 5 |
| Best / typical / worst gap to 1st | 20.0 / 35.0 / 50.0 | 15.0 / 30.0 / 50.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 36.4% | 40.0% |
| Leapfrog rate (passes a non-leader) | 4.7% | 19.6% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 30, raw 65% 25) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -20 | 5.0% | 4 | 1 | band | no |
| -10 | 37.5% | 5 | 0 | band | no |
| -5 | 37.5% | 5 | 0 | band | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 4.0% | 5 | 0 | setback | no |
| 10 | 4.0% | 5 | 0 | setback | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -25 | 10.0% | 4 | 1 | band · rounding | no |
| -20 | 10.0% | 4 | 1 | band · rounding | no |
| -15 | 25.0% | 5 | 0 | band · rounding | no |
| -10 | 15.0% | 5 | 0 | band · rounding | no |
| -5 | 15.0% | 5 | 0 | band · rounding | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 5 | 7.5% | 5 | 0 | setback | no |
| 10 | 7.5% | 5 | 0 | setback | no |

### Five Crowns late · Duke-style 51 behind 1st, best current is −20

Player **Duke**. Gap to 1st 51, gap to 2nd 38, gap to 3rd 32, now 5th. Rounds left: 2.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 25 | 30 |
| Largest setback | 10 | 10 |
| Odds of help | 80.0% | 74.4% |
| Average help (when it helps) | 8.6 | 19.0 |
| Average help as % of gap to 1st | 16.9% | 37.3% |
| Odds of a setback | 7.9% | 15.0% |
| Average setback (when it hurts) | 7.5 | 7.5 |
| Expected net (incl. zeros and setbacks) | 6.3 | 13.0 |
| Best / typical / worst rank | 4 / 5 / 5 | 4 / 5 / 5 |
| Best / typical / worst gap to 1st | 26.0 / 46.0 / 61.0 | 21.0 / 36.0 / 61.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 22.3% | 30.9% |
| Leapfrog rate (passes a non-leader) | 5.1% | 19.6% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 35, raw 65% 30) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -25 | 5.0% | 4 | 1 | band | no |
| -10 | 37.5% | 5 | 0 | band | no |
| -5 | 37.5% | 5 | 0 | band | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 4.0% | 5 | 0 | setback | no |
| 10 | 4.0% | 5 | 0 | setback | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -30 | 10.0% | 4 | 1 | band · rounding | no |
| -25 | 10.0% | 4 | 1 | band · rounding | no |
| -20 | 25.0% | 5 | 0 | band · rounding | no |
| -15 | 15.0% | 5 | 0 | band · rounding | no |
| -10 | 15.0% | 5 | 0 | band · rounding | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 5 | 7.5% | 5 | 0 | setback | no |
| 10 | 7.5% | 5 | 0 | setback | no |

### Five Crowns packed table · Dee just barely eligible

Player **Dee**. Gap to 1st 38, gap to 2nd 32, gap to 3rd 28, now 5th. Rounds left: 4.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 10 | 10 |
| Odds of help | 80.1% | 74.4% |
| Average help (when it helps) | 8.3 | 13.0 |
| Average help as % of gap to 1st | 21.8% | 34.1% |
| Odds of a setback | 8.1% | 15.4% |
| Average setback (when it hurts) | 7.6 | 7.6 |
| Expected net (incl. zeros and setbacks) | 6.0 | 8.5 |
| Best / typical / worst rank | 5 / 5 / 5 | 5 / 5 / 5 |
| Best / typical / worst gap to 1st | 18.0 / 33.0 / 48.0 | 18.0 / 28.0 / 48.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 35.2% | 38.5% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 30, raw 65% 20) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -20 | 5.0% | 5 | 0 | band | no |
| -10 | 37.5% | 5 | 0 | band | no |
| -5 | 37.5% | 5 | 0 | band | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 4.0% | 5 | 0 | setback | no |
| 10 | 4.0% | 5 | 0 | setback | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -20 | 15.0% | 5 | 0 | band · rounding | no |
| -15 | 30.0% | 5 | 0 | band · rounding | no |
| -10 | 15.0% | 5 | 0 | band · rounding | no |
| -5 | 15.0% | 5 | 0 | band · rounding | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 5 | 7.5% | 5 | 0 | setback | no |
| 10 | 7.5% | 5 | 0 | setback | no |

### Five Crowns packed mid-pack · 65% would reach 2nd (leapfrog-to-3rd test)

Player **Dee**. Gap to 1st 38, gap to 2nd 6, gap to 3rd 4, now 4th. Rounds left: 3.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 10 | 10 |
| Odds of help | 79.6% | 75.0% |
| Average help (when it helps) | 8.2 | 13.0 |
| Average help as % of gap to 1st | 21.6% | 34.2% |
| Odds of a setback | 8.2% | 15.1% |
| Average setback (when it hurts) | 7.5 | 7.4 |
| Expected net (incl. zeros and setbacks) | 5.9 | 8.6 |
| Best / typical / worst rank | 2 / 3 / 5 | 2 / 2 / 5 |
| Best / typical / worst gap to 1st | 18.0 / 33.0 / 48.0 | 18.0 / 28.0 / 48.0 |
| Immediate top-3 chance | 79.6% | 75.0% |
| Top 3 by the end (model) | 56.4% | 58.9% |
| Leapfrog rate (passes a non-leader) | 79.6% | 75.0% |
| Leapfrog-to-3rd would block 65%? | — | yes (3rd-cap 5 vs raw 65% 20) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -20 | 5.0% | 2 | 2 | band | no |
| -10 | 37.5% | 2 | 2 | band | no |
| -5 | 37.5% | 3 | 1 | band | no |
| 0 | 12.0% | 4 | 0 | zero | no |
| 5 | 4.0% | 5 | 0 | setback | no |
| 10 | 4.0% | 5 | 0 | setback | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -20 | 15.0% | 2 | 2 | band · rounding | no |
| -15 | 30.0% | 2 | 2 | band · rounding | no |
| -10 | 15.0% | 2 | 2 | band · rounding | no |
| -5 | 15.0% | 3 | 1 | band · rounding | no |
| 0 | 10.0% | 4 | 0 | zero | no |
| 5 | 7.5% | 5 | 0 | setback | no |
| 10 | 7.5% | 5 | 0 | setback | no |

### 818 early · Cat far back after 4

Player **Cat**. Gap to 1st 62, gap to 2nd 54, gap to 3rd 42, now 5th. Rounds left: 11.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 2 | 2 |
| Odds of help | 79.8% | 75.8% |
| Average help (when it helps) | 4.6 | 18.0 |
| Average help as % of gap to 1st | 7.4% | 29.0% |
| Odds of a setback | 8.2% | 14.1% |
| Average setback (when it hurts) | 1.5 | 1.5 |
| Expected net (incl. zeros and setbacks) | 3.5 | 13.4 |
| Best / typical / worst rank | 5 / 5 / 5 | 5 / 5 / 5 |
| Best / typical / worst gap to 1st | 42.0 / 60.0 / 64.0 | 42.0 / 44.0 / 64.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 4.1% | 11.1% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 54, raw 65% 40) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 4.0% | 5 | 0 | setback | no |
| -1 | 4.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 1 | 22.5% | 5 | 0 | band | no |
| 2 | 22.5% | 5 | 0 | band | no |
| 6 | 15.0% | 5 | 0 | band | no |
| 8 | 15.0% | 5 | 0 | band | no |
| 16 | 2.5% | 5 | 0 | band | no |
| 20 | 2.5% | 5 | 0 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 7.5% | 5 | 0 | setback | no |
| -1 | 7.5% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 12 | 15.0% | 5 | 0 | band · rounding | no |
| 18 | 15.0% | 5 | 0 | band · rounding | no |
| 20 | 45.0% | 5 | 0 | game-cap | yes · game-cap |

### 818 middle · Cat 39 behind (porch-like)

Player **Cat**. Gap to 1st 39, gap to 2nd 29, gap to 3rd 14, now 5th. Rounds left: 7.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 2 | 2 |
| Odds of help | 79.9% | 74.7% |
| Average help (when it helps) | 4.5 | 14.0 |
| Average help as % of gap to 1st | 11.6% | 35.9% |
| Odds of a setback | 7.9% | 15.0% |
| Average setback (when it hurts) | 1.5 | 1.5 |
| Expected net (incl. zeros and setbacks) | 3.5 | 10.2 |
| Best / typical / worst rank | 3 / 5 / 5 | 3 / 4 / 5 |
| Best / typical / worst gap to 1st | 19.0 / 37.0 / 41.0 | 19.0 / 28.0 / 41.0 |
| Immediate top-3 chance | 4.8% | 44.8% |
| Top 3 by the end (model) | 24.4% | 38.3% |
| Leapfrog rate (passes a non-leader) | 19.9% | 74.7% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 29, raw 65% 25) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 4.0% | 5 | 0 | setback | no |
| -1 | 4.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 1 | 22.5% | 5 | 0 | band | no |
| 2 | 22.5% | 5 | 0 | band | no |
| 6 | 15.0% | 5 | 0 | band | no |
| 8 | 15.0% | 4 | 1 | band | no |
| 16 | 2.5% | 3 | 2 | band | no |
| 20 | 2.5% | 3 | 2 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 7.5% | 5 | 0 | setback | no |
| -1 | 7.5% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 7 | 15.0% | 4 | 1 | band · rounding | no |
| 11 | 15.0% | 4 | 1 | band · rounding | no |
| 15 | 15.0% | 3 | 2 | band · rounding | no |
| 17 | 15.0% | 3 | 2 | band · rounding | no |
| 20 | 15.0% | 3 | 2 | game-cap | yes · game-cap |

### 818 late · Cat last with 3 rounds left

Player **Cat**. Gap to 1st 80, gap to 2nd 68, gap to 3rd 50, now 5th. Rounds left: 3.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 2 | 2 |
| Odds of help | 79.6% | 75.2% |
| Average help (when it helps) | 4.5 | 18.8 |
| Average help as % of gap to 1st | 5.7% | 23.5% |
| Odds of a setback | 7.9% | 15.1% |
| Average setback (when it hurts) | 1.5 | 1.5 |
| Expected net (incl. zeros and setbacks) | 3.5 | 13.9 |
| Best / typical / worst rank | 5 / 5 / 5 | 5 / 5 / 5 |
| Best / typical / worst gap to 1st | 60.0 / 78.0 / 82.0 | 60.0 / 60.0 / 82.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 0.0% | 0.1% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 68, raw 65% 52) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 4.0% | 5 | 0 | setback | no |
| -1 | 4.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 1 | 22.5% | 5 | 0 | band | no |
| 2 | 22.5% | 5 | 0 | band | no |
| 6 | 15.0% | 5 | 0 | band | no |
| 8 | 15.0% | 5 | 0 | band | no |
| 16 | 2.5% | 5 | 0 | band | no |
| 20 | 2.5% | 5 | 0 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 7.5% | 5 | 0 | setback | no |
| -1 | 7.5% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 16 | 22.5% | 5 | 0 | band | no |
| 20 | 52.5% | 5 | 0 | game-cap | yes · game-cap |

### Five Crowns tied leaders · Duke last

Player **Duke**. Gap to 1st 52, gap to 2nd 52, gap to 3rd 34, now 5th. Rounds left: 3.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 30 |
| Largest setback | 10 | 10 |
| Odds of help | 79.8% | 75.0% |
| Average help (when it helps) | 8.2 | 19.0 |
| Average help as % of gap to 1st | 15.8% | 36.6% |
| Odds of a setback | 8.5% | 15.0% |
| Average setback (when it hurts) | 7.4 | 7.5 |
| Expected net (incl. zeros and setbacks) | 5.9 | 13.1 |
| Best / typical / worst rank | 5 / 5 / 5 | 4 / 5 / 5 |
| Best / typical / worst gap to 1st | 32.0 / 47.0 / 62.0 | 22.0 / 37.0 / 62.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 23.5% | 31.2% |
| Leapfrog rate (passes a non-leader) | 0.0% | 20.2% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 50, raw 65% 30) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -20 | 5.0% | 5 | 0 | band | no |
| -10 | 37.5% | 5 | 0 | band | no |
| -5 | 37.5% | 5 | 0 | band | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 4.0% | 5 | 0 | setback | no |
| 10 | 4.0% | 5 | 0 | setback | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -30 | 10.0% | 4 | 1 | band · rounding | no |
| -25 | 10.0% | 4 | 1 | band · rounding | no |
| -20 | 25.0% | 5 | 0 | band · rounding | no |
| -15 | 15.0% | 5 | 0 | band · rounding | no |
| -10 | 15.0% | 5 | 0 | band · rounding | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 5 | 7.5% | 5 | 0 | setback | no |
| 10 | 7.5% | 5 | 0 | setback | no |

### Five Crowns with a retired seat · Duke last of the active four

Player **Duke**. Gap to 1st 60, gap to 2nd 52, gap to 3rd 44, now 4th. Rounds left: 3.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 30 | 35 |
| Largest setback | 10 | 10 |
| Odds of help | 80.1% | 75.9% |
| Average help (when it helps) | 9.0 | 21.1 |
| Average help as % of gap to 1st | 14.9% | 35.1% |
| Odds of a setback | 8.4% | 14.2% |
| Average setback (when it hurts) | 7.4 | 7.5 |
| Expected net (incl. zeros and setbacks) | 6.6 | 14.9 |
| Best / typical / worst rank | 4 / 4 / 4 | 4 / 4 / 4 |
| Best / typical / worst gap to 1st | 30.0 / 55.0 / 70.0 | 25.0 / 45.0 / 70.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 27.5% | 37.1% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 50, raw 65% 35) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -30 | 5.0% | 4 | 0 | band | no |
| -10 | 37.5% | 4 | 0 | band | no |
| -5 | 37.5% | 4 | 0 | band | no |
| 0 | 12.0% | 4 | 0 | zero | no |
| 5 | 4.0% | 4 | 0 | setback | no |
| 10 | 4.0% | 4 | 0 | setback | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -35 | 10.0% | 4 | 0 | band · rounding | no |
| -30 | 10.0% | 4 | 0 | band · rounding | no |
| -25 | 10.0% | 4 | 0 | band · rounding | no |
| -20 | 15.0% | 4 | 0 | band · rounding | no |
| -15 | 15.0% | 4 | 0 | band · rounding | no |
| -10 | 15.0% | 4 | 0 | band · rounding | no |
| 0 | 10.0% | 4 | 0 | zero | no |
| 5 | 7.5% | 4 | 0 | setback | no |
| 10 | 7.5% | 4 | 0 | setback | no |

### Five Crowns final round · Duke still 50 behind

Player **Duke**. Gap to 1st 50, gap to 2nd 38, gap to 3rd 29, now 5th. Rounds left: 1.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 25 | 30 |
| Largest setback | 10 | 10 |
| Odds of help | 79.7% | 75.3% |
| Average help (when it helps) | 8.6 | 18.9 |
| Average help as % of gap to 1st | 17.1% | 37.8% |
| Odds of a setback | 7.6% | 14.7% |
| Average setback (when it hurts) | 7.7 | 7.5 |
| Expected net (incl. zeros and setbacks) | 6.2 | 13.2 |
| Best / typical / worst rank | 4 / 5 / 5 | 3 / 5 / 5 |
| Best / typical / worst gap to 1st | 25.0 / 45.0 / 60.0 | 20.0 / 35.0 / 60.0 |
| Immediate top-3 chance | 0.0% | 9.8% |
| Top 3 by the end (model) | 17.5% | 28.7% |
| Leapfrog rate (passes a non-leader) | 4.9% | 44.9% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 35, raw 65% 30) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -25 | 5.0% | 4 | 1 | band | no |
| -10 | 37.5% | 5 | 0 | band | no |
| -5 | 37.5% | 5 | 0 | band | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 4.0% | 5 | 0 | setback | no |
| 10 | 4.0% | 5 | 0 | setback | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -30 | 10.0% | 3 | 2 | band · rounding | no |
| -25 | 10.0% | 4 | 1 | band · rounding | no |
| -20 | 25.0% | 4 | 1 | band | no |
| -15 | 15.0% | 5 | 0 | band | no |
| -10 | 15.0% | 5 | 0 | band | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 5 | 7.5% | 5 | 0 | setback | no |
| 10 | 7.5% | 5 | 0 | setback | no |

### 818 final round · Cat last on the last 8-trick hand

Player **Cat**. Gap to 1st 84, gap to 2nd 66, gap to 3rd 48, now 5th. Rounds left: 1.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 2 | 2 |
| Odds of help | 79.7% | 75.3% |
| Average help (when it helps) | 4.6 | 18.8 |
| Average help as % of gap to 1st | 5.4% | 22.4% |
| Odds of a setback | 8.2% | 14.9% |
| Average setback (when it hurts) | 1.5 | 1.5 |
| Expected net (incl. zeros and setbacks) | 3.5 | 13.9 |
| Best / typical / worst rank | 5 / 5 / 5 | 5 / 5 / 5 |
| Best / typical / worst gap to 1st | 64.0 / 82.0 / 86.0 | 64.0 / 64.0 / 86.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 0.0% | 0.0% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 66, raw 65% 54) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 4.0% | 5 | 0 | setback | no |
| -1 | 4.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 1 | 22.5% | 5 | 0 | band | no |
| 2 | 22.5% | 5 | 0 | band | no |
| 6 | 15.0% | 5 | 0 | band | no |
| 8 | 15.0% | 5 | 0 | band | no |
| 16 | 2.5% | 5 | 0 | band | no |
| 20 | 2.5% | 5 | 0 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -2 | 7.5% | 5 | 0 | setback | no |
| -1 | 7.5% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 16 | 22.5% | 5 | 0 | band · rounding | no |
| 20 | 52.5% | 5 | 0 | game-cap | yes · game-cap |

### Wizard early · Pat far back after 4

Player **Pat**. Gap to 1st 180, gap to 2nd 140, gap to 3rd 110, now 5th. Rounds left: 8.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 35 | 60 |
| Largest setback | 10 | 10 |
| Odds of help | 80.0% | 74.9% |
| Average help (when it helps) | 17.7 | 53.2 |
| Average help as % of gap to 1st | 9.8% | 29.5% |
| Odds of a setback | 8.3% | 15.1% |
| Average setback (when it hurts) | 7.4 | 7.4 |
| Expected net (incl. zeros and setbacks) | 13.5 | 38.7 |
| Best / typical / worst rank | 5 / 5 / 5 | 5 / 5 / 5 |
| Best / typical / worst gap to 1st | 145.0 / 170.0 / 190.0 | 120.0 / 130.0 / 190.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 0.1% | 2.2% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 140, raw 65% 115) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -10 | 4.0% | 5 | 0 | setback | no |
| -5 | 4.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 22.5% | 5 | 0 | band | no |
| 10 | 22.5% | 5 | 0 | band | no |
| 30 | 30.0% | 5 | 0 | band | no |
| 35 | 5.0% | 5 | 0 | band | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -10 | 7.5% | 5 | 0 | setback | no |
| -5 | 7.5% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 35 | 15.0% | 5 | 0 | band · rounding | no |
| 50 | 15.0% | 5 | 0 | band · rounding | no |
| 60 | 45.0% | 5 | 0 | game-cap | yes · game-cap |

### Wizard middle · Pat 160 behind after 7

Player **Pat**. Gap to 1st 160, gap to 2nd 110, gap to 3rd 70, now 5th. Rounds left: 5.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 50 | 60 |
| Largest setback | 10 | 10 |
| Odds of help | 79.8% | 75.0% |
| Average help (when it helps) | 20.3 | 51.0 |
| Average help as % of gap to 1st | 12.7% | 31.9% |
| Odds of a setback | 8.0% | 14.9% |
| Average setback (when it hurts) | 7.5 | 7.4 |
| Expected net (incl. zeros and setbacks) | 15.6 | 37.2 |
| Best / typical / worst rank | 4 / 5 / 5 | 4 / 4 / 5 |
| Best / typical / worst gap to 1st | 110.0 / 150.0 / 170.0 | 100.0 / 115.0 / 170.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 3.5% | 16.9% |
| Leapfrog rate (passes a non-leader) | 19.8% | 59.9% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 110, raw 65% 100) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -10 | 4.0% | 5 | 0 | setback | no |
| -5 | 4.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 22.5% | 5 | 0 | band | no |
| 10 | 22.5% | 5 | 0 | band | no |
| 30 | 15.0% | 5 | 0 | band | no |
| 40 | 15.0% | 4 | 1 | band | no |
| 50 | 5.0% | 4 | 1 | band | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -10 | 7.5% | 5 | 0 | setback | no |
| -5 | 7.5% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 30 | 15.0% | 5 | 0 | band · rounding | no |
| 45 | 15.0% | 4 | 1 | band · rounding | no |
| 60 | 45.0% | 4 | 1 | game-cap | yes · game-cap |

### Wizard late · Pat 180 behind with 2 rounds left

Player **Pat**. Gap to 1st 180, gap to 2nd 130, gap to 3rd 80, now 5th. Rounds left: 2.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 60 | 60 |
| Largest setback | 10 | 10 |
| Odds of help | 80.1% | 74.1% |
| Average help (when it helps) | 21.4 | 52.9 |
| Average help as % of gap to 1st | 11.9% | 29.4% |
| Odds of a setback | 8.2% | 15.8% |
| Average setback (when it hurts) | 7.5 | 7.6 |
| Expected net (incl. zeros and setbacks) | 16.5 | 38.0 |
| Best / typical / worst rank | 4 / 5 / 5 | 4 / 4 / 5 |
| Best / typical / worst gap to 1st | 120.0 / 170.0 / 190.0 | 120.0 / 130.0 / 190.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 0.6% | 4.7% |
| Leapfrog rate (passes a non-leader) | 5.3% | 59.1% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 130, raw 65% 115) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -10 | 4.0% | 5 | 0 | setback | no |
| -5 | 4.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 22.5% | 5 | 0 | band | no |
| 10 | 22.5% | 5 | 0 | band | no |
| 30 | 15.0% | 5 | 0 | band | no |
| 40 | 15.0% | 5 | 0 | band | no |
| 60 | 5.0% | 4 | 1 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -10 | 7.5% | 5 | 0 | setback | no |
| -5 | 7.5% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 35 | 15.0% | 5 | 0 | band · rounding | no |
| 50 | 15.0% | 4 | 1 | band · rounding | no |
| 60 | 45.0% | 4 | 1 | game-cap | yes · game-cap |

### Flip 7 early · Pat cooked after 4 banks

Player **Pat**. Gap to 1st 78, gap to 2nd 62, gap to 3rd 46, now 5th. Rounds left: 3.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 40 | 40 |
| Largest setback | 5 | 5 |
| Odds of help | 80.0% | 75.8% |
| Average help (when it helps) | 17.7 | 28.0 |
| Average help as % of gap to 1st | 22.7% | 35.9% |
| Odds of a setback | 8.4% | 14.3% |
| Average setback (when it hurts) | 5.0 | 5.0 |
| Expected net (incl. zeros and setbacks) | 13.7 | 20.5 |
| Best / typical / worst rank | 4 / 5 / 5 | 4 / 5 / 5 |
| Best / typical / worst gap to 1st | 38.0 / 68.0 / 83.0 | 38.0 / 58.0 / 83.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 7.8% | 13.3% |
| Leapfrog rate (passes a non-leader) | 4.9% | 30.3% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 60, raw 65% 50) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -5 | 8.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 22.5% | 5 | 0 | band | no |
| 10 | 22.5% | 5 | 0 | band | no |
| 30 | 30.0% | 5 | 0 | band | no |
| 40 | 5.0% | 4 | 1 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -5 | 15.0% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 15 | 15.0% | 5 | 0 | band · rounding | no |
| 20 | 15.0% | 5 | 0 | band · rounding | no |
| 30 | 15.0% | 5 | 0 | band · rounding | no |
| 35 | 15.0% | 4 | 1 | band · rounding | no |
| 40 | 15.0% | 4 | 1 | game-cap | yes · game-cap |

### Flip 7 middle · Pat 80 behind after 8

Player **Pat**. Gap to 1st 80, gap to 2nd 58, gap to 3rd 40, now 5th. Rounds left: 3.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 40 | 40 |
| Largest setback | 5 | 5 |
| Odds of help | 80.1% | 75.1% |
| Average help (when it helps) | 18.0 | 27.9 |
| Average help as % of gap to 1st | 22.5% | 34.9% |
| Odds of a setback | 8.5% | 15.0% |
| Average setback (when it hurts) | 5.0 | 5.0 |
| Expected net (incl. zeros and setbacks) | 14.0 | 20.2 |
| Best / typical / worst rank | 4 / 5 / 5 | 4 / 4 / 5 |
| Best / typical / worst gap to 1st | 40.0 / 70.0 / 85.0 | 40.0 / 60.0 / 85.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 13.2% | 20.8% |
| Leapfrog rate (passes a non-leader) | 35.1% | 59.8% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 55, raw 65% 50) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -5 | 8.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 22.5% | 5 | 0 | band | no |
| 10 | 22.5% | 5 | 0 | band | no |
| 30 | 30.0% | 4 | 1 | band | no |
| 40 | 5.0% | 4 | 1 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -5 | 15.0% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 15 | 15.0% | 5 | 0 | band · rounding | no |
| 20 | 15.0% | 4 | 1 | band · rounding | no |
| 30 | 15.0% | 4 | 1 | band · rounding | no |
| 35 | 15.0% | 4 | 1 | band · rounding | no |
| 40 | 15.0% | 4 | 1 | game-cap | yes · game-cap |

### Flip 7 late · Pat 95 behind after 12

Player **Pat**. Gap to 1st 95, gap to 2nd 65, gap to 3rd 43, now 5th. Rounds left: 3.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 40 | 40 |
| Largest setback | 5 | 5 |
| Odds of help | 79.8% | 74.8% |
| Average help (when it helps) | 17.9 | 30.9 |
| Average help as % of gap to 1st | 18.8% | 32.6% |
| Odds of a setback | 8.1% | 15.2% |
| Average setback (when it hurts) | 5.0 | 5.0 |
| Expected net (incl. zeros and setbacks) | 13.8 | 22.4 |
| Best / typical / worst rank | 4 / 5 / 5 | 4 / 4 / 5 |
| Best / typical / worst gap to 1st | 55.0 / 85.0 / 100.0 | 55.0 / 70.0 / 100.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 11.9% | 22.5% |
| Leapfrog rate (passes a non-leader) | 34.6% | 59.8% |
| Leapfrog-to-3rd would block 65%? | — | no (3rd-cap 65, raw 65% 60) |

Current pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -5 | 8.0% | 5 | 0 | setback | no |
| 0 | 12.0% | 5 | 0 | zero | no |
| 5 | 22.5% | 5 | 0 | band | no |
| 10 | 22.5% | 5 | 0 | band | no |
| 30 | 30.0% | 4 | 1 | band | no |
| 40 | 5.0% | 4 | 1 | game-cap | no |

Proposed pockets after caps:

| Amount | Odds | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- | --- |
| -5 | 15.0% | 5 | 0 | setback | no |
| 0 | 10.0% | 5 | 0 | zero | no |
| 15 | 15.0% | 5 | 0 | band · rounding | no |
| 25 | 15.0% | 4 | 1 | band · rounding | no |
| 35 | 15.0% | 4 | 1 | band · rounding | no |
| 40 | 30.0% | 4 | 1 | game-cap | yes · game-cap |

## Several eligible players, one after another

Duke-style Five Crowns late table. Current vs Proposed, spinning Duke then Dee if still eligible. Order effects use the locked result at the mean help, not a fresh Monte Carlo.

**current**
- Duke: mean-ish -5, total now 71, rank 5
- Dee: mean-ish -5, total now 47, rank 4

**proposed**
- Duke: mean-ish -15, total now 61, rank 5
- Dee: mean-ish -5, total now 47, rank 4

## Playtest checklist

- After the spin, does the trailing player feel they have something worth playing for? Watch whether they lean back in and talk about the next hand, or treat the rest of the night as over.
- Does a setback make an already frustrated player check out? Keep setbacks small. If someone slumps after a −5/−10, that is the signal, not a reason to make setbacks bigger.
- Does the rest of the table still feel their earned positions matter? Watch the 2nd and 3rd players. If a rescue parks someone on their heels too often, the leapfrog / leader rules are too loose.

## Where a 65% rescue is cut

| Scenario | Raw 65% | Offered best | What binds | Leapfrog-to-3rd would block? |
| --- | --- | --- | --- | --- |
| Five Crowns middle · Dee 40 behind 1st | 25 | 25 | band · rounding | no |
| Five Crowns late · Duke-style 51 behind 1st, best current is −20 | 30 | 30 | band · rounding | no |
| Five Crowns packed table · Dee just barely eligible | 20 | 20 | band · rounding | no |
| Five Crowns packed mid-pack · 65% would reach 2nd (leapfrog-to-3rd test) | 20 | 20 | band · rounding | yes |
| 818 early · Cat far back after 4 | 40 | 20 | game-cap | no |
| 818 middle · Cat 39 behind (porch-like) | 25 | 20 | game-cap | no |
| 818 late · Cat last with 3 rounds left | 52 | 20 | game-cap | no |
| Five Crowns tied leaders · Duke last | 30 | 30 | band · rounding | no |
| Five Crowns with a retired seat · Duke last of the active four | 35 | 35 | band · rounding | no |
| Five Crowns final round · Duke still 50 behind | 30 | 30 | band · rounding | no |
| 818 final round · Cat last on the last 8-trick hand | 54 | 20 | game-cap | no |
| Wizard early · Pat far back after 4 | 115 | 60 | game-cap | no |
| Wizard middle · Pat 160 behind after 7 | 100 | 60 | game-cap | no |
| Wizard late · Pat 180 behind with 2 rounds left | 115 | 60 | game-cap | no |
| Flip 7 early · Pat cooked after 4 banks | 50 | 40 | game-cap | no |
| Flip 7 middle · Pat 80 behind after 8 | 50 | 40 | game-cap | no |
| Flip 7 late · Pat 95 behind after 12 | 60 | 40 | game-cap | no |

## Recommendation

Proposed gives Duke-style blowouts a real ladder back toward the pack, while Current often spends 80% of spins on a small unit. The 818 and Flip 7 game caps still bind a 65% rescue on the bigger holes, so those games change less than Five Crowns. A stricter leapfrog-to-3rd cap would clip the packed mid-pack case and is not required to keep 1st safe. Try Proposed on the TEMP wheel (`?demo&view=lifepreserver-low&lp=proposed` and `?demo&view=lifepreserver&lp=proposed`) before touching live amounts.

## Knobs for Matt

- Best as 60% vs 65% of the gap to 1st.
- 818 / Flip 7 / Wizard / Five Crowns per-game caps (20 / 40 / 60 / 75).
- Whether a rescue may pass 3rd or only reach it.
- Keep or add a non-leader leapfrog cap. This candidate only uses the leader rule (2nd is allowed). Rows marked "Leapfrog-to-3rd would block 65%" are the keep-or-relax cases.
- Proposed setback caps (Five Crowns 10, Wizard 15, Flip 7 5, 818 4).

Played hands stay the main story if the typical Proposed help is a fraction of a real hand and 1st stays out of reach. Five Crowns late is the risk case: a 30-point lift on a 51-point hole is more than one clean hand, so the last few hands can feel smaller. 818 stays closer to ordinary play because the 20-point cap is about two made bids.
