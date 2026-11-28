# Full-flow walk (Nov 13)

The walk was Home, start Five Crowns, two rounds with large scores, correct a score, reload, finish, and Records. It ran at 1024, 1180, 1440, and 390 with a long name and the bigger text setting. Five screens were wrong. Two of them were pre-existing on 88f690d.

- The unusual-score prompt (Five Crowns 200+, Wizard 150+, and so on) wrote its buttons into `#score-entry-error` without `.is-on`. The element stayed `display:none`, so Submit looked dead. The prompt now shows whenever it holds `#unusual-score-use`.
- `score-entry-reviewing` stayed on the modal after Submit. On the next round at 1440 the keypad stayed hidden, and tapping a row did not bring it back, because the new state was not reviewing. The entry now syncs the class to the state when it opens.
- The ledger `.font-display` ink rule turned the WHAMMY Respect label dark on a dark button.
- The shared 92vh modal height stretched the victory and low-tide cards. Post-game cards hug their content.
- Long single words split mid-word. Score entry shrinks a name by its longest word (`--fit-em`, about 0.6em per letter) to the row width, capped at `--se-fit-name`. Tonight's table shrinks a seat name the same way (0.56em per letter) to the seat width.

Do not repeat: a status line that sits on the felt needs the paper color, not `--s2-muted`. Check any new modal against the 92vh panel rule. Test review-state classes across two rounds, not one.
