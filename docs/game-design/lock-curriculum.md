# The lock curriculum

Which floors teach which mechanic, and which locks combine them, from junior to master. Wizard is not in
it: wizard gets sand puzzles, which `mechanic-contract.md` §8 parks outside the lock model.

The locks and lessons themselves are files: `src/game/locks/{junior,expert,master,wizard}/**/*.lock` (lessons in `junior/lessons/`),
in the notation of `src/game/lockNotation.ts`. `yarn lock <file>` draws one, walks it and says what it
could do without; `yarn lock` walks the whole catalogue, lessons included, and is the check on them: no unit
test pins what a lock contains.

## Tiers and folders

A lock's tier is its action count, the length of its cheapest solution (`yarn lock`'s "steps"), and its folder says
which: `src/game/locks/junior/` (1-3 actions, the lessons in `junior/lessons/`), `expert/` (4-6 actions),
`master/` (a bathHouse-sized lock, about 14 actions, and locks not yet buildable such as masonsRamp) and `wizard/`
(empty: sand puzzles, parked). A lock goes by its bare file name, never its folder, so a name is unique across
tiers and `yarn lock expert/relay` and `yarn lock relay` draw the same lock. The tier columns below match the
folders; relay and doubleBack take three actions and stand in expert by the designer's choice. The "Where they
go" tables are the older per-site layers; the one-lock-per-floor proposal is in
[`lock-placement.md`](lock-placement.md).

## The rule

**A mechanic appears alone before it appears in company.** A player who meets a lever, a drop and a door
that shuts behind them all at once learns nothing from the failure, because they cannot tell which of the
three caught them.

So each mechanic is taught in three beats:

1. **Alone, where nothing can go wrong.** A lesson: one mechanic, one action, no dead end. Plain floor
   content, not a lock — `yarn lock` says so ("under two actions solve it").
2. **Alone, with a consequence.** The same mechanic doing something the player has to notice: the lever
   that swaps two doors, the door that waits for two.
3. **In a lock, with at most one mechanic the player has not combined before.** The first locks pair
   exactly two taught lessons.

**A lesson shows the problem first.** The player reaches and sees the shut door before its control is
reachable: the control stands off the obvious path, in a side room or behind them, so they go looking for it
and come back. A lever beside its door, or in the room the player starts in, teaches nothing. `yarn lock`
checks it ("every shut door is seen before its control"): from `in`, the door of each gate shut at the start
is reached without entering a region any of its controls stands in. A board stands in its own junction, so it
counts as no room to come to. It refuses a lesson (`src/game/locks/junior/lessons/`) and warns of any other lock. A
carve that will not take a door-first lesson is fixed in the carve, or the lesson is not placed there; the
order is never traded for carve convenience. The door's hall, where the side room branches off, must hold a room on its stretch off
the route, or its fog is lost on a re-carve: the bake picks a seed that gives it one ("every stub holds a room").

One layer per site, never per floor (`floor-as-puzzle-brainstorm.md`): a site carries one lesson or one
lock, not a sampler.

## What each lock leans on

| mechanic                                      | taught by                            | locks that need it                                                                                        |
| --------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| board picks the way (fork-switch)             | `boardPicksTheWay`                   | dropHome, twoLamps, doubleBack, lamplighter, observatory, clockwork                                       |
| lever (toggle, can go back)                   | `leverOpensADoor`, `leverSwapsDoors` | all but plates                                                                                            |
| torch (lit by the player, put out by a flood) | `torch`                              | relay, stoneGate, hourglass, highWater                                                                    |
| key or prize (activator, once)                | — (a floor key, met in the world)    | cellar, keyring, observatory, sluice, tide, highWater, lockChamber                                        |
| one-way drop                                  | `dropDown`                           | beforeYouJump, dropHome, cellar, doubleBack, overlook, seesaw, lamplighter, observatory, relay, clockwork |
| a door that waits for several                 | `doorWaitsForTwo`                    | beforeYouJump, twoLamps, seesaw, lamplighter, observatory, relay, clockwork                               |
| water or sand (region gate)                   | `waterMoves`                         | sluice, tide, hourglass (sand), highWater, lockChamber                                                    |
| tiles in order (sequence)                     | `tilesInOrder`                       | plates, festivalProcession (the first procession door)                                                    |
| stones on plates, and where a stone cannot go | `stoneOnAPlate`                      | twoStones, masonsRamp, counterweight, throughTheWall, scaffold, buildersLift, stoneGate                   |
| stone pipe, and the narrow passage            | `throughTheWall`                     | buildersLift (pipe), masonsRamp, stoneGate (narrow passage)                                               |

## The lessons

| lesson             | tier                 | what the player learns                                        |
| ------------------ | -------------------- | ------------------------------------------------------------- |
| `boardPicksTheWay` | junior               | a board in a junction decides which way opens                 |
| `leverOpensADoor`  | junior               | a lever elsewhere opens a door here                           |
| `dropDown`         | junior               | a drop is a way down, never back                              |
| `torch`            | junior               | a torch, lit for good, opens its door                         |
| `leverSwapsDoors`  | junior               | one lever swaps two doors, and can be thrown back             |
| `doorWaitsForTwo`  | junior               | a door shows the marks it waits for, and opens on the last    |
| `waterMoves`       | junior               | one lever drains a hall                                       |
| `tilesInOrder`     | expert               | two tiles, in order                                           |
| `stoneOnAPlate`    | junior               | a stone on a plate holds its door; lift it and the door shuts |
| `throughTheWall`   | expert, four actions | a stone goes through the pipe where the player squeezes       |

## The locks

| lock               | tier                     | trick                                                                                                                                                       |
| ------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dropHome           | junior                   | the lever that opens the exit shuts the door behind you; a drop is the way home                                                                             |
| beforeYouJump      | junior                   | the way out waits for two levers, one above a drop and one below; throw the upper one before you jump                                                       |
| cellar             | junior                   | the drop lands in a cell that holds its own key                                                                                                             |
| twoLamps           | expert                   | the exit wants both lamps, the board reaches one at a time                                                                                                  |
| overlook           | junior                   | one room overlooks two drops; the second saves the early dropper                                                                                            |
| doubleBack         | expert capstone          | a lever shuts the way you came and opens a branch you drop onto                                                                                             |
| seesaw             | junior                   | each lever's throw shuts the way to the other                                                                                                               |
| lamplighter        | junior                   | a drop that saves a board solve, for whoever lights west first                                                                                              |
| keyring            | expert                   | a key chain behind an airlock                                                                                                                               |
| relay              | expert                   | a chain of airlocks; the drop home opens on the last torch                                                                                                  |
| clockwork          | expert                   | the board must point two ways, and the lever behind one of them shuts it                                                                                    |
| observatory        | expert                   | a three-way board, two prizes, one shortcut                                                                                                                 |
| tide               | junior                   | carry the key home against the water                                                                                                                        |
| sluice             | junior                   | drain the hall for the gold, then the vault for the way out                                                                                                 |
| plates             | expert                   | four tiles across three rooms; the door resets them                                                                                                         |
| twoStones          | expert, once buildable   | one stone holds the vault while you fetch the second, then presses the exit: a stone spent twice                                                            |
| masonsRamp         | master, once buildable   | one stone holds the chute door for the other; you squeeze back up the narrow passage, where no stone fits                                                   |
| counterweight      | expert, once buildable   | the zipline takes you down empty-handed; weigh the lift down from below, then bring the other stone by lift                                                 |
| festivalProcession | expert                   | the first procession door: four shrines in the board's order, a lever opening one side of the hall at a time                                                |
| hourglass          | expert                   | a lever buries one hall in sand and clears the other; a lit torch behind a hall burns on, so light one, turn, light the other                               |
| highWater          | expert                   | the key's cellar is dry only while the torch's hall floods; fetch the key first, or the flood puts the torch out                                            |
| lockChamber        | expert                   | three basins, two winches: walk to the key and back as a boat goes through a canal lock                                                                     |
| scaffold           | expert                   | a stone holds the quarry open; bring the quarry's stone out first, then spend the prop                                                                      |
| buildersLift       | expert                   | the stone goes down the pipe and you down the hatch; the stone propping the hatch is the wrong one to post                                                  |
| stoneGate          | expert capstone (Djoser) | lifting the stone off the altar opens the back way and shuts the way in; park a stone on a shelf to fit through the narrow passage; both stones spent twice |

## Where they go

Site counts are the shipped world's (junior 16, expert 18, master 19).

### Junior — the lessons, each about four times

| journey (sites) | layers, in site order                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| junior_1 (3)    | leverOpensADoor · dropDown · boardPicksTheWay                                                         |
| junior_2 (4)    | boardPicksTheWay (the switch fork already authored at pyramid 2) · leverOpensADoor · torch · dropDown |
| junior_3 (4)    | leverOpensADoor · dropDown · torch · boardPicksTheWay                                                 |
| junior_4 (5)    | boardPicksTheWay · leverOpensADoor · dropDown · torch · leverSwapsDoors                               |

### Expert — a lesson opens each journey, then the first locks

| journey (sites) | layers, in site order                                           |
| --------------- | --------------------------------------------------------------- |
| expert_1 (4)    | leverSwapsDoors · dropHome · twoLamps · **doubleBack**          |
| expert_2 (4)    | doorWaitsForTwo · cellar · twoLamps · dropHome                  |
| expert_3 (5)    | leverSwapsDoors · dropHome · cellar · overlook · **doubleBack** |
| expert_4 (5)    | doorWaitsForTwo · twoLamps · cellar · overlook · **stoneGate**  |

Every lock in a journey leans only on lessons that journey or junior has taught. In Djoser (expert_4) the stone comes
first (stoneOnAPlate, site 1), then throughTheWall teaches the pipe and the narrow passage (site 2) before scaffold
(site 3), buildersLift (site 4, the pipe again, with a drop) and stoneGate, the capstone. festivalProcession (expert_2
site 3) is the first procession door. doubleBack closes expert_3. The site tables above are the older layers; the
placed locks are in `lock-placement.md`.

### Master — the remaining combinations

The 19 master sites take seesaw, lamplighter, keyring, relay, clockwork and observatory about twice each,
replacing the floor-key gates being converted to locks (`floor-topology-design.md`: 56 of the world's 58
are at master and wizard). tide and sluice take master sites too; plates takes one.

### A repeat is not the same floor twice

What fills a region, and what dresses each mechanic — a lever or a lightswitch, a zipline or a headwind —
is said where the lock is placed (`regions-and-containers.md`, `mechanic-contract.md` §5). Two
doubleBacks in two journeys can play differently while the lock stays one file.

## Stones

A stone rests on a plate or is in the player's hand, never loose, so lifting one is a move of its own:
it empties a plate. Stones are alike, so a lock places plates, each with or without a stone
(`p plate @hall stone`). A plate is live and opens a way, or bars a region, either while it holds a stone
(`-[p]-`) or while it holds none (`-[p:empty]-`): lift a stone off its plate and the door moves. A plate that opens
nothing is a shelf, a place to keep a stone. The explorer's own weight presses a plate while the player stands on it, which teaches that weight is what counts,
but it never lets them through: a plate is never the cell of the way it opens, so stepping off lifts their
weight first. Passing a door on two plates therefore takes two stones, and the tool refuses a lock that
asks for more stones than it has.

- **One stone in hand, and no swapping.** It is set down only on an empty plate, so where the stones are
  is always one of a few arrangements the walk can prove.
- **No one-way and no narrow passage is passed with a stone.** Every `>>` (a drop, a zipline) takes
  empty hands with nothing written; a narrow passage is written `-[unladen]-`, alone on its gate. Whatever
  realises them, the walk sees the same: a realisation may not change it (`mechanic-contract.md`, "Three
  layers").
- **A stone never leaves its floor.** The stairs and the way out take empty hands, so a return visit always finds every
  stone where it was set down, and the walk proves the lock from every arrangement, leaving and
  returning included.

Natural homes: Djoser's building site (masonsRamp), Giza's counterweights (counterweight), the Book of the
Dead's weighing (twoStones).

## Not yet true

- **Stones and plates are a proposal**, carried beside the shared `Lock` type as `weights`. They need a
  contract addition and engine work before they bake; the acceptance criteria are in
  `docs/superpowers/specs/2026-10-04-stones-acceptance.md`.

- **Sequences are built.** `tilesInOrder` and plates carve on the playground bench.
- **A region only drops reach does not carve yet.** None of these needs one: every region is also joined
  by a connection or a gate.
- **Two regions joined by a bare corridor stay one region in the engine's solver** until its T15 lands.
  overlook's `in -- top` and the lessons' corridors walk correctly in the tool and are what the engine is
  meant to match.
- **Placement is not authored.** This document says which journey site carries which layer; writing that
  into the world spec waits on the placement format, which binds the lock, its realisations and its
  regions' contents at one site. The per-site table the designer fills in, and which mechanics each lock
  combines, are in [`lock-placement.md`](lock-placement.md).
