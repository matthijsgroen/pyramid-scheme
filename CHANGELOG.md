# Changelog

All notable user-facing changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Light puzzles carry doors that no tap will move: send the beam across a socket in the floor and the way clears.
- Harder light puzzles carry a mirror that sends the beam off at a slant, so the light can run corner to corner.
- The hardest hide a trap: a socket to keep the light away from, because crossing it drops stone in front of the beam.

### Changed

- Every light puzzle is new, and every difficulty asks for real reasoning: tapping each piece in turn no longer solves one.
- The light difficulties now play differently from each other — one leans on stone, one on pieces that slide, one on sockets and doors.
- Light puzzles show what a piece will do before you tap it, and animate the tap.
- Balance-scale puzzles start harder, and every difficulty above the easiest moved up to match.
- A solved puzzle waits for a tap instead of fading out on a timer, and dims the board far less.
- Finishing a puzzle shows how long it took, counting only the time it was on screen.

### Fixed

- The light beam was drawn with gaps: any square it crossed travelling rightward was only drawn half way.
- A light-puzzle hint said the beam ran into stone when a mirror had sent it back into the sun disc.

## 0.36.0 - 2026-08-17

### Added

- A light puzzle: bend the sunlight from the disc to the shrine.

## 0.35.1 - 2026-08-17

### Changed

- Comparison grids show only the signs the puzzle actually turns on: a starter board carries four or five instead of sixteen.
- A comparison grid leans on its signs rather than on pre-filled numbers, so every board still teaches what a sign means.
- Wizard comparison grids ask for four harder kinds of reasoning, with hints that explain each, so they no longer solve like master ones.
- Asking for a hint now moves the cursor to the square it is about, so the number pad is already aimed there.
- The same number twice in a row or column now turns the squares red outright, instead of a dark tint that was easy to miss.
- Writing a number no longer rubs out your notes elsewhere. Notes it rules out are struck through in red, and come back if you correct the number.

## 0.35.0 - 2026-08-16

### Added

- A comparison puzzle: fill the grid so every row and column shows each number once, obeying the signs between squares.
- Tap a square and a number to fill it in; the pencil button writes the same numbers in as notes instead.
- Writing a number in clears it from the notes of every square in its row and column.
- An undo button takes back your last move on that puzzle, notes and all.
- A repeated number and a sign pointing the wrong way turn red the moment you write them.
- Comparison grids turn up in pyramids and tombs from the first tier, growing from 4×4 up to 7×7.
- A balance-scale puzzle: give each glyph a weight that keeps every scale level.
- Balance scales turn up in pyramids and tombs from the first tier, alongside the number puzzles.

### Changed

- Sumplete puzzles are always solvable by reasoning; boards that would need a guess are never handed out.
- Sumplete boards grow with the tier, from 4×4 up to 7×7, and fit a phone screen without pinching.
- Each Sumplete row and column shows what it currently adds up to under its target.
- Every puzzle has a hint button that explains the next step and why it follows, a reset, and a back button.
- A puzzle left standing still lights up its hint button, and a used hint takes ten seconds to recharge.
- Finishing a puzzle says whether you solved it unaided or how many hints it took.
- The rules of a puzzle sit under the board — scroll down to read them.

### Fixed

- Floor keys stay readable on any background: the key icon now carries a dark halo, and the hole in its ring is see-through instead of a black dot.

## 0.34.4 - 2026-08-15

### Changed

- The proximity dot beside the detector button grows as well as pulses faster the closer the reading gets, so the three bands are easier to tell apart at a glance.
- A running detector stays on when you walk into another pyramid, instead of switching itself off at every entrance.

## 0.34.3 - 2026-08-14

### Changed

- A detector keeps reading with its readout closed, so you can put the panel away and still see the map. The button now opens and closes the readout rather than switching the detector on and off; tapping the running detector in the readout is what stops it.
- A pulsing dot beside the detector button carries the reading while the readout is shut: slow for something elsewhere in this pyramid, quicker for something on this floor, fast for something a few steps away. It reports whichever detector is running — corridors, hieroglyphs or supplies.
- The dot never says more than your detector level knows. A level-1 compass reports "somewhere in this pyramid" even when the piece is around the corner, because that is all a level-1 compass can tell.

## 0.34.2 - 2026-08-13

### Changed

- The interior HUD takes less room: your detectors share one button that opens the readout, and which detector is reading is chosen inside it, next to the results. The hearts are smaller too — at full health there were six of them competing with the key ring, your supplies and your coins for one line on a phone.
- That row now wraps instead of running off the screen. With everything unlocked it used to push the coin balance out of sight entirely.
- The passageway detector answers at every range it has reached, and says so when the answer is nothing: whether a hidden corridor is close by, waiting on this floor, or waiting on another floor of this pyramid. It used to speak up only when it had news, so a silent panel could mean either "nothing here" or "this thing is broken".
- Walking now moves the detector's closest reading: it tells you a corridor is near as you come within a few steps of one, rather than only stating what the detector does.
- Dropped the "(L4)" tag from the readout. It was the detector's own level shown as a code, with nothing anywhere to say what it meant.
- A pyramid's tally still counts only floors you have walked, so the detector never sends you after a corridor behind a door you cannot open yet — its "nothing found so far" says exactly that, rather than claiming the pyramid is empty.

## 0.34.1 - 2026-08-12

### Fixed

- A tomb treasure's bonus now follows from holding the treasure, instead of being handed over once at the moment you opened the chest. A save that ended up with the treasure but not its bonus — the corridor detector's eye never appearing is the visible case — now reads the bonus back from the treasures in your collection.
- Retuning which treasure carries which bonus reaches saves that already hold it, rather than only players who find it afterwards.

## 0.34.0 - 2026-08-11

### Added

- A locked floor door now names the coloured key it wants, and draws it.
- Finding a floor key names its colour in the loot popup instead of calling it a tomb key.
- The interior HUD carries this floor's key ring: coloured keys in hand, plus the colours of doors seen here and still shut.

### Removed

- The interior HUD's developer cheat buttons (+Junk, +Hieroglyphs, +1000 Coins).

## 0.33.3 - 2026-08-10

### Changed

- Wizard pyramids are less sprawling: fewer dead-end side corridors per floor, so the tier reads as a deep descent rather than a wider version of master. Both main floors, the ward paths and the key chains are unchanged.
- A crocodile guards every tomb treasure from the junior tomb down, not just the last one of each tomb. Starter tombs stay crocodile-free.

### Fixed

- A tomb floor that ended in a crocodile was one tableau room short — the crocodile took a tableau's place instead of adding a room.
- Release notes no longer get reformatted back and forth between releases, so the changelog history stays readable in diffs.

## 0.33.2 - 2026-08-10

### Changed

- Hieroglyph fragments spread across a tier's pyramids instead of piling into its first ones: the last pyramid of a tier used to be its emptiest (junior's last two held 3 fragments each while its first two held 32 between them).

### Fixed

- The "X/Y needed" count on a still-collecting hieroglyph in the tomb's available-symbols strip was stuck in English regardless of your chosen language.
- A hieroglyph tile's engraved shading could show as a doubled, mismatched-color outline around the symbol, most visible on devices missing the true hieroglyph glyph.

## 0.33.1 - 2026-08-09

### Changed

- A hieroglyph you're still collecting is easier to spot in the tomb's available-symbols strip: the stone shows only the fragment you've carved so far, with its count, and the glyph itself always reads clearly — instead of a flat grey tile that gave no hint which symbol was missing.

### Fixed

- A ward door opens onto a floor as hard as the key that opened it. The first treasure of the starter tomb opened a junior floor in the onboarding pyramid, paying out junior mosaic glass before you had set foot in a junior expedition; two more starter pyramids handed out expert and master loot the same way.

## 0.33.0 - 2026-08-08

### Added

- A ward door carries the sign of the treasure that opens it, so you can see which key it wants — the same glyph that treasure shows in the Collection.

### Changed

- A tomb treasure opens the next difficulty: hold any one of a tomb's four unlock treasures and that tier's first expedition is yours, without finishing the tomb run first.

## 0.32.1 - 2026-08-08

### Changed

- Finding a tomb treasure says what it does for you — the same bonus line the Collection shows.

### Fixed

- Pinch-zooming the site map is smooth, and zooms toward your fingers instead of the middle of the screen.
- Tapping something in the Collection shows its details again, instead of only for players holding a trinket.

## 0.32.0 - 2026-08-08

### Added

- The site map zooms: pinch on touch, ctrl/⌘ + scroll on desktop, between half size and five times.
- Double-tap (double-click) the site map to go back to the default zoom.

### Changed

- Reaching an exit asks whether to step outside, so walking into one no longer ends the expedition on the spot.
- Taking a staircase walks you to the stairs first, and you arrive standing on the staircase on the other floor.

### Fixed

- The mosaic window fits the screen whether or not you carry pieces, instead of overflowing sideways.

## 0.31.6 - 2026-08-07

### Changed

- The mosaic is five scenes instead of one abstract window: a cat guarding a doorway, a scribe taught to write, dawn light landing in a temple hall, the green king, a heart weighed against a feather — Anubis standing over all five.
- Each scene belongs to one difficulty and fills left to right as you play that difficulty.
- Mosaic pieces drop on paths of their own difficulty — starter glass on starter paths, wizard glass on wizard paths.
- You place pieces yourself: a "Place 4 pieces" button drops them in one at a time, lowest scene first.
- A finished scene lights up — daylight through the glass, lead lines still dark.
- Fez says three lines about each scene you finish, and steps back with you once all five are done.
- A finished scene keeps its name below the window — tap it to hear what Fez said about it again.
- Deep lapis and oxblood cells are collectible; they used to read as leadwork and show from the start.
- Black-painted shapes — the balance scale, Anubis's head, the snake — are glass you collect, not leadwork stuck black.
- Every piece flares as it lands, not just the first batch you place.
- Mosaic pieces you already collected reset once — the world's loot was reshuffled to place them.
- A mosaic piece you find shows its scene's own colour of glass, so you can tell which of the five it belongs to — on Fez's counter too.
- Fez says at the start of the game that he's along for the trade — the tombs are full of things worth selling.
- The first stall you ever reach, he owns up to it being his and pitches what's on the counter. Later stalls get the short greeting.
- Fez greets a shop as his own stall instead of as a customer.
- What you sell at the stall is "trinkets", not "junk" — his offer, the sell section, the Collection category.
- Trinkets are worth far more — 25 for a stone one up to 125 for a divine one — so you find fewer of them and each one matters.
- Loose coins are rarer and small change — the trinkets you sell are what pays for a stall's rarities.
- Found riches barely cover what Fez's stalls charge: buying everything he sells means gathering nearly everything the world holds.
- Loot fills treasure chests first, so a chest at the end of a side path is worth the walk — solved puzzles still hand you loose change.
- Every junior journey has an old working off its second pyramid: an easy corridor an earlier expedition left behind, holding the plainest trinkets.

## 0.31.5 - 2026-08-02

### Changed

- A locked treasure location now hints at where its map leads, like the map pieces do, and shows the same part-gathered scroll.
- A tomb's name is held back until its map is whole, instead of appearing with the first piece.
- Dropped the progress bar and "25% collected" line from locked locations — the scroll and the "1/4" say it.

## 0.31.4 - 2026-08-02

### Changed

- A map piece hints at where its map leads — a trader's cellar, a temple precinct, somewhere no mortal put there — instead of the same line every time.
- A map piece shows how much you've gathered ("2 of 3 map pieces gathered"); the last one names the tomb.
- A hieroglyph fragment's "2 of 3 fragments found" sits on its own line instead of trailing the description.
- Part-collected icons fill in clockwise so you can read your progress off the icon alone.

### Fixed

- Finding a single coin says "1 coin" rather than "1 coins".
- Tomb tiles on the journey list no longer show a chamber count.
- Four tombs showed internal names on the journey list. The Inner Sanctum, the Hall of Osiris, the Realm of Cosmic Forces and the Throne of Eternity are now named in English and Dutch.

## 0.31.3 - 2026-08-02

### Changed

- Trapped corridors are twice as long, everywhere: two to four questions before the payoff instead of one or two.
- Trap timers are shorter — expert 12s → 8s, master 9s → 6s, wizard 6s → 4s.
- Starter and junior traps are timed now, at 8 seconds. Trap insight still adds a second per stack, at every difficulty.
- About 40% fewer bandages, oil flasks and trap tools scattered through the world.

### Fixed

- Trap supplies reach the later difficulties. The whole master tier got none at all, most of wizard went without, and expert hoarded the lot.

## 0.31.2 - 2026-08-01

### Fixed

- Seventeen pyramid interiors across expert, master and wizard that showed only "Site layout unavailable." now open. They get roomier floor plans; a few side passages wander less so everything fits. Every other interior is untouched.

## 0.31.1 - 2026-08-01

### Fixed

- Re-entering a pyramid no longer leaves an unplayable look-alike board in the middle of the screen while the real one slides off to the side.
- A pyramid you'd already solved comes back empty instead of pre-filled with its old answers. Backing out part-way still keeps what you'd filled in.
- Saving no longer re-reads your save file on every frame, which could drop the last thing you typed into a pyramid.

## 0.31.0 - 2026-08-01

### Added

- The compass marks pieces you can't take yet: 🔒 behind a ward key or a locked difficulty, 👁 hidden in a corridor needing the passageway detector, ❓ when it can't tell. Nothing in the way, no mark.

### Fixed

- The compass names places instead of internal ids — "Papyrus Merchant's Route L2" rather than `starter_2`. Same for the supplies detector.
- The compass points at one pyramid instead of naming a whole journey, which can be five of them.
- The compass panel says what it's hunting ("Looking for 𓎗").
- Detector buttons sit alongside your health and coins instead of taking a row of their own, and the readout only appears once a detector is on.

## 0.30.10 - 2026-08-01

### Fixed

- Taps near the bottom of a pyramid or tomb map are no longer swallowed by an invisible strip behind the detector panel.
- You can pick a hieroglyph to hunt with the compass. Part-collected ones (showing 2/3) are tappable now, so the compass can finally be given a target.

## 0.30.9 - 2026-07-31

### Changed

- Ward gates hold more varied bonus pockets, mixing in tiers other than their own. Master previously hosted nothing but its own content.
- Starter "merchant" moments turn up throughout the whole game as a low-difficulty breather, sometimes holding a real starter fragment.
- Cross-tier bonus pockets hold a real hieroglyph fragment far more often, instead of falling back to a mosaic piece or plain loot.

## 0.30.8 - 2026-07-31

### Changed

- Hieroglyph fragments stay strictly within their own difficulty, never mixed into a harder or easier one.
- Most symbols now need some tomb descent to finish: a few early ones turn up freely, the rest hold pieces behind that tomb's own gates.

## 0.30.7 - 2026-07-30

### Changed

- Each tier has 4 tier-unlock treasures instead of 1, spread across its journeys, so one key no longer opens all of a tier's ward-gated content at once.
- Some of those treasures gate a bonus pocket much later in the game, so an old key may still have something new to open.

### Fixed

- Hieroglyph fragments are no longer placed behind a tomb's own gated staircase, where they couldn't be picked up — permanently locking the tableau rooms that needed them.

## 0.30.6 - 2026-07-29

### Fixed

- Leaving a pyramid or tomb right as it was entered could wipe every journey's progress back to the start, keeping only your hieroglyphs.

## 0.30.5 - 2026-07-19

### Changed

- The "still something here" marker on a completed expedition's tile is now a pulsing green dot instead of a key icon, matching the pulse on the map.

### Fixed

- The map's "still something here" pulse now pulses in place on its pyramid, instead of drifting toward the corner.

## 0.30.4 - 2026-07-19

### Fixed

- A pyramid could become impossible to finish: revealing the chamber with the exit made the screen flicker and the marker refuse to move.

## 0.30.3 - 2026-07-19

### Fixed

- The "still something here" marker appears at all: a completed expedition's tile stayed blank even when it clearly still held loot. The 🔑 shows now, and the map node pulses as soon as you finish.

## 0.30.2 - 2026-07-19

### Fixed

- The game no longer opens to a black screen for players who had explored before the previous update.

## 0.30.1 - 2026-07-19

### Fixed

- The "still something here" marker catches what it should: unopened chests and puzzles, side branches you never entered, and ward paths the moment you hold the key they need.

## 0.30.0 - 2026-07-19

### Added

- A completed expedition flags on the map (emerald pulse) and on its card (🔑) when it still holds treasure — a chest you walked past, or one a newly-earned ward key now opens.

### Changed

- Hieroglyph fragments land in pyramids of their own tier far more often. Starter and junior fragments had been spilling into harder pyramids.

### Fixed

- Loose coins turn up from the first tier. The whole coin budget had been landing in the late-game tiers.

## 0.29.4 - 2026-07-18

### Fixed

- The entrance staircase on a tomb/pyramid floor no longer shows a "completed" checkmark and dimming — a staircase is a passage, not a puzzle to finish.
- Switching floors now places you at the new floor's entrance instantly, instead of showing your marker gliding across the map to the staircase from your position on the previous floor.

## 0.29.3 - 2026-07-18

### Changed

- The chest holding a tomb's ward key now looks the part — an ornate golden chest instead of the plain wooden one, matching how valuable the reward is.

## 0.29.2 - 2026-07-18

### Changed

- Tomb tableau puzzles ramp up as you descend: each room widens the numbers and adds operators, including between two rooms on the same floor. Starter tomb sums range 1–6.

## 0.29.1 - 2026-07-18

### Changed

- The Collection screen lists ward treasures first, then hieroglyph fragments, then trinkets.
- Loot leans more toward loose coins — more often and in bigger handfuls — with fewer trap consumables scattered around.
- Tomb tableau rooms ask for new hieroglyphs as you descend, instead of demanding almost every symbol on the first floor or two.
- The shallowest floors of late-game tombs lean on symbols from earlier difficulties.

## 0.29.0 - 2026-07-18

### Added

- Each tomb floor holds several tableau puzzle rooms in sequence instead of one — 2 in starter tombs up to 6 in the divine vaults, each with its own story.

### Fixed

- A tomb tableau asks for the hieroglyphs its story is about — a "Fish for the Market" tableau asks for the Fish. Story and requirements had drifted apart in every tomb.

## 0.28.3 - 2026-07-18

### Fixed

- The short story is shown again above a tomb tableau — it had gone blank.
- You can now travel back down a staircase to a previous floor. Clicking a staircase you'd already used (including the one you arrive on) did nothing instead of taking you back.

## 0.28.2 - 2026-07-18

### Changed

- Removed the length indicator from journey and tomb cards.

### Fixed

- Re-entering a completed tomb from the travel screen works; its revisit card used to end the journey instead.
- A tomb's card reads "Revisit — re-enter the tomb" instead of "pick a pyramid".

## 0.28.1 - 2026-07-18

### Fixed

- The tier-unlock treasure now correctly reads "Unlocks {tier} expeditions" — it opens the next difficulty of expeditions, not tombs.

## 0.28.0 - 2026-07-18

### Added

- Ward gates are tinted by the tier of the key that opens them, so you can read a locked ward's difficulty at a glance.
- The gate screen says who sealed it — a merchant, a nobleman, a high priest, a pharaoh, or the gods.

### Changed

- The short story on a tomb tableau is now fully readable from the start, instead of unscrambling letter by letter as you solve the puzzle.

### Fixed

- Claiming a tomb ward key now shows the actual treasure you found — its name and icon — instead of a generic "tomb key".

## 0.27.5 - 2026-07-17

### Fixed

- A tomb tableau could ask for a hieroglyph whose fragments were impossible to collect, leaving the tomb unfinishable.
- The exit now sits at the true end of a pyramid corridor, instead of leaving a stretch beyond it you could never reach.

## 0.27.4 - 2026-07-17

### Changed

- Reworded the popup shown when you find a map piece or a mosaic tile — less about game mechanics, more in-world flavor.

## 0.27.3 - 2026-07-17

### Fixed

- Opening a chest that held a mosaic tile crashed the game to a black screen. The reward popup now shows correctly.

## 0.27.2 - 2026-07-17

### Changed

- A collected hieroglyph solves every tableau that needs it and is never used up — no more stockpiling copies.
- The tableau screen shows which hieroglyphs you have and your progress on the ones you're still collecting.

### Fixed

- Mosaic tiles turn up on reachable paths in starter and junior journeys. Every early one used to sit behind a hidden passage you couldn't open until the corridor detector arrived.

## 0.27.1 - 2026-07-17

### Changed

- Revisiting a completed journey opens its map to pick a pyramid, instead of dropping you into the first one. Each re-entry replays that pyramid's exterior puzzle.

## 0.27.0 - 2026-07-17

### Added

- Solving a puzzle sometimes rewards a few coins or a healing supply, on top of its usual progress.
- Ancient trinkets and curios can now be found scattered through pyramids.
- Tomb treasures now grant permanent perks — more health, sturdier armor, a bigger carrying capacity, steadier hands at traps, and upgrades to the detectors below.
- Detectors can be leveled up: the compass and the supply sensor point more precisely as they improve.
- A corridor detector reveals nearby hidden passages — first as a proximity hint, then pinned on the floor and travel maps.
- Hidden passages can now hold optional bonus loot, found with the corridor detector or by stumbling onto them.
- Fez shops now stock progression pieces you can buy (such as map pieces), alongside consumables.
- Before attempting a trap you can choose to heal first; attempting one always launches the encounter now.
- The Collection screen shows how many of each trinket you're holding, and keeps a category hidden until you've found your first piece from it.

### Changed

- The opening journey's first three pyramids branch out to ward-gated bonus floors, each with a hidden path holding a puzzle or trap.
- Master pyramids now have two ward-gated bonus floors to explore; wizard pyramids have three, plus a two-floor main path.
- Some pyramids use a single key for several locked doors instead of one each, more often at higher difficulties.
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

- Fix the interior map rendering squished on narrow screens; it renders at full size and scrolls in both directions.

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
- A long corridor's click target sits next to you instead of at its far end, so you don't scroll to walk into it.
- That target is a direction arrow rather than a plain dot, and only appears once the explorer dot settles.

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
- Fix chests with a consumable becoming permanently unavailable when your pack was full; revisit them once you have room.
- You're told your pack is full instead of silently missing the item, and an unlooted chest is marked differently on the map.
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
