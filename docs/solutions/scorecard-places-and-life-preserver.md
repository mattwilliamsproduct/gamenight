# Hidden hands and place ties

What broke: the scorecard hides round columns to fit the screen. A Life Preserver painted only inside that cell disappeared with the column, and on a phone the player column pushed Total off-screen too. Place ranking used strict equality, so a string total and the same number sorted as a tie and then received the next place. A name merge added only real `number` fields, so a numeric-string bid was deleted while the points were kept.

What fixed it: trimmed columns copy their Life Preserver onto Total, and a narrow window keeps that Total column on screen. `competitionPlaces` compares finite numbers. Merges add finite numbers, including numeric strings, and leave booleans such as `joinBonus` alone.

What not to repeat: do not treat `display: none` on a round column as “this hand has no bonus.” Do not use `===` for places after a numeric sort. Do not drop a field on merge just because it was stored as `"40"` instead of `40`.
