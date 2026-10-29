# rc3 five-minute walkthrough

Local candidate only. Branch `cursor/rc3-candidate`. Serve the `public/` folder (or the project's usual static preview). Prefer 1024×768 landscape, then 1280×720, then phone.

1. **Home scroll (about 45s)**  
   Open Home at 1280×720 and again with larger text. Scroll: Tonight's Table, game cards, and Start all reachable. Selected game and Start should share the viewport without a clipped footer.

2. **Wizard bids (about 90s)**  
   Start Wizard with a full table. Open bid entry. Keypad reads 7 8 9 / 4 5 6 / 1 2 3 / 0 (no minus, no 00). Enter 0 for one player: header should move to "1 of N bids entered" and that seat should look like Entered 0, not empty. Fix a bad total, then accept. Helper text should stay unclipped. Header must not say "Review scores" during bids.

3. **Departed player (about 60s)**  
   From an in-progress match, mark one player left early. Active scorecard hides that row and shows "1 player left early" near the table. Tap the disclosure; names appear. Completing the match must not crown the departed player. Past night card lists them under Left early.

4. **Demo isolation (about 45s)**  
   Open `?demo=try` (or the project's Try a demo entry). Banner shows Exit demo and Reset demo above the page. Open Settings: dialog covers the banner. Passports show the 12-name sample cast. Records nav count matches the sample night list after load. Exit demo restores the prior device book.

5. **Records / Explore / Profile skim (about 60s)**  
   Past nights: one card per match under a day heading (no second date on the card). Overview uses the same card. Explore: two columns on tablet+; "Steadiest scores" instead of Variance jargon. Profile: Most played; badges read All scored / Everyone hit bid when those events exist.

Stop if any of those five fail. Shots for this candidate live under `/workspace/back-porch/rc3/shots/final/`.
