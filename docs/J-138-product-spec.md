# J-138 — Back Porch Games product specification

**Status:** proposed MVP contract  
**Date:** 2026-09-22  
**Audience:** product, design, engineering, and porch-table testers

## Product promise

Back Porch Games is a scorekeeper for in-person game nights. Humans play the cards, make bids, resolve tricks and effects, and enter outcomes. The app keeps an accurate, readable, recoverable record of the match.

It is not an AI opponent, rules referee, online multiplayer service, or move-advice product.

## Product bar

A release is porch-ready only when it is:

- **Correct:** scoring, finishing, standings, ties, and special adjustments follow the documented game contract.
- **Glanceable:** names, places, totals, dealer, current round/hand, and entry phase are readable at table distance.
- **Fast:** the scorekeeper can enter a full table without horizontal hunting or repeated setup.
- **Forgiving:** drafts survive reload; undo and edit clearly state their scope; destructive actions require confirmation.
- **Reconcilable:** visible rounds plus labeled adjustments add up to displayed totals and saved receipts.
- **Durable:** an active match works offline after installation, resumes locally, and cannot be silently replaced by cloud sync.
- **Explainable:** unusual house rules and Life Preserver outcomes are described where they occur.

## Supported games

| Game | Winner and finish | Score entry | Variant boundary |
| --- | --- | --- | --- |
| Five Crowns | Lowest score after 11 hands, from 3 through 13 cards | Enter each player's leftover-card score | Standard score values in in-app rules |
| Wizard | Highest score after `floor(60 / starting players)` rounds | Lock bids, enter tricks; app computes exact/miss score | Match length is based on starting roster unless an explicit house-rule change is accepted |
| 818 | Highest score after 8→1→8 rounds | Lock bids, enter tricks; app adds 10 for an exact bid | Dealer may not make total bids equal available tricks |
| Flip 7 Vengeance | Highest score when the host manually finishes | Enter the table-resolved round score | App records Vengeance effects but does not resolve cards |
| Beat the Heat | Lowest score when any player reaches 66 heat | Enter heat gained each round | Current 66-point ending |
| Rook | Highest score to the configured target | Bid winner/amount, trump/called card, teams, counters | Call-your-partner Rook only; not every Rook ruleset |

Adding or changing a supported game requires scoring, finish, undo, resume, and history tests—not only a picker card and rules text.

## Golden path

1. The host selects known players or adds people to tonight's lineup.
2. The host selects a supported game and confirms any game-specific setup.
3. Starting a new game while one is active explicitly preserves or discards the current match.
4. The app snapshots roster, game configuration, match identity, and starting time.
5. Each scoring period follows the game's entry flow:
   - simple score entry for Five Crowns, Flip 7, and Beat the Heat;
   - bid lock followed by tricks for Wizard and 818;
   - bid, trump/call, teams, and counters for Rook.
6. Submission validates structural rules, records an audit entry, updates totals/standings, and saves locally.
7. The host can undo the latest scoring period or edit an earlier value. Dependent adjustments are recalculated or removed predictably.
8. Reloading at any point restores the same phase, drafts, roster, scores, and special adjustments.
9. At the natural endpoint—or explicit manual finish—the app saves exactly one match, handles tied winners, and offers a readable receipt and run-it-back.

## Standings contract

- Low-score games sort ascending; high-score games sort descending.
- Equal totals share the same competition rank: `1, 2, 3, 4, 4, 6, 6`.
- A tie for first is first place.
- Ranking is consistent on the live scorecard, history, profiles, records, explanations, and special-feature safety checks.
- Stable table order breaks display-order ties but must not change the displayed rank.

## Edit, undo, join, and retire

- Undo removes the latest scoring period and only the special adjustments owned by that period.
- Editing recomputes totals and any dependent eligibility; it must not leave stale bonuses.
- A mid-game join is a house rule. Before applying a catch-up score or changing Wizard's match length, the app explains the effect and asks for confirmation.
- Join catch-up values are labeled and excluded from records derived from played rounds.
- Retired players remain in match history but do not win, deal, bid, or receive new special adjustments.

## Life Preserver contract

Life Preserver is the one shipped comeback mechanic.

1. It is supported for Five Crowns, Wizard, 818, and Flip 7 Vengeance; not Rook or Beat the Heat.
2. It becomes available only after enough scoring periods and only when ordinary play is unlikely to recover the player's deficit.
3. The player may inspect the reason, bounds, and game-specific behavior before spinning.
4. Eligibility is checked again when the spin resolves.
5. A helpful result can improve position but must remain strictly behind first. Tying first counts as first and is prohibited.
6. Harmful and zero outcomes are valid if shown on the wheel.
7. A result is applied exactly once, visibly labeled, included in the audit trail and receipt, and excluded from ordinary-round records.
8. Used/held state survives reload and backup. Undo releases use only when its owning adjustment is removed.

### Terminology compatibility

- **Life Preserver** is the canonical product name.
- `hailMaryUsed`, `hailMaryBonus`, and `authorizeHailMary` are legacy implementation names, not a second customer feature.
- Existing backups using legacy fields remain readable until a versioned migration replaces them.
- Automatic **Comeback/Turbo** is not part of this MVP unless separately approved and restored to the shipped application.

## Persistence and multi-device behavior

- Local state is authoritative during an active match.
- Every active match has a stable ID and revision/update timestamp.
- Cloud writes are conditional on the last-seen server revision.
- Divergent active matches are never automatically merged or overwritten.
- On conflict, the host can keep this device, use cloud, or export both.
- Profile-only, lineup-only, history-only, and active-match-only changes all synchronize.
- Manual backup export/import is versioned and preserves a live local match unless the host explicitly chooses replacement.

## Accessibility and table ergonomics

- All primary flows work by touch and keyboard.
- Controls expose meaningful accessible names and state.
- Supported player counts fit without clipping at supported iPad, laptop, and 1080p-TV layouts.
- Text-size controls cannot make names, totals, primary actions, or entry rows unusable.
- Animations, sound, haptics, wake lock, charts, confetti, and screenshot export are enhancements; scoring remains usable when they fail.

## Non-goals

- AI players, automated card play, strategy, or move recommendations.
- Real-time multi-device co-editing.
- Accounts, public profiles, matchmaking, or social feeds.
- A universal engine for every house variant.
- New games before existing scoring families pass the release gate.
- Visual redesign as a substitute for correctness.
- Changing Life Preserver from unpublished anecdotal feedback.

## Release acceptance

- A clean build and required checks pass.
- One complete match per scoring family is covered: simple entry, bid/trick, and Rook.
- Reload/resume, edit, undo, finish, tie, and backup are covered.
- Generated offline assets match the scripts loaded by the app.
- Two simulated clients cannot silently overwrite divergent active matches.
- Michelle and other long names fit the supported Five Crowns layouts.
- Life Preserver state and displayed adjustments reconcile across live scorecard, history, receipt, backup, and undo.

