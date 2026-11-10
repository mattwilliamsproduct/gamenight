# RC4 fast-follow risks

Lenses: hidden state machine, and assumptions the code never checks. No scoring math, storage schema, or dependency changes in this pass. Emulated checks only.

## Fixed here

- History lookups used `===` while `parkActiveMatch` already stringified the id. A legacy numeric id and the string `"42"` missed resume, finish, delete, the scorecard, and a prior-score skip. `BPGScorebook.sameMatchId` and `findMatchIndex` in `public/assets/scorebook.js` are the one comparison. Call sites are in `public/index.html`: `priorScoreForGame`, `snappedLosingStreak`, `parkActiveMatch`, `resumeMatch`, `finishMatch`, `syncSavedMatchFromGame`, round correction, `deleteMatchRecord`, and `openScorecard`.
- `parkActiveMatch` and `finishMatch` now drop a later row with the same id before writing. `resumeMatch` drops the extra before it splices the night back onto the table.
- `resumeMatch` dropped `endedEarly`, `gameOver`, `winners`, and `endScore` when it rebuilt `currentGame`. `resumeCarryFields` copies those four onto the live match. Unfinished parks still carry `endedEarly: false` and an empty winners list, which `parkActiveMatch` already writes.

## Left alone

- `createSavedMatchSnapshot` in `public/index.html` stores `rounds: game.rounds` by reference. `parkActiveMatch` can put that array into history while `currentGame` still holds it, so a later round push edits the parked night until the next park replaces the row. A deep copy would change object identity. Not in this pass.
- `scratchMatch` clears `currentGame` only. It does not delete a history row. The confirm says the progress is lost. That is true for a night that was never parked. A park that already wrote history, followed by a resume that cannot find its id, can leave the live game and a history twin. The id fix covers the miss. Scratch still does not delete history, so it cannot wipe a finished night that shares an id.
- `spinWheel` in `public/index.html` sets `_lifePreserverCommitted` and calls `BPGScorebook.recordLifePreserverSpin` before the result timer. A second call returns at the flag. `recordLifePreserverSpin` also no-ops when `hailMaryUsed` or a bonus round already names that player. A zero adjustment is a real no-change and still marks the match assisted. An unparsable adjustment is stored as 0 and still uses the spin. That path stays, because changing it would change the stored spin.
- `undoLastRound` removes every round from the last scoring round through the end, then `releaseRemovedLifePreservers` in `public/assets/life-preserver-logic.js` frees only the players on those removed bonus rounds. A spin that landed after the undone hand is released with it. A spin stored earlier stays used.
- `visibilitychange` (hidden) and `pagehide` both flush the open score draft and call `_persistGamenightState`. An emulated night did not grow a duplicate round. The save schema is unchanged.
- `isCompletedHistoryMatch` treats a missing `completed` field as finished (`completed !== false`). Parked nights set `completed: false`. Changing the default would change win counts.
- `finalizeHistoryCorrection` will not resume a reopened night when `historyReopenWouldReplaceActive` says another match is on the table. The saved row stays in history with `completed: false`. The live match stays put.
