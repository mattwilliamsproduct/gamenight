# RC1 bonus addendum

Branched from freeze tag `rc1-candidate-20261028-0538` (`a653174` docs / `c4841e3` app).  
Draft PR: #77. **Do not fold into #73 unless Matt asks.**

Frozen candidate stays PR #73. Pin: `gamenight-7voetuyns-mattwilliamsproducts-projects.vercel.app`.

Matt checked the earlier bonus after-shots: toast stays in the header band, names are whole, frame 05 is clean, and it reads `1 night`. Dealer explanation is fine, no change.

Finalized early (~7:25 AM ET) after running out of **safe** CSS-only matrix items. Remaining leftovers are column-fit, wrap, dealer, or density — labeled unfinished, not forced.

Final head: `4f52faa`.

## Leftover past-night (requested)

The wide token capped at 1200px and the panel shrank to the table, so 1440 read as 1200×577 (83%×64%) and 1920 as 1200×577 (62.5%×53%) — a small centered card.

The wheel leftover is a **square** (`min(96vw, 100dvh − 8px)`). A square on 1920 landscape is worse for a table. CSS-only leftover for this sheet is rectangular tokens, same leftover idea:

- `--bp-modal-leftover-w` / `--bp-modal-leftover-h`: `min(96vw/96vh, 100vw/dvh − 2×gutter)`
- Phone: `calc(100vw/dvh − 16px)`
- Panel is opaque `#fffaf1` so leftover fill is not Home showing through

After leftover (`e80b9ff`):

| Size | Panel | Share |
| --- | --- | --- |
| 390×844 | 374×828 | 96% × 98% |
| 768×1024 | 736×983 | 96% × 96% |
| 1440×900 | 1382×864 | 96% × 96% |
| 1920×1080 | 1843×1037 | 96% × 96% |

375 is near-full. Long 8-player / 11-round Five Crowns at 1440/1920 shows **R1–R11** (`leftover-long/past-night-1440-11r.png`; `modal-size` lock on `72f9c29`, still 5/5 on `4f52faa`). Long tables scroll inside `.scorecard-table-wrap`.

### End match stays form

Save & End confirm is a short question (“End this match now?”) plus two buttons. Taste already likes `--bp-modal-form` (`min(92vw, 46rem)`) for that copy. Wheel leftover is a square and would swallow the laptop. Making it leftover would break the form / confirm / leftover split in `docs/solutions/rc1-modal-size-system.md`. Leave it.

Matrix 1440 End match: `/opt/cursor/artifacts/screenshots/visual-matrix/1440x900/end-match.png`.

## Landed

| SHA | Problem | Benefit | Verify | Before / after |
| --- | --- | --- | --- | --- |
| `f8ee3ac` | Standings updated sat on Rosa/Hank totals | Toast in the header band | phone-conditions toast vs totals | freeze strip 03–04 vs bonus `03-corrected` |
| `a929a71` | Toast still on Records frame 05 | `clearToasts()` on `navigateTo` | phone-conditions toast-dismiss; reshot 05 | `bonus-fixes/before/05-records-{390,375}.png` / `after/05-records-{390,375}.png` |
| `3ea2375` | Ledger said `1 nights` | `formatNightCount` → `1 night` / `N nights` | `test-records` golden 0/1/2/11 | same 05 pair |
| `7942378` + `20c6adf` | 390 frame 01 R9/R10/R11 clipped | Now column shares leftover; keep one past hand | phone-conditions 375+390 | `before/01-open-390.png` / `after/01-open-390.png` |
| `bcc63f4` | Last past hand left Mike’s +40 on a 43px cell | Park LP on Total under 44px | `life-preserver-visible` 5/5 | same park-on-Total rule |
| `e80b9ff` | 1440/1920 past-night was a small card | Rectangular leftover 96% sheet | `modal-size` ≥90% w / ≥85% h at 1024/1440/1920; 375 near-full | `bonus-fixes/modal-before/past-night-{390,1440,1920}.png` / `modal-after/past-night-{390,1440,1920}.png` |
| `9ff92b6` | Leftover 390 still hid R1–R2 (Total matched Player ~132px) | Cap modal Total so two last-hand columns stay | `390 past-night` ≥2 rounds, Megan present | `modal-rounds-before-390.png` (R3 only) / `modal-rounds-after-390.png` (R2+R3, Total 75px) |
| `a6635ee` | Leftover date stayed 10px | Date 16px (modal body floor) | `modal-size` date ≥16 | `date-before/date-{390,1440}.png` / `date-after/date-{390,1440}.png` |
| `b0fa847` | Leftover × was 22×36 | 44px close, title clear | `modal-size` close ≥44, no overlap | `close-before/close-390.png` / `close-after/past-night-390.png` |
| `9edc615` | Hidden-rounds hint was 10px | Hint 13px on leftover and live | `390 past-night` hint ≥13 | `hint-before/hint-modal-390.png` / `hint-after/hint-modal-390.png` |
| `6fc6db1` | Leftover PLAYER/TOTAL/R2 were 10px | Headers 13px | `390 past-night` still ≥2 rounds | `thead-before/past-night-390.png` / `thead-after/thead-390.png` |
| `f45a56e` | Resume / Enter Round used 42% teal outline on teal fill | Cream `#fff8ee` focus ring | Tab to Resume/Enter; outline `rgb(255, 248, 238)` | `focus-before/resume-1440.png` + `enter-390.png` / `focus-after/resume-1440.png` + `enter-390.png` |
| `837f2fd` | Past nights View scorecard / Resume were 36px | 44px tap targets | measure 133×44 / 83×44 | `nights-btn-before/past-nights-390.png` / `nights-btn-after/past-nights-390.png` |
| `4ead7ff` | Show all was 20px tall | 44px hit area, text-link look | measure 66×44 | `show-all-before/past-nights-390.png` / `show-all-after/past-nights-390.png` |
| `09e4705` | Leftover laptop/TV headers stayed 13px next to large totals | 16px from 1024 up | measure 16 at 1440/1920; 13.6 at 390 | `thead-tv-before/past-night-1440.png` / `thead-tv-after/thead-1440.png` |
| `e706823` | Leftover title stayed 30px on 1920 | Clamp 1.875–2.75rem (30 / 37 / 44) | measure title 30/37/44 | `title-before/past-night-{390,1440,1920}.png` / `title-after/past-night-{390,1440,1920}.png` |
| `efcaf5f` | Leftover laptop/TV date stayed 16px | 18px from 1024 up | measure 16 at 390, 18 at 1440 | `date-tv-before/past-night-1440.png` / `date-tv-after/date-1440.png` |
| `59cf5f0` | 768 board sub clipped to `Ks` | Wrap title row through 1023; 1024+ one line | `scorecard-table` one-line title; 768 nav one row | `768-banner-before/scorecard-768.png` / `768-banner-after/scorecard-768.png` |
| `26e4f3f` | Explore All games / All players were 34px / 11px | 44px / 16px selects | measure 44 / 16 at 390 and 1440 | `explore-before/explore-390.png` / `explore-after/explore-390.png` |
| `43c18c8` | Settings and other form × stayed 22×36 | Shared `.bp-modal-panel > button.absolute` 44px | Settings close 44; leftover still 44, no overlap | `settings-close-before/settings-390.png` / `settings-close-after/settings-390.png` |
| `8d89ea8` | Settings App Management / Appearance were 10px | Section labels 13px | measure 13 | `settings-kicker-before/settings-390.png` / `settings-kicker-after/settings-390.png` |
| `72f9c29` | Leftover 1440/1920 could hide rounds later | Lock all 11 Five Crowns rounds | `modal-size` 1440/1920 roundCount === 11 | `leftover-long/past-night-1440-11r.png` |
| `4148487` | Profiles Search / Sort / Game were 10px | Filter labels 13px | measure 13 | `profiles-before/profiles-390.png` / `profiles-after/profiles-390.png` |
| `3b21c67` | Settings helper “Adjust for the iPad…” was 11px | Helper copy 13px | measure 13 | `settings-helper-before/settings-390.png` / `settings-helper-after/settings-390.png` |
| `e74a9be` | Profiles Photo was 9px / 22px tall | 13px / 44px tap, no name overlap | measure 74×44, font 13 | `photo-before/profiles-{390,1440}.png` / `photo-after/profiles-{390,1440}.png` |
| `3373320` | Games / Wins / Favorite Game were 9px | Labels 13px; mini-stat side pad so Games stays whole on 1440 four-up | measure 13, clip false | `stat-label-before/profiles-{390,1440}.png` / `stat-label-after/card-{390,1440}.png` |
| `0aaaa65` | Explore GAME / PLAYER kickers were 11.5px | Labels 13px; selects stay 44 / 16 | measure 13 / 44 | `explore-label-before/filters-390.png` / `explore-label-after/filters-390.png` |
| `ab6d9a7` | Best final / Best round were 11.5px | Laptop heads + phone `::before` 13px | measure 13 | `ledger-before/records-{390,1440}.png` / `ledger-after/records-{390,1440}.png` |
| `bcd032a` | 818 · Played was 11px | Last-played line 13px, wraps on 1440 | measure 13, clip false | `sub-before/card-{390,1440}.png` / `sub-after/card-{390,1440}.png` |
| `4eb01b3` | Active match / Head-to-head were 11.5px | Kickers 13px | measure 13 | `kicker-before/home-kicker-390.png` / `kicker-after/home-kicker-390.png` |
| `68f3a3c` | Home Saved chip was 11px | 13px; board-line Saved stays 0.62rem | measure 13; scorecard no dealer overlap | `saved-before/home-390.png` / `saved-after/home-390.png` + `chip-390.png` |
| `5961d41` | Unassisted matches note was 11px | Footnote 13px | measure 13 | `unassisted-before/records-390.png` / `unassisted-after/note-390.png` |
| `237b940` | Career wins / Win rate were 11.5px | Headline labels 13px | measure 13, clip false | `headline-before/records-390.png` / `headline-after/card-{390,1440}.png` |
| `74e13db` | Home Selected pill was 11px | Selected 13px | measure 13 | `selected-before/home-1440.png` / `selected-after/card-1440.png` |
| `f6f2fc9` | Leftover R heads were 27px vs Player/Total 16px | One size: 13.6 phone / 16 laptop | measure all th; 390 still R2+R3 | `thead-unify-before/past-night-{390,1440,1920}.png` / `thead-unify-after/past-night-{390,1440,1920}.png` |
| `7916714` | 768 leftover heads stayed 13.6px | 16px from 768; 390 stays 13.6 | measure 16 at 768; all 3 rounds | `thead-768-before/past-night-768.png` / `thead-768-after/past-night-768.png` |
| `a3dc942` | 768 leftover date stayed 16px | 18px from 768; 390 stays 16 | measure 18 at 768, 16 at 390 | `date-768-before/past-night-768.png` / `date-768-after/date-768.png` |
| `4f52faa` | Leftover laptop/TV names stayed 16.8px | 20px from 1440; 390 stays 16.8 | names whole; `modal-size` 11-round still 5/5 | `leftover-body-before/past-night-{390,1440,1920}.png` / `leftover-body-after/past-night-{390,1440,1920}.png` |

Artifact root: `/opt/cursor/artifacts/screenshots/bonus-fixes/`.

## Dealer on frame 01 (no CSS change)

Hank’s outlined name pill is the **dealer chip**, not leftover focus.

- Header: `Dealer: Hank`
- `button.dealer-name-indicator` + `.dealer-player-label` emerald inset ring
- Avatar `D` badge
- `nameFocused: false`
- Taste already says the dealer chip hugs the letters. Adding “dealer” next to Hank would fight NAME-FIT.

The outlined/dashed **4th** is `.scorecard-life-preserver-rank` (Life Preserver available), plus `.is-place-rest`.

## Not landed / unfinished

- **PINNED URL for `4f52faa`:** Vercel Preview is rate-limited (`Deployment rate limited — retry in 24 hours`). No per-deployment host for this head. Last successful Preview is `237b940` (below).
- Laptop look of the bonus toast
- Fold-in to the frozen candidate (#73)
- Physical Safari PENDING
- 768 live scorecard still hides R1–R9 (column fit, not leftover). Not this CSS pass.
- Live laptop/TV thead stays 11.5px. `R11 · Now` already clips at 74px; raising heads would clip more. Not this pass.
- Home “Start a New Match” below the fold on 8-seat 768 — scroll, already noted
- Seat nudge / × stay 32px on 8-seat Home — density, not this pass
- Records Overview / Explore / Past nights stay 11.5px so the phone segment does not wrap
- Phone nav stays 11.8px so Table / Records / Profiles / gear stay one row
- Leftover Canasta 1440 inject did not open; live Canasta 390/1440 names and 4-digit totals were already whole

## Verify (final head `4f52faa`)

- `npm run check` pass
- `npm run test:functional` **154/154**
- `npm run test:porch-night` **2/2**
- `modal-size` 5/5 including leftover fill, 390 ≥2 rounds, date ≥16, close ≥44, 1440/1920 all 11 rounds (re-run after body scale)
- `scorecard-table` one-line title at 1024/1440 still pass after 768 wrap
- `phone-conditions` 768 nav one row; toast dismiss; 390 rounds

## Preview

Last successful PINNED bonus app (`237b940`, GitHub deployment 7383764135): `gamenight-6fciotfhj-mattwilliamsproducts-projects.vercel.app`  
Not the git-branch alias. SSO 302. **Missing `74e13db`…`4f52faa`** (Selected pill, leftover thead unify, 768 thead/date, leftover 20px names). Final head `4f52faa` has no Preview host until the rate limit lifts.

## Status

Draft only. Candidate tag / PR #73 untouched. Do not close PR #76. Bonus CSS pass stopped: out of safe items.
