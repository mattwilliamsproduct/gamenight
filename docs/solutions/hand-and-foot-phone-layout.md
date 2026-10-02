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
