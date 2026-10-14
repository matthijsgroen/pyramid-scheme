# Lock placement

Which lock or lesson stands on which site, as a table the designer fills in, and which mechanics each lock in
the catalogue combines. The curriculum it starts from is `lock-curriculum.md`; the locks are the files in
`src/game/locks/{junior,expert,master,wizard}/**/*.lock` (lessons in `junior/lessons/`).

## Part 1 — the placement table

Junior and expert only. Master and wizard are shielded for now: their sites keep their floor keys.

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

Placed: 34 of 34 (2026-10-14).

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

| Site | Main floors | Wing floors | Authored         | Chosen lock | Placed                                |
| ---- | ----------- | ----------- | ---------------- | ----------- | ------------------------------------- |
| 1    | 1           | 0           |                  | clockwork   | ✓                                     |
| 2    | 1           | 0           |                  | relay       | ✓                                     |
| 3    | 1           | 1           | master ward wing | twoLamps    | ✓ stand-in (an expert lock to design) |
| 4    | 1           | 1           | wizard ward wing | dropHome    | ✓ stand-in (an expert lock to design) |

**expert_3 — Nile Delta Expedition** (overgrown, growing from pyramid 2 to 5)

| Site | Main floors | Wing floors | Authored                                    | Chosen lock     | Placed                                                           |
| ---- | ----------- | ----------- | ------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| 1    | 1           | 0           |                                             | leverSwapsDoors | ✓ stand-in (counterweight is not buildable yet)                  |
| 2    | 1           | 0           | overgrown 0.2                               | dropHome        | ✓ stand-in (observatory does not lay: its board needs five ways) |
| 3    | 1           | 0           | overgrown 0.4                               | cellar          | ✓ stand-in (an expert lock to design)                            |
| 4    | 1           | 1           | overgrown 0.65, wizard ward wing            | overlook        | ✓ stand-in (an expert lock to design)                            |
| 5    | 1           | 1           | overgrown 1, master ward wing, patron Sobek | doubleBack      | ✓                                                                |

**expert_4 — Pyramid of Djoser**

| Site | Main floors | Wing floors | Authored                                               | Chosen lock   | Placed                                      |
| ---- | ----------- | ----------- | ------------------------------------------------------ | ------------- | ------------------------------------------- |
| 1    | 1           | 0           |                                                        | stoneOnAPlate | ✓ stand-in (twoStones is not buildable yet) |
| 2    | 1           | 0           | two floor-key colours, broad packing                   | twoLamps      | ✓ stand-in (an expert lock to design)       |
| 3    | 1           | 0           |                                                        | cellar        | ✓ stand-in (an expert lock to design)       |
| 4    | 1           | 1           | two floor-key colours, broad packing, master ward wing | overlook      | ✓ stand-in (an expert lock to design)       |
| 5    | 1           | 1           | wizard ward wing                                       | stoneGate     | ✓                                           |

Site counts: junior 16 (3 + 4 + 4 + 5), expert 18 (4 + 4 + 5 + 5), the same as the curriculum's. Treasure
tombs are not sites in this table.

Duplicates among the stand-ins, until they are replaced: leverSwapsDoors (junior_2 site 2 and expert_3 site 1), stoneOnAPlate (junior_4 site 1 and expert_4 site 1), cellar
(junior_3 site 4, expert_3 site 3, expert_4 site 3), dropHome (junior_3 site 3, expert_2 site 4,
expert_3 site 2), twoLamps (expert_1 site 3, expert_2 site 3, expert_4 site 2), overlook (junior_4 site 2, expert_3
site 4, expert_4 site 4).

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
activator `torch`). expert_3's doubleBack pyramid authors `packing: 0.15`: at the default packing its floor carves at
the inspector's default seed on no attempt. No `RELAID_FLOORS_VERSION`, by the designer's call.

A lesson stands through `lessonOnMainFloor(name)` in `src/worldGen/spec/locks/lessons.ts`: the lesson's file read as
`catalogueLock("lessons/<name>")`, every region `free`, and only the kinds the lesson uses bound (toggle `handle`,
fork-switch `lightbeamSwitch`, one-way `zipline`, flame `torch`, weights `stonePlate`). The lessons raised no
`RELAID_FLOORS_VERSION`, by the designer's call: a save standing inside one of their pyramids keeps its place.

## Proposal: one puzzle per floor

Adopted 2026-10-11, and baked as far as it carves (Part 1 says where a stand-in holds a floor). Every one of the 34
junior and expert floors (floor 0 of each site) gets one lock, and no lock is used twice. The tier folders hold
16 junior locks (9 lessons and cellar, dropHome, overlook, seesaw, sluice, lamplighter, tide) for the 16 junior
floors, and 10 expert locks for 18 expert floors. bathHouse and masonsRamp are master: masonsRamp is not placeable
until the stone pipe exists, and master sites keep their floor keys.

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

| Site | Proposed                        | Today                | Note                                                |
| ---- | ------------------------------- | -------------------- | --------------------------------------------------- |
| e1.1 | tilesInOrder                    | leverSwapsDoors (no) | the sequence lesson opens expert                    |
| e1.2 | keyring                         | dropHome             |                                                     |
| e1.3 | twoLamps                        | twoLamps             | kept                                                |
| e1.4 | plates                          | doubleBack           | leans on tilesInOrder; doubleBack moves to expert_3 |
| e2.1 | clockwork                       | doorWaitsForTwo      | leans on board, doorWaitsForTwo                     |
| e2.2 | relay                           | cellar               | leans on torch, doorWaitsForTwo                     |
| e2.3 | to design (expert, 4-6 actions) | twoLamps             |                                                     |
| e2.4 | to design (expert, 4-6 actions) | dropHome             |                                                     |
| e3.1 | counterweight                   | leverSwapsDoors      | leans on stoneOnAPlate; not yet buildable           |
| e3.2 | observatory                     | dropHome             |                                                     |
| e3.3 | to design (expert, 4-6 actions) | cellar               |                                                     |
| e3.4 | to design (expert, 4-6 actions) | overlook             |                                                     |
| e3.5 | doubleBack                      | doubleBack           | kept                                                |
| e4.1 | twoStones                       | stoneOnAPlate        | leans on stoneOnAPlate; not yet buildable           |
| e4.2 | to design (expert, 4-6 actions) | twoLamps             |                                                     |
| e4.3 | to design (expert, 4-6 actions) | cellar               |                                                     |
| e4.4 | to design (expert, 4-6 actions) | overlook             |                                                     |
| e4.5 | stoneGate                       | stoneGate            | kept                                                |

Counts: 27 floors get an existing lock (16 junior, 11 expert); 7 expert slots are "to design".
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

| lock          | tier                               | mechanics                                                  | yarn lock                                                          |
| ------------- | ---------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| dropHome      | expert                             | lever, board, drop                                         | solvable                                                           |
| cellar        | expert                             | lever, torch, drop                                         | solvable                                                           |
| twoLamps      | expert                             | lever, board, door-waits-for-two                           | solvable                                                           |
| overlook      | expert                             | lever, drop                                                | solvable                                                           |
| doubleBack    | expert capstone                    | lever, board, drop                                         | solvable                                                           |
| twoStones     | expert, stones                     | door-waits-for-two, stones & plates                        | solvable                                                           |
| seesaw        | master                             | lever, drop, door-waits-for-two                            | solvable                                                           |
| keyring       | master                             | lever, torch                                               | solvable                                                           |
| relay         | master                             | lever, torch, drop, door-waits-for-two                     | solvable                                                           |
| beforeYouJump | junior                             | lever, drop, door-waits-for-two                            | solvable; control reached before its door is seen: pit-out         |
| clockwork     | master                             | lever, board, drop, door-waits-for-two                     | solvable                                                           |
| lamplighter   | master                             | lever, board, drop, door-waits-for-two                     | solvable; drop west>east is an optional shortcut                   |
| observatory   | master                             | board, torch, drop, door-waits-for-two                     | solvable; drop east>west is an optional shortcut                   |
| counterweight | master, stones                     | drop, door-waits-for-two, stones & plates                  | solvable                                                           |
| masonsRamp    | master, stones                     | drop, stones & plates, narrow passage                      | **not solvable**: `out` never reached (waits on a stone-only pipe) |
| plates        | master                             | sequence tiles                                             | solvable                                                           |
| sluice        | master                             | lever, torch, water/sand barrier                           | solvable                                                           |
| tide          | master                             | lever, torch, water/sand barrier                           | solvable                                                           |
| stoneGate     | expert capstone (Djoser 5), stones | torch, door-waits-for-two, stones & plates, narrow passage | solvable                                                           |

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
