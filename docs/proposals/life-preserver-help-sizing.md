# Life Preserver help sizing

Comparison only. Live reward math is unchanged. The Proposed wheel is TEMP behind `?demo&lp=proposed`.

## Spec

- **Current:** 45% small / 30% medium / 5% big / 12% no change / 8% setback. Amounts from one strong remaining unit, then clamped.
- **Proposed:** gap to 1st. 30% really good (45-65% of that gap) / 45% good (20-40%) / 10% no change / 15% small setback. Best is 65% of the gap, then the per-game cap and the never-tie-or-pass-1st rule. Setbacks stay small and are not gap-scaled. No late-game boost. No leapfrog cap in this candidate.
- **Already in the top 3:** 2nd and 3rd still have a gap to 1st, so they use that gap. If the gap is smaller than one game increment, Proposed falls back to one increment of modest help.
- **Ties:** the current leader score is the tied 1st score. A spin still cannot match it.
- **Rounding:** each game increment (Five Crowns and Wizard 5s, 818 1s).

Remaining-round model for end-of-game top-3: Five Crowns hands score `5 × 0..10`; 818 rounds score a made bid 62% of the time (`+10` plus 0-5 tricks) otherwise 0-4. Same model for Current and Proposed.

## Tables

### Five Crowns early · Dee cooked after 4 hands

Player **Dee**. Gap to 1st 52, gap to 3rd 42, now 5th.

Not eligible (recovery-load).

### Five Crowns middle · Dee 40 behind 1st

Player **Dee**. Gap to 1st 40, gap to 3rd 25, now 5th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 25 |
| Largest setback | 10 | 10 |
| Odds of help | 80.1% | 75.0% |
| Average help (when it helps) | 8.2 | 13.9 |
| Average help as % of gap to 3rd | 32.9% | 55.6% |
| Expected net (incl. zeros and setbacks) | 6.0 | 9.3 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 36.4% | 40.0% |
| Leapfrog rate (passes a non-leader) | 4.7% | 19.6% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -25 | 4 | 1 | band+leader-or-game-cap | no |
| -20 | 4 | 1 | band | yes |
| -15 | 5 | 0 | band | yes |
| -10 | 5 | 0 | band | yes |
| -5 | 5 | 0 | band | yes |
| 0 | 5 | 0 | setback-or-zero | no |
| 5 | 5 | 0 | setback-or-zero | no |
| 10 | 5 | 0 | setback-or-zero | no |

### Five Crowns late · Duke-style 51 behind 1st, best current is −20

Player **Duke**. Gap to 1st 51, gap to 3rd 32, now 5th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 25 | 30 |
| Largest setback | 10 | 10 |
| Odds of help | 80.0% | 74.4% |
| Average help (when it helps) | 8.6 | 19.0 |
| Average help as % of gap to 3rd | 26.9% | 59.4% |
| Expected net (incl. zeros and setbacks) | 6.3 | 13.0 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 22.3% | 30.9% |
| Leapfrog rate (passes a non-leader) | 5.1% | 19.6% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -30 | 4 | 1 | band+leader-or-game-cap | no |
| -25 | 4 | 1 | band | yes |
| -20 | 5 | 0 | band | yes |
| -15 | 5 | 0 | band | yes |
| -10 | 5 | 0 | band | yes |
| 0 | 5 | 0 | setback-or-zero | no |
| 5 | 5 | 0 | setback-or-zero | no |
| 10 | 5 | 0 | setback-or-zero | no |

### Five Crowns packed table · Dee just barely eligible

Player **Dee**. Gap to 1st 38, gap to 3rd 28, now 5th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 10 | 10 |
| Odds of help | 80.1% | 74.4% |
| Average help (when it helps) | 8.3 | 13.0 |
| Average help as % of gap to 3rd | 29.7% | 46.3% |
| Expected net (incl. zeros and setbacks) | 6.0 | 8.5 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 35.2% | 38.5% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -20 | 5 | 0 | band+leader-or-game-cap | no |
| -15 | 5 | 0 | band | yes |
| -10 | 5 | 0 | band | yes |
| -5 | 5 | 0 | band | yes |
| 0 | 5 | 0 | setback-or-zero | no |
| 5 | 5 | 0 | setback-or-zero | no |
| 10 | 5 | 0 | setback-or-zero | no |

### 818 early · Cat far back after 4

Player **Cat**. Gap to 1st 62, gap to 3rd 42, now 5th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 4 | 4 |
| Odds of help | 80.1% | 74.6% |
| Average help (when it helps) | 4.6 | 18.0 |
| Average help as % of gap to 3rd | 11.0% | 42.8% |
| Expected net (incl. zeros and setbacks) | 3.6 | 13.2 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 3.9% | 10.8% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -2 | 5 | 0 | setback-or-zero | no |
| -1 | 5 | 0 | setback-or-zero | no |
| 0 | 5 | 0 | setback-or-zero | no |
| 12 | 5 | 0 | band | yes |
| 18 | 5 | 0 | band | yes |
| 20 | 5 | 0 | game-cap | yes |

### 818 middle · Cat 39 behind (porch-like)

Player **Cat**. Gap to 1st 39, gap to 3rd 14, now 5th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 4 | 4 |
| Odds of help | 79.8% | 76.0% |
| Average help (when it helps) | 4.6 | 14.1 |
| Average help as % of gap to 3rd | 32.6% | 100.4% |
| Expected net (incl. zeros and setbacks) | 3.5 | 10.5 |
| Immediate top-3 chance | 4.7% | 45.9% |
| Top 3 by the end (model) | 24.6% | 39.4% |
| Leapfrog rate (passes a non-leader) | 20.3% | 76.0% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -2 | 5 | 0 | setback-or-zero | no |
| -1 | 5 | 0 | setback-or-zero | no |
| 0 | 5 | 0 | setback-or-zero | no |
| 7 | 4 | 1 | band | yes |
| 11 | 4 | 1 | band | yes |
| 15 | 3 | 2 | band | yes |
| 17 | 3 | 2 | band | yes |
| 20 | 3 | 2 | game-cap | yes |

### 818 late · Cat last with 3 rounds left

Player **Cat**. Gap to 1st 80, gap to 3rd 50, now 5th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 20 |
| Largest setback | 4 | 4 |
| Odds of help | 79.9% | 75.2% |
| Average help (when it helps) | 4.5 | 18.8 |
| Average help as % of gap to 3rd | 9.1% | 37.6% |
| Expected net (incl. zeros and setbacks) | 3.5 | 13.9 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 0.0% | 0.1% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -2 | 5 | 0 | setback-or-zero | no |
| -1 | 5 | 0 | setback-or-zero | no |
| 0 | 5 | 0 | setback-or-zero | no |
| 16 | 5 | 0 | band | yes |
| 20 | 5 | 0 | game-cap | yes |

### Five Crowns tied leaders · Duke last

Player **Duke**. Gap to 1st 52, gap to 3rd 34, now 5th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 20 | 30 |
| Largest setback | 10 | 10 |
| Odds of help | 80.5% | 74.8% |
| Average help (when it helps) | 8.3 | 19.1 |
| Average help as % of gap to 3rd | 24.3% | 56.1% |
| Expected net (incl. zeros and setbacks) | 6.0 | 13.1 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 23.1% | 31.1% |
| Leapfrog rate (passes a non-leader) | 0.0% | 20.2% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -30 | 4 | 1 | band+leader-or-game-cap | no |
| -25 | 4 | 1 | band | yes |
| -20 | 5 | 0 | band | yes |
| -15 | 5 | 0 | band | yes |
| -10 | 5 | 0 | band | yes |
| 0 | 5 | 0 | setback-or-zero | no |
| 5 | 5 | 0 | setback-or-zero | no |
| 10 | 5 | 0 | setback-or-zero | no |

### Five Crowns with a retired seat · Duke last of the active four

Player **Duke**. Gap to 1st 60, gap to 3rd 44, now 4th.

| Metric | Current | Proposed |
| --- | --- | --- |
| Eligible | yes | yes |
| Best help | 30 | 35 |
| Largest setback | 10 | 10 |
| Odds of help | 79.8% | 75.0% |
| Average help (when it helps) | 8.8 | 21.0 |
| Average help as % of gap to 3rd | 20.0% | 47.7% |
| Expected net (incl. zeros and setbacks) | 6.4 | 14.6 |
| Immediate top-3 chance | 0.0% | 0.0% |
| Top 3 by the end (model) | 27.1% | 36.5% |
| Leapfrog rate (passes a non-leader) | 0.0% | 0.0% |

Proposed pockets after caps:

| Amount | Resulting rank | Non-leaders passed | Binding rule | 65% blocked? |
| --- | --- | --- | --- | --- |
| -35 | 4 | 0 | band+leader-or-game-cap | no |
| -30 | 4 | 0 | band | yes |
| -25 | 4 | 0 | band | yes |
| -20 | 4 | 0 | band | yes |
| -15 | 4 | 0 | band | yes |
| -10 | 4 | 0 | band | yes |
| 0 | 4 | 0 | setback-or-zero | no |
| 5 | 4 | 0 | setback-or-zero | no |
| 10 | 4 | 0 | setback-or-zero | no |

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

## Recommendation

Proposed gives Duke-style blowouts a real ladder back toward 3rd, while Current often spends 75% of spins on −5/−10. The 818 game cap (20) still binds a 65% rescue when the hole is bigger than that, so 818 will feel less changed than Five Crowns. Try Proposed on the TEMP wheel (`?demo&view=lifepreserver-low&lp=proposed` and `?demo&view=lifepreserver&lp=proposed`) before touching live amounts.

## Knobs for Matt

- Best as 60% vs 65% of the gap to 1st.
- 818 / Flip 7 / Wizard per-game caps (20 / 40 / 60 / Five Crowns 75).
- Whether a rescue may pass 3rd or only reach it.
- Keep or drop a non-leader leapfrog cap. This candidate has none; flagged rows show where a 65% hit is already stopped by the game cap or the leader rule.

Played hands stay the main story if the typical Proposed help is a fraction of a real hand and 1st stays out of reach. Five Crowns late is the risk case: a −35 on a 51-point hole is more than one clean hand, so it can make the last few hands feel smaller.
