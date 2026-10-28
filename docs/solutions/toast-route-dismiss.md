# Toast leaves when the screen changes

What broke: parking Standings updated off the phone totals still left the toast on Records. `toast()` lives 3700ms and `navigateTo` did not clear the tray, so the demo’s Save & End → History walk showed “Standings updated” on frame 05.

What fixed it: `clearToasts()` empties `#toast-container`. `navigateTo` calls it after `closeNumpad`. `showHistory` already goes through `navigateTo`.

What not to repeat: do not treat a toast position fix as a route fix. A leftover toast on another screen is still a clip. Do not add the word “dealer” inside the name chip — that chip hugs the letters; the avatar `D` and “Dealer: Name” already say it. The candy-stripe 4th is Life Preserver available, not focus.
