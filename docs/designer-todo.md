# Designer to-do

Puzzle work waiting on the designer. Claude builds mechanics and places locks; the designer designs them. When a
lock is ready, say "place <lock> on <site>" and Claude carves, bakes and gates it.

## How to work on a lock

- Files live in `src/game/locks/<tier>/<name>.lock` (lessons in `<tier>/lessons/`). First line:
  `// designed by: Matthijs`.
- Check one: `yarn lock <name>` (draws it and runs every check), or the Lock editor in the preview (develop mode:
  7 taps on the title, Travel, "Lock editor"; "Carve and play" tries it on a floor).
- Tiers by actions: junior 1–3, expert 4–6, master about 14 (bathHouse-sized).
- A lock `yarn lock` refuses is renamed `<name>-blocked.lock`, never silently edited.

## New locks for the open slots

Each slot holds a stand-in today (it repeats a lock placed elsewhere). Site details: `docs/game-design/lock-placement.md`
Part 1.

| Site            | Tier   | Stand-in today | Floor notes                                            |
| --------------- | ------ | -------------- | ------------------------------------------------------ |
| junior_3 site 2 | junior | dropDown       |                                                        |
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
- **bathHouse** (master): carves now, 200 of 200 in the playground (twelve glyphs; `hall`'s tile stands between the
  board and its gates). Nothing to reshape; it waits for a master floor to stand on.

## Questions only the designer can answer

- relay and doubleBack take 3 actions: stay expert (as now) or move to junior?
- doubleBack: how should a drop beside a gate compile (needed to fold its TypeScript twin)?
- stoneGate.lock header says "not placed yet, not buildable yet", but it stands in Djoser: correct it?
- The stone pipe (masonsRamp waits for it): one-way or both, where a stone lands (a shelf plate, refused if full),
  how paired holes are told apart.
- Fog of a room-free lock region (stoneGate's `hall3` comes back fogged after a re-carve): a door in the bare
  region, or restore its fog from its neighbours?
- The corner squeeze is still the old two-leg slide: keep or redo?
- A lit torch in fog looks like an unlit one apart from its light pool: art change wanted?

## Not buildable yet (Claude's side)

counterweight (expert_3 site 1) and twoStones (expert_4 site 1) need mechanics that are not built; their floors hold
stand-ins. Ask Claude to build them when wanted.
