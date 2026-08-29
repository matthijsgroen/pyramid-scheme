# Changelog

All notable user-facing changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- The canister puzzle teaches one idea a tier now: two pours to start, then a leftover to park and pick up
  again, then a line long enough that the two compound, then a fourth canister. One amount to measure a
  board rather than two, and it no longer turns up in the very first rooms.

### Fixed

- Tapping a full canister while holding another picks that one up, instead of quietly putting down the one
  you were holding.
- The button that claims a canister reads “this one” again, in both languages. It has been showing the name
  of a translation that was never written.
- The detector panel speaks Dutch again where it had fallen back to English: what it is looking for, and
  why a piece cannot be reached yet.
- On iPhone, a square no longer stands taller than the rest of its row: no patch of the board hangs below
  the bottom edge of a puzzle grid, and the lines of a number grid stay where they are as you fill it in.
### Added

- A new puzzle about the hours of a day: every bar lasts as long as it lasts, but when each one happens is
  yours to work out from the marks under the board — a gap of so many hours, one thing before another, two
  that never coincide, two that must.

## 0.41.0 - 2026-08-29

### Added

- A new puzzle: measure out an exact amount by pouring between canisters that do not divide evenly.
- A new puzzle: shove blocks out of the way along their own lanes until your own block can leave.
- The six tomb journeys now dress their puzzles as the tomb they are set in, and the ibis migration draws
  only water puzzles.
- Star puzzles now show above the board how many a row, column and area holds, so a one-star board and a
  two-star board are told apart while playing rather than from the goal below the board.

### Fixed

- Star and sudoku boards are drawn straight: the dividing walls sit on the grid lines, and every figure and
  mark is the same size, centred in its square.
- The way out of a blockade board is now marked beside the board instead of on its edge, so a block standing
  in the last column can no longer hide the thing you are aiming at.
- Puzzles and other encounters no longer open under the phone's status bar, so the hint button is reachable
  again.

## 0.40.0 - 2026-08-26

### Added

- Added the sudoku puzzle to the world.

### Changed

- Updated the crocodile puzzle to new standards.

### Fixed

- No two rooms in the world hand out the same puzzle any more. Rooms used to pick a board at random from
  their difficulty's supply, so the same one turned up in several rooms of a journey; each room is now
  dealt a board of its own.

## 0.39.0 - 2026-08-25

### Added

- Every puzzle now shows its name above the board, worded for the room it is in.
- A new puzzle: thread one unbroken run of numbers from cell to touching cell until the board is filled.

### Changed

- A side passage now serves the difficulty it was built for, not the floor's.
- Meeting the same board twice on a run is far less likely.
- The Great Pyramid of Giza now draws on every kind of puzzle, not only the two that trade in goods.

### Fixed

- Hieroglyphs now draw everywhere, including on devices with no hieroglyph font of their own.

## 0.38.3 - 2026-08-23

### Fixed

- The farmland star grid now draws a farmstead rather than a sheaf of grain.

## 0.38.2 - 2026-08-23

### Changed

- A solved star battle board lights its answers one at a time before the win. Less motion skips it.
- A solved sumplete board checks its own sums off before the win. Less motion skips it.
- A solved futoshiki board counts itself up to its last number before the win. Less motion skips it.
- A solved eclipse board sweeps corner to corner before the win. Less motion skips it.
- A solved balance board settles beam by beam before the win. Less motion skips it.
- The puzzle lab now offers the tomb's own two boards, the crocodile capstone and the tableau.

### Fixed

- The crocodile capstone no longer draws on top of itself, and its sums are no longer cut off at the edges.

## 0.38.1 - 2026-08-23

### Changed

- The one-star grid can wear the flood plain too, the farmland face its two-star twin wears.
- A pyramid keeps its explored corridors, found passages and opened chests when the puzzles inside it are rewritten.
- Changing how long or how winding a pyramid's corridors are now resets the floors it changed.
- A fork branch leading past a trap to something worth reaching no longer counts as a dead loss.
- Building the world now stops on any chest that would hold nothing, rather than working around it.

### Fixed

- Your explorer could turn up outside the map after an update. Such a visit now starts at the entrance.
- A tomb no longer says it has something left when what remains needs hieroglyphs you cannot read yet.

## 0.38.0 - 2026-08-23

### Added

- A new puzzle: fill a grid with suns and moons so no three ever sit in a row.
- A new puzzle: place one star in every row, column and walled-off region, no two ever touching.
- A new puzzle: the same star grid, with TWO stars to every row, column and region.
- The two-star grid is drawn as a flood plain of farmsteads on farming journeys.
- A new puzzle: join the stars with lines of light, as many at each star as its number says.
- A second kind of trap: a clock face, and four times to pick from before the countdown runs out.
- The Lighthouse of Alexandria serves light and sky puzzles on its main path, drawn against a night sky.
- The Great Pyramid of Giza serves trade puzzles: scales to balance, and the star map drawn as haul roads.
- Solving a beam puzzle sends the light down the route you found, and the shrine flares when it arrives.

### Changed

- Puzzle boards come from a list checked ahead of time, so a room stops searching when you open it.
- The game starts from a smaller download, a fifth lighter: the mosaic window's glass now arrives with the window.
- Every puzzle states its goal in one line above the how-to-play, worded for the place it is.
- The star map speaks its own place throughout — goal, rules and hints.
- Hints now say what to do as well as why, and hatch the squares they are about.
- The easiest comparison grids start with more numbers filled in, and ask for simpler reasoning.
- Every comparison-grid difficulty starts with a different number of squares filled in.
- The hardest comparison grids are 6×6 rather than 7×7, and each difficulty needs its own hardest reasoning.
- Comparison grids step up more gently: the second difficulty stays 4×4, and the grid grows a difficulty later.
- The signs between squares are drawn rather than typed, and never crowd the numbers.

### Fixed

- The stained-glass window came up black with no connection. The whole game is now playable offline.
- Finishing a puzzle made the page jump: the controls and rules dropped out from under the banner.

## 0.37.0 - 2026-08-19

### Added

- Light puzzles carry doors no tap will move: send the beam across a socket and the way clears.
- Harder light puzzles carry a mirror that slants the beam, so light can run corner to corner.
- The hardest hide a trap: a socket to keep the light away from, or stone drops in front of the beam.

### Changed

- Every light puzzle is new, and every difficulty asks for real reasoning: tapping each piece in turn no longer solves one.
- The light difficulties play differently — one leans on stone, one on sliding pieces, one on sockets and doors.
- Light puzzles show what a piece will do before you tap it, and animate the tap.
- Balance-scale puzzles start harder, and every difficulty above the easiest moved up to match.
- A solved puzzle waits for a tap instead of fading on a timer, and dims the board far less.
- Finishing a puzzle shows how long it took, counting only the time it was on screen.

### Fixed

- The light beam was drawn with gaps: squares it crossed travelling rightward were only half drawn.
- A light-puzzle hint said the beam ran into stone when a mirror had sent it back into the sun disc.

## 0.36.0 - 2026-08-17

### Added

- A light puzzle: bend the sunlight from the disc to the shrine.

## 0.35.1 - 2026-08-17

### Changed

- Comparison grids show only the signs the puzzle turns on: a starter board carries four or five, not sixteen.
- A comparison grid leans on its signs rather than pre-filled numbers, so every board teaches what a sign means.
- Wizard comparison grids ask for four harder kinds of reasoning, so they no longer solve like master ones.
- Asking for a hint moves the cursor to the square it is about, so the number pad is already aimed.
- The same number twice in a row or column turns the squares red outright, instead of a tint easy to miss.
- Writing a number no longer rubs out your notes: the ones it rules out are struck through instead.

## 0.35.0 - 2026-08-16

### Added

- A comparison puzzle: fill the grid so every row and column shows each number once, obeying the signs between squares.
- Fill a square by tapping a number, write notes with the pencil, and undo your last move.
- Writing a number in clears it from the notes of every square in its row and column.
- A repeated number, or a sign pointing the wrong way, turns red the moment you write it.
- Comparison grids turn up in pyramids and tombs from the first tier, growing from 4×4 up to 7×7.
- A balance-scale puzzle: give each glyph a weight that keeps every scale level.
- Balance scales turn up in pyramids and tombs from the first tier, alongside the number puzzles.

### Changed

- Sumplete puzzles are always solvable by reasoning; boards that would need a guess are never handed out.
- Sumplete boards grow with the tier, from 4×4 up to 7×7, and fit a phone screen without pinching.
- Each Sumplete row and column shows what it currently adds up to under its target.
- Every puzzle has a hint button explaining the next step and why it follows, a reset, and a back button.
- A puzzle left standing lights up its hint button, and a used hint takes ten seconds to recharge.
- Finishing a puzzle says whether you solved it unaided or how many hints it took.
- The rules of a puzzle sit under the board — scroll down to read them.

### Fixed

- Floor keys stay readable on any background: the key icon carries a dark halo and a see-through ring.

## 0.34.4 - 2026-08-15

### Changed

- The proximity dot beside the detector button grows as well as pulses faster, so its three bands are easier to tell apart.
- A running detector stays on when you walk into another pyramid, instead of switching itself off at every entrance.

## 0.34.3 - 2026-08-14

### Changed

- A detector keeps reading with its readout closed. The button opens and closes the readout; tapping the running detector stops it.
- A pulsing dot carries the reading while the readout is shut — slower or faster as the find gets closer.
- The dot never says more than your detector level knows: a level-1 compass reports "somewhere in this pyramid".

## 0.34.2 - 2026-08-13

### Changed

- The interior HUD takes less room: your detectors share one button, and the hearts are smaller.
- That row now wraps instead of running off the screen and pushing your coin balance out of sight.
- The passageway detector answers at every range it has reached, and says so when the answer is nothing.
- Walking moves the detector's closest reading, so it tells you a corridor is near as you come within a few steps.
- Dropped the "(L4)" tag from the readout — a code with nothing anywhere to say what it meant.
- A pyramid's tally counts only floors you have walked, so the detector never sends you behind a door you cannot open.

## 0.34.1 - 2026-08-12

### Fixed

- A tomb treasure's bonus now follows from holding the treasure, so a save that has the treasure gets the bonus.
- Retuning which treasure carries which bonus reaches saves that already hold it.

## 0.34.0 - 2026-08-11

### Added

- A locked floor door now names the coloured key it wants, and draws it.
- Finding a floor key names its colour in the loot popup instead of calling it a tomb key.
- The interior HUD carries this floor's key ring: keys in hand, plus the colours of doors still shut.

### Removed

- The interior HUD's developer cheat buttons.

## 0.33.3 - 2026-08-10

### Changed

- Wizard pyramids are less sprawling: fewer dead-end side corridors, so the tier reads as a deep descent.
- A crocodile guards every tomb treasure from the junior tomb down. Starter tombs stay crocodile-free.

### Fixed

- A tomb floor that ended in a crocodile was one tableau room short.

## 0.33.2 - 2026-08-10

### Changed

- Hieroglyph fragments spread across a tier's pyramids instead of piling into its first ones.

### Fixed

- The "X/Y needed" count on a hieroglyph in the tomb's symbols strip was stuck in English.
- A hieroglyph tile's engraved shading could show as a doubled, mismatched outline around the symbol.

## 0.33.1 - 2026-08-09

### Changed

- A hieroglyph you're still collecting shows only the fragment you have carved so far, with its count.

### Fixed

- A ward door opens onto a floor as hard as the key that opened it, not one from a tier ahead.

## 0.33.0 - 2026-08-08

### Added

- A ward door carries the sign of the treasure that opens it, the same glyph that treasure shows in the Collection.

### Changed

- A tomb treasure opens the next difficulty: hold any one of a tomb's four unlock treasures and that tier is yours.

## 0.32.1 - 2026-08-08

### Changed

- Finding a tomb treasure says what it does for you.

### Fixed

- Pinch-zooming the site map is smooth, and zooms toward your fingers instead of the middle of the screen.
- Tapping something in the Collection shows its details again.

## 0.32.0 - 2026-08-08

### Added

- The site map zooms: pinch on touch, ctrl/⌘ + scroll on desktop, between half size and five times.
- Double-tap the site map to go back to the default zoom.

### Changed

- Reaching an exit asks whether to step outside, so walking into one no longer ends the expedition.
- Taking a staircase walks you to the stairs first, and you arrive standing on the staircase.

### Fixed

- The mosaic window fits the screen whether or not you carry pieces.

## 0.31.6 - 2026-08-07

### Changed

- The mosaic is five scenes instead of one abstract window, with Anubis standing over all five.
- Each scene belongs to one difficulty and fills as you play it, and pieces drop on paths of that difficulty.
- You place pieces yourself: a "Place 4 pieces" button drops them in one at a time, lowest scene first.
- A finished scene lights up and keeps its name below the window — tap it to hear Fez on it again.
- Fez says three lines about each scene you finish, and steps back with you once all five are done.
- More of the window is collectible glass: deep lapis, oxblood, and the black shapes that read as leadwork.
- A mosaic piece you find shows its scene's own colour, so you can tell which of the five it belongs to.
- Mosaic pieces you already collected reset once, because the world's loot was reshuffled to place them.
- Fez is along for the trade, and greets his first stall as his own rather than as a customer.
- What you sell at the stall is "trinkets", not "junk" — his offer, the sell section, the Collection.
- Trinkets are worth far more, 25 for a stone one up to 125 for a divine one, so you find fewer.
- Loose coins are rarer and small change; the trinkets you sell are what pays for a stall's rarities.
- Buying everything Fez sells means gathering nearly everything the world holds.
- Loot fills treasure chests first, so a chest at the end of a side path is worth the walk.
- Every junior journey has an old working off its second pyramid, holding the plainest trinkets.

## 0.31.5 - 2026-08-02

### Changed

- A locked treasure location hints at where its map leads, and shows the same part-gathered scroll.
- A tomb's name is held back until its map is whole.
- Dropped the progress bar and "25% collected" line from locked locations.

## 0.31.4 - 2026-08-02

### Changed

- A map piece hints at where its map leads, instead of showing the same line every time.
- A map piece shows how much you have gathered; the last one names the tomb.
- A hieroglyph fragment's "2 of 3 fragments found" sits on its own line.
- Part-collected icons fill in clockwise, so you can read your progress off the icon alone.

### Fixed

- Finding a single coin says "1 coin" rather than "1 coins".
- Tomb tiles on the journey list no longer show a chamber count.
- Four tombs showed internal names on the journey list, and are now named in English and Dutch.

## 0.31.3 - 2026-08-02

### Changed

- Trapped corridors are twice as long: two to four questions before the payoff.
- Trap timers are shorter — expert 12s → 8s, master 9s → 6s, wizard 6s → 4s.
- Starter and junior traps are timed now, at 8 seconds.
- About 40% fewer bandages, oil flasks and trap tools scattered through the world.

### Fixed

- Trap supplies reach the later difficulties: master got none at all, and expert hoarded the lot.

## 0.31.2 - 2026-08-01

### Fixed

- Seventeen pyramid interiors across expert, master and wizard that showed only "Site layout unavailable." now open.

## 0.31.1 - 2026-08-01

### Fixed

- Re-entering a pyramid no longer leaves an unplayable look-alike board in the middle of the screen.
- A pyramid you had already solved comes back empty instead of pre-filled with its old answers.
- Saving no longer re-reads your save on every frame, which could drop the last thing you typed.

## 0.31.0 - 2026-08-01

### Added

- The compass marks pieces you cannot take yet: 🔒 behind a key, 👁 hidden in a corridor, ❓ when it cannot tell.

### Fixed

- The compass names places instead of internal ids — "Papyrus Merchant's Route L2" rather than `starter_2`.
- The compass points at one pyramid instead of naming a whole journey, which can be five of them.
- The compass panel says what it is hunting ("Looking for 𓎗").
- Detector buttons sit alongside your health and coins, and the readout appears only once a detector is on.

## 0.30.10 - 2026-08-01

### Fixed

- Taps near the bottom of a map are no longer swallowed by an invisible strip behind the detector panel.
- You can pick a part-collected hieroglyph to hunt with the compass, so it can finally be given a target.

## 0.30.9 - 2026-07-31

### Changed

- Ward gates hold more varied bonus pockets, mixing in tiers other than their own.
- Starter "merchant" moments turn up throughout the game as a breather, sometimes holding a real fragment.
- Cross-tier bonus pockets hold a real hieroglyph fragment far more often.

## 0.30.8 - 2026-07-31

### Changed

- Hieroglyph fragments stay strictly within their own difficulty.
- Most symbols now need some tomb descent to finish; a few early ones turn up freely.

## 0.30.7 - 2026-07-30

### Changed

- Each tier has 4 tier-unlock treasures instead of 1, so one key no longer opens all of a tier's ward-gated content.
- Some of those treasures gate a bonus pocket much later, so an old key may still have something new to open.

### Fixed

- Hieroglyph fragments are no longer placed behind a tomb's own gated staircase, where they could not be picked up.

## 0.30.6 - 2026-07-29

### Fixed

- Leaving a pyramid or tomb right as it was entered could wipe every journey's progress back to the start.

## 0.30.5 - 2026-07-19

### Changed

- The "still something here" marker on a completed expedition is a pulsing green dot, matching the map.

### Fixed

- The map's "still something here" pulse now pulses in place on its pyramid, instead of drifting to the corner.

## 0.30.4 - 2026-07-19

### Fixed

- A pyramid could become impossible to finish: revealing the chamber with the exit made the marker refuse to move.

## 0.30.3 - 2026-07-19

### Fixed

- The "still something here" marker appears at all — a completed expedition's tile stayed blank when it still held loot.

## 0.30.2 - 2026-07-19

### Fixed

- The game no longer opens to a black screen for players who had explored before the previous update.

## 0.30.1 - 2026-07-19

### Fixed

- The "still something here" marker catches unopened chests, side branches you never entered, and newly openable ward paths.

## 0.30.0 - 2026-07-19

### Added

- A completed expedition flags on the map and on its card when it still holds treasure.

### Changed

- Hieroglyph fragments land in pyramids of their own tier far more often.

### Fixed

- Loose coins turn up from the first tier, instead of the whole budget landing in late-game tiers.

## 0.29.4 - 2026-07-18

### Fixed

- The entrance staircase no longer shows a "completed" checkmark — a staircase is a passage, not a puzzle.
- Switching floors places you at the new floor's entrance instantly, instead of gliding across the map.

## 0.29.3 - 2026-07-18

### Changed

- The chest holding a tomb's ward key is an ornate golden chest instead of the plain wooden one.

## 0.29.2 - 2026-07-18

### Changed

- Tomb tableau puzzles ramp up as you descend: each room widens the numbers and adds operators.

## 0.29.1 - 2026-07-18

### Changed

- The Collection screen lists ward treasures first, then hieroglyph fragments, then trinkets.
- Loot leans more toward loose coins, with fewer trap consumables scattered around.
- Tomb tableau rooms ask for new hieroglyphs as you descend, instead of almost every symbol at once.
- The shallowest floors of late-game tombs lean on symbols from earlier difficulties.

## 0.29.0 - 2026-07-18

### Added

- Each tomb floor holds several tableau rooms in sequence — 2 in starter tombs up to 6 in the divine vaults.

### Fixed

- A tomb tableau asks for the hieroglyphs its story is about; story and requirements had drifted apart.

## 0.28.3 - 2026-07-18

### Fixed

- The short story is shown again above a tomb tableau — it had gone blank.
- You can travel back down a staircase to a previous floor.

## 0.28.2 - 2026-07-18

### Changed

- Removed the length indicator from journey and tomb cards.

### Fixed

- Re-entering a completed tomb from the travel screen works; its revisit card used to end the journey.
- A tomb's card reads "Revisit — re-enter the tomb" instead of "pick a pyramid".

## 0.28.1 - 2026-07-18

### Fixed

- The tier-unlock treasure reads "Unlocks {tier} expeditions" — it opens expeditions, not tombs.

## 0.28.0 - 2026-07-18

### Added

- Ward gates are tinted by the tier of the key that opens them, readable at a glance.
- The gate screen says who sealed it — a merchant, a nobleman, a high priest, a pharaoh, or the gods.

### Changed

- The short story on a tomb tableau is fully readable from the start, instead of unscrambling as you solve.

### Fixed

- Claiming a tomb ward key shows the treasure you found, instead of a generic "tomb key".

## 0.27.5 - 2026-07-17

### Fixed

- A tomb tableau could ask for a hieroglyph whose fragments were impossible to collect.
- The exit now sits at the true end of a pyramid corridor, instead of leaving a stretch you could never reach.

## 0.27.4 - 2026-07-17

### Changed

- Reworded the popup shown when you find a map piece or a mosaic tile, in-world rather than mechanical.

## 0.27.3 - 2026-07-17

### Fixed

- Opening a chest that held a mosaic tile crashed the game to a black screen.

## 0.27.2 - 2026-07-17

### Changed

- A collected hieroglyph solves every tableau that needs it and is never used up.
- The tableau screen shows which hieroglyphs you have, and your progress on the ones you are collecting.

### Fixed

- Mosaic tiles turn up on reachable paths in starter and junior journeys, not behind hidden passages.

## 0.27.1 - 2026-07-17

### Changed

- Revisiting a completed journey opens its map to pick a pyramid, instead of dropping you into the first.

## 0.27.0 - 2026-07-17

### Added

- Solving a puzzle sometimes rewards a few coins or a healing supply.
- Ancient trinkets and curios can be found scattered through pyramids.
- Tomb treasures grant permanent perks: more health, sturdier armor, a bigger pack, steadier hands, better detectors.
- Detectors can be levelled up, pointing more precisely as they improve.
- A corridor detector reveals nearby hidden passages, first as a hint and then pinned on the maps.
- Hidden passages can hold optional bonus loot.
- Fez shops stock progression pieces you can buy, such as map pieces, alongside consumables.
- Before attempting a trap you can choose to heal first.
- The Collection shows how many of each trinket you hold, and hides a category until you find your first.

### Changed

- The opening journey's first three pyramids branch to ward-gated bonus floors, each hiding a puzzle or trap.
- Master pyramids have two ward-gated bonus floors; wizard pyramids have three, plus a two-floor main path.
- Some pyramids use a single key for several locked doors, more often at higher difficulties.
- Higher-difficulty pyramids and tombs may have extra winding corridors or a larger, more sprawling layout.
- Every pyramid has at least one hidden path holding a puzzle or a trap.
- Leaving through any exit finishes that site; deeper floors you skipped stay open to revisit later.

### Removed

- Chests scattered along pyramid paths; the supplies they held are rewarded for solving puzzles instead.

### Fixed

- Turning tutorials off survives clearing your game data.
- A gated area could generate with a shortcut around its own gate, reachable without the key.
- A hidden, trapped area could generate with a way to its reward without passing the trap.
- Some treasure rooms could generate empty; every one now holds something.

## 0.26.4 - 2026-07-05

### Changed

- Puzzles, chests and a floor's treasure room are spread along the whole path, instead of packed near the entrance.

## 0.26.3 - 2026-07-05

### Changed

- The journey list shows a checkmark for completed expeditions, without the "completed N times" count.

### Fixed

- The journey list's map-piece indicator lights up again when you have found a pyramid's map piece.

## 0.26.2 - 2026-07-05

### Changed

- The interior map is scaled back down — the narrow-screen fix left it too large everywhere.

## 0.26.1 - 2026-07-05

### Fixed

- The interior map rendered squished on narrow screens; it now renders at full size and scrolls both ways.

## 0.26.0 - 2026-07-05

### Added

- A "Disable tutorials" toggle in Settings. Explicit replays, like the tomb's "?" button, still work.

### Changed

- The interior map is zoomed in twice as far as the previous pass.

## 0.25.3 - 2026-07-05

### Changed

- The interior map is more zoomed in — corridors, rooms and icons are all noticeably bigger.

### Fixed

- The explorer dot cut through unexplored corridors when a floor had a genuine loop.

## 0.25.2 - 2026-07-05

### Changed

- Side paths branch off throughout the main path instead of bunching up after its last puzzle room.

## 0.25.1 - 2026-07-04

### Changed

- Room icons on the interior map are larger and easier to make out on mobile.
- A long corridor's tap target sits next to you rather than at its far end, and is a direction arrow.

### Fixed

- The explorer dot rendered off-centre and small inside interiors, and skipped its first travel animation.
- Unexplored rooms no longer render at all, instead of showing faintly.
- Adjacent junction rooms merge into one open space instead of showing a wall between them.
- A hidden passage's detector-stop message never appeared when it was more than one step past its junction.
- Walls shifted near an unrelated junction whenever a hidden room was revealed or completed.

## 0.25.0 - 2026-07-04

### Added

- A "Clear game data" option in Settings, for resetting your save without clearing browser storage.
- Some interior rooms display decorative details, such as statues or sarcophagi.

### Changed

- Junctions, treasure rooms, staircases and exits appear as larger, uniquely shaped rooms.
- The corridor leading to a locked gate blends into the neighbouring room.
- Interior corridors wind more naturally, with occasional wider junctions where several paths meet.

### Fixed

- The "pack is full" marker sometimes showed on puzzle rooms instead of the chest it belonged to.

## 0.24.2 - 2026-07-03

### Fixed

- Corridor corners in pyramid interiors were hard to tap on mobile.
- A completed pyramid's interior showed different corridors explored than when you left it.

## 0.24.1 - 2026-07-03

### Fixed

- The back button, floor indicator and health display were hidden behind the notch on installed devices.
- The interior map opened in the top-left corner instead of centred on screen.
- The level-completion animation replayed over the interior map when returning to a pyramid.
- Fully completed pyramids always opened on the "Expedition Completed" screen, blocking revisits.
- A chest with a consumable became permanently unavailable when your pack was full.
- You are told your pack is full instead of silently missing the item, and the chest is marked.
- The fragment-count badge stayed on a hieroglyph in the Collection after it was complete.

## 0.24.0 - 2026-07-03

### Added

- **Pyramid interiors** — after solving a pyramid level you enter the pyramid itself, navigating room by room to the exit.
- **Hidden passages** — some corridors and side rooms are concealed behind walls; step close enough to reveal them.
- **Multi-floor pyramids** — deeper pyramids have several floors connected by staircases, with richer rewards below.
- **Revisit any level** — tap a completed level on the journey path to go back inside and explore again.
- **Chests and hieroglyph fragments** — open chests for items, and collect enough pieces to complete a hieroglyph.
- **Health and traps** — some rooms hold a trap; you need health to enter, and a quick arithmetic challenge to escape.
- **Consumables** — bandages, oil flasks and trap tools restore health, light dark passages, or disarm traps.
- **Detectors** — a compass that finds hieroglyph pieces, and a tool that finds chests you left unopened.
- **Tomb interiors** — treasure tomb floors are navigated as full site maps, just like pyramids.
- **Ward and floor-key gates** — locked gates that open with a key you have earned; keys and doors share a colour.
- **Tomb treasure perks** — completing a treasure tomb run unlocks a permanent power-up.
- **The world mosaic** — a stained-glass window that fills in piece by piece as you play through levels.

### Changed

- The pyramid map scrolls to keep the explorer dot centred, so you can always see what is ahead.
- Completed rooms and corridors are tappable again, letting you move back to any room you have visited.
- Expeditions no longer award items on completion; items are found inside the pyramid instead.
- The alpha notice explains this is a full redesign of the game being tested from scratch.

## 0.23.6 - 2025-01-01
