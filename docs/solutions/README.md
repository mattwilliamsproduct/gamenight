# Solutions

After a novel bugfix or a non-obvious ship, add `docs/solutions/<short-slug>.md` so the next agent compounds.

Say what broke, what fixed it, and what not to repeat. If the lesson is a standing rule, also add one Hard constraints bullet in `AGENTS.md`. The learning does not stay only in chat.

Keep the note short. Product and tech truth stays in `docs/product-spec.md` and `docs/tech-spec.md`.

Ready-to-test language waits on a filled `docs/prove-it-packet.md`. After a durable Matt correction, also add one like or one kill the same day in `docs/taste-ledger.md` and the ledger section of `docs/taste.md`.

`gate-log.md` in this folder is the append-only Gate B and Gate C log. It is not a lesson note. Column rules are in `docs/jev-gates.md`.

Standing trap: [select-chevron.md](select-chevron.md) — one `select.bp-select` chevron, 14px in from the right. Do not draw a second arrow per screen.

Standing trap: [leave-game-outcomes.md](leave-game-outcomes.md) — one Leave game choice. A counted partial total stays out of full-game score records. History does not inherit today's targets.

Standing trap: [legacy-history-review.md](legacy-history-review.md) — saved-round classification stays off until History review summary is shown and applied. Canasta stays uncertain. Do not invent a Flip 7 or Rook target.

Standing trap: [rc4-place-and-board.md](rc4-place-and-board.md) — tied totals skip to the next place. The scoreboard uses the page width and caps row height.

Standing trap: [late-join-start.md](late-join-start.md) — mid-match Add Player uses the ceiling of the seated average. A departure does not change the Wizard length. Canasta and Rook do not add a seat.

Standing trap: [restore-keeps-live-match.md](restore-keeps-live-match.md) — an empty backup table does not clear the live match. A different match in the file is parked first.

Standing trap: [left-early-stays-visible.md](left-early-stays-visible.md) — a player who left early stays on the board with their score and the words Left early. Passport Best score skips that partial total.

Standing trap: [end-screen-eligibility.md](end-screen-eligibility.md) — an uncounted ended-early night says Ended early. It does not name a winner or celebrate a score.

Standing trap: [exact-bid-open-nights.md](exact-bid-open-nights.md) — exact-bid stats include paused and ended-early rounds that have both a bid and the tricks taken. A late-join starting adjustment does not count.

Standing trap: [two-tab-revision.md](two-tab-revision.md) — a second tab loads the newer match instead of writing over it.

Standing trap: [try-demo.md](try-demo.md) — `?demo=try` is an isolated sample on `bpg_demo_*`. Remap the QA seed to a fictional cast in the demo path only. Bare `?demo` still does nothing.

Standing trap: [add-player-suggestions-joined-name.md](add-player-suggestions-joined-name.md) — spread profile keys into the known-name list, or Add Player offers one comma-joined fake row.

Standing trap: [worker-template-matches-page.md](worker-template-matches-page.md) — Vercel ships `src/service-worker.js`, not the committed `public/sw.js`.

Standing trap: [scorecard-places-and-life-preserver.md](scorecard-places-and-life-preserver.md) — a hidden round column is not a deleted hand, and place ties compare as numbers.

Standing trap: [scorecard-visible-lead.md](scorecard-visible-lead.md) — a name that fits its cell can still sit off the phone viewport; row-fit must use the visible remainder, and phone Slice 2 must apply the fit-row height.

Standing trap: [emoji-avatar-fallback.md](emoji-avatar-fallback.md) — `charAt(0)` on an emoji name throws inside the avatar data URI.

Standing trap: [data-integrity-records.md](data-integrity-records.md) — bid accuracy comes from bids and actuals, a historical round keeps its own roster, and a Life Preserver flag follows the spins that remain.

Standing trap: [slice2-phone-scorekeeper.md](slice2-phone-scorekeeper.md) — Slice 2 still needs a scrollable phone roster above the keypad; do not port #59 welcome/sample work onto that preview.

Standing trap: [rc1-one-skin.md](rc1-one-skin.md) — Warm Porch Ledger is the only skin; 818 / Wizard gallery rows must be rule-valid, including dealer law.

Standing trap: [rc1-phone-p1.md](rc1-phone-p1.md) — one shared NAME-FIT size, Saved is not a nav slot, and Life Preserver header copy states the real spin range.

Standing trap: [rc1-local-only.md](rc1-local-only.md) — this release does not call `/api/sync`; Redis stays an untouched backup.

Standing trap: [rc1-scorecard-table.md](rc1-scorecard-table.md) — Table leaves a live match; it does not end it.

Standing trap: [rc1-lp-wheel-color.md](rc1-lp-wheel-color.md) — color Life Preserver slices by benefit, never by numeric sign.

Standing trap: [rc1-records-restore.md](rc1-records-restore.md) — Records keeps the full book; Shame is not capped at 5, and completed nights do not show Resume.

Standing trap: [rc1-lp-roulette-wheel.md](rc1-lp-roulette-wheel.md) — Life Preserver labels stay inside every slice; equal-ish pockets stay accurate-ish, and the draw still uses the live table.

Standing trap: [rc1-modal-size-system.md](rc1-modal-size-system.md) — one token set sizes every modal; past-night scorecards use most of the viewport. Add Player is form, not confirm.

Standing trap: [demo-art-dusk.md](demo-art-dusk.md) — dusk rasters stay on disk. The shipped page does not load `demo-art` or honor `?art` / `?logo`. Home uses card-picker faces. Canasta still uses the dusk sheet tile.

Standing trap: [home-recent-nights-column.md](home-recent-nights-column.md) — laptop Home columns stretch even; extra height goes into seats and game art, not padding. Recent nights stays full width. Phone stays Table, Start, nights.

Standing trap: [home-night-podium.md](home-night-podium.md) — Recent nights podiums reuse Records ranking. Incomplete nights have no podium. Rook partners share a place from the stored totals.

Standing trap: [home-seat-reorder.md](home-seat-reorder.md) — Home reorder writes `players` only. A live match keeps its own roster and dealer.

Standing trap: [scoreboard-header-tiles.md](scoreboard-header-tiles.md) — header is Home, Actions, Enter Scores. Save & End stays in Actions. Entered scores use one light tile. A Life Preserver cell grows in height instead of shrinking the digits.

Standing trap: [home-live-standings.md](home-live-standings.md) — landscape Home fills under the nav and ends a margin above the viewport. A `100dvh` height taken from the wrong top slices Start, Add Player, and the last row. Live standings use `scoreboardStandings` and do not sort the seats. Start confirms before `parkActiveMatch`. Unfinished nights resume from the banner, not a Home history list.

Standing trap: [avatar-photo.md](avatar-photo.md) — uploads are shrunk to a JPEG data URL before `gn_profiles` or `bpg_demo_profiles`. A failed save keeps the previous portrait. A broken ref shows the silhouette.

Standing trap: [canasta-on-rc1.md](canasta-on-rc1.md) — shelf says Canasta, saved id stays Hand and Foot; Rook stays hidden. `.hf-rate-bar.hidden` must stay `display:none` so Canasta rates do not leak onto other games.

Standing trap: [toast-route-dismiss.md](toast-route-dismiss.md) — parking a toast is not enough; `navigateTo` must clear the tray so Standings updated does not follow the table to Records.

Standing trap: [rc2-look-fixes.md](rc2-look-fixes.md) — iPad 1024 score entry cannot use managed-fit `flex: 1 1 0` on player rows. A 100% scorecard table that stays 5px over a fudge of 4 will hide every past round. Settings body with flex-basis 0 collapses Appearance behind the foot.

Standing trap: [card-picker.md](card-picker.md) — Home uses 5:7 card faces and select-then-Start. Do not import the card-picker demo seed. 1024 Start stays in the viewport. Tablet-land entry stays two-column.

Standing trap: [rc2-look-1400.md](rc2-look-1400.md) — reserve NOW min-width and shrink columns; do not hide another oldest hand to unclip a NOW that is already on screen. Saved sits under the Tonight's Table title, fully inside the card.

Standing trap: [rc2-look-1505.md](rc2-look-1505.md) — do not ship TEMP demo-loading. 1024 Records headline stays three across. Current-round header is `R11 Now`, not `R11 · Now`. Phone entry mutes the subtitle and keeps three rows above Scoring. Non-active 8-player rows have no teal/dealer outline.

Standing trap: [rc2-records-labels.md](rc2-records-labels.md) — Canasta nights keep the Hand and Foot id. Records must list that id as Canasta. Rook history can show while the start card stays hidden.

Standing trap: [rc3d-phone-entry-roster.md](rc3d-phone-entry-roster.md) — phone 8-player entry must scroll the roster lane; do not let `#score-entry-rows` grow and clip under the keypad.

Standing trap: [rc4-usability.md](rc4-usability.md) — scorecard width stays stable, not edge-to-edge then hugged. Nine-seat wrap was not reproduced. Passport filters scope every number. Demo records are computed, never planted. Safari on a real phone stays Matt's check.

Standing trap: [phone-scoreboard-reach.md](phone-scoreboard-reach.md) — a phone scoreboard that locks the shell to `100dvh` clips the last seats and hides the app nav. Scroll the seat list inside the visual viewport. Phone header is Home, Enter Score, Actions, Save & End on one row. The back control says Home at every size and does not end the match. See [rc4-ipad-landscape.md](rc4-ipad-landscape.md).
