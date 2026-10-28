# RC1 combined candidate — gate report

**Status:** automated verification passed; physical Safari approval pending  
**FROZEN at** `c4841e3`, 5:38 AM ET  
**HEAD:** `c4841e3` — Rebuild app utilities after the phone name-fit scan.  
**Code:** three demo-path CSS fixes on `a859377` / `a507208` (`4515594`, `2389a2b`, `c8ad40c`, plus utilities `c4841e3`).  
**Branch:** `cursor/rc1-records`  
**Base:** `cursor/release-candidate-1`  
**Draft PR:** #73 (draft only; no undraft / merge / deploy)  
**Tag:** `rc1-candidate-20261028-0538`

Do not write "approved". Physical iPhone Safari, post-deploy smoke, and rollback stay PENDING.

## Baseline (start of this overnight pass)

| Field | Value |
| --- | --- |
| Starting commit | `0945d46` — Record Gate C for the last rc1-records Canasta look-pass. Origin tip when this pass began. |
| Local HEAD while writing baseline | `af4be85` — revert of tonight's first-click sample persist (`f4090d5`). Tree matches `0945d46`. |
| Production host | `https://cardknight.vercel.app` (director URL withheld) |
| Production flags | Porch-password cloud **off** (`canPorchCloud()` returns false; `/api/sync` not fetched). Slice 2 Warm Porch Ledger **on**. Canasta on the shelf as Hand and Foot; Rook `hidden: true` unless `?demo&games=rook`. Turbos / `comeback-logic.js` **unloaded**. Art/logo dusk stays behind `?demo&art=` / `?logo=`. TEMP `?demo` preview/localhost only. |
| Redis | Never read or written. `gamenight:backup:v1` and cardknight backup untouched. |
| Older saved-data backup | `docs/prove-it/fixtures/older-night-from-main.json`, built by `scripts/build-older-night-from-main.mjs` running `origin/main` `public/assets/backup.js` (`3d3a87d`). Rook night, profiles, records, incomplete Beat the Heat, live 818. No Hand and Foot / Canasta rows. |

## Known failures at baseline (pre-existing is not an excuse)

Classified from this branch's own docs and a first look, not from memory. Untested items stay UNVERIFIED.

| Id | Where it came from | Severity | Notes |
| --- | --- | --- | --- |
| B-scorecard-nav | Slice 2 board bar never parked Save & End / Actions; CSS already expected them in `.s2-board-actions`. Banner is `display:none` on `html.slice2-tv`. | P1 | Settled B: visible ← Table, outlined Save & End, History in Actions. First-timer cannot tell leave vs end vs discard. Fix on this pass. |
| visual-stale | `docs/SLICE2-ARCHITECTURE-PLAN.md` | UNVERIFIED tonight until `test:visual` runs | Prior laptop/TV snapshot set had ~26 fails (stale + Comeback UI that production does not load). |
| keypad-8p | `docs/solutions/canasta-on-rc1.md` | OK layout this pass | 8-player Next is in view on 375 (84px tall) and 390. Shots: `visual-matrix/375x667/keypad-8p.png`. Old Next-corner fails were environmental on `7a1b1a6`. |
| F items | Rubric §F | OPEN | Not decided tonight. See `docs/decisions-for-matt.md`. |

## Production flag settings (portfolio RC)

- Local-device scoring. Cloud backup off. Existing Redis blob left in place, unused by this client.
- Honesty copy: "Saved on this device" / "Scores and history are saved in this browser on this device."
- Six-game shelf: Five Crowns, Wizard, 818, Flip 7, Beat the Heat, Canasta. Rook preserved in history and via hide switch.
- Life Preserver loaded. Comeback script not loaded.

## Demo fixture (isolated)

- Link: `/?demo&view=demo-path`
- Hosts: localhost / 127.0.0.1 / preview `*-mattwilliamsproducts-projects.vercel.app` only. Production host ignores `?demo`.
- Fixture id: `demo-path` in `public/qa/fixtures.mjs`
- Live match: Five Crowns, June / Theo / Rosa / Hank, **10 of 11 hands in**. Totals after 10: June 38, Theo 36, Rosa 52, Hank 71.
- Walk: enter last hand with June **12** (mistake), correct to **0**, June's total 50→38 and first place flips Theo→June, then End Match. Records show June won 38.
- Isolation: `persist: false`, `skipPersist`, does not write `gn_*` or `gn_demo_seeded`. Existing personal history is left on disk. Banner: "Sample night · Five Crowns · not saved on this device".
- Production "Try a sample night" on an empty book is **not** offered. Decision list.

## Freeze procedure (run ~6:30 AM ET; do not execute early)

1. Stop product edits on `cursor/rc1-records` unless a true blocker.
2. `npm run check` + `npm run test:functional` + `demo-path` + `phone-conditions` + `life-preserver-visible`.
3. Tag `rc1-candidate-20261028-<HHMM>` on the freeze sha. Push the tag.
4. Read GitHub Preview deployment statuses for that sha. Pin `gamenight-<hash>-mattwilliamsproducts-projects.vercel.app` (not the git-branch alias).
5. Write `FROZEN at <sha>, <time ET>` and status `automated verification passed; physical Safari approval pending`.
6. Branch `cursor/rc1-bonus` from the tag for spacing/alignment/wording/focus/readability only.

## Freeze block (fill at freeze; do not invent a pinned URL)

| Field | Value |
| --- | --- |
| FROZEN at | `c4841e3`, 5:38 AM ET |
| Tag | `rc1-candidate-20261028-0538` |
| HEAD sha | `c4841e3` |
| Commands + pass counts | 5:34 AM ET: `npm run check` pass. `test:functional` **152/152**. `demo-path` 2/2. `phone-conditions` 12/12 (match-complete NAME-FIT, toast clear, 375 headers). `life-preserver-visible` 5/5. `test:porch-night` 2/2. Demo rehearse 390×3 + 375×3, all June 38 / Theo 41. |
| Demo fixture | `/?demo&view=demo-path` |
| Pinned preview | `gamenight-7voetuyns-mattwilliamsproducts-projects.vercel.app` (GitHub deployment 7381820408, Preview success on `c4841e3`). Not the git-branch alias. Curl hits Vercel SSO (302). |
| Status wording | automated verification passed; physical Safari approval pending |
| Physical iPhone Safari | PENDING (Matt only) |
| Post-deploy smoke / rollback | PENDING |
| TV-distance 1920×1080 | layout check only; readability judged separately |

## Gate table

Mark untested UNVERIFIED. Never green without evidence.

| Gate item | Result | Evidence |
| --- | --- | --- |
| Combined RC (Slice 1 + Slice 2 + responsive + flags) | OK (automated visual matrix + porch-night) | 5-size matrix 375/390/768/1440/1920 with contact sheets. `test:porch-night` 2/2. Physical Safari PENDING. |
| Classify all test failures | OK (this pack) | `npm run check` pass at `c4841e3` (5:34 AM ET). `test:functional` **152/152**. `test:visual` Playwright baselines still stale / not the overnight matrix. |
| Task-completion acceptance (8 players, correct past, resume) | OK (automated) | `rc1-acceptance.spec.mjs` passed in the 64/65 pack (the one fail was the demo-path locator, now fixed). |
| Older saved data + backup/restore | OK (automated) | `test:older-night` 3/3. `older-night.spec.mjs` 1/1. |
| Canasta variant / team scoring / records | OK (automated, this pack) | `hand-and-foot.spec.mjs` + `canasta-rook-flag.spec.mjs` passed. |
| Historical Rook identity preserved | OK (automated) | older-night + canasta-rook-flag + game-registry. |
| Interrupted entry (refresh, Table, modal, double Submit) | OK (automated) | `data-integrity.spec.mjs` 24/24. `interrupted-entry.spec.mjs` 2/2: Table and back keeps the same hand; double-tap Submit adds one round. |
| Phone conditions (long names, 8 players, retired, large totals, negatives, 200% text, keyboard) | OK targets + 8-player + 200% + Scratch + complete NAME-FIT + toast + 375 rounds + Canasta 3695 + 768 nav | `phone-conditions.spec.mjs` 12/12. Keyboard-open UNVERIFIED. FC negatives rejected (`data-integrity` P1-05). |
| Understandability: Table vs End vs Scratch | OK (automated + matrix) | `← Table` leaves (no modal, Resume stays). Save & End confirm: “End this match now?” Scratch is “Scratch Match (discard)” on the phone Actions menu (`4a2f666`) then native confirm. Physical PENDING. |
| 90s isolated demo path | OK (automated, 6 rehearsals, reshot after CSS fixes) | `demo-path.spec.mjs` 2/2. Rehearse 390×3 and 375×3, all June 38 / Theo 41. Strips: `demo-rehearse/strip-390x844.png`, `strip-375x667.png`. |
| Physical iPhone Safari | PENDING | Matt only |
| Post-deploy smoke + rollback | PENDING | |
| Art / logo live swap | not in candidate | dusk stays behind `?demo` |
| Undraft / merge / production deploy | HARD STOP | draft only |

## Changes this pass

See `docs/prove-it/calls-made.md`. One coherent change per commit.

## Decision list

See `docs/decisions-for-matt.md`. Section F stays OPEN. Sample night on production empty-home stays OPEN.

## Interview stories

None forced. Write only where a real decision and real evidence exist at freeze.

## Known P1 — demo-path name clipping (fixed on this freeze)

Matt caught it on the 390/375 strips before freeze. After the last hand, leftover row height blew `--scorecard-player-font` to 34px so Theo/June/Rosa/Hank clipped (`Thec`/`The`, `Junc`, `Rosi`/`Ros`, `Han`). The mid-game NAME-FIT check did not cover match-complete. Listed here either way per the freeze brief.

| Item | Result | SHA | Before / after |
| --- | --- | --- | --- |
| Name clip on match-complete (375 + 390) | Fixed. Phone name size capped; NAME-FIT asserted on match-complete. | `4515594` | `demo-fixes/names-before/` · `demo-fixes/names-after/` |
| Standings updated toast on Save & End / Match complete | Fixed. Toast parked in the scorecard band. | `2389a2b` | `demo-fixes/toast-before/` · `demo-fixes/toast-after/` |
| 375 R9/R10 collision | Fixed. Fewer round columns; R10 and R11 stay apart. | `c8ad40c` | `demo-fixes/rounds-before/` · `demo-fixes/rounds-after/` |

## Artifact paths (matrix from a859377 UI; demo strips reshot on `c4841e3`)

Recaptured 5:08 AM ET. 50/50 matrix shots. Game tiles below the fold on phone Home are scroll, not a P0. No blocker.

### Contact sheets (one per size)

- `/opt/cursor/artifacts/screenshots/visual-matrix/contact-375x667.png`
- `/opt/cursor/artifacts/screenshots/visual-matrix/contact-390x844.png`
- `/opt/cursor/artifacts/screenshots/visual-matrix/contact-768x1024.png`
- `/opt/cursor/artifacts/screenshots/visual-matrix/contact-1440x900.png`
- `/opt/cursor/artifacts/screenshots/visual-matrix/contact-1920x1080.png`

### Per-size frames (Home, Table/scorecard, end, discard, leave, past-night, LP wheel, Records, Canasta)

Each size folder: `home.png`, `scorecard.png`, `end-match.png`, `discard-actions.png`, `leave-table.png`, `past-night.png`, `lp-wheel.png`, `records.png`, `canasta-scorecard.png`, `canasta-entry.png`

- `/opt/cursor/artifacts/screenshots/visual-matrix/375x667/`
- `/opt/cursor/artifacts/screenshots/visual-matrix/390x844/`
- `/opt/cursor/artifacts/screenshots/visual-matrix/768x1024/`
- `/opt/cursor/artifacts/screenshots/visual-matrix/1440x900/`
- `/opt/cursor/artifacts/screenshots/visual-matrix/1920x1080/`

### 90-second demo strip (fixed fixture `/?demo&view=demo-path`)

- `/opt/cursor/artifacts/screenshots/demo-rehearse/strip-390x844.png` (required)
- `/opt/cursor/artifacts/screenshots/demo-rehearse/strip-375x667.png`
- Key frames: `/opt/cursor/artifacts/screenshots/demo-path/390-01-resume.png`, `390-02-mistake.png`, `390-03-corrected.png`, `390-04-victory.png`, `390-05-records.png`
