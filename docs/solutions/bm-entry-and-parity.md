# Entry parity, with one keypad exception

`bffd216` put the porch tools back so this branch matched the scoring behavior that was already in use: Canasta's five fields, Flip 7 at 200, View Pace, delete night, the minus key, and a `00` key.

The `00` key is the exception. Matt's Nov 12, 4:12 PM ET keypad spec removed `00` from score entry. That decision overrides the parity restore. Score pads use Skip in that slot. Five Crowns and Beat the Heat also hide minus, because those games do not allow a negative score. Flip 7 keeps minus.

Bid and trick pads still show their previous keys, including `00`. The keypad spec covers score entry. The round-correction pad's `00` key is a different control and stays.

Do not put `00` back on a score pad to match `bffd216`.
