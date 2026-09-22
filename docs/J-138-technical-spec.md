# J-138 — Back Porch Games technical specification

**Status:** proposed implementation contract  
**Date:** 2026-09-22  
**Companion:** `docs/J-138-product-spec.md`

## Design principles

1. Keep the application local-first and usable as an installed static PWA.
2. Treat score and match history as domain data, not presentation state.
3. Keep each game scorer deterministic and independently testable.
4. Make persistence versioned, normalized, and conflict-aware.
5. Generate deployable assets deterministically and verify source/output parity.
6. Extract incrementally from the current app shell; do not block correctness on a framework rewrite.

## Target boundaries

### Game definitions

Each game definition owns:

- display name and score direction;
- fixed or computed finish rule;
- round/hand label;
- entry phases;
- validation;
- deterministic scoring;
- supported player counts/variant configuration;
- whether Life Preserver is supported.

UI rendering must consume the definition rather than repeat game-name conditionals across unrelated functions.

### Match domain

The match domain owns:

- stable match ID, schema version, revision, creation/update timestamps;
- starting and active rosters;
- current scoring period and phase;
- submitted periods, drafts, totals, retirements, and joins;
- special adjustments with explicit type, player, value, and owner period;
- competition ranking;
- undo/edit transitions;
- finish and history snapshot creation.

Totals should be derivable from submitted periods and adjustments. Persisted totals may be retained as a cache, but normalization verifies or recomputes them.

### Presentation

Presentation owns DOM rendering, modals, responsive fitting, animation, sound, haptics, and optional assets. It calls domain commands and renders returned state; it does not independently implement score or rank rules.

### Persistence

Persistence owns:

- localStorage adapters;
- schema migration and normalization;
- manual backup import/export;
- cloud serialization and revision protocol;
- page-hide flushing and storage failure reporting.

### Optional capabilities

Confetti, charts, screenshot generation, wake lock, vibration, and audio must fail independently without blocking scoring or persistence.

## Canonical state schema

Illustrative target:

```json
{
  "schemaVersion": 3,
  "matchId": "uuid",
  "revision": 12,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "game": {
    "name": "Wizard",
    "config": {},
    "maxPeriods": 10
  },
  "startingRoster": ["Matt", "Michelle"],
  "activeRoster": ["Matt", "Michelle"],
  "retired": [],
  "period": 4,
  "phase": "bidding",
  "periods": [],
  "draft": {
    "bids": {},
    "results": {}
  },
  "adjustments": [
    {
      "id": "uuid",
      "type": "life-preserver",
      "player": "Michelle",
      "value": 20,
      "ownerPeriod": 3,
      "createdAt": "ISO-8601"
    }
  ],
  "audit": []
}
```

Migration requirements:

- Continue reading current `name`, `originalRoster`, `currentRound`, `rounds`, `hailMaryUsed`, and `hailMaryBonus` shapes.
- Convert legacy bonus rounds to typed adjustments during normalization.
- Never mutate imported input before validation succeeds.
- Preserve unknown history rows for forward compatibility where safe.
- Keep migration functions pure and fixture-tested.

## Command contracts

Domain changes occur through commands with explicit validation and results:

- `startMatch(game, roster, config)`
- `saveDraft(match, draft)`
- `lockBids(match, bids)`
- `submitPeriod(match, results)`
- `editPeriod(match, periodId, results)`
- `undoLastPeriod(match)`
- `joinPlayer(match, player, acceptedCatchUp)`
- `retirePlayer(match, player)`
- `applyLifePreserver(match, offerId, outcome)`
- `finishMatch(match)`

A command either returns the complete next state plus events or returns a validation error without partial mutation.

## Ranking

One pure helper computes competition rank from score direction and totals. It is used by every presentation and by Life Preserver legality. Display order and rank are separate outputs.

Required cases:

- high- and low-score games;
- tied first;
- multiple tie groups;
- retired players excluded;
- hypothetical scores used for Life Preserver caps.

## Life Preserver

`public/assets/life-preserver-logic.js` is the current extraction seam. Its public API should remain pure except for explicit state-transition helpers.

Required invariants:

- supported game and minimum-period gate;
- no offer to leader, retired player, used player, or unsupported game;
- eligibility calculated from scoring periods only;
- one immutable offer snapshot identifier, then live revalidation at application;
- helpful outcome remains strictly behind first;
- adjustment represented separately from an ordinary period;
- undo removes adjustment by owner period;
- history and records can distinguish ordinary score, join catch-up, and Life Preserver adjustment without boolean inference.

## Local persistence

- Save active-match changes synchronously enough to survive immediate navigation.
- Debouncing may apply to repeated draft keystrokes, but page hide and visibility loss flush pending work.
- Storage errors are observable to the host; a save indicator must mean persistence completed, not merely that a timer was scheduled.
- Cold history/profile serialization may be deferred only while the active match is safely persisted.
- Normalization runs at load, backup import, cloud pull, and history resume.

## Cloud protocol

The cloud document includes `revision`, `savedAt`, and optional active-match identity.

1. GET returns document and revision.
2. PUT supplies `expectedRevision`.
3. The server atomically writes only when the stored revision equals `expectedRevision`.
4. A stale write returns `409 conflict` and the current revision, without overwriting.
5. The client compares active-match IDs before merge.
6. History entries merge by stable IDs; profile and lineup fields use explicit merge rules.
7. Different active-match IDs require user resolution.

The shared household password remains an MVP gate, not an account-grade authorization model. Requests and payloads require bounded size and schema validation.

## Build and offline contract

- `src/service-worker.js` is the only editable worker source.
- `public/sw.js` is deterministic generated output.
- The app-shell cache contains every essential same-origin script and stylesheet loaded at startup.
- Retired scripts are not cached.
- `/api/` is always network-only.
- A build verification step compares startup dependencies in `public/index.html` with worker entries.
- CI fails when a clean build changes committed generated output unexpectedly.
- Offline smoke coverage installs/activates the worker, reloads without network, resumes a fixture match, opens rules, and submits a local score.

## Test pyramid and CI

### Required on every pull request

- syntax and production-asset checks;
- pure scorer/ranking/Life Preserver/state migration tests;
- backup and cloud conflict tests;
- focused laptop-Chromium flows:
  - simple score → undo → finish;
  - Wizard or 818 bid → score → reload;
  - Rook setup → one scored round;
  - long-name fit and tied standings.

### Required before release

- full iPad/laptop/TV visual matrix;
- installed-PWA offline/update smoke;
- two-client cloud conflict scenario;
- manual porch-table pass using `docs/release-checks.md`.

Tests for code that production does not load must not count toward shipped-path confidence. Retired Comeback/Turbo tests should be removed, archived, or placed behind an explicitly separate experiment target.

## Incremental extraction sequence

1. Add characterization tests around current behavior.
2. Extract competition ranking.
3. Extract Wizard and 818 scorer/validation definitions.
4. Introduce normalized match schema and migration.
5. Represent Life Preserver as typed adjustments.
6. Move cloud merge/revision logic behind the persistence boundary.
7. Extract Rook state machine.
8. Split presentation only where these domain seams reduce repeated branching.

Each step must preserve visible behavior unless its ticket explicitly changes the product contract.

## Observability

For this household MVP:

- retain bounded in-match audit events;
- record schema/build version in exported backups;
- surface local save and cloud conflict errors in the UI;
- avoid logging porch passwords, full backups, or player profile data;
- keep performance instrumentation separate from domain behavior.

## Definition of done

A technical change is complete when:

- its product acceptance case is linked;
- pure logic and relevant browser flow are tested;
- migration/backward compatibility is covered when state changes;
- clean build output is deterministic;
- offline and cloud implications are considered;
- generated files and documentation are updated together;
- no unrelated theme or feature refactor is bundled.

