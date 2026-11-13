# Live places, Leave, and Records

The live Canasta scoreboard asks for places by the team key (`Ann & Bo`), not by each member. `canastaTeamPlaces` stamps that key. Member-only callers still get member places. A missing key paints `0th`.

Flip 7 Leave uses the seated 200 rule through `leaveFinishState`. A seated total at or above 200 is finished and skips the count question. A played game under 200 asks, and the copy says it ended before 200. `completionFromSavedRules` stays null for a Flip 7 night with no stored target, so History review off does not finish that night. Rook Leave still uses only the saved target.

Biggest single-game comeback is the ordinary round history: last at halfway, then won. It is not Turbo and it does not load `comeback-logic.js`. Comeback Extra stays off. The records-book fixture includes a legal 15-round Wizard, so Records shows Cleo · 100 · Last at halfway, won Wizard.

A Hall of Fame tie names every holder when the row is not the phone compact layout. Three names at 1024 read `Ada, Cleo, and Bea`. The compact phone line still uses `+ 1 more`.

Editing an older Canasta total writes `breakdownCleared` on the column and each member. The title says the old parts no longer apply. Do not leave a breakdown that no longer adds up to the total.

The shelf name is Canasta. The saved id stays `Hand and Foot`.

Canasta is 4 rounds (Matt, 7:13 PM ET, amendment 11). A legacy night with 4 unambiguous saved rounds is complete, and a game finished in the app is finished. A legacy night with fewer than 4 rounds, or with an ambiguous row, stays needs review. A stored finished flag does not finish a short legacy night. The user-facing wheel name is Back Porch Wheel, from `BACK_PORCH_WHEEL`.
