# Recent nights podium

Home Recent nights cards show that night's top three from the saved match. Incomplete nights stay labeled Incomplete and have no podium.

## Rule

`BPGRecords.nightPodium` calls the same `sortPlayersByTotal` and `competitionPlaces` helpers as the scorecard and Records. Lowest-wins for Five Crowns and Beat the Heat. Highest-wins for 818, Wizard, Flip 7, and Rook. Ties share a place and skip the next number. Retired players stay if the match still has their name and total.

Rook has no second team-ranking function. Partners already share a stored total, so the winning pair shows as two 1sts and the other pair as two 3rds.

One badge sits on each place group, not on every face. Missing avatars use the existing fallback. Gallery id: `home-nights-podium`.

## Kill

A second ranking function, a podium on an Incomplete night, or a badge so small it reads as a speck.
