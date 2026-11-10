# Late-join start

Matt, 2026-11-10 (t3493u), on the fast-follow branch. A player who sits down mid-match starts at the ceiling of the other players' current totals. 97.5 and 97.1 both become 98. An even split stays put.

What it stores: `lateJoins[name] = { start, joinedRound }`. `recomputeTotals` adds `start` once. Missed rounds are not given zeros or a copy of the average. The card says "Did not play" until the round they joined, and the name line says `Joined R4 · start 100`.

They enter the round that is on the table, including Wizard and 818. A locked bid round goes back to bidding so the new player can bid; bids already entered stay. No bid is invented. A late joiner can win. A helpful Life Preserver still bars the win. Zero or a setback does not. The wheel odds are unchanged.

Hand and Foot still refuses the add. That card scores two sides, not a new person. Older nights that used `joinBonus` on every earlier round stay on that path.

Do not copy this join onto the MVP branch. MVP seating for the next match is Tonight's Table.
