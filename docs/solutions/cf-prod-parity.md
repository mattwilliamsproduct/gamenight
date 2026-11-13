# Production parity for Rook, Comeback Extra, and Porch Cloud

Production is `main` at `39e6b51` (Hotfix: Add Player suggestions joined-name bug).

## Rook

The scoring code was already on this branch. Setup still offers 300, 500, and 1000, and 300 starts selected. A made bid splits the hand with `rookConfig.totalCounters`. The win check is still `totals >= rookConfig.winTarget`. Nothing new was invented.

What was missing: `game-registry.js` and `records-logic.js` marked Rook `hidden: true`, so the picker and the empty ledger omitted it. Production shows the start card. Rook is `hidden: false` again. More than 6 players hits the existing confirm: "Call-your-partner Rook is usually played with 4-6 players. Start anyway?" Fewer than 4 still cannot start.

The landscape home grid was locked to two rows, which clipped the seventh card. It is three equal rows now, still three cards across. At 1024 the faces are about 99px wide and still 5:7.

## Comeback Extra

Production does not load `comeback-logic.js`. `applyComebackAndNotify` returns `[]` on `39e6b51` and on this branch. `npm run check` fails if the page loads the script or the worker precaches it. That is the production behavior, so the script stays unloaded.

What was missing: Records computed Most Comeback Extras In One Game and Biggest Comeback Extra, then the slice 2 book never painted them. Those two labels now show when a night stored a `round.comeback` value. The score cell still paints the stored mark. An empty book does not add the rows.

## Porch Cloud

`mergeCloud` in `public/assets/backup.js` matches production: if this device already has a named live match, the incoming live match is dropped before `mergeBackup`. History still merges by id. `api/sync.js` and Redis `gamenight:backup:v1` were not edited.

The client path is restored. `canPorchCloud()` is true only when the hostname is `cardknight.vercel.app`, QA mode is off, and Try demo is off. The request is `GET` or `PUT /api/sync` with header `x-porch-key`. The storage key is `gn_porch_key` (`gnKey` adds the demo prefix only inside Try demo, so a sample book cannot write the real key). Save schedules the same 2.5s push. Boot pulls when the gate and the key are both set.

Try demo is the one extra guard. It did not exist on `39e6b51`. Without it, a sample book on the live host could `PUT` the real blob. The live site without Try demo is unchanged.

Localhost, preview, and this emulator do not fetch. The stubbed test replaces `window.fetch` and forces the gate inside the page. It must not call the network.

## Do not

- Do not invent a Rook target.
- Do not load `comeback-logic.js`.
- Do not change `mergeCloud`, `api/sync.js`, the Redis key, or the `/api/sync` path.
- Do not call `/api/sync` from a preview, from localhost, or from Try demo.
