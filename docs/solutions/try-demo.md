# In-app Try a demo

`cursor/try-demo` only until Matt undrafts. Cut from `cursor/rc2-launch` at `6500992`. A Records pass may land on that branch; keep `index.html` hooks small and rebase.

`/?demo=try` opens the fictional QA `demo-seed` book. Bare `?demo` still does nothing. Session `bpg_try_demo=1` keeps refresh in the sample. Exit clears the session and the query.

The sample uses `bpg_demo_*`. `gnKey()` remaps every `gn_*` read and write while the sample is on. Real games stay byte-identical. Backup, restore, and `/api/sync` are blocked. The chrome says `Demo · Sample data` with Exit and Reset.

Do not seed `gn_*`. Do not revive `public/assets/demo-seed.mjs` or `gn-demo-pending`.
