# Scoreboard tiles

Round scores on the live board were bare numbers on white, so a row of them blended together. A stored 0 and the current-round dash looked alike.

An entered score, including 0, gets the class `is-entered` and one tile. Ordinary rows use warm gray `#e4d6c4`. The leader row uses mint `#b7dccb`. The tile is 9px radius with a small gap, no border, and no shadow. Digits are a step darker. A blank cell stays transparent. The current-round dash stays the existing pill. A Life Preserver mark shares the tile with that round's score. Total stays the large teal number.

Do not add alternating column colors or vertical borders on top of the tiles.
