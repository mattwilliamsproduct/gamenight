# Player photo save

What broke: in the demo, choosing Donkey stored `donkey.png`, then the sample set that portrait to invisible and removed the passport image's src because the passport img had no fallback. The file itself loads. There was no photo upload, so a large iPad picture could not be shrunk before a save, and a failed write had no message.

What fixed it: `public/assets/avatar-photo.js` draws the upload to a canvas, longest edge 512, and stores a JPEG data URL. The same path runs for demo (`bpg_demo_profiles`) and real games (`gn_profiles`). If decode or `localStorage` fails, the previous avatar stays and the picker says the current picture stayed. `blob:` and other unreadable values are cleared on boot. The img falls back to the silhouette instead of a broken icon. A chosen portrait is no longer hidden or wiped on each demo refresh. The sample seed still starts on silhouettes.

A real iPad photo, including HEIC, still needs Matt's check. Emulation can decode a PNG and a JPEG. It cannot stand in for the camera roll.
