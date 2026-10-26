# Camp phases 4b and 4c — side paths in a lock's corridors, the tunnel to the Sphinx — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md). The art prompts in Task 5 are content, not code, and are copied verbatim.

**Goal:** A lock's corridors carry the floor's open and trapped side paths, so between two of a lock's areas the player meets a side path's puzzles and chest with the lock's obstacles in between; and the ending moves inside the Sphinx, reached from starter_1's ward gate through a wizard cave floor and a stair up. Both land in one bake.

**Architecture:**

1. **Phase 4b, a lock as a blueprint.** On a lock floor the carve already absorbs ungated side sections onto laid nodes, spread from the way in (`prepareFloor.ts` `isContentSection`, `laidFloor.ts` `fillLaidFloor`). This plan gives each eligible side section **a corridor of the lock**: a pure assignment (`assignCorridors`) pairs sections with the lock plan's corridors before the lay, one per corridor while corridors last, and only when there are more sections than corridors does a corridor take a second; the lay sizes each corridor for its sections' rooms; the fill seats a section on its corridor only, in walk order, its puzzles first and its chest last, the corridor's doors between them where the lay puts them. Trapped (sealed) side sections become eligible; gated, keyed and hidden ones stay branches (a key or a detector inside a lock would make it not provably solvable). An absorbed trap room keeps the isolation `sealed` asks for.
2. **A side path that fits no layout inside the lock is hung outside it, never dropped.** The layout search tries every candidate with every eligible section inside; when none meets the hard criteria it moves one section outside the lock (the last authored first) and searches again, until a layout is found. A section outside the lock is a branch off laid ground, as gated sections are today, so its rooms and loot still exist. The sections moved out are pinned on the floor (`outsideLock`) and listed by `yarn layout-report`. No hard criterion is relaxed: a floor that meets none with every section outside still fails the bake by name.
3. **Phase 4c, stairs name their floor.** A side path ending in a stair, and a floor's main path, may name the floor index the stair leads to (`toFloor`); default is the next floor, so every existing authoring wires as before. A floor may author its `depth` (default its index); a stair climbs when it leads to a shallower floor, and that direction is stamped on the stair so the map draws it. A stair always leads to a later floor index (refused otherwise), so the reachability walk, which visits floors in index order, needs no change.
4. **The tunnel.** starter_1 pyramid 1: floor 0's Sphinx ward chest becomes a ward stair (`toFloor: 2`) gated by the same Vault of the Gods key; floor 2 is a wizard cave floor (cave dressing, seven puzzles on its main path, no lock) whose main path climbs (`toFloor: 3`) into floor 3, the Sphinx interior (new `sphinx` tileset), whose one room is the reading. The wall data (`walls.ts`, keyed by journey) is unchanged.
5. **One bake at the end** (Task 7), after `yarn layout-report` has measured 4b without baking (Task 3).

**Tech Stack:** TypeScript, Vitest, `src/game/{laidFloor,lockPlan,lockPuzzles}.ts`, `src/game/carve/{prepareFloor,layFloor,isolate,roomSpecs}.ts`, `src/worldGen/{carveSeedSearch,buildSite,sideSections,dsl,serializer}.ts`, `scripts/{layoutPicker,layoutReport,generateWorld}.ts`, `src/app/SiteMap/*`, `yarn repaint`.

**Spec:** `docs/handover-camp-release.md` §Phase 4b and §Phase 4c; the designer's rulings below; `docs/superpowers/plans/2026-10-25-camp-phase-4-layout-first.md` (Decision 7 and the layout stage this builds on); `docs/game-design/lock-placement.md` ("What a lock floor's side sections stand on", "A lock holds a puzzle on its way"); `docs/game-design/keys-and-locks-solver.md` (canonical order, hard criteria); `docs/game-design/world-spec-stability.md` (free and structural fields); `docs/game-design/tile-art-brief.md` §1, §4a; `docs/instructions/repaint-queue.md`.

## Designer rulings (binding)

- **4b:** a lock is a generic blueprint of rooms and corridors. Its corridors may be filled as a side path, so between two areas lie the puzzles and chests of a side path with the defined obstacles in between. **Only open side paths** go in (otherwise no guarantee the lock is solvable). Side paths with traps are allowed (healing is always available). Packing is an intention, not a requirement.
- **4c:** starter_1 ward gate → a cave floor (wizard) → stairs up into the Sphinx interior, where the same inscription stands, clear of the sand. Stairs link by `stairId` across any floors at runtime (`stairPeerPosition`); only `wireSideSectionStaircases` wires floor i to i+1, so stair sections name their target floor. The Sphinx interior needs art: prompts in `repaint-queue.md` style, the user paints.
- **Both land in this release** (it resets saves), planned together, **one bake** at the end. After this release floors may change, but saves must stay compatible.

Answers to the plan's questions (designer, 2026-10-26):

1. **Corridor choice:** off-route corridors first, then on-route ones. Excluded: corridors carrying a drop, a fork-switch junction's arms, corridors arriving in a sequence step's region (their thresholds stay bare), and a nest spot another lock is spliced into.
2. **One side path per corridor** — "unless the bake can't be made otherwise; then a corridor may take more."
3. **Any encounter node counts as "on the lock's way"**: "chests, puzzles, traps, etc." The lock-puzzle criterion asks for any encounter room that is neither the lock's control nor its door.
4. **No dropping:** "if no layout fits a side path inside a lock, that side path is placed outside the lock (as a branch, like today) — it must exist, otherwise content and loot go missing." Never a fallback that loses a side path.
5. **The cave floor:** wizard, cave dressing, no lock, and **7 puzzles on the main path** between the stairs, "so it feels like a long corridor".
6. **Ordinary loot in the tunnel:** its chests are filled by the solver behind the wizard key, as the old ward chest's end was.
7. **Sphinx art is not a release blocker:** the ward key into the cave and the Sphinx is not obtainable yet, so the art comes later. The prompts go into the repaint queue; until painted the floor draws placeholders.
8. **No puzzle on the floor-0 ward stair:** the cave carries the puzzles; the section's corridor still wears wizard stone.
9. **No Sphinx placement verify.** The existing `sphinxPlacement.spec.ts` stays as it is unless the authoring change breaks it; then it is adjusted minimally.

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. One commit per task (Task 7 commits its docs step separately). Do not push from a task.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data` and `src/worldGen` never name a mod, a trap, an encounter family or a perk. Core speaks of sealed sections, side sections, corridors, stairs and tilesets. `no-restricted-imports` stays at zero.
- **Mods toggle off.** With the trap mod off no section is sealed for a trap, so none is absorbed as one; nothing in this plan reads a mod.
- **No side path is ever lost.** Every authored side section exists in the carved floor: inside the lock on a corridor, or outside it as a branch (ruling 4).
- **`src/ui` takes props only**, and each changed `src/ui` component gets or updates its story with made-up props.
- **Strings** go nl first (spoken, everyday Dutch), then en, in `public/locales/{nl,en}/`. This plan adds none; a task that finds it needs one adds both and lists it under Drafts in `docs/review-camp-release.md`.
- **Saves stay compatible after this release.** Ids are authoring names, never indices that shift: the tunnel floors are starter_1 pyramid 1's floors 2 and 3 for good (a later floor is appended, never inserted); stair ids stay `stairIdAt` addresses. This release resets saves, so no version bump.
- **Tests never pin authored content or real-world counts.** Specs build made-up locks, plans, floors and sites. Agreement over the real data lives in `.verify.ts` files. Count work (carves, lays), never wall-clock.
- **Comments describe the current state and why**, never history.
- **Never weaken a check or relax a hard criterion.** Where a side path stands (inside the lock or outside it) is a preference the search orders, not a criterion it drops. Never hand-edit a baked number: pins, ledger entries and fingerprints come out of a deliberate bake.
- **Every bake, layout report, loot report, verify and build runs under `timeout 900`.** When a process is quiet for long, check `ps` for a hung node or vitest.
- **Commits:** one line, `type: what changed`, ≤ 72 chars, plus the session's attribution trailer.
- **Model per task:** tasks marked **soundness** are implemented by Opus and get a per-task Opus review. The others are Sonnet. One Sonnet review of the whole plan at the end (fast SDD: light reviews on the mechanical tasks).
- **The bake runs only in Task 7.** Task 3 runs `yarn layout-report`, which writes nothing. Every other task runs its specs, `yarn check-types` and `yarn lint`.
- **Stop rule:** two failed attempts at a task stop it. Write what failed under Failures in the review list and continue with the next task that does not depend on it. A floor the bake refuses on layout is the authoring's to fix: record it under Failures with the floor and criterion, and stop the bake task.

## Review Focus

1. **A lock with side paths in its corridors still walks sound and holds an encounter on its way.** The hard criteria judge the carved grid as before; any encounter room (puzzle, trap, chest, shop) that is not the lock's control or door counts (ruling 3) (Tasks 2, 3).
2. **Only open side paths enter a lock.** A gated, keyed or hidden section, one with sub-sections, a lever, a one-way's name or a stair end is never assigned a corridor, at any setting (Task 1).
3. **No stray edge bypasses an absorbed trap room.** The only ways into a trap room on a corridor are the lay's own passages (Task 2).
4. **A side path moved outside the lock still exists.** Every authored side section's rooms and end are on the carved grid whether it stands on a corridor or hangs as a branch; a floor with `outsideLock` loses no room and no loot slot (Tasks 1, 3).
5. **Every existing site wires its stairs as before.** Defaults keep `wireSideSectionStaircases`' output byte-identical for every made-up site that names no target and no depth; the tunnel's two stairs pair once each and draw in the right direction (Tasks 4, 6).
6. **The ending is reachable only through the Vault's key**, the reading stands once in the world, inside the Sphinx, and the reed leaf is still only in the Vault (Task 7's bake, and the existing Sphinx spec on the baked world).

---

### Task 1: Each open side path is assigned a corridor of its own (**soundness**: the carve and lay)

**Files:**

- Create: `src/game/corridorSidePaths.ts`, `corridorSidePaths.spec.ts`: which corridors may carry a side path, and the deterministic pairing of sections with corridors.
- Modify: `src/game/siteTypes.ts`: `FloorConfig.outsideLock?: number[]`, the top-level side sections (by index) that hang outside the lock as branches; written by the layout search only (Task 3), documented in the current state.
- Modify: `src/game/carve/prepareFloor.ts` (+ `prepareFloor.spec.ts`): with the corridor fill on, a sealed section is eligible beside today's content sections (no gate, not hidden, no sub-sections, ends in a chest or shop, no lever, not named by a one-way, not the floor-key host, not a junction's way). The eligible sections not named in `outsideLock` are passed to `assignCorridors`. An assigned section becomes an `AbsorbedDemand` with its `corridor`. A section named in `outsideLock`, and an eligible one on a floor whose lock has no eligible corridor, hangs as a branch off laid ground (no longer spread over lock ground). The floor-key host section and a junction's ways keep today's treatment. The comment above `isContentSection` is rewritten to the current rule.
- Modify: `src/game/laidFloor.ts` (+ `laidFloor.spec.ts`): `AbsorbedDemand.corridor?: string`; `planToLay` takes `corridorRooms: ReadonlyMap<string, number>` and lays each assigned corridor at least that many nodes longer than its doors and hubs need.
- Modify: `src/game/carve/state.ts`: the prepared sections carry the assignments.

**Interfaces:**

- Produces: `eligibleCorridors(plan: LockPlan, appetite: ReadonlyMap<string, RegionAppetite>): PlanCorridor[]`, in preference order (ruling 1): off-route before on-route, then plan order; excludes a corridor with a drop, a junction's arm, one arriving in a sequence step's region (`corridorSeats(...).thresholds` non-empty at any length) and a nest spot a lock is spliced into.
- Produces: `CorridorAssignment = { section: number; corridor: string }` (the `PlanCorridor.id`) and `assignCorridors(corridors: PlanCorridor[], sections: readonly { section: number; kinds: ContentKind[] }[], appetite): CorridorAssignment[]`: authored section order onto corridor preference order, one section per corridor; when sections outnumber corridors, the extra sections are dealt again from the first corridor in preference order, so a corridor takes a second only then (ruling 2); a corridor whose end regions' appetites do not take every kind of the section is skipped for that section. A section no corridor takes is returned unassigned and hangs as a branch.
- Produces: `AbsorbedDemand.corridor?: string`; `planToLay(plan, { content, appetite, corridorRooms })`.
- Consumes: `LockPlan`, `PlanCorridor`, `appetiteAccepts`, `corridorSeats` (export it from `laidFloor.ts` if it is not yet).

- [ ] **Step 1: Failing tests** (made-up plans and floors, no real lock):
  - `corridorSidePaths.spec.ts`:
    - "an off-route corridor is offered before an on-route one";
    - "a corridor carrying a drop, a junction's arm, a sequence threshold or a spliced nest spot is never offered";
    - "a corridor between regions that take nothing is never offered";
    - "sections pair with corridors in authored order, one each";
    - "with more sections than corridors, a corridor takes a second only after every corridor has one";
    - "a section no corridor's appetite takes is left unassigned";
    - "the same plan and sections always give the same assignment".
  - `prepareFloor.spec.ts`:
    - "an open side section on a lock floor is assigned a corridor";
    - "a sealed side section is assigned a corridor";
    - "a gated, a hidden, a keyed, a nested, a lever-holding, a one-way-named and a stair-ended section are never assigned" (one made-up floor each);
    - "a section named in outsideLock hangs as a branch, open or sealed";
    - "every authored side section is either a corridor demand or a branch: none is lost" (made-up floors with 0, 1 and more eligible corridors than sections, and with outsideLock naming every section).
  - `laidFloor.spec.ts`: "planToLay lays an assigned corridor long enough for its section's rooms".
- [ ] **Step 2: Run** `yarn test src/game/corridorSidePaths src/game/carve/prepareFloor src/game/laidFloor` → FAIL.
- [ ] **Step 3: Implement.** The top comment of `corridorSidePaths.ts` says, in the current state, why only open side paths go into a lock (a key or a detector inside would make the lock not provably solvable) and why a trap may (a trap costs hearts and the camp always heals).
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): nothing gated or hidden is ever assigned; no section is lost; the assignment reads no seed.
- [ ] **Step 6: Commit:** `feat: open side paths are assigned a lock corridor of their own`

---

### Task 2: A side path stands on its own corridor (**soundness**: the carve and lay)

**Files:**

- Modify: `src/game/laidFloor.ts` (+ spec):
  - `fillLaidFloor` reads `stretches`; a demand with a `corridor` takes only nodes of `stretches.get("corridor:<id>")` that are no door, threshold, junction or drop end, in walk order (depth from the way in), its puzzles first and its end room deepest, spread along the corridor as the spread fill does; demands without a corridor fill as today, after the corridor ones.
  - `MissingRoom.corridor?: string`; `lengtheningCandidates` offers only that corridor for a room missing from a corridor demand.
- Modify: `src/game/carve/layFloor.ts` (+ `layFloor.spec.ts`): after a fill that placed everything, `corridorUnfed` must be empty, or the attempt is refused as `contentNotLaid` (a carve bug guard, never a quiet pass).
- Modify: `src/game/carve/isolate.ts` (+ `isolate.spec.ts`): an absorbed section that is sealed has its rooms isolated as a sealed chain's are: no maze edge reaches them other than the lay's own passages.
- Modify: `src/game/lockPuzzles.ts` (+ `lockPuzzles.spec.ts`):
  - `corridorUnfed`;
  - `isPuzzleRoom` becomes `isEncounterOnTheWay`: any encounter room (a puzzle, a trap, a chest, a shop) that is neither a control nor a door counts, with or without a `pathIndex` (ruling 3). The criterion's name stays `lock holds a puzzle` in `HARD_CRITERIA` only if renaming it would churn the ledger; otherwise rename it `lock holds an encounter` and update `AUTHORING_FIELD` and the comments to the current rule;
  - `src/worldGen/layoutFeasibility.ts`: content that may stand on lock ground now counts sealed sections and every section's end room as well as open puzzles, since any encounter counts (an infeasible claim must hold for every layout, so counting more only makes it rarer);
  - the `it.todo("a corridor asking for a side path that carries none is named")` becomes the `corridorUnfed` test below.
- Modify: `src/worldGen/laidCarveWorld.verify.ts`: its expected absorbed set follows the new eligibility (assigned sections included).

**Interfaces:**

- Produces: `corridorUnfed(laid: Pick<LaidFloor, "stretches" | "absorbed">, demands: readonly AbsorbedDemand[]): string[]`, one line per assigned section with a room off its corridor: `side path s<i> on <corridor> has a room off it`.
- Consumes: Task 1's `AbsorbedDemand.corridor`, `CorridorAssignment`.

- [ ] **Step 1: Failing tests** (made-up locks laid by `layLockPlan`, made-up sections):
  - `laidFloor.spec.ts`:
    - "a section assigned to a corridor stands wholly on that corridor's nodes";
    - "its puzzles come before its chest along the walk";
    - "a corridor whose gate is aligned center holds rooms on both sides of it";
    - "a room missing from a corridor section asks to lengthen that corridor only".
  - `layFloor.spec.ts`: "an assigned section seated off its corridor refuses the attempt" (inject a fill that misplaces one room).
  - `isolate.spec.ts`: "an absorbed trap room is reached only through the lay's passages": count every passage into the room's cells and compare with the laid passages.
  - `lockPuzzles.spec.ts`:
    - "a corridor whose assigned side path stands elsewhere is named" (replaces the `it.todo`);
    - "a chest on the lock's way counts", "a trap room on the lock's way counts": a made-up floor whose only room on the way is a chest (then a trap) passes, and is named when that room is moved off the way;
  - `layoutFeasibility.spec.ts`: "a lock floor whose only content is a trapped side path is not infeasible".
- [ ] **Step 2: Run** `yarn test src/game/laidFloor src/game/carve src/game/lockPuzzles` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; `yarn test src/game src/worldGen`; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): the lock walk and every other hard criterion judge the grid as before; isolation holds; no fill quietly misplaces a corridor section.
- [ ] **Step 6: Commit:** `feat: a side path stands on its own lock corridor, obstacles between`

---

### Task 3: The search moves a side path outside the lock only when nothing fits (**soundness**: the layout stage)

**Files:**

- Modify: `src/worldGen/carveSeedSearch.ts` (+ spec): where the side paths stand is the outermost preference. Stage 0 searches every candidate (each packing, each seed, then the ladder) with `outsideLock` empty; each next stage adds the last authored eligible section still inside to `outsideLock` and searches every candidate again; the first stage with a found layout wins. With every eligible section outside and still nothing found, the result is `notFound`, counting every stage. `LayoutFound` carries `outsideLock: number[]`. A pin is verified with its own `outsideLock`, and re-searched from stage 0 when the authoring hash changes, so a floor that can hold a side path inside again gets it back. The stage count is bounded by the floor's eligible sections; carves are counted, never timed.
- Modify: `scripts/layoutPicker.ts`: writes `floor.outsideLock` only when non-empty, and deletes it otherwise; `printPicks` adds `N floor(s) carry side paths in their lock corridors (C corridors, D taking two), M side path(s) on K floor(s) hang outside the lock` and lists those floors and sections by key.
- Modify: `scripts/carveLedger.ts`: an entry records the `outsideLock` it was found with.
- Modify: `src/worldGen/serializer.ts` (+ spec): writes `outsideLock` on a floor that has it.
- Modify: `src/game/siteAssembler.ts` (`computeMainSectionHash`): `outsideLock` is in the structural inputs.
- Modify: `docs/game-design/world-spec-stability.md` (structural table: `outsideLock`, and that a lock floor's eligible side sections stand on its corridors) and the free/structural sweep in `src/app/SiteMap/worldFloorAssembly.verify.ts` if it lists fields.

**Interfaces:**

- Produces: `LayoutFound.outsideLock: number[]`; `CarvePairOptions.assemble` receives it (`(seed, packing, attempts, outsideLock) => AssemblerResult`); `CarvePairOptions.eligibleSections: number[]` in authored order.
- Consumes: Task 1's `FloorConfig.outsideLock`.

- [ ] **Step 1: Failing tests** (`carveSeedSearch.spec.ts`, injected assembler, counted carves):
  - "a floor that carves with every side path inside is pinned so, and no later stage is carved";
  - "a floor that carves only with its last side path outside is found at stage 1, outsideLock naming that section";
  - "sections move outside last authored first, one per stage";
  - "a floor that meets no hard criterion even with every side path outside is notFound, counting every stage";
  - "a pin with outsideLock verifies in one carve with that list";
  - `serializer.spec.ts`: "outsideLock is written and read back".
- [ ] **Step 2: Run** `yarn test src/worldGen/carveSeedSearch src/worldGen/serializer` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Measure, without baking:** `timeout 900 yarn layout-report`. Under §4 Failures of `docs/review-camp-release.md` write every infeasible or not-found floor with its message (this is what Task 7's bake will refuse); under §2 a `Phase 4b — corridor fill` line with the floors that carry side paths in their corridors, the corridors used (and how many take two), and every side path hung outside its lock. A side path outside the lock is accepted (ruling 4), not a failure.
- [ ] **Step 6: Per-task review** (Opus): where side paths stand orders the search and refuses nothing; no stage loses a section; the hash and the serializer agree.
- [ ] **Step 7: Commit:** `feat: side paths stay in a lock unless no layout fits them`

---

### Task 4: A stair names its floor and its direction (**soundness**: stair wiring)

**Files:**

- Modify: `src/worldGen/dsl.ts`: `SideSectionConstraint.toFloor?: number` (read only with `end: "staircase"`), accepted by `wardPath`; `FloorConstraint.toFloor?: number` (the main path ends in a stair to that floor) and `FloorConstraint.depth?: number` (default the floor's index; a larger depth is further down).
- Modify: `src/worldGen/sideSections.ts`: a stair section's target travels to the wiring alongside its `stairId` (a map built while the sections are built; no new field on the runtime section).
- Modify: `src/worldGen/buildSite.ts` (+ `buildSite.spec.ts`): `wireSideSectionStaircases(floors, site, links)`:
  - every stair section's target (its `toFloor`, else the next floor) gets that section's stair as its `entrance` and is off the main walk;
  - a floor's main path stairs to its `toFloor` where authored, else, as today, to the next floor when that floor is entered by no other stair;
  - a floor off the main walk with no `toFloor` has no way out of its own (`exitOrStaircase: "none"`), as today;
  - each stair's direction comes from the two floors' depths; a stair is refused (throws, naming journey, pyramid and floor) when it leads to an earlier floor index, to itself, to a floor already entered by another stair, to a floor that does not exist, or between two floors of equal depth.
- Modify: `src/game/siteTypes.ts`: the stair link objects (`SubSection.end`, `FloorConfig.exitOrStaircase`, `FloorConfig.entrance`) take `goes?: "up" | "down"`, written only where it differs from the default (a floor's entrance goes up, every other stair down); `RoomCell.stairGoes?: "up" | "down"`.
- Modify: `src/game/carve/roomSpecs.ts` (+ spec): a stairhead cell gets `stairGoes` from its link, else the default.
- Modify: `src/worldGen/serializer.ts` (+ spec): writes `goes`.
- Modify: `src/app/SiteMap/SiteMapView.tsx` (+ `SiteMapView.spec.tsx`, + a `SiteMapView.stories.tsx` story "A stair climbing out of a cave" on a made-up floor): both `goesUp` reads (stair art and its cresset, and the portal's click art) take `cell.stairGoes`, falling back to "at the entrance".
- Modify: `docs/game-design/world-spec-stability.md`: `toFloor` and `depth` are structural (they decide which floor a stair enters); `goes` is drawn only.

**Interfaces:**

- Produces: `SideSectionConstraint.toFloor`, `FloorConstraint.toFloor`, `FloorConstraint.depth`, `wardPath({ …, toFloor })`, `RoomCell.stairGoes`, the link `goes`.
- Consumes: `stairIdAt`, `findMispairedStairs` (unchanged; it already counts every link).

- [ ] **Step 1: Failing tests** (made-up sites):
  - `buildSite.spec.ts`:
    - "a site naming no target and no depth wires exactly as before": three made-up shapes (a main chain, a ward stair off floor 0, a tomb-like chain of side stairs), each compared field by field with the wiring the current rule gives (write the expected configs out by hand in the spec);
    - "two stair sections on one floor enter the floors they name";
    - "a floor reached by a side stair may climb by its main path to a later floor";
    - "a stair to a shallower floor goes up, and the floor it enters is entered going down";
    - "a stair to an earlier index, to itself, to a floor already entered, to no floor or to an equal depth is refused, naming where".
  - `roomSpecs` spec: "a stairhead carries its link's direction, else the default".
  - `SiteMapView.spec.tsx`: "a stair marked up at a floor's main end draws the climbing flight and no cresset".
  - `serializer.spec.ts`: "`goes` is written and read back".
- [ ] **Step 2: Run** `yarn test src/worldGen/buildSite src/game/carve src/app/SiteMap/SiteMapView src/worldGen/serializer` → FAIL.
- [ ] **Step 3: Implement.** The comment above `wireSideSectionStaircases` is rewritten to the current rule.
- [ ] **Step 4: Run** → PASS; `yarn test src/worldGen src/app/SiteMap`; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): defaults change nothing; the reachability walk's index-order assumption is guaranteed by the refusal; stair travel (`stairPeerPosition`) needs no change.
- [ ] **Step 6: Commit:** `feat: a stair names the floor it leads to and which way it goes`

---

### Task 5: The Sphinx tileset and its art prompts

Sonnet, light review.

**Files:**

- Modify: `src/game/siteTypes.ts`: `Tileset = Difficulty | "cave" | "sphinx"`; let `yarn check-types` find every `Record<Tileset, …>`:
  - `src/app/SiteMap/tileMaterials.ts` `tierPalette.sphinx`: warm bedrock limestone — floor `#8a7556`, wall `#b9a179` with top `#d8c49c` and shadow `#5e4c36`, outline `#2a2117`;
  - `src/app/SiteMap/moodSettings.ts` `RANK_MOOD.sphinx`: warm, dim, still air (lamplit, no daylight shaft);
  - `src/ui/atoms/tombImageMap.ts` `imageMap.sphinx` with the palette's wall colours. Its `image` is looked up through `import.meta.glob("@/assets/tombWall/*.webp")` (as `tileAssets.ts` finds tiles), so the panel appears when the user's `yarn import-panel` drops `sphinx.webp` in; until then `image` is absent and the encounter shows the card colour, as an encounter opened without a tileset does. No stand-in painting is copied in. `EncounterModal`/`TombDoor` take an absent `image` (spec: "a tileset with no painted wall shows the card colour");
  - any other map the type check names.
- Modify: `scripts/importPanel.ts` (`PANEL_TIERS`) and `scripts/importTile.ts` (if it lists tiers) to accept `sphinx`.
- Create: `src/assets/tiles/sphinx/.gitkeep`.
- Modify: `src/ui/atoms/TombDoor.stories.tsx` (or the `EncounterModal` story that shows walls): a `sphinx` wall story with made-up props.
- Modify: `docs/game-design/tile-art-brief.md`: a §4b "The Sphinx tileset": a tileset, not a rank; the four surfaces (floor, wall face, threshold, encounter wall); the inscription itself is drawn by the reading encounter, never painted into the wall.
- Modify: `docs/instructions/repaint-queue.md`: a new section `## The Sphinx — four` (its intro: the inside of the Sphinx is cut from the plateau's own bedrock, layered limestone, swept clean of the sand that keeps burying the outside; four surfaces, same loop as the cave's) with the four entries below, verbatim. `scripts/repaintQueue.spec.ts` must pass and `yarn repaint` must list `sphinx/floor`, `sphinx/wall-face`, `sphinx/threshold`, `sphinx/wall-panel`.

The four entries (copy exactly, headings included):

````markdown
### `sphinx/floor` — the Sphinx's cut bedrock floor

**Attach:** `art/masters/surfaces/starter-floor.webp` — the merchant's floor, for scale and paint quality only

```
Top-down dungeon game tile art for the inside of the Great Sphinx, a passage cut into the desert bedrock.
A FLOOR CUT FROM ONE MASS OF LIVING ROCK, never laid: soft yellow limestone dressed flat by masons, long
shallow chisel strokes running one way, faint horizontal bands where harder grey-buff layers cross the
softer yellow ones, a few hairline cracks following those bands, a little fine sand swept into the hollows
and nothing more — the sand that buries the outside never got in here.
Warm, dim and still: lamplight, no daylight. Every part of the floor is readable, nothing sinks into black.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Limestone #8a7556, its harder bands #7d7462, shadow #4a3c2b, sand #b39b72. Nothing lighter than #c9b48c,
nothing darker than #2a2117.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its scale. Do NOT take its
colours, its slabs or its subject from it.
THE CAMERA: straight down. A seamless square tile.
NOTHING LAID: no slabs, no paving, no bricks, no joints, no mortar, no courses of blocks. The bands are
rock strata, soft-edged and uneven, never ruled lines.
It tiles, so NOTHING crosses the whole image: no band, crack or stain runs edge to edge, and no feature
touches two edges. Value spread evenly over the whole tile.
Even lighting, no hotspot, no vignette.
```

**Prepare:** if the generator returns a wide band rather than a square, stack it on itself, cut the square and make it seamless; that square is the master, `art/masters/surfaces/sphinx-floor.webp`:
`magick band.jpeg band.jpeg -append -gravity Center -crop 2688x2688+0+0 +repage square.png && yarn make-seamless square.png`

**Import:** `yarn import-tile art/masters/surfaces/sphinx-floor.webp --tier=sphinx --name=floor --slot=floor --filter=smooth --key=none --repeat=2`

### `sphinx/wall-face` — the Sphinx's cut bedrock wall face

**Attach:** `art/masters/surfaces/cave-wall-face.webp` — the cave's face, for the frontal band and the paint only

```
Top-down dungeon game tile art for the inside of the Great Sphinx, a passage cut into the desert bedrock.
The standing face of a wall seen from the front: the plateau's own limestone, cut straight down by masons
and never built: horizontal strata stacked up the face, soft yellow layers worn back a little and harder
grey-buff layers standing proud of them, long diagonal chisel marks across every layer, a few small
hollows where the softest rock crumbled. NOTHING BUILT: no bricks, no blocks, no joints, no mortar, no
paint, no carving, no hieroglyphs.
Pale and lit, catching the lamplight, clearly lighter than the floor in front of it.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look.
Yellow limestone #b9a179, harder bands #a39a86, top light #d8c49c, shadow #5e4c36. Nothing lighter than
#e6d6b2, nothing darker than #3a2e20.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it.
Flat frontal view, no perspective. A wide band, seamless left to right; the strata run the whole width,
nothing else does. Even lighting.
```

**Prepare:** the generator returns a band about a third of a face's 8:1. Lay three side by side and make it seamless along x; that band is the master, `art/masters/surfaces/sphinx-wall-face.webp`:
`magick band.jpeg band.jpeg band.jpeg +append wide.png && yarn make-seamless --axis=x wide.png`

**Import:** `yarn import-tile art/masters/surfaces/sphinx-wall-face.webp --tier=sphinx --name=wall-face --slot=face --filter=smooth --key=none --headroom=0.14 --repeat=1` (check the face against the floor with `yarn rank-colour` and set `--brightness` from it)

### `sphinx/threshold` — a step cut in the Sphinx's bedrock

**Attach:** `art/masters/surfaces/starter-threshold.webp` — the merchant's sill, for its camera and proportions only

```
Top-down dungeon game tile art for the inside of the Great Sphinx, a passage cut into the desert bedrock.
A sill where one cut passage meets the next: a low step left standing in the living limestone, its top
worn smooth and slightly dished by feet, chisel marks still on its face, a thin line of fine sand along
its foot. NOTHING LAID: no slab, no joints, no blocks, no paint.
Warm, dim and readable. HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and
fine speckle in the surface, soft shading. Painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look.
Limestone #8a7556, its harder bands #7d7462, shadow #4a3c2b, sand #b39b72. Nothing lighter than #c9b48c,
nothing darker than #2a2117.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS FOR CAMERA AND PROPORTIONS ONLY. Do NOT take its colours, its cut stone or its
subject from it.
Same camera and proportions as the attached sill. Even lighting.
```

**Import:** `yarn import-tile art/masters/surfaces/sphinx-threshold.webp --tier=sphinx --name=threshold --slot=sill --filter=smooth --key=none`

### `sphinx/wall-panel` — the inscription wall, inside the Sphinx

**Attach:** `art/masters/tombWall/starter.webp` — the merchant's encounter wall, for the frame's proportions only

```
A whole wall inside the Great Sphinx, seen straight on, for a puzzle's backdrop: the plateau's own
limestone cut straight down, horizontal strata of soft yellow and harder grey-buff layers, chisel marks
across them. In the middle of the wall the masons dressed one broad rectangle smooth and flat, a little
paler than the rock around it, its edges softened by age: the place where a line of writing is cut.
LEAVE THAT RECTANGLE PLAIN — no signs, no hieroglyphs, no carving, no cartouche, no figures: the writing
is laid over it by the game. A little fine sand along the foot of the wall, no more; the sand outside
never reached in here. Lamplit, warm, still.
HAND-PAINTED digital art: matte, soft brush texture, grit and speckle. NO OUTLINES — no black contour, no
ink, no cel shading, no vector look.
Yellow limestone #b9a179, harder bands #a39a86, the dressed panel #c9b48c, shadow #5e4c36. Nothing lighter
than #e6d6b2, nothing darker than #3a2e20.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY, for the frame's proportions and paint quality. Do NOT take
its colours or its subject from it. Same aspect as the reference; do not re-compose it square.
```

**Import:** `yarn import-panel art/masters/tombWall/sphinx.webp --tier=sphinx`
````

- [ ] **Step 1: Failing tests:** `src/app/SiteMap/tileMaterials` spec (or the nearest palette spec): "every tileset has a palette and a mood" iterating the `Tileset` values (add the values list next to the type if none exists); `scripts/repaintQueue.spec.ts` parses the four new keys with their attachments and import lines.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`; `yarn repaint` lists the four keys.
- [ ] **Step 5: Commit:** `feat: a sphinx tileset and the prompts to paint it`

---

### Task 6: The tunnel to the Sphinx

Sonnet.

**Files:**

- Modify: `src/worldGen/spec/starter.ts`, `journey("starter_1").pyramid(1, …)`:
  - floor 0: the Sphinx `wardChest({ tomb: "wizard_treasure_tomb", index: 0, puzzles: 1, nodes: [reading] })` becomes `wardPath({ tomb: "wizard_treasure_tomb", index: 0, toFloor: 2 })` with no puzzle (ruling 8); the starter-tomb `wardPath` keeps its default target (floor 1);
  - `.floor(2, …)`: the fields of `CAVE_DRESSING` (from `src/worldGen/spec/cave.ts`) that a floor takes, `difficulty: "wizard"`, `pathPuzzles: 7`, `encounter: "puzzle"`, `sideSections: []`, `depth: 1`, `toFloor: 3`, no lock (rulings 5, 6): the seven puzzles stand on the main path between the stair down and the stair up, a long corridor;
  - `.floor(3, …)`: `tileset: "sphinx"`, `difficulty: "wizard"`, `pathPuzzles: 1`, `nodes: [{ where: "first", encounter: "reading" }]`, `sideSections: []`, `depth: 0` (ruling 7);
  - the comment block above the Sphinx stair says, current state only: sealed and visible in the first hour, opened in the last by the Vault of the Gods' key; down into a cave, then up into the Sphinx itself, where the writing first seen outside is read clear of the sand.
- `src/mods/story/game/reading/sphinxPlacement.spec.ts` stays (ruling 9). It reads the committed world, so it still passes until Task 7's bake; Task 7 adjusts it minimally if the baked world breaks it.
- Modify: `src/app/SiteMap/floorMaterial.verify.ts`: its comment and, if the bake changes it, its tier expectation for starter_1 floor 0 (the ward section's corridor is still wizard stone; no tier is pinned beyond what the floor draws).
- Modify: `src/mods/story/game/reading/walls.ts`: the Sphinx comment says the wall stands inside the Sphinx, down the ward stair of `starter_1`.
- Modify: `src/worldGen/spec/wizard.ts`: the comment on the reed leaf says "the gate the Sphinx stair stands behind".
- Modify: `docs/game-design/story/IMPLEMENTATION.md`: the Sphinx ending row names the ward stair, the cave floor and the Sphinx floor in `starter.ts`.

No unit test pins the authored floors; the bake is the check.

- [ ] **Step 1: Author** the floors and comments. `yarn check-types`; `yarn lint`; `timeout 900 yarn validate-world` must pass the structural checks it runs (stair pairing included: the two new stairs pair once each). Do not bake.
- [ ] **Step 2: Commit:** `feat: the Sphinx is read inside, through a cave behind the ward gate`

---

### Task 7: Bake, gate, docs (**soundness**: the bake)

Docs: Sonnet. The rest: Opus.

**Files (by the bake):** `src/data/generatedWorld.ts`, `src/data/carveLedger.json`, `src/data/tierFingerprints.json` (moved tiers, deliberately), `docs/loot-report.md`, `.betterer.results` (re-key only).

- [ ] **Step 1: Before:** `timeout 900 yarn loot-report` on the committed bake; keep its totals in the scratchpad.
- [ ] **Step 2: Seeds:** `timeout 900 yarn verify-seeds`. A shortfall for the tunnel's wizard rooms is generated with `yarn generate-seeds` (see `scripts/puzzleSeeds.ts`) before the bake; the known twin-stars/wizard shortfall is recorded, not chased.
- [ ] **Step 3: Bake:** `timeout 900 yarn generate-world`.
  - A layout refusal (infeasible or not found) stops the task: the floors and criteria go under Failures (Task 3 listed them already).
  - Otherwise it must print `strict walk enters N of N journeys` with N the journey count, report no "loot moved a wall" and no "web moved", pair every stair (no mispaired stair), place every hieroglyph, leave 0 empty chests, and pass every money ground.
- [ ] **Step 4: Fingerprints:** every tier may move. For each moved tier, copy its hash and write one review-list line why (lock floors re-carved with side paths in their corridors; starter for the tunnel).
- [ ] **Step 5: Report and checks:** `timeout 900 yarn loot-report` (totals exact; the slot mix moves); `timeout 900 yarn layout-report` (prints the corridor-fill line); `timeout 900 yarn verify-content` (`laidCarveWorld.verify.ts`, `bakedCarve.verify.ts`, `worldWinnable.verify.ts` included); `timeout 900 yarn verify`; `timeout 900 yarn build`.
- [ ] **Step 5b: The Sphinx spec:** `yarn test src/mods/story/game/reading`. If `sphinxPlacement.spec.ts` fails on the baked world (it looks for the reading room in a side section and its gate on that section), adjust it minimally: find the reading room on a floor's main path as well, and read the tomb-key gate off the floor-0 stair section leading to it. Nothing else in it changes.
- [ ] **Step 6: Commit:** `chore: bake side paths into lock corridors and the Sphinx tunnel`
- [ ] **Step 7: Docs**, current state only:
  - `docs/game-design/lock-placement.md` "What a lock floor's side sections stand on": an open or trapped side section is assigned a corridor of its own and stands on it, obstacles between; gated, keyed and hidden ones hang as branches; a corridor takes a second side path only when sections outnumber corridors; a side path that fits no layout inside hangs outside the lock as a branch (`outsideLock`), never dropped, and the layout report lists it; and in "A lock holds a puzzle on its way", that any encounter room counts (chest, puzzle, trap, shop);
  - `docs/game-design/keys-and-locks-solver.md`: the layout stage's preference order gains the corridor fill;
  - `docs/game-design/pyramid-interior-design.md` (or wherever stairs are described; grep `wireSideSectionStaircases`): stairs name their floor and their direction;
  - `docs/review-camp-release.md`: §2 a `Phase 4b —` and `Phase 4c —` block (the designer's answers above, the corridor-fill numbers, the fingerprint lines); §5 Look at in browser: a lock floor with a side path in a corridor (name one from the layout report), the ward stair on starter_1 floor 0 with a dev-granted Vault key, the cave, the climbing stair and the reading inside the Sphinx; the four Sphinx surfaces are queued for painting (`yarn repaint sphinx/floor` …), not a release blocker, since the Vault's key is not obtainable yet;
  - `docs/playtest-backlog.md`: the same two walks;
  - `docs/handover-camp-release.md`: tick phases 4b and 4c, one State line each, and Next;
  - `CHANGELOG.md` Unreleased: one line, e.g. `Side paths run through a lock's corridors; the Sphinx is read from inside, through a cave behind the ward gate`;
  - this plan: tick the boxes.

  **Commit:** `docs: side paths in lock corridors and the Sphinx tunnel`
- [ ] **Step 8: Look:** `yarn dev` with develop mode: walk one lock floor the layout report names as carrying a side path; grant the Vault key, open starter_1 floor 0's ward stair, cross the cave, climb into the Sphinx, read the wall. Take screenshots. Anything not reachable goes under Look at in browser with steps.

---

## Self-review notes

- Every ruling has a task: corridors as side paths (1–3), only open side paths (1), traps allowed (1, 2), a second side path per corridor only when needed (1), any encounter on the way (2), no side path dropped (1, 3), packing as intent (3), stairs naming floors (4), the tunnel and same inscription (6), art prompts (5), one bake (7).
- Names used across tasks: `CorridorAssignment`, `assignCorridors`, `eligibleCorridors` (1); `AbsorbedDemand.corridor`, `corridorUnfed` (1, 2); `FloorConfig.outsideLock` (1, 3); `LayoutFound.outsideLock` (3); `toFloor`, `depth`, `goes`, `RoomCell.stairGoes` (4, 6); `Tileset` `"sphinx"` (5, 6).
