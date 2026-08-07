# Changelog
All notable user-facing changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased
### Changed
- The mosaic is now a picture that tells you something. Instead of one abstract stained-glass window, it is five stacked scenes — a cat guarding a doorway, a scribe being taught to write, dawn light landing in a temple hall, the green king with barley growing out of him, and a heart weighed against a feather — with Anubis standing over all five. Each scene belongs to one difficulty, and it fills in left to right as you play that difficulty, the way an Egyptian wall is read.
- Mosaic pieces now come from the difficulty they belong to: starter glass is found on starter paths, wizard glass on wizard paths. A register fills as you work through its own difficulty, so a finished scene is the record of that tier rather than of your total piece count. Pieces you have already collected reset once with this change, since the world's loot was reshuffled to place them.
- A finished scene lights up. Once every piece of one register is in place, daylight comes through it — brightest in the middle of the panel, fading out towards the leading, breathing slowly. The lead lines stay dark, so it reads as light from behind the glass rather than a glow painted on top.
- Deep colours in the window are collectible again. Saturated lapis and oxblood cells used to be mistaken for leadwork, which meant nearly half the picture was simply visible from the start and could never be earned.
- Fez greets a shop as his own stall ("Ah, my stall! Let me lay out what I've picked up along the way.") instead of as a customer who happens to be carrying coin. The second line already had him selling you supplies and buying what you carry, so the two lines now agree on whose stall it is.
- The small finds you sell at the stall are "trinkets" now, not "junk" — in Fez's offer, in the stall's sell section, and in the Collection category. Fez is paying you for these things; he shouldn't be calling them rubbish in the same breath.

## 0.31.5 - 2026-08-02
### Changed
- A treasure location you haven't unlocked yet now says the same thing its map pieces do: a hint at where the map leads ("The scrap sketches a market road and a cellar door — a trader's hiding place, nothing grander") and the same part-gathered scroll you see when you find a piece. It also keeps the tomb's name back until the map is whole, which is the moment you can actually go there — previously the name appeared as soon as you held a single piece, spoiling what the map pieces themselves were being coy about. The separate progress bar and "25% collected" line are gone; the scroll and the "1/4" say it.

## 0.31.4 - 2026-08-02
### Changed
- A map piece now tells you something about the map it belongs to. Instead of the same "a shame it's nowhere near complete" line every time, the popup hints at where that particular map leads — a trader's cellar, a temple precinct, somewhere no mortal put there — and shows how much of it you've gathered ("2 of 3 map pieces gathered"). The tomb keeps its name to itself until the map is whole; the last piece names it outright, which is also the moment you can go there.
- The progress line on a hieroglyph fragment ("2 of 3 fragments found") now sits on its own line instead of being squashed onto the end of the description.
- Partly-collected things now show only the part you actually have, filling in clockwise as you find more, instead of being covered up: a hieroglyph tile at 2 of 3 is two thirds of a stone with a faint ghost of the rest, and a map piece is a fragment of scroll inside the dashed outline of the finished map. You can read how far along you are off the icon alone. Previously a hieroglyph tile filled in left to right, and a map piece showed no progress at all.

### Fixed
- Finding a single coin says "1 coin" rather than "1 coins".
- Tomb tiles on the journey list no longer show a chamber count. It was left over from an earlier design where a tomb was several separate sites, and had stopped matching what a tomb actually is.
- Four tombs showed an internal name to the player — the second expert tomb read as "expert_treasure_tomb_b.name" on the journey list. The Inner Sanctum, the Hall of Osiris, the Realm of Cosmic Forces and the Throne of Eternity are now named and described in both English and Dutch.

## 0.31.3 - 2026-08-02
### Changed
- Trapped corridors are twice as long — every one of them, in every difficulty. Where a trapped passage used to ask one or two questions before its payoff, it now asks two to four.
- Trap timers are shorter, and every difficulty is timed now. Expert drops from 12 seconds to 8, master from 9 to 6, wizard from 6 to 4. Starter and junior traps were previously untimed and now use expert's 8 seconds — their sums are the smallest in the game, and all their trapped passages are hidden ones you have to go looking for. Trap insight still adds a second per stack, and now does so at every difficulty.
- Fewer supplies scattered through the world — bandages, oil and trap tools all drop by about 40%. Combined with the longer, faster corridors, a trapped passage is meant to be a decision rather than a formality.

### Fixed
- Trap supplies now actually reach the later difficulties. They were supposed to be spread evenly across the world, but a flaw in how they were shared out meant **the entire master tier received none at all** — all four of its journeys, every pyramid — while most of the wizard tier went without too, and expert hoarded the lot. Supplies are now shared evenly, so every pyramid that can hold them does.

## 0.31.2 - 2026-08-01
### Fixed
- Seventeen pyramid interiors that couldn't be entered at all now open normally. Reaching one — the first expert pyramid among them — showed only "Site layout unavailable." with no way forward: its floor plan was being laid out on a grid too small to fit all of its side passages, and the game gave up trying. The affected floors sit in the expert, master and wizard tiers; they get a roomier floor plan, and a few of their side passages wander a little less than intended so everything fits. Every other interior keeps exactly the layout it had, so anything you'd already explored is untouched.

## 0.31.1 - 2026-08-01
### Fixed
- Re-entering a pyramid no longer leaves you with a board you can't play. Picking an earlier pyramid off the journey map could slide the real board off to the side and leave a look-alike sitting in the middle of the screen — one that ignored every tap, since it was only ever scenery. Tapping around would also send the pyramids drifting out of view. The board you picked now stays put and stays playable.
- A pyramid you'd already solved comes back empty instead of pre-filled. Its old answers were still being restored, which greyed out every square and re-ran the "level complete" celebration over a board you hadn't touched. Re-entering a pyramid means solving its board again; backing out part-way through still keeps what you'd filled in.
- Saving is no longer slowed down by re-reading your save file on every frame of every screen, which is what let the two problems above slip through in the first place, and could occasionally drop the last thing you typed into a pyramid.

## 0.31.0 - 2026-08-01
### Added
- The compass now warns you when a piece isn't yours to take yet: 🔒 for one sitting behind a ward key you don't hold or in a difficulty you haven't unlocked, 👁 for one hidden in a corridor you'd need the passageway detector to find, and ❓ where it genuinely can't tell — inside a tomb you may not be able to enter, or on sale at a merchant. A piece with nothing known in its way carries no mark. Previously the compass listed every location in the world with no hint that most of them were unreachable, which had become misleading now that hieroglyph pieces are deliberately held back behind tomb gates.

### Fixed
- The compass readout now names places instead of showing internal ids — "Papyrus Merchant's Route L2" rather than `starter_2`. It also tells you which pyramid of a journey to search: at its first level it was naming the whole journey, which can be five pyramids, instead of the one pyramid it actually knows. The supplies detector's readout is named the same way.
- The compass panel now says what it's hunting ("Looking for 𓎗"), rather than leaving you to remember which hieroglyph you picked over on the Collection screen.
- The detector buttons now sit alongside your health and coins instead of taking up a row of their own above them, and the readout panel only appears once you actually switch a detector on — so the bottom of the screen stays clear of the map while you're exploring.

## 0.30.10 - 2026-08-01
### Fixed
- Taps near the bottom of a pyramid or tomb map are no longer swallowed. An invisible strip spanning the full width of the screen behind the detector panel and the health/coins row was catching them, so rooms and corridors down there simply wouldn't respond — worst while a detector was switched on, since the panel grows taller as it lists results.
- You can now actually pick a hieroglyph to hunt with the compass. The Collection screen only let you tap hieroglyphs you'd already completed, while the "hunt this one" button only ever appeared for ones you hadn't — so the compass could never be given a target despite the screen telling you to choose one. Partially-collected hieroglyphs (the ones showing e.g. 2/3) are now tappable, which is what the hint always meant.

## 0.30.9 - 2026-07-31
### Changed
- More variety in what a ward gate can hold: pyramids now mix in bonus pockets from tiers other than their own more often, including several new tiers reaching back into each other for the first time (master previously never hosted anything but its own content). Starter-tier "merchant" moments also now reappear throughout the whole game, not just early on — a low-difficulty breather tucked into every later tier, occasionally holding an actual starter hieroglyph fragment instead of always being cosmetic.
- These cross-tier bonus pockets are now noticeably more likely to actually hold a real hieroglyph fragment for their tier, rather than falling back to a mosaic piece or plain loot.

## 0.30.8 - 2026-07-31
### Changed
- Hieroglyph fragments now stay strictly within their own difficulty — a symbol only ever turns up somewhere marked for its own tier, never mixed in with a harder or easier one. Most symbols also now require at least a little tomb descent to fully collect: a handful of early ones still turn up freely while exploring, but the rest hold back one or more of their pieces behind that tomb's own gates, so completing a hieroglyph collection is more of a hunt tied to your progress through its tomb, instead of something you can gather up entirely before ever setting foot inside.

## 0.30.7 - 2026-07-30
### Changed
- Ward gates that unlock a new difficulty tier no longer all open at once off a single key. Each tier now has 4 tier-unlock treasures instead of 1, mixed and matched across that tier's journeys, so finding more of them opens more ward-gated bonus content instead of one key instantly unlocking everything. A few of these treasures now also gate a bonus pocket much later in the game, so a key you found long ago may still have something new to open.

### Fixed
- Fixed a small number of hieroglyph fragments being placed behind a tomb's own gated staircase to its next floor, where they could never actually be picked up — permanently locking the tableau rooms that needed them. Those fragments now always appear somewhere they can be collected.

## 0.30.6 - 2026-07-29
### Fixed
- Fixed a rare bug where leaving a pyramid or tomb right as it was entered — most likely while backing out of a glitching screen — could wipe every journey's progress back to the start, keeping only your hieroglyphs. Progress is now always saved on top of what's already there, never over it.

## 0.30.5 - 2026-07-19
### Changed
- The "still something here" marker on a completed expedition's tile is now a pulsing green dot instead of a key icon, matching the pulse on the map.

### Fixed
- The map's "still something here" pulse now pulses in place on its pyramid, instead of drifting toward the corner.

## 0.30.4 - 2026-07-19
### Fixed
- Fixed a freeze/flicker that could make a pyramid impossible to finish: as the chamber with the exit was revealed, the screen flickered and the marker refused to move. Tracking "still something here" was running on every map change and feeding a render loop. It's now recorded once, when you leave the floor — no more loop.

## 0.30.3 - 2026-07-19
### Fixed
- The "still something here" marker now actually appears. A pyramid's exploration wasn't being recorded on entry (the recording ran before the journey had finished loading and never retried), so a completed expedition's tile stayed blank even when it clearly still held loot. It now records reliably and the 🔑 shows on the tile; the pyramid's node on the map also pulses as soon as you finish it.

## 0.30.2 - 2026-07-19
### Fixed
- The game no longer opens to a black screen for players who had already explored before the previous update. A completed expedition's saved exploration data from the older format was read incorrectly on load; it's now tolerated (and refreshed as you replay those pyramids).

## 0.30.1 - 2026-07-19
### Fixed
- The "still something here" marker on a completed expedition now actually catches what it should. It reads an unopened chest or puzzle as worth returning for even when you can't see what's inside, spots side branches you never entered, and lights up a ward path or tomb puzzle the moment you're holding the key or hieroglyphs it needs — where before it often stayed dark on pyramids that clearly still had loot.

## 0.30.0 - 2026-07-19
### Added
- A completed expedition now flags on the map (an emerald pulse) and on its card (a 🔑) when it still holds treasure you haven't collected — a chest you walked past, or one behind a ward door that a key you've since earned now opens. So a freshly-earned ward key points you back to exactly where it's worth returning.

### Changed
- Hieroglyph fragments now stay close to their own difficulty. Starter and junior fragments had been spilling heavily into harder pyramids, so early-game players kept finding symbols for tombs they couldn't tackle yet; fragments now land in pyramids of their own tier far more often.

### Fixed
- Loose coins now turn up from the very first tier. Early pyramids were handing out no loose money at all — the whole coin budget was landing in the late-game tiers — so every difficulty now gets its share of small change.

## 0.29.4 - 2026-07-18
### Fixed
- The entrance staircase on a tomb/pyramid floor no longer shows a "completed" checkmark and dimming — a staircase is a passage, not a puzzle to finish.
- Switching floors now places you at the new floor's entrance instantly, instead of showing your marker gliding across the map to the staircase from your position on the previous floor.

## 0.29.3 - 2026-07-18
### Changed
- The chest holding a tomb's ward key now looks the part — an ornate golden chest instead of the plain wooden one, matching how valuable the reward is.

## 0.29.2 - 2026-07-18
### Changed
- Tomb tableau puzzles now ramp up as you descend: each room down a tomb widens the numbers and brings in more operators (starting from addition), so a later room asks a genuinely harder sum rather than the same shape as the one before — including two rooms on the same floor. Starter tomb sums now range 1–6.

## 0.29.1 - 2026-07-18
### Changed
- The Collection screen now lists ward treasures first (the most valuable — ward keys and their perks), then hieroglyph fragments, then junk.
- Loot leans more toward loose coins: small change turns up more often and in slightly bigger handfuls, while fewer trap consumables are scattered around. Shop-funding junk is unchanged.
- Tomb tableau rooms are ordered so each floor asks for new hieroglyphs as you descend, instead of demanding almost every symbol on the first floor or two. You now keep finding fresh puzzles to collect for deeper in a tomb, and the shallowest floors of the late-game tombs lean on symbols from earlier difficulties — rewarding having worked through them.

## 0.29.0 - 2026-07-18
### Added
- Each tomb floor now holds several tableau puzzle rooms in sequence instead of just one, scaling with difficulty (2 in starter tombs up to 6 in the divine vaults). Every room tells its own story and puts more of the hieroglyph collection into play.

### Fixed
- A tomb tableau now requires the hieroglyphs its story is actually about — e.g. a "Fish for the Market" tableau asks for the Fish, not unrelated symbols. The story text and the required hieroglyphs had drifted apart for every tomb.

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
