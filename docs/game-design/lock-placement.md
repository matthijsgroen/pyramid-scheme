# Lock placement

Which lock or lesson stands on which site, as a table the designer fills in, and which mechanics each lock in
the catalogue combines. The curriculum it starts from is `lock-curriculum.md`; the locks are the files in
`src/game/locks/{junior,expert,master,wizard}/**/*.lock` (lessons in `junior/lessons/`).

## Part 1 — the placement table

Every junior and expert site, and the master sites placed so far. Wizard is shielded for now.

Columns:

- **Site**: the pyramid number as the world spec names it, `journey("…").pyramid(n)`, counted from 1.
- **Main floors**: main-path floors in the baked world (`src/data/generatedWorld.ts`). Every junior and expert
  pyramid has one, floor `0`, which is the floor `floorLocks` names.
- **Wing floors**: extra floors up a ward-gated stair (`wardWings`), off the main path.
- **Authored**: what the world spec already says about the site, where it says something.
- **Suggested**: the curriculum's layer for the site, copied from `lock-curriculum.md`.
- **Chosen lock**: the lock on the floor now, as the adopted proposal (below, 2026-10-11) says.
- **Placed**: ✓ where the world spec places it today. "✓ stand-in" is a lock that holds the floor until the proposed
  one exists: the slot is still to design, the proposed lock is not buildable yet, or it does not carve (the reason
  follows). A stand-in may repeat a lock placed elsewhere; the designer replaces it. "no" is a floor with no lock.

Placed: 34 of 34 junior and expert (2026-10-16): 31 with their chosen lock, 3 stand-ins. Master: 1
(2026-10-17), the Book of the Dead's last site.

### Junior

**junior_1 — Sacred Ibis Migration** (`water` role on pyramids 1-3, patron Thoth)

| Site | Main floors | Wing floors | Authored         | Chosen lock      | Placed |
| ---- | ----------- | ----------- | ---------------- | ---------------- | ------ |
| 1    | 1           | 0           |                  | dropDown         | ✓      |
| 2    | 1           | 0           |                  | leverOpensADoor  | ✓      |
| 3    | 1           | 1           | expert ward wing | boardPicksTheWay | ✓      |

**junior_2 — Valley of the Artisans**

| Site | Main floors | Wing floors | Authored                                                                     | Chosen lock     | Placed |
| ---- | ----------- | ----------- | ---------------------------------------------------------------------------- | --------------- | ------ |
| 1    | 1           | 0           |                                                                              | torch           | ✓      |
| 2    | 1           | 0           | the world's one switch fork: a `lightbeamSwitch` board in a two-way junction | leverSwapsDoors | ✓      |
| 3    | 1           | 1           | master ward wing                                                             | waterMoves      | ✓      |
| 4    | 1           | 1           | wizard ward wing                                                             | sluice          | ✓      |

**junior_3 — Temple of Thoth** (patron Thoth)

| Site | Main floors | Wing floors | Authored         | Chosen lock     | Placed |
| ---- | ----------- | ----------- | ---------------- | --------------- | ------ |
| 1    | 1           | 0           |                  | doorWaitsForTwo | ✓      |
| 2    | 1           | 0           |                  | beforeYouJump   | ✓      |
| 3    | 1           | 1           | expert ward wing | dropHome        | ✓      |
| 4    | 1           | 1           | master ward wing | cellar          | ✓      |

**junior_4 — Lighthouse of Alexandria** (`light`/`sky` role and night theme on pyramids 1-5)

| Site | Main floors | Wing floors | Authored         | Chosen lock   | Placed |
| ---- | ----------- | ----------- | ---------------- | ------------- | ------ |
| 1    | 1           | 0           |                  | stoneOnAPlate | ✓      |
| 2    | 1           | 0           |                  | overlook      | ✓      |
| 3    | 1           | 0           |                  | seesaw        | ✓      |
| 4    | 1           | 1           | wizard ward wing | lamplighter   | ✓      |
| 5    | 1           | 1           | expert ward wing | tide          | ✓      |

### Expert

**expert_1 — Valley of the Kings** (`funerary` role on pyramids 1-4)

| Site | Main floors | Wing floors | Authored                            | Chosen lock  | Placed |
| ---- | ----------- | ----------- | ----------------------------------- | ------------ | ------ |
| 1    | 1           | 0           |                                     | tilesInOrder | ✓      |
| 2    | 1           | 0           |                                     | keyring      | ✓      |
| 3    | 1           | 2           | master ward wing, starter ward wing | twoLamps     | ✓      |
| 4    | 1           | 1           | wizard ward wing, patron Anubis     | plates       | ✓      |

**expert_2 — Karnak Temple Complex**

| Site | Main floors | Wing floors | Authored         | Chosen lock        | Placed |
| ---- | ----------- | ----------- | ---------------- | ------------------ | ------ |
| 1    | 1           | 0           |                  | clockwork          | ✓      |
| 2    | 1           | 0           |                  | relay              | ✓      |
| 3    | 1           | 1           | master ward wing | festivalProcession | ✓      |
| 4    | 1           | 1           | wizard ward wing | hourglass          | ✓      |

**expert_3 — Nile Delta Expedition** (overgrown, growing from pyramid 2 to 5)

| Site | Main floors | Wing floors | Authored                                    | Chosen lock     | Placed                                                           |
| ---- | ----------- | ----------- | ------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| 1    | 1           | 0           |                                             | leverSwapsDoors | ✓ stand-in (counterweight is not buildable yet)                  |
| 2    | 1           | 0           | overgrown 0.2                               | dropHome        | ✓ stand-in (observatory does not lay: its board needs five ways) |
| 3    | 1           | 0           | overgrown 0.4                               | highWater       | ✓                                                                |
| 4    | 1           | 1           | overgrown 0.65, wizard ward wing            | lockChamber     | ✓                                                                |
| 5    | 1           | 1           | overgrown 1, master ward wing, patron Sobek | doubleBack      | ✓                                                                |

**expert_4 — Pyramid of Djoser**

| Site | Main floors | Wing floors | Authored                                               | Chosen lock    | Placed                                      |
| ---- | ----------- | ----------- | ------------------------------------------------------ | -------------- | ------------------------------------------- |
| 1    | 1           | 0           |                                                        | stoneOnAPlate  | ✓ stand-in (twoStones is not buildable yet) |
| 2    | 1           | 0           | two floor-key colours, broad packing                   | throughTheWall | ✓                                           |
| 3    | 1           | 0           |                                                        | scaffold       | ✓                                           |
| 4    | 1           | 1           | two floor-key colours, broad packing, master ward wing | buildersLift   | ✓                                           |
| 5    | 1           | 1           | wizard ward wing                                       | stoneGate      | ✓                                           |

### Master

Master sites keep their floor keys: a lock stands beside them on the floor, as on Djoser's site 4. Only the site
below has a lock so far.

**master_2 — The Book of the Dead** (`judgement` role on pyramids 1-5)

| Site | Main floors | Wing floors | Authored                                              | Chosen lock        | Placed |
| ---- | ----------- | ----------- | ----------------------------------------------------- | ------------------ | ------ |
| 5    | 1           | 1           | blue floor key, two tomb-key chests, master ward wing | weighingOfTheHeart | ✓      |

Site counts: junior 16 (3 + 4 + 4 + 5), expert 18 (4 + 4 + 5 + 5), the same as the curriculum's. Treasure
tombs are not sites in this table; their locks are below.

### Starter tomb

A tomb's floor locks feel one tier up (`docs/superpowers/specs/2026-10-22-tomb-redesign-design.md` §5–6), so the
starter tomb's are junior locks, with one expert-weight capstone. The cave is the first floor lock a starter player
meets: levers and doors only.

| Site             | Floor       | Chosen lock | Mechanics   | Placed |
| ---------------- | ----------- | ----------- | ----------- | ------ |
| cave (level 1)   | the one     | caveLevers  | lever       | no     |
| cavern (level 2) | 2 (index 1) | pitStair    | lever, drop | no     |
| cavern (level 2) | 4 (index 3) | throwItBack | lever, drop | no     |

- **caveLevers**: one lever in a side room opens two doors at once; west's lever opens a cell inside east, and the
  cell's lever opens the way out. Four doors, three levers, and the order of west and east is the player's. 3 actions.
- **pitStair**: a lever opens a ledge, the drop below lands beside the lever that opens both the stair back up and
  the gallery holding the exit lever. The one mechanic beyond levers is the drop. 3 actions.
- **throwItBack**: the lever beside the shut exit opens a side room, whose lever swaps the way east for a ledge; the
  exit's lever waits below the drop, so the swap lever is thrown, then thrown back to reach the exit again. The
  tomb's capstone and its one expert-weight lock (`expert/`): 4 actions.

They stand on authored floors through `lockOnFloor(name)` (below).

Duplicates among the stand-ins, until they are replaced: leverSwapsDoors (junior_2 site 2 and expert_3 site 1),
stoneOnAPlate (junior_4 site 1 and expert_4 site 1), dropHome (junior_3 site 3 and expert_3 site 2).

**Open:** observatory (expert_3 site 2) does not lay on any floor: its three-way board stands in `in`, a region the
route runs through, so the board's node would need five ways (three arms, the way in, the way on) and a lattice node
has four. It needs the board off the route (a carve change: the carve seats a junction on a route step) or a reshape
by the designer. counterweight and twoStones are not buildable.

### Where the curriculum and the world spec disagree

- **The junior switch fork.** The curriculum puts boardPicksTheWay on junior_2's first site and says the
  switch fork is "already authored at pyramid 2", but the world spec authors it on pyramid 2 (site 2). The adopted
  proposal puts leverSwapsDoors there, on the fork floor.
- **Djoser.** stoneGate stands on Djoser's last pyramid (site 5, floor 0), where the curriculum suggests doubleBack:
  the journey's capstone, on the floor shape doubleBack already stands on in expert_1, and with no floor keys. The
  player meets the stone first at site 1, where stoneOnAPlate stands in place of the curriculum's doorWaitsForTwo;
  the narrow passage is still met first in stoneGate.

### From a row to the world

A filled row becomes a `floorLocks` entry on its pyramid in `src/worldGen/spec/junior.ts` or `expert.ts`:
`journey("expert_2").pyramid(2, { floorLocks: { 0: { locks: [{ lock: catalogueLock("cellar") }], realisations: {…} } } })`,
with `catalogueLock(name)` from `src/worldGen/spec/locks/catalogue.ts` reading the `.lock` file and
`realisations` binding each control kind to what the player sees. `yarn generate-world` bakes it. A lock on a
shipped floor re-carves that floor. Saves name rooms by authoring address, so exploration and loot carry across;
only where a save stands does not, so `RELAID_FLOORS_VERSION` goes up by one and the pyramid joins `RELAID_PYRAMIDS`
(`src/app/SiteMap/relaidPyramids.ts`) with `since` set to the new version, and a save inside it resumes at its
entrance once.

junior_2's site 2 authors its own `.floor(0)` for the switch fork, so its lesson, leverSwapsDoors, goes into that
floor with `lessonFloor("leverSwapsDoors")` rather than `lessonOnMainFloor`: a `floorLocks` entry beside an explicit
floor rebuilds the pyramid.

expert_4's stoneGate stands the same way, read from its `.lock` file with `catalogueLock` and every region `free`
(`freeRegions`), bound `weights` `stonePlate`, `activator` `torch`, `unladen` `narrowPassage`.

The locks between a journey's lessons and its capstone stand through `lockOnMainFloor(name)` in
`src/worldGen/spec/locks/onFloor.ts`: the lock read with `catalogueLock`, every
region `free`, and only the kinds it uses bound (fork-switch `lightbeamSwitch`, toggle `handle`, one-way `zipline`,
activator `torch`). On a floor the spec authors itself, such as a tomb's, `lockOnFloor(name)` gives the same lock
and bindings as the floor's `locks` and `realisations`. master_2's last site stands the same way in
`src/worldGen/spec/master.ts`: Tom's weighingOfTheHeart, bound toggle `handle`, sequence `pressure-plate`, weights
`stonePlate`, pipe `stonePipe`, unladen `narrowPassage`, beside the floor's own blue floor key, chests and ward wing.
expert_3's doubleBack pyramid authors `packing: 0.15`: at the default packing its floor carves at the inspector's
default seed on no attempt. No `RELAID_FLOORS_VERSION`, by the designer's call.

A lesson stands through `lessonOnMainFloor(name)` in `src/worldGen/spec/locks/lessons.ts`: the lesson's file read as
`catalogueLock("lessons/<name>")`, every region `free`, and only the kinds the lesson uses bound (toggle `handle`,
fork-switch `lightbeamSwitch`, one-way `zipline`, flame `torch`, weights `stonePlate`). The lessons raised no
`RELAID_FLOORS_VERSION`, by the designer's call: a save standing inside one of their pyramids keeps its place.

### What a lock floor's side sections stand on

A lock is laid first and the floor's content is seated on it. The main path's own puzzles stand on the lock's
route. An **open side section** (no gate, not hidden, no sub-sections, ending in a chest or shop, no lever, not named
by a one-way, not a junction's way) is offered **a corridor of the lock of its own**: its puzzles and end chest stand
on that corridor in walk order, puzzles first and the chest last, with the corridor's doors and drops between them
where the lay puts them. The lay lengthens each corridor for the rooms it carries. A **trapped** (sealed) side section
is offered a corridor too, because a trap costs only hearts and the camp always heals; its trap room keeps the
isolation `sealed` asks for, and the only ways into it are the lay's own passages. Gated, keyed and hidden sections,
sections with sub-sections and a junction's ways hang as branches off laid ground, because a key or a detector inside a lock would
leave it not provably solvable. The section hosting the key a floor-key gate waits on is spread over laid ground no
door shuts.

Only a corridor inside the lock carries a side path: both its end regions are lock regions, so one touching the
floor's own entrance or exit never does. Off-route corridors are offered first, then on-route ones. A corridor
carrying a drop's stretch, a fork-switch junction's arm, one arriving in a sequence step's region, and one joining a
nested lock into its host's nest spot carry none.

The order a layout is searched in (`sidePathStages`, `src/worldGen/carveSeedSearch.ts`):

1. One side path to a corridor, in authored order. Sections beyond the corridors that take them hang outside the
   lock as branches from the start (`outsideLock`).
2. While no layout fits, one more section moves outside the lock, the last authored first, until every section is
   outside.
3. Only when nothing fits even with every section outside does a corridor take two (`corridorsTakeTwo`), searched
   the same way.

A side path is never dropped: inside the lock or outside it, its rooms and loot exist. A floor's `outsideLock` and
`corridorsTakeTwo` are written by the bake, and `yarn layout-report` lists the floors carrying side paths in their
corridors, the sections hung outside, and the floors whose corridors take two. Every catalogue lock is stood with
every region `free`, so no authored appetite is in force.

### A lock holds a puzzle on its way

A layout is accepted only if every lock holds an encounter on its way: on the lock's solving walk, from the first
sight of its shut door to its last control, at least one encounter room (a puzzle, a trap, a chest or a shop) that is
neither its control nor its door. "On the way" is judged per region on the shortest solving walk, so a room in a
dead-end branch of a region the walk crosses counts. A region whose appetite asks for puzzles or a reward must hold
one too. It is one of the bake's hard layout criteria (`HARD_CRITERIA` in `src/worldGen/carveSeedSearch.ts`). A floor
with no content that may stand on lock ground (no main-path puzzle and no content section) is infeasible and fails the
bake by name.

A lock that stands before the floor's content (every region but its way out takes nothing, `lockBeforeFloorContent`)
is exempt: it is a lesson in the lock alone. Every other criterion still holds for it. The starter tomb's level 2
floors 1 (`pitStair`) and 3 (`throwItBack`) stand that way.

## Proposal: one puzzle per floor

Adopted 2026-10-11, and baked as far as it carves (Part 1 says where a stand-in holds a floor). Every one of the 34
junior and expert floors (floor 0 of each site) gets one lock, and no lock is used twice. The tier folders hold
16 junior locks (9 lessons and cellar, dropHome, overlook, seesaw, sluice, lamplighter, tide) for the 16 junior
floors, and 10 expert locks for 18 expert floors. bathHouse and masonsRamp are master: masonsRamp solves with the
stone pipe and waits for a master floor. A master site keeps its floor keys when a lock is placed on it.

Rules the table follows: a journey opens with lessons, in the curriculum's order (lever, drop, board, torch,
swaps, then waterMoves, doorWaitsForTwo, tilesInOrder, stoneOnAPlate); a lock comes only after the lessons it
leans on (`lock-curriculum.md`, "What each lock leans on"); a site that today carries a lock or lesson that stays
there says "kept". Everything else is a re-carve: a hall-shaped lesson (leverOpensADoor, torch, leverSwapsDoors,
doorWaitsForTwo) may meet the bare-hall refusal on a first site, in which case the fallback is dropDown,
boardPicksTheWay or tilesInOrder, which have no hall stub.

### The three unplaced lessons

- **leverOpensADoor** (junior_1 site 1, junior_2 site 2) is one lesson, so one site: junior_1 site 2, where today's
  dropDown moves to site 1 (no hall stub, so no bare hall). Fallback: junior_3 site 1, where it already carves.
  junior_2's site 2 keeps its switch fork and no lesson.
- **leverSwapsDoors** (expert_1 site 1) moves to junior_2 site 2, a junior lesson. Fallback: junior_4 site 5,
  where it already carves. expert_1 site 1 gets an expert lock.
- **boardPicksTheWay** (junior_2 site 1, junior_4 site 1, "board first") stays on junior_1 site 3, kept, after
  the lever.

### Junior (16 floors, 16 existing locks)

| Site | Proposed         | Today                 | Note                                                         |
| ---- | ---------------- | --------------------- | ------------------------------------------------------------ |
| j1.1 | dropDown         | leverOpensADoor (no)  | opens with a hall-less lesson                                |
| j1.2 | leverOpensADoor  | dropDown              | first lever; the unplaced lesson's new site                  |
| j1.3 | boardPicksTheWay | boardPicksTheWay      | kept                                                         |
| j2.1 | torch            | boardPicksTheWay (no) |                                                              |
| j2.2 | leverSwapsDoors  | leverOpensADoor (no)  | the switch fork floor; the unplaced lesson's new site        |
| j2.3 | waterMoves       | torch                 |                                                              |
| j2.4 | sluice           | dropDown              | leans on waterMoves                                          |
| j3.1 | doorWaitsForTwo  | leverOpensADoor       |                                                              |
| j3.2 | beforeYouJump    | dropDown              | written by Claude (2026-10-14); tilesInOrder moved to expert |
| j3.3 | dropHome         | torch                 | leans on board, lever, drop                                  |
| j3.4 | cellar           | boardPicksTheWay      | leans on lever, drop, a floor key                            |
| j4.1 | stoneOnAPlate    | boardPicksTheWay (no) | before the stone locks of expert                             |
| j4.2 | overlook         | leverOpensADoor       |                                                              |
| j4.3 | seesaw           | dropDown              | leans on doorWaitsForTwo                                     |
| j4.4 | lamplighter      | torch                 | leans on board, doorWaitsForTwo                              |
| j4.5 | tide             | leverSwapsDoors       | leans on waterMoves                                          |

### Expert (18 floors, 11 existing locks, 7 to design)

stoneGate closes expert_4 (kept); doubleBack is late, closing expert_3 (kept); twoLamps stays on expert_1 site 3
(kept). relay and doubleBack take three actions, below the expert 4-6, but the designer put them in expert.

| Site | Proposed           | Today                | Note                                                |
| ---- | ------------------ | -------------------- | --------------------------------------------------- |
| e1.1 | tilesInOrder       | leverSwapsDoors (no) | the sequence lesson opens expert                    |
| e1.2 | keyring            | dropHome             |                                                     |
| e1.3 | twoLamps           | twoLamps             | kept                                                |
| e1.4 | plates             | doubleBack           | leans on tilesInOrder; doubleBack moves to expert_3 |
| e2.1 | clockwork          | doorWaitsForTwo      | leans on board, doorWaitsForTwo                     |
| e2.2 | relay              | cellar               | leans on torch, doorWaitsForTwo                     |
| e2.3 | festivalProcession | twoLamps             |                                                     |
| e2.4 | hourglass          | dropHome             |                                                     |
| e3.1 | counterweight      | leverSwapsDoors      | leans on stoneOnAPlate; not yet buildable           |
| e3.2 | observatory        | dropHome             |                                                     |
| e3.3 | highWater          | cellar               |                                                     |
| e3.4 | lockChamber        | overlook             |                                                     |
| e3.5 | doubleBack         | doubleBack           | kept                                                |
| e4.1 | twoStones          | stoneOnAPlate        | leans on stoneOnAPlate; not yet buildable           |
| e4.2 | throughTheWall     | twoLamps             |                                                     |
| e4.3 | scaffold           | cellar               |                                                     |
| e4.4 | buildersLift       | overlook             |                                                     |
| e4.5 | stoneGate          | stoneGate            | kept                                                |

Counts: 27 floors get a lock that existed when this was adopted (16 junior, 11 expert); the 7 expert slots that were
"to design" hold Claude's locks (2026-10-16).
Kept as placed today: junior_1 site 3, expert_1 site 3, expert_3 site 5, expert_4 site 5; the other 22 re-carve.
Wizard has no locks and no floors here.

## Part 2 — mechanics coverage

### The mechanics

One name per mechanic the player experiences, read from the parsed lock (`parseLock`):

| mechanic           | in the lock                                                                      |
| ------------------ | -------------------------------------------------------------------------------- |
| lever              | a `toggle` control                                                               |
| board              | a `fork` control (fork-switch)                                                   |
| torch              | an `activator` control                                                           |
| drop               | a one-way, `>>`                                                                  |
| door-waits-for-two | a gate with two or more owners under "every" (`-[A+B]-`); plates count as owners |
| stones & plates    | any plate (`weights`)                                                            |
| narrow passage     | a gate owned by `unladen` alone                                                  |
| water/sand barrier | a region gate (`hall -[S:wet]`)                                                  |
| sequence tiles     | a `sequence` control                                                             |

### Every lock and lesson

The verdict is `yarn lock`'s. "Not buildable" is the tool's own flag; the stone locks walk and solve in the tool
but are still a proposal for the engine (`lock-curriculum.md`, "Stones").

**Lessons**

| lesson           | tier                      | mechanics                 | yarn lock                   |
| ---------------- | ------------------------- | ------------------------- | --------------------------- |
| boardPicksTheWay | junior                    | board                     | solvable; under two actions |
| leverOpensADoor  | junior                    | lever                     | solvable; under two actions |
| dropDown         | junior                    | drop                      | solvable; under two actions |
| torch            | junior                    | torch                     | solvable; under two actions |
| leverSwapsDoors  | junior preview and expert | lever                     | solvable; under two actions |
| doorWaitsForTwo  | expert                    | torch, door-waits-for-two | solvable                    |
| stoneOnAPlate    | expert                    | stones & plates           | solvable                    |
| tilesInOrder     | expert                    | sequence tiles            | solvable                    |
| waterMoves       | expert                    | lever, water/sand barrier | solvable; under two actions |

**Locks**

| lock               | tier                                        | mechanics                                                                              | yarn lock                                                  |
| ------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| dropHome           | expert                                      | lever, board, drop                                                                     | solvable                                                   |
| cellar             | expert                                      | lever, torch, drop                                                                     | solvable                                                   |
| twoLamps           | expert                                      | lever, board, door-waits-for-two                                                       | solvable                                                   |
| overlook           | expert                                      | lever, drop                                                                            | solvable                                                   |
| doubleBack         | expert capstone                             | lever, board, drop                                                                     | solvable                                                   |
| twoStones          | expert, stones                              | door-waits-for-two, stones & plates                                                    | solvable                                                   |
| seesaw             | master                                      | lever, drop, door-waits-for-two                                                        | solvable                                                   |
| keyring            | master                                      | lever, torch                                                                           | solvable                                                   |
| relay              | master                                      | lever, torch, drop, door-waits-for-two                                                 | solvable                                                   |
| beforeYouJump      | junior                                      | lever, drop, door-waits-for-two                                                        | solvable; control reached before its door is seen: pit-out |
| clockwork          | master                                      | lever, board, drop, door-waits-for-two                                                 | solvable                                                   |
| lamplighter        | master                                      | lever, board, drop, door-waits-for-two                                                 | solvable; drop west>east is an optional shortcut           |
| observatory        | master                                      | board, torch, drop, door-waits-for-two                                                 | solvable; drop east>west is an optional shortcut           |
| counterweight      | master, stones                              | drop, door-waits-for-two, stones & plates                                              | solvable                                                   |
| masonsRamp         | master, stones                              | drop, stones & plates, stone pipe, narrow passage                                      | solvable; drop chute>workshop is an optional shortcut      |
| plates             | master                                      | sequence tiles                                                                         | solvable                                                   |
| sluice             | master                                      | lever, torch, water/sand barrier                                                       | solvable                                                   |
| tide               | master                                      | lever, torch, water/sand barrier                                                       | solvable                                                   |
| stoneGate          | expert capstone (Djoser 5), stones          | torch, door-waits-for-two, stones & plates, narrow passage                             | solvable                                                   |
| weighingOfTheHeart | master (Book of the Dead 5), stones, by Tom | lever, door-waits-for-two, stones & plates, stone pipe, narrow passage, sequence tiles | solvable; gate court-west does nothing (kept by design)    |
| caveLevers         | junior (starter tomb cave)                  | lever                                                                                  | solvable                                                   |
| pitStair           | junior (starter tomb cavern 2)              | lever, drop                                                                            | solvable                                                   |
| throwItBack        | expert (starter tomb capstone)              | lever, drop                                                                            | solvable                                                   |

The curriculum's "lever: all but plates" is wider than the files: twoStones, counterweight, masonsRamp,
observatory and stoneGate have no lever either.

### Pairs

Which locks combine each pair (_italic_ = a lesson). A cell names every lock that holds both, whatever else it
holds. The diagonal is the mechanic alone.

|                   | lever                                | board                                                  | torch                                | drop                                                                                         | waits-for-two                                                                    | stones                              | narrow                | water/sand                 | sequence               |
| ----------------- | ------------------------------------ | ------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- | --------------------- | -------------------------- | ---------------------- |
| **lever**         | _leverOpensADoor_, _leverSwapsDoors_ | clockwork, doubleBack, dropHome, lamplighter, twoLamps | cellar, keyring, relay, sluice, tide | beforeYouJump, cellar, clockwork, doubleBack, dropHome, lamplighter, overlook, relay, seesaw | beforeYouJump, clockwork, lamplighter, relay, seesaw, twoLamps                   | **— gap —**                         | **— gap —**           | _waterMoves_, sluice, tide | **— gap —**            |
| **board**         |                                      | _boardPicksTheWay_                                     | observatory                          | clockwork, doubleBack, dropHome, lamplighter, observatory                                    | clockwork, lamplighter, observatory, twoLamps                                    | **— gap —**                         | **— gap —**           | **— gap —**                | **— gap —**            |
| **torch**         |                                      |                                                        | _torch_                              | cellar, observatory, relay                                                                   | _doorWaitsForTwo_, observatory, relay, stoneGate                                 | stoneGate                           | stoneGate             | sluice, tide               | **— gap —**            |
| **drop**          |                                      |                                                        |                                      | _dropDown_                                                                                   | beforeYouJump, clockwork, counterweight, lamplighter, observatory, relay, seesaw | counterweight, masonsRamp           | masonsRamp            | **— gap —**                | **— gap —**            |
| **waits-for-two** |                                      |                                                        |                                      |                                                                                              | no lesson alone                                                                  | counterweight, stoneGate, twoStones | stoneGate             | **— gap —**                | **— gap —**            |
| **stones**        |                                      |                                                        |                                      |                                                                                              |                                                                                  | _stoneOnAPlate_                     | masonsRamp, stoneGate | **— gap —**                | **— gap —**            |
| **narrow**        |                                      |                                                        |                                      |                                                                                              |                                                                                  |                                     | no lesson alone       | **— gap —**                | **— gap —**            |
| **water/sand**    |                                      |                                                        |                                      |                                                                                              |                                                                                  |                                     |                       | no lesson alone            | **— gap —**            |
| **sequence**      |                                      |                                                        |                                      |                                                                                              |                                                                                  |                                     |                       |                            | _tilesInOrder_, plates |

17 of the 36 pairs have no lock. Every one of them involves stones, the narrow passage, water/sand or sequence
tiles; lever, board, torch, drop and door-waits-for-two are combined pairwise
throughout. Sequence tiles combine with nothing: plates is a sequence alone.

Of those pairs, two meet only at master: board × torch (observatory) and torch × door-waits-for-two
outside its lesson (observatory, relay), and stoneGate at Djoser's capstone.

### Triples

Every three-mechanic combination that at least one lock holds (16 of the 84):

| triple                                                | locks                                                |
| ----------------------------------------------------- | ---------------------------------------------------- |
| lever + board + drop                                  | clockwork, doubleBack, dropHome, lamplighter         |
| lever + board + door-waits-for-two                    | clockwork, lamplighter, twoLamps                     |
| lever + torch + drop                                  | cellar, relay                                        |
| lever + torch + door-waits-for-two                    | relay                                                |
| lever + torch + water/sand barrier                    | sluice, tide                                         |
| lever + drop + door-waits-for-two                     | beforeYouJump, clockwork, lamplighter, relay, seesaw |
| board + torch + drop                                  | observatory                                          |
| board + torch + door-waits-for-two                    | observatory                                          |
| board + drop + door-waits-for-two                     | clockwork, lamplighter, observatory                  |
| torch + drop + door-waits-for-two                     | observatory, relay                                   |
| torch + door-waits-for-two + stones & plates          | stoneGate                                            |
| torch + door-waits-for-two + narrow passage           | stoneGate                                            |
| torch + stones & plates + narrow passage              | stoneGate                                            |
| drop + door-waits-for-two + stones & plates           | counterweight                                        |
| drop + stones & plates + narrow passage               | masonsRamp                                           |
| door-waits-for-two + stones & plates + narrow passage | stoneGate                                            |

68 triples are uncovered. Many are not worth a lock: the narrow passage only means something where a stone can
be carried, so its triples without stones are empty, and sequence tiles have no pair yet to grow a triple from.

_Suggestion, judged lightly:_ the uncovered triples that look most natural for junior and expert.

- **lever + board + torch.** All three are junior lessons; the only triple of lever, board, torch, drop and
  door-waits-for-two that no lock holds.
- **lever + door-waits-for-two + stones & plates.** A plate and a lever co-own one door: the step after
  stoneOnAPlate and doorWaitsForTwo, at Djoser before stoneGate.
- **lever + drop + water/sand barrier.** Drop into a flooded hall that a lever drains: the Nile Delta's lock.
- **torch + drop + stones & plates.** Light the way back before going down, because a stone never rides a drop.

### Mechanics with no single-mechanic lesson

- **door-waits-for-two**: its lesson, doorWaitsForTwo, owns the door with two torches, so it teaches the torch
  too. It reads as one beat because the torch is taught first.
- **water/sand barrier**: waterMoves has a lever drain the hall; a barrier always needs a control to move it.
- **narrow passage**: no lesson at all. It is met first in masonsRamp or stoneGate.

Lever, board, torch, drop, stones & plates and sequence tiles each have a lesson of their own.
