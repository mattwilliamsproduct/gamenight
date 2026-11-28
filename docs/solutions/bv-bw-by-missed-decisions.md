# Missed Nov 12 decisions

Matt had already decided these. The build still showed the old behavior.

What was wrong: Five Crowns, Flip 7, and Wizard kept a `00` key in the slot above Next. Five Crowns still showed minus even though `NON_NEGATIVE_PLAYED_GAMES` rejects a negative score. Home listed every unfinished game behind View all. Home game cards used an inset shadow under the photo, so Flip 7's white art had no edge against the cream.

What fixed it: The slot above Next is Skip on a score pad (Five Crowns, Flip 7, Beat the Heat). Skip stores a skipped seat, distinct from a never-touched blank and from a confirmed 0, then advances. After the last player it visits skipped seats, then opens score review when none remain. `0 & Next` stores a confirmed 0 on a blank score. Bid and trick pads keep their existing keys, including `00`, because the Nov 12 keypad spec covers score entry. Submit on a plain score pad names the missing players. Minus follows `playedScoreMustBeNonNegative`, so Five Crowns and Beat the Heat share the widened 0 and Flip 7 keeps minus. A 999 or 9,999 note sits beside that row. Home's banner is only the newest unfinished game. Older unfinished nights stay in Past nights, marked Unfinished, with Resume. Nothing is deleted to hide them. Each Home card draws its edge as an inset ring on top of the cover, so Flip 7's white art cannot hide it. The selected ring is thicker and `#0a5c54`. There is no Selected label.

Do not bring back `keepDoubleZero` on a score pad, a `00` score token, a minus key on Five Crowns or Beat the Heat, View all on Home, or a border that sits under the cover. The round-correction pad's own `00` key is not this keypad. Bid and trick `00` stays.
