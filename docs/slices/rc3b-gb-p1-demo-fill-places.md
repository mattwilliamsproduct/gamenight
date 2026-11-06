# rc3b GB P1/P2: demo Exit, 3p fill, past-nights ordinals

## Acceptance
- Entering demo / using it / Exit never writes any `gn_*` key (remap stays).
- After Exit (+ reload), every `gn_*` key matches the pre-demo snapshot byte-for-byte (same key set and raw strings). No new `gn_*`; none removed.
- Exit clears every `bpg_demo_*` key.
- A second normal boot after Exit does not mutate real data beyond what the same seed would do without a demo detour.
- Functional test seeds mid-game `gn_current`, history without `gameId`, no `gn_players_v2`/`gn_profiles`; snapshots all keys; enter/edit/Reset/Exit/reload deep-equals; same for refresh-in-demo then Exit. Fails on a55a96d; passes after fix.
- 3p at 1440/1920: empty space below table ≤ ~10% of viewport height; no overflow. 6p/8p and 1024/390 unchanged in spirit.
- Past nights place labels use `1st`/`2nd`/`3rd` via the dense ordinal helper (same as Home/scorecard).

## Anti-acceptance
- Exit that leaves `bpg_demo_*` behind.
- Demo path that writes/removes/rewrites any `gn_*`.
- Soft equality (parsed JSON) instead of raw string deep-equal in the Exit test.
- Raising the 96px row cap globally so 8p/phone break or overflow.
- Past nights still showing `1.`/`2.`.
