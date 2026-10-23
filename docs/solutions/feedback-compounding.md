# Feedback compounding

North star: crush requirements so one-shots get better every correction.

What broke: durable Matt corrections stayed in chat. Multi-step jobs started without the spec, taste, `AGENTS.md`, and `docs/solutions/`. Ready was claimed without prove-it evidence. App and product PRs were treated as mergeable before Matt said so.

What fixed it: Hard constraints in `AGENTS.md`.

- Before a multi-step coding kickoff, load `docs/product-spec.md`, `docs/taste.md`, `docs/taste-ledger.md`, `docs/goals-nongoals.md`, `AGENTS.md`, and `docs/solutions/` (including `docs/solutions/README.md`). Load the builder-taste-profile skill when it is available.
- After any durable Matt correction, or a novel lesson from a ship, compound the same day into `docs/solutions/<short-slug>.md` and/or `docs/taste.md` and/or one `AGENTS.md` Hard constraints bullet. Never leave durable feedback only in chat.
- Add one like or one kill bullet the same day in `docs/taste-ledger.md` and in the ledger section of `docs/taste.md`.
- Never claim ready without prove-it evidence: `npm run check`, plus a gallery or UI look when the change is UI. Non-UI work needs backend-prove-it.
- Ready-to-test language waits on a filled `docs/prove-it-packet.md`. Gallery ids, commands, backend cases, and the gap list go in that packet.

What not to repeat: leaving that feedback only in chat, or undrafting an app or product PR before Matt says undraft or merge. Docs-only OS edits with no game behavior may merge.

Product and tech truth stays in `docs/product-spec.md` and `docs/tech-spec.md`.
