# RC4 iPad landscape review

Matt's 2026-11-08 look was iPad Safari landscape on the RC4 demo (`?demo=try`), starting from `93f3403`.

## What was wrong

- Past-night standings were `width: max-content`, so 818 scores sat in a short block and the rest of the card was empty.
- Explore records put the games column on `grid-row: 1 / -1`. That tall span opened a gap under Career leaders and above Bid accuracy.
- Home's nav was sticky at `top: 0.65rem` with a translucent blurred background and a 28px radius, so scrolling content showed through the strip above it. The nav's bottom margin was 2.5rem. Card faces were left at 132px. A trial at 168px hid Start under the demo bar, so that bump was not kept.
- The scoreboard back control said `← Table` from 761px up and sat in front of the title, so Five Crowns did not line up with the score table.
- Life Preserver printed the same status on `#wheel-player-meta` and `#wheel-why-line`, and the center hub was a second SPIN button beside Use your one spin.
- The place badge stacked the letters LP under the place number.
- Rook "Highest bid made" used the bid-count unit, so a bid of 90 read "90 bids". A single made bid read "1 made bids".
- Winner confetti used `shapeFromText` emoji bitmaps. Those bitmaps are drawn with `fillRect` of `bitmap.width * scalar`. A bad emoji measurement can paint huge opaque tiles. Chromium and desktop WebKit on this machine measured the hibiscus bitmap at 29×28 and did not paint white tiles. The shipped loop no longer uses that path.
- Score entry kept the progress chip in a wrapping flex row, and iPad widths above 1180 never got the tablet-landscape fit. Eight-player rows were capped at 52px with `flex: 0 0 auto`, so space sat under the last player.
- Home from 761px scrolled `body` inside a `position: fixed` html. That is a known first-touch failure on iOS. A later navigation reflow can make the same page scroll. Chromium and desktop WebKit both scrolled the new shell on the first wheel. A stuck first touch was not reproduced. This was not iPad Safari.

## Wheel counts

Counted on the live 40-pocket Five Crowns offer before the edit.

| | Help slices | No change | Setback slices | Help draw | No change draw | Setback draw |
| --- | --- | --- | --- | --- | --- | --- |
| Current | 32 | 5 | 3 (amounts 5 and 10) | 80% | 12% | 8% |
| Raw +70% setback slices | 32 | — | 5.1 | — | — | — |
| Applied | 32 | 3 | 5 (amounts still 5 and 10) | 80% | 7.5% | 12.5% |

5 is the modest rounding of 5.1. The two extra setback slices come from no-change, not from help. Penalty amounts are unchanged. Help stays the majority. A 24-pocket narrow wheel moves setback from 2 slices to 3.

## What fixed it

- Night standings are full width. The score sits on the right edge.
- Explore's non-game sections stack in `.s2-explore-side`. The games column no longer spans every row.
- The nav is opaque `#f6f1e7`, `top: 0`, square corners, no backdrop blur. Bottom margin is 0.85rem. Card faces stay at the existing 132px / 148px caps. Growing them on an iPad hid Start under the demo bar.
- Home is the back control at every size. From 761px the board bar is one grid row: title, then Home, Enter, Actions, Save & End. `leaveMatchToTable()` is unchanged.
- The status sentence stays on `#wheel-player-meta`. `#wheel-why-line` stays hidden. The hub is a div with no label and no click.
- The LP `::after` is gone. The button name is still Life Preserver.
- Bid amounts print as the number. One made bid is singular.
- Winner confetti uses square and circle particles in the porch colors. It does not call `shapeFromText`.
- Score-entry header is a two-column grid. Tablet landscape now includes iPad landscape up to 1400×1100 on the first frame and on the fit pass. Every tablet row uses `flex: 1 1 auto`. Six or more players keep a 44px floor. Fewer players use a 52px floor. `flex: 1 1 0` still collapses the rows.
- Home's scrollport from 761px is `.bp-app-shell` (`height: 100%`, `overflow-y: auto`). `navigateTo` resets that scroll and clears a stale modal lock.

## Do not repeat

- Do not put Home back inside the title row.
- Do not fund extra setback slices by cutting help, and do not raise the setback point amounts.
- Do not bring emoji bitmap confetti back to cover a Safari tile bug.
- Do not use `flex: 1 1 0` on iPad score-entry rows. That collapses them.
- A later successful Home scroll is not proof the first-load lock is gone.

## Emulated play, 2026-11-10

Mobile WebKit at 1194×834. This is not iPad Safari.

- Five Crowns, 11 rounds: Dee's round 1 changed from 3 to 8 and stayed 8 after reload. Final totals Ada 44, Bea 66, Cal 55, Dee 38. Dee wins. Completed, not early, not assisted. pagehide/pageshow did not add a round.
- Wizard, 15 rounds, every bid exact: Ada 1500, others 300. Ada wins. Home, then reload, kept those totals.
- 818, 15 rounds, bids 0 and one player taking every trick: 150, 150, 150, and 71. Three-way tie. Completed.
- Canasta, 4 rounds: first round 1955 and -50. Ada 2145, Bea 600.
- Beat the Heat: a 20 corrected to 5, reload kept it, then the match ended 20 to 66. Ada wins.
- Flip 7 ended early at 70 to 30. Cancel on Save & End left the match on round 3.
- Two-player Five Crowns tie. Delete and Scratch both asked first. Dismiss kept the data. Accept removed it.
- All-blank Five Crowns asked "Everyone scored 0?" Dismiss left the modal open. Accept stored zeros.
- Life Preserver: one spin wrote one bonus round. A second spin plus pagehide/pageshow left it at one. The hub is a div. The button says "USE YOUR ONE SPIN". The duplicate status line stays hidden.
- Passports after an early Five Crowns win and a finished Heat win: Ada 2 wins in 2 games, Bea 0 wins in 2 games. Same winners as history.
- Demo enter left `gn_history` on its real marker. Exit cleared the demo keys.
- Home wheel and mouse drag did not move the shell. Mobile WebKit rejects mouse.wheel. Setting scrollTop does move it. Do not call the first-touch scroll fixed.
