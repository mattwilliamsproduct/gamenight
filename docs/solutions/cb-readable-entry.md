# Readable score entry

What broke: The score helper was one long sentence, so at 390 it ran off the edge. The 999 note was painted to the left of the score box and covered the player's name. Commit `bffd216` had put `00` back on the score pad for parity. Matt's Nov 12, 4:12 PM ET keypad spec removed that key from score entry.

What fixed it: The helper is `Skip leaves a score blank.` The 999 note sits inside that player's score box. Score pads use Skip. Bid and trick pads still show `00`. The card edge is an inset ring on top of the cover. Home has no View all.

What not to repeat: Do not lengthen the helper until it clips at 390. Do not park the cap note on top of the name. Do not restore `00` on a score pad to match an older parity commit. Do not change tie placement in this slice.
