# Lock placement

Which lock or lesson stands on which site, as a table the designer fills in, and which mechanics each lock in
the catalogue combines. The curriculum it starts from is `lock-curriculum.md`; the locks are the files in
`src/game/locks/*.lock` and `src/game/locks/lessons/*.lock`.

## Part 1 — the placement table

Junior and expert only. Master and wizard are shielded for now: their sites keep their floor keys.

Columns:

- **Site**: the pyramid number as the world spec names it, `journey("…").pyramid(n)`, counted from 1.
- **Main floors**: main-path floors in the baked world (`src/data/generatedWorld.ts`). Every junior and expert
  pyramid has one, floor `0`, which is the floor `floorLocks` names.
- **Wing floors**: extra floors up a ward-gated stair (`wardWings`), off the main path.
- **Authored**: what the world spec already says about the site, where it says something.
- **Suggested**: the curriculum's layer for the site, copied from `lock-curriculum.md`.
- **Chosen lock**: the designer's pick, pre-filled with the suggestion.
- **Placed**: ✓ where the world spec places it today.
  "no" names why a chosen lesson is not placed:
  - **board first**: boardPicksTheWay on a journey's first site. The lesson's door is opened by a lever (`S toggle`,
    bound to the handle), and on junior_2 and junior_4 the board comes before the journey's lever lesson, so the site
    would teach two mechanics at once. Placed where the lever was taught first (junior_1 site 3, junior_3 site 4);
    whether a fork lesson may also teach the lever is the designer's call.
  - **switch fork**: leverOpensADoor on junior_2's site 2. The switch fork chooses between two ungated branches
    (`switchBranch`), and a laid floor stands an ungated chest-ending section's rooms on its laid nodes instead of
    growing it as a branch, so nothing branches where `forks` could reserve a junction (`forksUnsatisfied` with none
    carved). Every node of the laid route holds a room, so no route node has the two free ways out a junction needs.
    Kept as branches, the nine sections find no room on the grid the lay sizes for the lock (`layoutNotFound` on every
    seed tried). The lay would have to reserve a junction node and grow the grid for its branches: assembler work.

### Junior

**junior_1 — Sacred Ibis Migration** (`water` role on pyramids 1-3, patron Thoth)

| Site | Main floors | Wing floors | Authored         | Suggested        | Chosen lock      | Placed |
| ---- | ----------- | ----------- | ---------------- | ---------------- | ---------------- | ------ |
| 1    | 1           | 0           |                  | leverOpensADoor  | leverOpensADoor  | ✓      |
| 2    | 1           | 0           |                  | dropDown         | dropDown         | ✓      |
| 3    | 1           | 1           | expert ward wing | boardPicksTheWay | boardPicksTheWay | ✓      |

**junior_2 — Valley of the Artisans**

| Site | Main floors | Wing floors | Authored                                                                     | Suggested                                                        | Chosen lock                                                      | Placed           |
| ---- | ----------- | ----------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------- |
| 1    | 1           | 0           |                                                                              | boardPicksTheWay (the switch fork already authored at pyramid 2) | boardPicksTheWay (the switch fork already authored at pyramid 2) | no (board first) |
| 2    | 1           | 0           | the world's one switch fork: a `lightbeamSwitch` board in a two-way junction | leverOpensADoor                                                  | leverOpensADoor                                                  | no (switch fork) |
| 3    | 1           | 1           | master ward wing                                                             | torch                                                            | torch                                                            | ✓                |
| 4    | 1           | 1           | wizard ward wing                                                             | dropDown                                                         | dropDown                                                         | ✓                |

**junior_3 — Temple of Thoth** (patron Thoth)

| Site | Main floors | Wing floors | Authored         | Suggested        | Chosen lock      | Placed |
| ---- | ----------- | ----------- | ---------------- | ---------------- | ---------------- | ------ |
| 1    | 1           | 0           |                  | leverOpensADoor  | leverOpensADoor  | ✓      |
| 2    | 1           | 0           |                  | dropDown         | dropDown         | ✓      |
| 3    | 1           | 1           | expert ward wing | torch            | torch            | ✓      |
| 4    | 1           | 1           | master ward wing | boardPicksTheWay | boardPicksTheWay | ✓      |

**junior_4 — Lighthouse of Alexandria** (`light`/`sky` role and night theme on pyramids 1-5)

| Site | Main floors | Wing floors | Authored         | Suggested        | Chosen lock      | Placed           |
| ---- | ----------- | ----------- | ---------------- | ---------------- | ---------------- | ---------------- |
| 1    | 1           | 0           |                  | boardPicksTheWay | boardPicksTheWay | no (board first) |
| 2    | 1           | 0           |                  | leverOpensADoor  | leverOpensADoor  | ✓                |
| 3    | 1           | 0           |                  | dropDown         | dropDown         | ✓                |
| 4    | 1           | 1           | wizard ward wing | torch            | torch            | ✓                |
| 5    | 1           | 1           | expert ward wing | leverSwapsDoors  | leverSwapsDoors  | ✓                |

### Expert

**expert_1 — Valley of the Kings** (`funerary` role on pyramids 1-4)

| Site | Main floors | Wing floors | Authored                            | Suggested       | Chosen lock     | Placed |
| ---- | ----------- | ----------- | ----------------------------------- | --------------- | --------------- | ------ |
| 1    | 1           | 0           |                                     | leverSwapsDoors | leverSwapsDoors | ✓      |
| 2    | 1           | 0           |                                     | dropHome        | dropHome        | ✓      |
| 3    | 1           | 2           | master ward wing, starter ward wing | twoLamps        | twoLamps        | ✓      |
| 4    | 1           | 1           | wizard ward wing, patron Anubis     | **doubleBack**  | doubleBack      | ✓      |

**expert_2 — Karnak Temple Complex**

| Site | Main floors | Wing floors | Authored         | Suggested       | Chosen lock     | Placed |
| ---- | ----------- | ----------- | ---------------- | --------------- | --------------- | ------ |
| 1    | 1           | 0           |                  | doorWaitsForTwo | doorWaitsForTwo | ✓      |
| 2    | 1           | 0           |                  | cellar          | cellar          | ✓      |
| 3    | 1           | 1           | master ward wing | twoLamps        | twoLamps        | ✓      |
| 4    | 1           | 1           | wizard ward wing | dropHome        | dropHome        | ✓      |

**expert_3 — Nile Delta Expedition** (overgrown, growing from pyramid 2 to 5)

| Site | Main floors | Wing floors | Authored                                    | Suggested       | Chosen lock     | Placed                 |
| ---- | ----------- | ----------- | ------------------------------------------- | --------------- | --------------- | ---------------------- |
| 1    | 1           | 0           |                                             | leverSwapsDoors | leverSwapsDoors | ✓                      |
| 2    | 1           | 0           | overgrown 0.2                               | dropHome        | dropHome        | ✓                      |
| 3    | 1           | 0           | overgrown 0.4                               | cellar          | cellar          | ✓                      |
| 4    | 1           | 1           | overgrown 0.65, wizard ward wing            | overlook        | overlook        | ✓                      |
| 5    | 1           | 1           | overgrown 1, master ward wing, patron Sobek | **doubleBack**  | doubleBack      | ✓                      |

**expert_4 — Pyramid of Djoser**

| Site | Main floors | Wing floors | Authored                                               | Suggested       | Chosen lock   | Placed                 |
| ---- | ----------- | ----------- | ------------------------------------------------------ | --------------- | ------------- | ---------------------- |
| 1    | 1           | 0           |                                                        | doorWaitsForTwo | stoneOnAPlate | ✓                      |
| 2    | 1           | 0           | two floor-key colours, broad packing                   | twoLamps        | twoLamps      | ✓                      |
| 3    | 1           | 0           |                                                        | cellar          | cellar        | ✓                      |
| 4    | 1           | 1           | two floor-key colours, broad packing, master ward wing | overlook        | overlook      | ✓                      |
| 5    | 1           | 1           | wizard ward wing                                       | **doubleBack**  | stoneGate     | ✓                      |

Site counts: junior 16 (3 + 4 + 4 + 5), expert 18 (4 + 4 + 5 + 5), the same as the curriculum's. Treasure
tombs are not sites in this table.

### Where the curriculum and the world spec disagree

- **The junior switch fork.** The curriculum puts boardPicksTheWay on junior_2's first site and says the
  switch fork is "already authored at pyramid 2", but the world spec authors it on pyramid 2 (site 2), where the
  curriculum suggests leverOpensADoor. One of the two moves: the lesson to site 2, or the fork to site 1.
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

expert_1's doubleBack stands through the same `floorLocks` with its realisations bound (fork-switch
`lightbeamSwitch`, toggle `handle`, one-way `zipline`), but reads the lock from `doubleBackLock()` in
`src/worldGen/spec/locks/doubleBack.ts` rather than from its `.lock` file.

expert_4's stoneGate stands the same way, read from its `.lock` file with `catalogueLock` and every region `free`
(`freeRegions`), bound `weights` `stonePlate`, `activator` `torch`, `unladen` `narrowPassage`.

The expert locks between a journey's lesson and its capstone (dropHome, twoLamps, cellar, and doubleBack on expert_3)
stand through `lockOnMainFloor(name)` in `src/worldGen/spec/expert.ts`: the lock read with `catalogueLock`, every
region `free`, and only the kinds it uses bound (fork-switch `lightbeamSwitch`, toggle `handle`, one-way `zipline`,
activator `torch`). expert_3's doubleBack pyramid authors `packing: 0.15`: at the default packing its floor carves at
the inspector's default seed on no attempt. No `RELAID_FLOORS_VERSION`, by the designer's call.

A lesson stands through `lessonOnMainFloor(name)` in `src/worldGen/spec/locks/lessons.ts`: the lesson's file read as
`catalogueLock("lessons/<name>")`, every region `free`, and only the kinds the lesson uses bound (toggle `handle`,
fork-switch `lightbeamSwitch`, one-way `zipline`, flame `torch`, weights `stonePlate`). The lessons raised no
`RELAID_FLOORS_VERSION`, by the designer's call: a save standing inside one of their pyramids keeps its place.

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

| lesson           | tier                      | mechanics                 | yarn lock                         |
| ---------------- | ------------------------- | ------------------------- | --------------------------------- |
| boardPicksTheWay | junior                    | board                     | solvable; under two actions       |
| leverOpensADoor  | junior                    | lever                     | solvable; under two actions       |
| dropDown         | junior                    | drop                      | solvable; under two actions       |
| torch            | junior                    | torch                     | solvable; under two actions       |
| leverSwapsDoors  | junior preview and expert | lever                     | solvable; under two actions       |
| doorWaitsForTwo  | expert                    | torch, door-waits-for-two | solvable                          |
| stoneOnAPlate    | expert                    | stones & plates           | solvable                          |
| tilesInOrder     | expert                    | sequence tiles            | solvable; not buildable: sequence |
| waterMoves       | expert                    | lever, water/sand barrier | solvable; under two actions       |

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
| clockwork     | master                             | lever, board, drop, door-waits-for-two                     | solvable                                                           |
| lamplighter   | master                             | lever, board, drop, door-waits-for-two                     | solvable; drop west>east is an optional shortcut                   |
| observatory   | master                             | board, torch, drop, door-waits-for-two                     | solvable; drop east>west is an optional shortcut                   |
| counterweight | master, stones                     | drop, door-waits-for-two, stones & plates                  | solvable                                                           |
| masonsRamp    | master, stones                     | drop, stones & plates, narrow passage                      | **not solvable**: `out` never reached (waits on a stone-only pipe) |
| plates        | master                             | sequence tiles                                             | solvable; not buildable: sequence                                  |
| sluice        | master                             | lever, torch, water/sand barrier                           | solvable                                                           |
| tide          | master                             | lever, torch, water/sand barrier                           | solvable                                                           |
| stoneGate     | expert capstone (Djoser 5), stones | torch, door-waits-for-two, stones & plates, narrow passage | solvable                                                           |

The curriculum's "lever: all but plates" is wider than the files: twoStones, counterweight, masonsRamp,
observatory and stoneGate have no lever either.

### Pairs

Which locks combine each pair (_italic_ = a lesson). A cell names every lock that holds both, whatever else it
holds. The diagonal is the mechanic alone.

|                   | lever                                | board                                                  | torch                                | drop                                                                          | waits-for-two                                                     | stones                              | narrow                | water/sand                 | sequence               |
| ----------------- | ------------------------------------ | ------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- | --------------------- | -------------------------- | ---------------------- |
| **lever**         | _leverOpensADoor_, _leverSwapsDoors_ | clockwork, doubleBack, dropHome, lamplighter, twoLamps | cellar, keyring, relay, sluice, tide | cellar, clockwork, doubleBack, dropHome, lamplighter, overlook, relay, seesaw | clockwork, lamplighter, relay, seesaw, twoLamps                   | **— gap —**                         | **— gap —**           | _waterMoves_, sluice, tide | **— gap —**            |
| **board**         |                                      | _boardPicksTheWay_                                     | observatory                          | clockwork, doubleBack, dropHome, lamplighter, observatory                     | clockwork, lamplighter, observatory, twoLamps                     | **— gap —**                         | **— gap —**           | **— gap —**                | **— gap —**            |
| **torch**         |                                      |                                                        | _torch_                              | cellar, observatory, relay                                                    | _doorWaitsForTwo_, observatory, relay, stoneGate                  | stoneGate                           | stoneGate             | sluice, tide               | **— gap —**            |
| **drop**          |                                      |                                                        |                                      | _dropDown_                                                                    | clockwork, counterweight, lamplighter, observatory, relay, seesaw | counterweight, masonsRamp           | masonsRamp            | **— gap —**                | **— gap —**            |
| **waits-for-two** |                                      |                                                        |                                      |                                                                               | no lesson alone                                                   | counterweight, stoneGate, twoStones | stoneGate             | **— gap —**                | **— gap —**            |
| **stones**        |                                      |                                                        |                                      |                                                                               |                                                                   | _stoneOnAPlate_                     | masonsRamp, stoneGate | **— gap —**                | **— gap —**            |
| **narrow**        |                                      |                                                        |                                      |                                                                               |                                                                   |                                     | no lesson alone       | **— gap —**                | **— gap —**            |
| **water/sand**    |                                      |                                                        |                                      |                                                                               |                                                                   |                                     |                       | no lesson alone            | **— gap —**            |
| **sequence**      |                                      |                                                        |                                      |                                                                               |                                                                   |                                     |                       |                            | _tilesInOrder_, plates |

17 of the 36 pairs have no lock. Every one of them involves stones, the narrow passage, water/sand or sequence
tiles; lever, board, torch, drop and door-waits-for-two are combined pairwise
throughout. Sequence tiles combine with nothing: plates is a sequence alone.

Of those pairs, three meet only at master: board × torch (observatory), drop × door-waits-for-two
(clockwork, lamplighter, observatory, relay, seesaw; counterweight is master too), and torch × door-waits-for-two
outside its lesson (observatory, relay), and stoneGate at Djoser's capstone.

### Triples

Every three-mechanic combination that at least one lock holds (16 of the 84):

| triple                                                | locks                                        |
| ----------------------------------------------------- | -------------------------------------------- |
| lever + board + drop                                  | clockwork, doubleBack, dropHome, lamplighter |
| lever + board + door-waits-for-two                    | clockwork, lamplighter, twoLamps             |
| lever + torch + drop                                  | cellar, relay                                |
| lever + torch + door-waits-for-two                    | relay                                        |
| lever + torch + water/sand barrier                    | sluice, tide                                 |
| lever + drop + door-waits-for-two                     | clockwork, lamplighter, relay, seesaw        |
| board + torch + drop                                  | observatory                                  |
| board + torch + door-waits-for-two                    | observatory                                  |
| board + drop + door-waits-for-two                     | clockwork, lamplighter, observatory          |
| torch + drop + door-waits-for-two                     | observatory, relay                           |
| torch + door-waits-for-two + stones & plates          | stoneGate                                    |
| torch + door-waits-for-two + narrow passage           | stoneGate                                    |
| torch + stones & plates + narrow passage              | stoneGate                                    |
| drop + door-waits-for-two + stones & plates           | counterweight                                |
| drop + stones & plates + narrow passage               | masonsRamp                                   |
| door-waits-for-two + stones & plates + narrow passage | stoneGate                                    |

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
