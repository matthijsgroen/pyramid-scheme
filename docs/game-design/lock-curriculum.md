# The lock curriculum

Which floors teach which mechanic, and which locks combine them, from junior to master. Wizard is not in
it: wizard gets sand puzzles, which `mechanic-contract.md` §8 parks outside the lock model.

The locks and lessons themselves are files: `src/game/locks/*.lock` and `src/game/locks/lessons/*.lock`,
in the notation of `src/game/lockNotation.ts`. `yarn lock <file>` draws one, walks it and says what it
could do without; `yarn lock` walks the whole catalogue. `src/game/lockCatalogue.spec.ts` holds every
lock to a test that takes its load-bearing piece away.

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

One layer per site, never per floor (`floor-as-puzzle-brainstorm.md`): a site carries one lesson or one
lock, not a sampler.

## What each lock leans on

| mechanic | taught by | locks that need it |
| --- | --- | --- |
| board picks the way (fork-switch) | `boardPicksTheWay` | dropHome, twoLamps, doubleBack, lamplighter, observatory, clockwork |
| lever (toggle, can go back) | `leverOpensADoor`, `leverSwapsDoors` | all but plates |
| torch or key (activator, once) | `torch` | cellar, keyring, relay, observatory, sluice, tide |
| one-way drop | `dropDown` | dropHome, cellar, doubleBack, overlook, seesaw, lamplighter, observatory, relay, clockwork |
| a door that waits for several | `doorWaitsForTwo` | twoLamps, seesaw, lamplighter, observatory, relay, clockwork |
| water (region gate) — not buildable yet | `waterMoves` | sluice, tide |
| tiles in order (sequence) — not buildable yet | `tilesInOrder` | plates |

## The lessons

| lesson | tier | what the player learns |
| --- | --- | --- |
| `boardPicksTheWay` | junior | a board in a junction decides which way opens |
| `leverOpensADoor` | junior | a lever elsewhere opens a door here |
| `dropDown` | junior | a drop is a way down, never back |
| `torch` | junior | a torch, lit for good, opens its door |
| `leverSwapsDoors` | junior preview, expert | one lever swaps two doors, and can be thrown back |
| `doorWaitsForTwo` | expert | a door shows the marks it waits for, and opens on the last |
| `waterMoves` | expert, once buildable | one lever drains a hall |
| `tilesInOrder` | expert, once buildable | two tiles, in order |

## The locks

| lock | tier | trick |
| --- | --- | --- |
| dropHome | expert | the lever that opens the exit shuts the door behind you; a drop is the way home |
| cellar | expert | the drop lands in a cell that holds its own key |
| twoLamps | expert | the exit wants both lamps, the board reaches one at a time |
| overlook | expert | one room overlooks two drops; the second saves the early dropper |
| doubleBack | expert capstone | a lever shuts the way you came and opens a branch you drop onto |
| seesaw | master | each lever's throw shuts the way to the other |
| lamplighter | master | a drop that saves a board solve, for whoever lights west first |
| keyring | master | a key chain behind an airlock |
| relay | master | a chain of airlocks; the drop home opens on the last torch |
| clockwork | master | the board must point two ways, and the lever behind one of them shuts it |
| observatory | master | a three-way board, two prizes, one shortcut |
| tide | master, once buildable | carry the key home against the water |
| sluice | master, once buildable | drain the hall for the gold, then the vault for the way out |
| plates | master, once buildable | four tiles across three rooms; the door resets them |

## Where they go

Site counts are the shipped world's (junior 16, expert 18, master 19).

### Junior — the lessons, each about four times

| journey (sites) | layers, in site order |
| --- | --- |
| junior_1 (3) | leverOpensADoor · dropDown · boardPicksTheWay |
| junior_2 (4) | boardPicksTheWay (the switch fork already authored at pyramid 2) · leverOpensADoor · torch · dropDown |
| junior_3 (4) | leverOpensADoor · dropDown · torch · boardPicksTheWay |
| junior_4 (5) | boardPicksTheWay · leverOpensADoor · dropDown · torch · leverSwapsDoors |

### Expert — a lesson opens each journey, then the first locks

| journey (sites) | layers, in site order |
| --- | --- |
| expert_1 (4) | leverSwapsDoors · dropHome · twoLamps · **doubleBack** |
| expert_2 (4) | doorWaitsForTwo · cellar · twoLamps · dropHome |
| expert_3 (5) | leverSwapsDoors · dropHome · cellar · overlook · **doubleBack** |
| expert_4 (5) | doorWaitsForTwo · twoLamps · cellar · overlook · **doubleBack** |

Every lock in a journey leans only on lessons that journey or junior has taught. doubleBack closes three
of the four.

### Master — the remaining combinations

The 19 master sites take seesaw, lamplighter, keyring, relay, clockwork and observatory about twice each,
replacing the floor-key gates being converted to locks (`floor-topology-design.md`: 56 of the world's 58
are at master and wizard). tide, sluice and plates take master sites once the engine builds region gates
and sequences; until then those sites keep their keys.

### A repeat is not the same floor twice

What fills a region, and what dresses each mechanic — a lever or a lightswitch, a zipline or a headwind —
is said where the lock is placed (`regions-and-containers.md`, `mechanic-contract.md` §5). Two
doubleBacks in two journeys can play differently while the lock stays one file.

## Not yet true

- **Region gates and sequences are `built: no`** (`mechanic-contract.md` §6). `waterMoves`,
  `tilesInOrder`, tide, sluice and plates validate and walk, and cannot bake.
- **A region only drops reach does not carve yet.** None of these needs one: every region is also joined
  by a connection or a gate.
- **Two regions joined by a bare corridor stay one region in the engine's solver** until its T15 lands.
  overlook's `in -- top` and the lessons' corridors walk correctly in the tool and are what the engine is
  meant to match.
- **Placement is not authored.** This document says which journey site carries which layer; writing that
  into the world spec waits on the placement format, which binds the lock, its realisations and its
  regions' contents at one site.
