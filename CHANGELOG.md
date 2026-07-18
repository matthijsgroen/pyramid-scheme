# Changelog
All notable user-facing changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 0.28.3 - 2026-07-18
### Fixed
- The short story is shown again above a tomb tableau — it had gone blank.
- You can now travel back down a staircase to a previous floor. Clicking a staircase you'd already used (including the one you arrive on) did nothing instead of taking you back.

## 0.28.2 - 2026-07-18
### Changed
- Removed the length indicator from journey and tomb cards.

### Fixed
- Re-entering a completed tomb from the travel screen now works — clicking its revisit card used to end the journey instead of taking you back in. The tomb's card also now reads "Revisit — re-enter the tomb" instead of "pick a pyramid" (a tomb is a single site, not a set of pyramids).

## 0.28.1 - 2026-07-18
### Fixed
- The tier-unlock treasure now correctly reads "Unlocks {tier} expeditions" — it opens the next difficulty of expeditions, not tombs.

## 0.28.0 - 2026-07-18
### Added
- Ward gates on the pyramid/tomb interior map are now tinted by the tier of the key that opens them, so you can read a locked ward's difficulty at a glance. The gate screen also shows a short themed line about who sealed it — a merchant, a nobleman, a high priest, a pharaoh, or the gods.

### Changed
- The short story on a tomb tableau is now fully readable from the start, instead of unscrambling letter by letter as you solve the puzzle.

### Fixed
- Claiming a tomb ward key now shows the actual treasure you found — its name and icon — instead of a generic "tomb key".

## 0.27.5 - 2026-07-17
### Fixed
- A tomb tableau could ask for a hieroglyph whose fragments were impossible to collect, leaving the tomb unfinishable. Tableaus now always ask for the hieroglyphs each floor was built around, and every required hieroglyph is reachable — so a tomb can always be completed.
- Pyramid corridors sometimes looked like they carried on past the exit, but that stretch was unreachable (stepping onto the exit leaves the pyramid). The exit now sits at the true end of the corridor.

## 0.27.4 - 2026-07-17
### Changed
- Reworded the popup shown when you find a map piece or a mosaic tile — less about game mechanics, more in-world flavor.

## 0.27.3 - 2026-07-17
### Fixed
- Opening a chest that held a mosaic tile crashed the game to a black screen. The reward popup now shows correctly.

## 0.27.2 - 2026-07-17
### Changed
- A hieroglyph you've collected can now solve every tomb tableau that needs it, and is never used up — tableaus no longer consume your hieroglyphs or ask you to stockpile copies of each. The tableau screen now shows which hieroglyphs you already have and your fragment progress on the ones you're still collecting.

### Fixed
- Mosaic tiles now turn up on reachable paths in the early (starter and junior) journeys. Previously every early mosaic was tucked behind a hidden passage you couldn't open until the corridor detector arrived much later, so the opening run had none to find.

## 0.27.1 - 2026-07-17
### Changed
- Revisiting a completed journey now opens its map so you can pick which pyramid to explore, instead of dropping you straight into the first one. Each re-entry replays the pyramid's exterior puzzle, and finishing or leaving a pyramid returns you to the map to pick another.

## 0.27.0 - 2026-07-17
### Added
- Solving a puzzle sometimes rewards a few coins or a healing supply, on top of its usual progress.
- Ancient trinkets and curios can now be found scattered through pyramids.
- Tomb treasures now grant permanent perks — more health, sturdier armor, a bigger carrying capacity, steadier hands at traps, and upgrades to the detectors below.
- Detectors can be leveled up. The compass homes in on hieroglyph fragments and the supply sensor on trap gear, each pointing more precisely as it improves; a new corridor detector reveals nearby hidden passages — first as a proximity hint, then pinned on the floor and travel maps.
- Hidden passages can now hold optional bonus loot, found with the corridor detector or by stumbling onto them.
- Fez shops now stock progression pieces you can buy (such as map pieces), alongside consumables.
- Before attempting a trap you can choose to heal first; attempting one always launches the encounter now.
- The Collection screen shows how many of each trinket you're holding, and keeps a category hidden until you've found your first piece from it.

### Changed
- The opening journey's first three pyramids now branch out to ward-gated bonus floors, each holding a hidden path with a puzzle or trap to find, with difficulty stepping up pyramid by pyramid.
- Master pyramids now have two ward-gated bonus floors to explore; wizard pyramids have three, plus a two-floor main path.
- Some pyramids now use a single key to open several locked doors instead of one each, more common at higher difficulties (wizard pyramids vary how many keys are in play from one pyramid to the next).
- Some pyramids at higher difficulties now have extra winding corridors or a larger, more sprawling layout.
- Expert, master, and wizard treasure tombs also now sometimes have extra winding corridors or a larger, more sprawling layout, matching their tier's pyramids.
- Every pyramid now has at least one hidden path holding a puzzle or a trap to find.
- Leaving a pyramid or tomb through any exit now finishes that site and continues your journey; deeper floors you skipped stay open to revisit later.

### Removed
- Chests scattered along pyramid paths are gone — the supplies they held are now rewarded for solving puzzles instead.

### Fixed
- Turning tutorials off now survives clearing your game data — the intro no longer replays after a reset.
- A gated area (one requiring a floor key or ward key) could occasionally generate with an unintended shortcut around its own gate, letting it be reached without the key it should have required.
- A hidden, trapped area could occasionally generate with a way to reach its reward without passing through the trap.
- Some treasure rooms at the end of a path could generate empty; every treasure room now holds something (a currency, a mosaic tile, or a little loot).

## 0.26.4 - 2026-07-05
### Changed
- Puzzles, chests, and a floor's main treasure room are now spread out along the whole path from entrance to exit, instead of being packed near the entrance with a long empty corridor afterward.

## 0.26.3 - 2026-07-05
### Changed
- The journey list only shows a checkmark for completed expeditions now, without the "completed N times" count.

### Fixed
- The journey list's map-piece indicator now lights up again when you've found a pyramid's map piece.

## 0.26.2 - 2026-07-05
### Changed
- The pyramid/tomb interior map is scaled back down to its previous size — the narrow-screen squish fix left it rendering at full zoomed-in size everywhere, which was too large.

## 0.26.1 - 2026-07-05
### Fixed
- Fix the pyramid/tomb interior map rendering squished on narrow screens — the map now always renders at full size and scrolls in both directions instead of shrinking to fit the width while staying full height.

## 0.26.0 - 2026-07-05
### Added
- A "Disable tutorials" toggle in Settings, for skipping Fez's guidance popups. Explicit replays (like the tomb's "?" button) still work even with tutorials disabled.

### Changed
- The pyramid/tomb interior map is zoomed in twice as far as the previous pass.

## 0.25.3 - 2026-07-05
### Changed
- The pyramid/tomb interior map is more zoomed in — corridors, rooms, and icons are all noticeably bigger.

### Fixed
- Fix the explorer dot cutting through unexplored corridors when a floor has a genuine loop and you tap a destination reachable by more than one route.

## 0.25.2 - 2026-07-05
### Changed
- Side paths now branch off throughout the main path instead of all bunching up after its last puzzle room.

## 0.25.1 - 2026-07-04
### Changed
- Room icons on the pyramid/tomb interior map are larger and easier to make out on mobile.
- A long corridor's click target now sits right next to you instead of at its far end, so you don't need to scroll to walk into it. It's now shown as a direction arrow rather than a plain dot, and only appears once the explorer dot actually settles there.

### Fixed
- Fix the explorer dot rendering off-center and small inside pyramid/tomb interiors.
- Unexplored (fogged) rooms no longer render at all, instead of showing faintly.
- Adjacent junction rooms now visually merge into one open space instead of showing a wall between them.
- Fix a hidden passage's detector-stop message never appearing when the passage was more than one step past its junction.
- Fix walls shifting near an unrelated junction whenever a hidden room's progression changed (being revealed, then later completed).
- Fix the explorer dot skipping its travel animation and snapping instantly on the very first move of a session.

## 0.25.0 - 2026-07-04
### Added
- A "Clear game data" option in Settings, for resetting your save without needing to clear app/browser storage manually.
- Some interior rooms now display decorative dungeon details, such as statues or sarcophagi.

### Changed
- Junctions, treasure rooms, staircases, and exits inside pyramid and tomb interiors now appear as larger, uniquely shaped rooms instead of uniform single tiles.
- The corridor leading up to a locked gate now blends into the neighboring room instead of showing as a separate passage tile.
- Interior corridors wind more naturally, with occasional wider junctions where several paths meet.

### Fixed
- Fix the "pack is full" chest marker sometimes showing up on puzzle rooms instead of the chest it belonged to.

## 0.24.2 - 2026-07-03
### Fixed
- Fix corridor corners in pyramid interiors being hard to tap on mobile.
- Fix a completed pyramid's interior showing different corridors explored than when you left it, after revisiting it.

## 0.24.1 - 2026-07-03
### Fixed
- Fix the back button, floor indicator, and health display inside pyramids and tombs being hidden behind the notch or home indicator on installed devices.
- Fix the interior map opening in the top-left corner instead of centered on screen.
- Fix the level-completion animation replaying over the interior map when returning to a pyramid you were already exploring.
- Fix fully completed pyramids always opening on the "Expedition Completed" screen, blocking revisits to their interiors.
- Fix chests with a consumable item becoming permanently unavailable when your pack was full; they can now be revisited once you have room, and you're told your pack is full instead of silently missing the item. An unlooted chest is now marked differently on the map so it stands out from ones you've fully cleared.
- Fix the fragment-count badge staying on a hieroglyph in the collection screen after it's fully completed.

## 0.24.0 - 2026-07-03
### Added
- **Pyramid interiors** — after solving a pyramid level you now enter the pyramid itself: navigate room by room on a map, open chests along the way, and find your way to the exit.
- **Explorer dot** — a glowing dot shows your movement as you travel through the pyramid interior.
- **Hidden passages** — some corridors and side rooms are concealed behind walls; step close enough to reveal them.
- **Multi-floor pyramids** — deeper pyramids have multiple floors connected by staircases; descend to find richer rewards.
- **Revisit any level** — tap a completed level on the journey path to go back inside and explore it again.
- **Chest rewards** — chests are scattered throughout pyramid interiors; open them for items and fragments.
- **Hieroglyph fragments** — rare items hidden inside pyramids; collect enough pieces of a hieroglyph to complete it.
- **Health system** — you have health points that can be lost to traps; your health carries between rooms.
- **Trap rooms** — some rooms contain traps marked with a skull; you need enough health to enter and must solve a quick arithmetic challenge to escape.
- **Consumable items** — find bandages, oil flasks, and trap tools in chests; use them to restore health, light dark passages, or disarm traps.
- **Consumable detector** — a compass-like tool that shows where you left chests unopened because your inventory was full.
- **Hieroglyph compass** — a tool that pinpoints which pyramid levels still contain pieces of a specific hieroglyph you are chasing.
- **Tomb treasure perks** — completing a treasure tomb run unlocks a permanent power-up that carries into future runs.
- **Ward key gates** — locked gates inside tombs that open when you have completed enough of the tomb to earn the matching key.
- **Color-coded floor-key gates** — keys and the sealed doors they open share the same color so you can match them at a glance.
- **Tomb interiors as explorable maps** — treasure tomb floors are now navigated as full site maps, just like pyramids.
- **Mosaic unlock** — the world mosaic fills in piece by piece as you play through pyramid levels; each completed level reveals more of the picture.
- **Stained-glass mosaic artwork** — the mosaic uses a layered stained-glass visual that reveals from the outside in.
- **Iris transition** — a circular wipe animation plays when you complete a level and when you exit an interior.
- **Puzzle completion animation** — a brief overlay celebrates solving a puzzle before the game moves on.

### Changed
- The pyramid map now scrolls to keep the explorer dot centered as you move, so you can always see what is ahead without manually scrolling.
- Completed rooms and corridors are now tappable again, letting you move back to any room you have already visited.
- Expeditions no longer award inventory items directly on completion; items are found inside the pyramid during exploration instead.
- The alpha notice banner has been updated to explain this is a full redesign of the game being tested from scratch.

## 0.23.6 - 2025-01-01
