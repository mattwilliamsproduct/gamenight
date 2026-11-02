# Add Player suggestions joined-name

What broke: `getKnownPlayerNames()` did `[...allPlayers, Object.keys(playerProfiles||{})]`. The profile-name array was one item. `String(['Megan','Matt',...])` became `MEGAN,MATT,...` in the dropdown when someone typed `m`.

What fixed it: spread the keys (`...Object.keys(playerProfiles||{})`). Mid-game Add Player and Home quick-add both read that list. New writes reject a comma name or a non-string and show an inline message. Existing saved data is left alone.

What not to repeat: dropping an array into a name list and letting `String(array)` invent a player. If a helper builds known names from more than one source, spread each source.
