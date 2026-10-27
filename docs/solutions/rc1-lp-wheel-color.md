# Life Preserver wheel color

What broke: `buildSlices()` already weighted helpful Five Crowns slices at about 85%. Slice 2 `paintWheel()` ignored `slice.color` and `_wheelKind` (stripped on arrange), then treated `adjustment < 0` as red. Linda’s −75 to +10 wheel read as mostly risky.

What fixed it: each slice keeps a `kind` of good / bad / zero. The painter colors by benefit, not by sign. Wedge angles follow the same `OUTCOME_TABLE` the spin picks from. The outcome is locked and saved before the wheel moves. The colored band is thick (hub ~14%) so wedge area reads as the odds. Labels are signed numbers in the band, with cream callouts under 8%. A Help / No change / Setback legend sits under the wheel. Higher-wins headlines use `+20 points`; Five Crowns uses `20 points off`.

What not to repeat: never infer good/bad from the numeric sign. Low-score games help by subtracting. Never let visual physics choose the result. Never paint labels at canvas pixels that shrink below readable on a 390 wheel.
