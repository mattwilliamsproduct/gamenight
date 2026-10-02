# Hand and Foot phone layout and side records

## What went wrong

A phone-width Hand and Foot score entry (390 by 844) stacked two full team rows, the selected-side card, a tall keypad, and three full-width footer buttons. The team list was given a minimum height, so the keypad was the piece that shrank. Its buttons still painted, but Cancel, Review Scores, and Submit Scores sat on top of them. A tap on minus hit Review Scores. The second team was only a sliver between the first team's fields and that footer.

The match scorecard had the same phone problem in the other direction. The shared player column keeps a wide minimum so Five Crowns names have room. Hand and Foot team names are longer (`Cy & Dee`), and that minimum pushed the Total column off the phone screen.

A separate scoring miss: merging two singles onto one name left two sides with the same key. Scoring and records walked every side, so that name could be written twice.

## What to do instead

On a phone, the Hand and Foot score panel is a fixed-height column. The header, the keypad, and a single row of footer buttons keep their height. The team list is the only region that scrolls. The active team scrolls into that list. The keypad stays above the buttons and receives the tap. The duplicate selected-side card is hidden on the phone, because the team row already shows who is selected and the header already shows the meld.

On the phone scorecard, the Hand and Foot player column is capped as a share of the screen, round columns stay narrow, and Total stays in the table width. Names still use the shared rank, avatar, and name treatment, and they shrink inside the column before they touch Total.

Side keys are unique. `scoringKeys` and a rename that lands on an existing key keep one side, so a merged player is one record.

The phone scorecard had a second miss. The shared trimmer hides round columns when the player column and the total leave less than 32px, or when a long name still overflows that player cell. On a 390px screen that hid the only Hand and Foot round, so a score of −70 lived in the total and the round cell was gone. The hint said the round was off to the left. Hand and Foot now keeps at least one round column, and the phone player column is a share of the table so the round and the total stay in the card.

A later pass still hid round 1 once all four rounds were logged. The player column at 52% plus a 3.6rem total left each round under 32px, so the trimmer tucked R1 behind “← R1” while R2–R4 stayed. On a phone the player column is 42% and the total is 3.15rem. At 390px that leaves four round columns about 41px wide, so the trimmer does not hide one. Team names still shrink inside the player column before they touch the total, including “Dee, Eve & Fay”.

Six singles hit a different shared fit. Tables of six shrink every row so they share one list. A Hand and Foot row is a name plus four fields, so that shrink piled the fields on top of the next player and slid Cards left under the keypad. Hand and Foot rows keep their height and the list scrolls, including when the shared “many players” class is present.

The saved scorecard is a second table. Giving it the same 42% player column and a 3.15rem total was not enough. A fixed table ignores max-width, so while the trimmer measured the columns the round headers were still 1px and the leftover width poured into Total. Total measured about 130px, each round looked under 32px, and the card kept only round 4 with “← R1–R3”. The trimmer now measures Total at its max width. On a 390px phone the saved card keeps all four rounds, about 38px each, and the meld line sits inside the header.

The history title was truncating to “…” beside Scorecard and Resume, so on a phone the title sits above those buttons. The end-of-match place chart put the Everyone pill on top of the title; on a phone the pill sits above the title instead.

Hall of Fame already calculated Hand and Foot best and worst scores on the side key, and the page never printed those rows. The page now shows best score, best round, worst score, and worst round. A three-name side fits on a phone next to the number.

Score entry used to ask for card points, one bonuses lump, and cards left. The round is now canastas times the round’s canasta rate, plus red threes times the round’s red-three rate, plus the typed card points, minus a foot penalty that counts only when that side enters it. The default rates are 500 and 100. They sit on the entry header and are stored with the round. A saved round that has none of those three fields still uses card points + bonuses − cards left.

A later phone pass still failed six singles. The keypad sat in a shrink-wrapped column, so the keys were about 36 by 41 pixels and the right half of the screen was empty. The row list grew to its content height inside a parent that hid the overflow, so Next updated the count while the scroll position stayed put and the last player's fields remained under the keypad. The list is now the scrollport: the keypad is the full panel width with keys at least 44 pixels, and Next brings that player's four fields above the keypad. The six-singles setup had the same shape. Fay and the Start button sat below the fold. The header and the Back / Start row stay on screen, and the side list is what scrolls. Home, Records, Profiles, Actions, and Save & End were 42 pixels tall on that phone; those controls are at least 44. A singles scorecard also painted a dealer chip on the first name. Hand and Foot has no dealer, so that chip is not shown.
