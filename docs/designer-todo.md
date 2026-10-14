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

Each slot holds a stand-in today (it repeats a lock placed elsewhere). Site details: `docs/game-design/lock-placement.md`
Part 1. These are junior and expert slots, so Claude can propose locks for them; master and wizard locks stay the
designer's work. junior_3 site 2 is placed: beforeYouJump (Claude, 2026-10-14).

| Site            | Tier   | Stand-in today | Floor notes                                            |
| --------------- | ------ | -------------- | ------------------------------------------------------ |
| expert_2 site 3 | expert | twoLamps       | master ward wing                                       |
| expert_2 site 4 | expert | dropHome       | wizard ward wing                                       |
| expert_3 site 3 | expert | cellar         | overgrown 0.4                                          |
| expert_3 site 4 | expert | overlook       | overgrown 0.65, wizard ward wing                       |
| expert_4 site 2 | expert | twoLamps       | two floor-key colours, broad packing                   |
| expert_4 site 3 | expert | cellar         |                                                        |
| expert_4 site 4 | expert | overlook       | two floor-key colours, broad packing, master ward wing |

## Reshapes

- **observatory** (expert_3 site 2): does not lay. Its three-way board stands in a region the route runs through,
  so the board's node would need five ways. Put the board off the route.
- **leverSwapsDoors** (junior_2 site 2): `yarn lock` says gate `hall-left` never stops anyone, so the swap is not
  needed to finish.
- **masonsRamp** (master, Claude's): solvable with the stone pipe, six stone moves; its drop `chute>workshop` is now an
  optional shortcut. It waits for a master floor.
- **bathHouse** (master): carves now, 200 of 200 in the playground (twelve glyphs; `hall`'s tile stands between the
  board and its gates). Nothing to reshape; it waits for a master floor to stand on. Its six-step `Gate` can become a
  procession door by writing `procession` for `sequence` on its line (your file; not touched).

## The procession door

Built: `P procession hall vault [reset hall-vault]` is a sequence whose door is a procession board (contract,
"The procession door"). Three to six steps. One thing to settle before a master or wizard lock uses one with three
steps: no seed of 2000 gives a board at master 3 or wizard 3, so those pairs are refused at bake
(`processionBoardUnseeded`) until you give them a band. Seeds found per 2000, first attempt
(`yarn tsx scripts/processionDoorSeeds.ts`):

| tier    | 3 steps | 4 steps | 5 steps | 6 steps |
| ------- | ------- | ------- | ------- | ------- |
| starter | 121     | 208     | 136     | 64      |
| junior  | 67      | 201     | 195     | 106     |
| expert  | 21      | 36      | 19      | 11      |
| master  | 0       | 7       | 16      | 16      |
| wizard  | 0       | 6       | 10      | 24      |

Playtest it on dev pyramid 10 (`processional`, three steps, expert) after an `INCLUDE_DEV=1` bake.

## Questions only the designer can answer

- relay and doubleBack take 3 actions: stay expert (as now) or move to junior?
- doubleBack: how should a drop beside a gate compile (needed to fold its TypeScript twin)?
- stoneGate.lock header says "not placed yet, not buildable yet", but it stands in Djoser: correct it?
- Fog of a room-free lock region (stoneGate's `hall3` comes back fogged after a re-carve): a door in the bare
  region, or restore its fog from its neighbours?
- The corner squeeze is still the old two-leg slide: keep or redo?
- A lit torch in fog looks like an unlit one apart from its light pool: art change wanted?

## Not buildable yet (Claude's side)

counterweight (expert_3 site 1) and twoStones (expert_4 site 1) need mechanics that are not built; their floors hold
stand-ins. Ask Claude to build them when wanted.
