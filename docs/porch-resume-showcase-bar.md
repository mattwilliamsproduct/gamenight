# Back Porch — resume showcase bar

Back Porch Games is going on Matt's resume. A recruiter or hiring manager will click the link once, usually on a phone or a laptop, with no players, no history, and no porch password. That click is now a product moment.

This file is the bar for that click and the order of work to reach it. Product rules stay in [product-spec.md](product-spec.md). Invariants stay in [tech-spec.md](tech-spec.md). Taste stays in [taste.md](taste.md). The Porch Golden Hour proposal is critiqued here, not replaced.

**The bar in one line:** within 10 seconds a stranger knows what this is; within 60 seconds they have seen a real scorecard work; nothing they can reach looks broken, half-themed, or placeholder.

**Status, Fri Oct 2, 2026:** S2 (first click) is draft [#59](https://github.com/mattwilliamsproduct/gamenight/pull/59), waiting on Matt's look. It ships the welcome, the sealed sample night, `/?sample=1`, monogram avatars, the link preview card, and the first-click phone fixes. What it learned is in [solutions/first-click-sample-night.md](solutions/first-click-sample-night.md).

## What a stranger sees today

Read on `main` (`c7740f8`) and live `https://cardknight.vercel.app` on Fri Oct 2, 2026. Screenshots are in the draft PRs.

| Where | What they see | Owner |
| --- | --- | --- |
| Phone first click (390×844) | An empty "Game Night Setup" form, a `0 · 0 on deck` chip, two empty dashed boxes. No games above the fold. Nothing says what the app does. | First-click slice |
| Phone landscape (844×390) | The add-player input is clipped by the Select Game card. | First-click slice |
| Tap a game on an empty book | A native browser `alert()`. The app has 25 `alert()` and 22 `confirm()` calls. | First-click slice (this one), then a dialog slice |
| Getting to a scorecard | Type at least two names, move them to the table, pick a game. Most strangers will not. | First-click slice |
| Phone portrait scorecard | Names only. Total is off-screen. The "portrait podium" in the spec is turned off in CSS. | #49 |
| Phone score entry | The roster collapses into a clipped strip. The keypad is half width. | #49 |
| Tied totals | `70` and `70` read as 1st and 2nd. | #49 |
| Link pasted into Slack, LinkedIn, or iMessage | `og:image` is a relative path, so no preview image. No `og:url`, no large Twitter card. | First-click slice |
| GitHub repo (public) | About link is `gamenight-zeta.vercel.app`, which is a 404. Description says "Game Night Scorekeeper Pro". README is four lines with no screenshot. | Matt (agents get 403), README slice |
| Production service worker | Precaches `comeback-logic.js` and omits `life-preserver-logic.js`. | #57 |
| Cold phone load | About 2.2 MB. Six game-card JPEGs are about 200 KB each, drawn at thumbnail size. | Image slice |
| Type | Six families in play: Bree Serif, Londrina Solid, Pacifico, Nunito Sans, Plus Jakarta Sans, Score Sign. | Type slice |
| Avatars | The picker and fixtures are film, Disney, Marvel, and Nintendo characters. Fine for the porch. A risk as the public face of the demo. | Matt |
| Open PRs | #44 (Porch Club) and #37 are open as ready-for-review even though neither may ship. | Matt |

What already clears the bar: the iPad landscape scorecard. Hierarchy is clear, totals are big, misses read at a glance, View Pace is a real feature. That is the hero shot. The post-game path replay is the second one.

## First-click recruiter path

This is the path the showcase is judged on. Every step must pass the phone check below.

1. **Land.** Home explains itself in one sentence, shows the six games, and offers one obvious action. No empty dashed boxes on a first visit.
2. **Try it.** One tap on **Try a sample night** opens a Wizard match already in progress at a believable table. Nothing is typed. Nothing is saved. A slim bar says so and offers Exit.
3. **Look around.** From the sample, Records, Hall of Fame, Profiles, View Pace, the Life Preserver, and the path replay all have real content.
4. **Play one round.** Log Bids → keypad → Log Tricks → the totals move by exactly the number entered (ROW-ADDS).
5. **Leave.** Exit returns to the untouched first-visit Home. A refresh does the same.
6. **Share.** The link unfurls with a real image and a one-line description.
7. **Peek at the code.** The repo About link works, the README shows the product and explains the architecture, and CI is green.

A deep link (`/?sample=1`) drops straight into step 2. That is the link for the resume.

## Visual and interaction bar

Prefer:

- One filled primary action per view. Everything else is outline or text. (Golden Hour section E, kept.)
- Three type families at most: display, player names, UI. Today there are six.
- 44×44 minimum targets. Full-width primary on phones.
- In-app sheets and toasts instead of `alert()` / `confirm()`. A native dialog is the most "side project" thing a stranger can hit.
- Empty states that teach the next step, not "X is empty".
- Press feedback that is small and honest (`scale(0.98)`, 120 ms). No bounce, no glow.
- New components consume tokens (`var(--ink)`, `.btn-primary`), never hex, so the token swap repaints them for free.
- Monogram avatars that look designed. The old fallback was a gray square with a gray letter.

Kill:

- Any screen that mixes two themes. #44 today shows dark chrome around a mint and teal scorecard, and beach-daylight posters on a night shelf.
- Any orphan layer. #44 shows "RELEASE TO DELETE" bleeding through every On Deck chip.
- Truncated names, clipped menus, a keypad over a row, Total off-screen, at any of the four sizes.
- Visible debug or placeholder (a "Perf" button, "Development only", a gray initial square, `0 · 0` with no label).
- Copy that disagrees with the screen.
- A control in the sample path that does nothing or dead-ends.

If a screen cannot meet the bar inside the window, take it off the sample path instead of showing it half done. Rook and Hand and Foot stay off the sample path for now.

## Logic and architecture must-haves

A hiring manager who opens the repo will judge the code. A stranger who plays one round will judge the math. Both have to hold.

1. **The worker matches the page (#57).** Production is wrong today. Merge first.
2. **SHARED-PLACE, LP-VISIBLE, merge (#49).** The sample shows a Life Preserver and close totals. It cannot show `1, 2` for a tie or a spin the card does not explain.
3. **Escaping, one theme block, no Turbo path (#55).** Unescaped names are a red flag to any reviewer. The duplicated theme block is the reason a token swap is unsafe today.
4. **CI on pull requests (#43).** A public repo with green checks reads as professional. Add the phone showcase spec below to it.
5. **The sample is data, not a mode of the app.** `public/assets/sample-night.js` builds the night. The page loads it into memory and refuses every write while it is open: localStorage, the cloud push, and page hide. A unit test proves every sample match adds up and every Wizard score follows the formula.
6. **Do not split `index.html` in this window.** Do move CSS into its own file after #55 dedupes it, and move pure scoring into a tested module. The repo tree should show the shape the tech spec already describes.

## Prove-it gallery for phone-sized looks

The Playwright config today has iPad, laptop, and TV. It has no phone. The showcase is judged on phones.

- One `tests/visual/showcase.spec.mjs` walks the first-click path at phone portrait (390×844), phone landscape (844×390), iPad, and laptop. It runs once under the iPad WebKit project and opens its own context per size, so no new Playwright projects are needed. #59 covers first visit, Try a sample night, the scorecard, Exit, the sealed check, and the populated-book check. Bid entry, Actions, Records, Profiles, and path replay join it after #49 lands.
- Assert on every step: no horizontal overflow, the primary action is on screen, nothing escapes the viewport, no console errors, and (after #49) Total is visible.
- Assert after Exit: localStorage is byte-for-byte what it was before the sample.
- Gallery scenarios: `first-visit` (empty book) and the sample night itself.
- One contact-sheet script renders those surfaces at phone, phone landscape, iPad, and laptop into a single image for Matt's review. Baselines stay local, per the existing rule.

Nothing on the path is called ready until those four sizes were opened and looked at.

## Porch Golden Hour — what to keep, change, cut

Keep: one amber CTA, nav as a quiet functional layer, sentence-case buttons, Londrina locked to player names, Nunito for chrome, retire coral plus sky as a second and third accent, retire palms and waves, the disabled and press specs.

Change:

1. **Ship the light variant first** (cream paper plus amber, current illustrations), not night teak. The six game illustrations and the background are beach daylight. Night chrome around them looks like two products, and #44 already shows that. Night needs new art for six games plus the backdrop. That is its own slice, later.
2. **Sequence the token swap after #55.** Today the theme exists twice and the copies differ in about 160 places. A swap on top of that is a third coat of paint.
3. **Fraunces only if two families leave.** Adding Fraunces without dropping Bree Serif and Pacifico makes seven families. Proposed set: Fraunces (display), Londrina Solid (names), Nunito Sans (everything else).
4. **Retire the beach copy in the same slice as the palette.** "Cabana Crew", "Head Back to Shore", and "Low Tide" under a porch palette is a half-baked screen.
5. **#44 does not ship.** Close it, or cut it down to tokens only after #55. It fails two kill criteria today.

Cut from the window: the poster shelf rework, night teak, Turbo anything, cloud revision (needs a named ticket), Closest Finish To 66 stays a separate T7.

## Slice order for the next 1–3 weeks

Each slice is one draft PR with its own prove-it. Nothing undrafts without Matt.

### Week 1 — correct and first click (no taste calls)

| # | Slice | Why now |
| --- | --- | --- |
| S0 | Matt-only hygiene: GitHub About link to `cardknight.vercel.app`, repo description, mark #44 and #37 draft or close them, pick demo names and avatars. | Agents get 403. Five minutes. |
| S1 | Merge #57 (worker). | Production is wrong today. |
| S2 | **First click**, draft [#59](https://github.com/mattwilliamsproduct/gamenight/pull/59): welcome Home, sample night, monogram avatars, link preview, no native alert on an empty-book game tap. Merge after #49. | The path is judged here. Additive, so it barely conflicts. |
| S3 | Matt's click on #49, then merge. | Phone scorecard, phone score entry, ties, Life Preserver on the card. |
| S4 | Rebase #55 onto #49, then merge. | Escaping, one theme block, no Turbo path. Unblocks every visual slice. |
| S5 | Rebase #43 (CI) and add the phone showcase spec. | Locks the path. |

### Week 2 — the look

| # | Slice |
| --- | --- |
| S6 | Golden Hour light token swap on the single theme block: palette, primary and secondary buttons, nav, chips, inputs, focus rings. Beach copy retires in the same PR. Before and after contact sheet at four sizes. |
| S7 | Type to three families. Fraunces in, Bree Serif and Pacifico out. NAME-FIT tests stay green. |
| S8 | Native `alert()` / `confirm()` to in-app sheets, starting with the ones on the sample path (Save & End, Scratch Match, Undo). |
| S9 | Image weight: WebP game thumbs at their drawn size, lazy below the fold. Target under 1 MB on a cold phone load. |
| S10 | README as the front door: one hero screenshot, what and why, how a round flows, architecture, how it is tested, how to run it. Refresh the social card from the new look. |

### Week 3 — depth a reviewer notices

| # | Slice |
| --- | --- |
| S11 | Move CSS to `public/assets/app.css`. Pixel-identical snapshots are the proof. |
| S12 | Pure scoring module (`calculateWizardScore`, 818, Rook) with node tests, beside `life-preserver-logic.js`. |
| S13 | Phone portrait scorecard as a designed compact view (place, name, total, last hand) instead of a trimmed table. |
| S14 | Records, Hall of Fame, and Profiles density and copy pass. |

Deferred: night teak and new art, Hand and Foot on the shelf (#48 still has open rules questions), Rook polish, cloud revision.

## Must be perfect before any "ready" claim

- `npm run check` green, plus the phone showcase spec green, pasted into the PR.
- The first-click path opened and looked at on phone portrait, phone landscape, iPad landscape, and laptop, with screenshots in the PR.
- No console errors on first load or anywhere on the sample path.
- After the sample, localStorage is unchanged and no cloud request was sent.
- ROW-ADDS, SHARED-PLACE, and LP-VISIBLE hold on every screen the sample reaches.
- No native dialog on the sample path. Still open after #59: Save & End and Undo use `confirm()`, and the sample's import and porch-cloud blocks in Settings use `alert()`. S8 moves them all at once.
- The link preview renders in a real unfurl (Slack or iMessage), not only in a validator.
- The repo About link and README match what the link shows.

## Questions for Matt

1. **Sample night as the first-visit default.** OK for **Try a sample night** to be the primary button on an empty book, with `/?sample=1` as the resume link?
2. **Demo table.** Fictional names with monogram avatars (the draft default), or the real porch crew and their character avatars?
3. **Light first.** Ship Golden Hour light (cream plus amber) in the resume window and hold night teak until there is new art?
4. **Domain.** `cardknight` reads as an old project name on a resume. Buy a short domain or add a `backporch` Vercel alias?
5. **README.** OK to rewrite the README as the project's front door with screenshots and an architecture section?
6. **Type.** Fraunces in, Bree Serif and Pacifico out?
7. **Zoom.** The viewport disables pinch zoom (`user-scalable=no`) for the porch iPad. Accessibility reviewers flag it. Keep, or allow zoom and rely on `touch-action: manipulation`?
8. **Hand and Foot.** On the shelf for the resume window, or held until #48's rules questions are answered?
