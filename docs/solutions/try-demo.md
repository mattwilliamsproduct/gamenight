# In-app Try a demo

`cursor/try-demo` only until Matt undrafts. Cut from `5e57d50` / `rc2-candidate-20261029-2126`. Keep `index.html` hooks small if another Records pass lands.

`/?demo=try` opens the fictional QA `demo-seed` book. Bare `?demo` still does nothing. Session `bpg_try_demo=1` keeps refresh in the sample. Exit clears the session and the query.

The sample uses `bpg_demo_*`. `gnKey()` remaps every `gn_*` read and write while the sample is on. Real games stay byte-identical. Backup, restore, and `/api/sync` are blocked. The chrome says `Demo · Sample data` with Exit and Reset. Empty-table Try a demo is an outlined secondary under a one-line note. In the sample, the chip says `Sample data · separate from your games` and does not flash Saved.

Do not seed `gn_*`. Do not revive `public/assets/demo-seed.mjs` or `gn-demo-pending`.
