# RC1 one skin

What broke: Slice 2 lived behind `?slice2` / `GN_SLICE2_TV` while production still painted the old scorecard. Gallery 818 and Wizard rows were invented from target totals, so one-trick rounds could show illegal bids and Life Preserver holes that 818 scoring cannot produce.

What fixed it: Warm Porch Ledger is the only skin. `slice2.css` / `slice2.js` load and precache always. Flag forks are gone. 818 and Wizard fixtures now store legal bids, actuals, and scores, including dealer law. Porch Cat stays 39 behind Duke so the +20 wheel goldens hold. Original 97 / 58 porch totals were impossible (table score must match tricks plus 10-point exacts).

What not to repeat: Do not invent 818 or Wizard scores from a desired total and then paint bids on top. Do not keep a second Timeline / HOF / Records chrome beside Fame / Shame. Do not turn Turbo back on to satisfy a chip screenshot. `test:comeback` still covers stored `round.comeback` history.
