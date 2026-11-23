# Designer to-do

Puzzle work waiting on the designer. The designer mainly writes the master and wizard locks; Claude may propose and
write junior and expert locks, builds mechanics and places locks. When a lock is ready, say "place <lock> on <site>"
and Claude carves, bakes and gates it.

## How to work on a lock

- Files live in `src/game/locks/<tier>/<name>.lock` (lessons in `<tier>/lessons/`). First line:
  `// designed by: Matthijs`.
- Check one: `yarn lock <name>` (draws it and runs every check), or the Lock editor in the preview (develop mode:
  7 taps on the title, Travel, "Lock editor"; "Carve and play" tries it on a floor).
- Tiers by actions: junior 1–3, expert 4–6, master about 14 (bathHouse-sized).
- A lock `yarn lock` refuses is renamed `<name>-blocked.lock`, never silently edited.

## New locks for the open slots

Every junior and expert slot holds its own lock now; the last seven expert slots took Claude's locks (2026-10-16), all
yours to playtest and reshape. Site details: `docs/game-design/lock-placement.md` Part 1.

| Site            | Lock               | Trick                                                                                                  |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| expert_2 site 3 | festivalProcession | the first procession door, four shrines; one lever opens one side of the hall at a time                |
| expert_2 site 4 | sandHalls          | sand buries the stone's hall; post the stone through the pipe first, then turn the lever               |
| expert_3 site 1 | emptyHanded        | the lever shuts the quarry behind you; the ziplines take no stone, so carry it out first               |
| expert_3 site 2 | starWell           | dropped into the board's room: east to the key, back for the vault, then the board to the way out      |
| expert_3 site 3 | highWater          | the key's cellar is dry only while the torch's hall floods: key first, torch second                    |
| expert_3 site 4 | lockChamber        | three basins, two winches: walk to the key and back like a boat through a canal lock                   |
| expert_4 site 1 | stoneSteps         | the first tile's door is held by the stone at the second tile: spoil, reset, walk in order             |
| expert_4 site 2 | throughTheWall     | the stone pipe's lesson: post the stone through the wall, squeeze after it                             |
| expert_4 site 3 | scaffold           | the quarry's stone out first; lift the prop first and the quarry shuts on it                           |
| expert_4 site 4 | buildersLift       | the stone down the pipe, you down the hatch; spend the hatch's prop only once the stone below holds it |

No stand-ins left: you chose emptyHanded, starWell and stoneSteps from `docs/review/expert/stand-in-proposals.md`
(2026-11-23). counterweight, observatory and twoStones stay in the catalogue, unplaced.

## Reshapes

- **observatory** (unplaced): does not lay. Its three-way board stands in a region the route runs through, so the
  board's node would need five ways.
- **leverSwapsDoors** (junior_2 site 2): `yarn lock` says gate `hall-left` never stops anyone, so the swap is not
  needed to finish.
- **masonsRamp** (master, Claude's): solvable with the stone pipe, six stone moves; its drop `chute>workshop` is now an
  optional shortcut. It waits for a master floor.
- **bathHouse** (master): carves now, 200 of 200 in the playground (twelve glyphs; `hall`'s tile stands between the
  board and its gates). Nothing to reshape; it waits for a master floor to stand on. Its six-step `Gate` can become a
  procession door by writing `procession` for `sequence` on its line (your file; not touched).

## The procession door

Built: `P procession hall vault [reset hall-vault]` is a sequence whose door is a procession board (contract,
"The procession door"). Three to six steps. The step count alone sets the board and the floor's tier is not read: 3 steps is a starter board, 4
junior, 5 expert, 6 wizard (distinct starts). Every count seeds. Seeds found per 2000, first attempt
(`yarn tsx scripts/processionDoorSeeds.ts`):

| steps | 3   | 4   | 5   | 6   |
| ----- | --- | --- | --- | --- |
| seeds | 121 | 201 | 19  | 24  |

Playtest it in the Lock editor with Carve and play, on a lock with a three-step procession door.

## Questions only the designer can answer

- relay and doubleBack take 3 actions: stay expert (as now) or move to junior?
- doubleBack: how should a drop beside a gate compile (needed to fold its TypeScript twin)?
- stoneGate.lock header says "not placed yet, not buildable yet", but it stands in Djoser: correct it?
- Fog of a room-free lock region (stoneGate's `hall3` comes back fogged after a re-carve): a door in the bare
  region, or restore its fog from its neighbours?
- The corner squeeze is still the old two-leg slide: keep or redo?
- A lit torch in fog looks like an unlit one apart from its light pool: art change wanted?

## Unplaced locks

counterweight and twoStones (Claude's) build and solve, but `yarn lock` warns that a control is reached before its
door is seen. They hold no slot.
