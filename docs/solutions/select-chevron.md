# One inset chevron on every select

Matt's note (5:37 PM ET): the Explore records Game and Player chevrons sat on the button edge.

Every `<select>` uses `bp-select`. The only arrow rule is `select.bp-select` in `public/index.html`: `appearance: none`, one SVG chevron, `background-position: right 14px center`, and `padding-right: 36px` (14px chevron + 14px inset + 8px gap). Text that still does not fit ends in an ellipsis. Do not add a per-screen `::after` arrow or a native appearance. Settings has no select. Its text size is a pair of buttons.
