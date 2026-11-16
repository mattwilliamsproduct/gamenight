# bpg2 candidate notes: phases 3 and 4, release checks

Branch `brian/rc-bpg2`, local only. Built on the accepted Phase 2 state (2572974).
All test and screenshot data is fictional.

## Phase 3: Home and setup

| Item | What changed | Covered by |
| --- | --- | --- |
| Deck art | Every deck shows at full strength. The selected deck gets a teal rim and a check, and no deck is dimmed. | home-setup.spec |
| 818 corners | The four white corner wedges are filled with the card's purple. The art inside is unchanged. | home-setup.spec (canvas pixels) |
| Flip 7 | Rescaled from its 428x600 source (Lanczos to 700x980 plus a light unsharp mask). No design change. No higher-resolution source exists. | visual review |
| Add field (3:38) | Reproduced: the suggestion list pushed the field and Add player down while typing. The list now opens upward over the roster. | home-setup.spec |
| Focus after add | Reproduced: focus was lost after Add player at every size. The fresh field now takes focus. | home-setup.spec |
| Names as typed | Autocapitalize, autocorrect and spellcheck are off on the add, rename and mid-game fields. No code ever changed case; the iPad keyboard did. Stored names are untouched. | home-setup.spec |
| Seated vs not seated | "Seated N · In dealing order" and "Not seated N · Check names, then Add" labels. | home-setup.spec |
| Drag | The held seat follows the finger and the rows it passes slide aside. Hit testing uses positions measured when the drag starts. | home-setup.spec |
| Edit from setup | Each Home avatar is an Edit button with a visible pencil. It opens "Edit player", which reuses the Passports rename, avatar and color editors. Rename, merge, avatar and color changes refresh Home and leave Passports closed. | home-setup.spec, release-checks-bpg2-final.spec |
| Hover-only controls (8:22) | At 8:22 the recording shows the always-visible unseat ×. The hover-only control was the legacy roster's delete (`opacity-0 group-hover`), which is hidden on the slice2 Home, so a saved player could not be deleted on touch. Unseated players now have "Delete player" in Edit player, which keeps the confirm. The passport avatar's Edit cue and the Rename and Color buttons are visible 44pt targets. | home-setup.spec |
| Undo | Unseat already offers Undo (unseat-roster.spec). Delete player, history deletes and counted results keep their confirms. | existing specs |
| Copy | "Assisted" is gone from the UI. The UI now says "Wheel used", "Only games without the Wheel", "Best and worst final scores skip games that used the Back Porch Wheel", and "A counted partial result never sets a best or worst final score." | records specs |

## Phase 4: cohesive pass (bounded)

- Score entry has one primary action at a time. Next leads while entries are missing; Lock bids or Submit leads once every entry is in. Submit stays tappable, so a partial lock still asks first. (entry-primary.spec)
- "Saved on this device" shows only after a write that landed. A blocked write shows a steady warning: "Not saved yet: this device is full. Your scores are still here." The last saved copy is kept, and the automatic retry clears the warning.
- Empty Home reads as empty: "Nobody seated yet", "Add a player to start Five Crowns." / "Add at least 2 players to start Canasta.", and no "All saved players are seated" when nobody is saved. This also fixes "needs at least 1 players".
- Bree Serif and Nunito Sans 500/700/800 are preloaded. The Home layout shift was already about 0.0002 before and after.
- Deck size on large screens is already capped by the page width (264px cards at 1920). The approved grid is unchanged.
- The 8-player board was reviewed at 1180 and 1024 and needed no change beyond Phase 2.

## Release checks (tests)

- A correction holds after reload: release-checks-bpg2.spec (Phase 2).
- Double-tap never duplicates: release-checks-bpg2.spec, interrupted-entry.spec.
- Interruptions: closing the keypad mid-entry asks first, and keeping or discarding leaves committed scores intact. Reload, and Table and back, keep committed scores with no half round. (release-checks-bpg2-final.spec)
- Rename keeps one person: a fresh rename (Rafael to Rafe) and a merge into an existing name (Rafael into Bea, from the setup sheet) both keep one person with combined history in Records and Passports across a reload. Fictional stand-ins replace the brief's Richard and Brick example.
- Saved indicator and quota: nothing shows on a fresh load. A simulated QuotaExceededError shows the warning, keeps every score on screen and keeps the stored copy, and the save lands once there is room.

## Still open

- Typed but unsubmitted numbers are dropped on reload. Committed scores are safe, and closing the keypad asks first.
- Phone board: long names share one column, so every name shrinks to about 12px.
- 1024: the tricks-phase header wraps to three lines.
- The demo bar is 56px tall.
- tests/functional/unseat-roster.spec.mjs (pre-existing) uses real first names in fixtures.

## LATER (real redesign, not built)

- One identity chip across the board, bidding, Records and Passports. Today seat order colors the board, bidding and Home rows, Passports use a separate profile accent color (default teal), and Records shows no color. Unifying them needs one player-color source, which is a product decision.
- Fewer borders across Records and Passports panels (grouping by spacing).
- Keep typed-but-unsubmitted entries across a reload (a persisted draft).
- Default the selected deck to a game that fits the seated count, so Start is ready without a tap.
