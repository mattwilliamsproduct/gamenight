# Porch ledger phone edge and match bar

Matt, 2026-11-13, on the ledger skin at 390. The page field showed a cream strip down the right edge, and Player Passports wrapped in the match bar. Draft PR #90 only. Do not port this into #86.

## What broke

`::-webkit-scrollbar` is 6px and the thumb is `--hairline` (`#e0d0bc`). On a phone, `#top-nav::before` stuck out 24px past the card, the document grew wider than the screen, and that thumb painted through the header and down the page. Below the thumb the track was clear, so the strip looked like wood or cream depending on the scroll.

The match bar gave every button the same width. At 13px, Player Passports is wider than that share, so it wrapped to two lines.

## What fixed it

On a phone, the skin hides the document scrollbar and clips the nav veil to the card, so the field color runs to the screen edge. Match-bar buttons size to their labels, stay `nowrap`, and stay at 13px. Letter-spacing is `-0.01em`. The labels are not abbreviated. Equal widths are not the rule on this skin.

Wood stays the default. `?bg=` still only swaps the page field.
