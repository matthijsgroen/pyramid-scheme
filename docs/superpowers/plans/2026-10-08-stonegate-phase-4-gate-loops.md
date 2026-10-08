# stoneGate Phase 4: Gate Loops in the Carve, One Nest Spot per Lock, and Stones in Nested Locks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Ready to run.** The designer answered every question (2026-10-08); none is open. Each answer is recorded under
> "Decisions (settled)" and built into the tasks. A task that meets something its "Check what this task stands on"
> step does not expect stops and reports; it never re-decides a settled question.

**Goal:** a lock whose gated joins close a loop is accepted by the floor topology, carves, is proved sound by the
floor walk, and stoneGate (`src/game/locks/stoneGate.lock`) bakes on the dev floor as pyramid 12; a loop inside one
region is fine in every carve (tasks 1-7). Each lock marks at most one connection as its nest spot, and a lock nests only
there (tasks 8-9). Then a floor that nests locks may hold stones: each nesting is a pass-through, a contained or a
shared one (spec, "Nested locks"), the floor walk proves it, and the blanket refusal `STONES_NESTED` goes (tasks
10-13). Task 14 looks, writes the docs and runs the whole gate.

**Architecture (gate loops, tasks 1-7):** a lock floor is laid before it is carved (`layLockPlan`,
`src/game/layLocks.ts`): every connection of the plan becomes a laid corridor, loops included, and the grown maze can
never join two regions. What refuses a gate loop today is older than the lay: `topologyFaults`
(`src/game/obstacles.ts`) only seats a gate on a route link or on a link of a side chain (`offRouteChains`,
`src/game/regions.ts`), the model of the side-chain carve, and a fork's seams are read off those same chains. This
phase tells `topologyFaults` when the floor is laid: then every connection is a seat, a fork's seams are every join of
its region the route does not take (`forkSeams`), and a gate an open loop goes round is refused by name
(`gateBypassed`) on every floor. A gate loop (a gate ON the loop, like stoneGate's) is the laid carve's job; a
corridor that circles back on ground of its own region, round no gate, is fine in every carve, laid and side-chain
(task 4 pins it: the checks read regions, never cells). The carve principle (D5): the carve is free wherever the
layout is silent; the only constraint on where an obstacle stands in its corridor is that the corridor's obstacles
keep their order (pinned in task 1). `gateDoorFaults` and the floor walk already work on any graph; the walk is what
proves each carved loop sound.

**Architecture (one nest spot, tasks 8-9):** the spot is a CONNECTION, because a nested lock has an `in` and an
`out` and is spliced into a corridor. The notation writes it `a -&> b`, the arrow pointing from the inner lock's `in`
(at `a`) to its `out` (at `b`) as a one-way's does; `-&-` and `<&-` are refused by name. It reads into
`Lock.nestSpot = { from, to }` (`src/game/lockAuthoring.ts`) while the connection stays in `connections` as a plain
corridor, so a lock nothing nests in compiles and carves as if the spot were `--`. A spot on a connection that also
carries a barrier is ignored (`nestSpotOf` is undefined) and `yarn run lock` says so in one line; a spot on no
connection is refused `nestSpotOnNoConnection`, a second spot `nestSpotsRepeated`. The spot may stand on any
connection. Placement (`seatNested`, `expandFloorLocks`, `src/game/floorLocks.ts`) splices the inner into the host's
spot: the spot's corridor gives way to `[from, inner.in]` and `[inner.out, to]`, the host keeps every region, and
`PlacedLock.inside` names only the host. `lockDraw` draws the spot's corridor `&` and `yarn run lock` prints
`nest spot: a -&> b`.

**Architecture (nested stones, tasks 10-13):** the expansion classifies every nested placement against the nearest
lock it stands in that holds stones (`stoneNestings`) and writes the case on `LockNesting.stones`. A pass-through lock
with a one-way on its own in→out route is refused by name (`oneWayOnPassThroughRoute`): every one-way takes empty
hands, so it would turn the host's stone away. A shared nesting's stones are compiled into ONE weights control
(`poolStones`, `src/game/mechanics/weights.ts`). A contained lock keeps its stones by its own design: its way out is
never passable with a stone in hand (the walk refuses it `stoneCrossesOut` otherwise), while carrying one back out
through its way in is allowed. No invisible edge, no play rule: the floor walk proves the rest. The walk spec's
`leaveWith` carries two rules (the floor's way out AND every one-way), so it is renamed `emptyHands` (`mayLeave`
`handsEmpty`), and every level keeps it. The composed walk (`src/game/floorLockWalk.ts`) fuses a nesting into the
level its stones reach: a shared one and a pass-through holding an off-route one-way into their pool's level, a
contained one (whose stones may leave by its way in) into the floor's own level. A pass-through without one-ways and
a nesting without stones keep the cut, which is exact for them because nothing inside reads a hand. A fused level's
failure names its instances (`pooled`).

**Tech Stack:** TypeScript, Vitest, `yarn run lock` (`scripts/lock.ts`), `yarn generate-world` (Node bake).

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (§3 Carve and bake; "Done when"; "The rules";
§1 "Nested locks (designer, 2026-10-08)", binding for tasks 8-13). **Contract:** `docs/mods/mechanic-contract.md`
§3.2 "Stones on plates" (every one-way takes empty hands; `unladen` stands alone). **Roadmap:**
`docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 4 row; "Decisions taken": gate loops are allowed).
**Design:** `docs/mods/floor-topology-design.md` ("The rules that keep a lock buildable": "Gates may form loops").

**Written against `608a067e`, re-verified against `99a68952`** (branch `topology/mechanics`; phases 1, 2 and 3
done, then the empty-hands correction `a573eb65`, `469bbbfe`, `34f31c70` and the squeeze choreography `c2e7c322`,
`2afa135a`). Every path, symbol and line cited below was checked at `99a68952`; line numbers drift as other work lands
on the branch, so find each edit by the symbol named beside it. The two untracked files at the repository root
(`circle.lock`, `stoneGate.lock`) are the designer's scratch: never stage them. Stage strictly by path, never
`git add -A` or `git add .`. Other sessions commit to this branch: before each task, `git status --short` and leave
files you did not touch alone.

## What was measured before writing this

Made-up locks carved through `assembleFloor` at `608a067e` (every region `?`, the `lockFixtures.ts` binding):

| lock | refused with |
| --- | --- |
| `in -[L]- hall`, `hall -- out`, `in -- side`, `side -[L:a]- hall` | `obstacleOffRoute` on `side-hall` (the join closing the loop) |
| `in -[Y]- a`, `in -[Y]- b`, `a -- b`, `in -- out`, `Y fork @in` | `gateOwnedOffSeam` on `in-b` (only `in-a` is a chain's seam) |
| a stone loop whose closing join `back -- hall` is open | carves (the gates sit on chain links) |
| `in -[L]- hall`, `hall -- out`, `in -- side`, `side -- hall` | every seed `gateDoorMisplaced` (`touches: 1`): one door, an open way round it |
| stoneGate, every region `free` | `obstacleOffRoute` on `altar-backroom`, `hall3-hall2`, `hall2-hall5`, `hall3-passage` |

`yarn run lock` reports "gate loop" as not buildable for stoneGate only; no other catalogue lock has a loop.

At `99a68952`: no catalogue lock, dev floor or world floor nests a lock (`grep -c lockNesting
src/data/generatedWorld.ts` is 0), the only nested
placements are in tests (`nestedLocks.spec.ts`, `layLocks.spec.ts`, `lockPlan.spec.ts`), all in the `hall` of
`leverLock`/`strandingLock` (`src/game/testSupport/floorLockFixtures.ts`) except the seat-refusal tests, which nest in
`sluiceLock` (world spec content), `ringLock` and `middleLeverLock`. `PlanNesting` (`src/game/lockPlan.ts`) is read by
its tests only. `src/game/barrierOrder.spec.ts` already pins the order of several barriers on one connection on floors
carved today. `adjacencyFaults` (`src/game/carveAgreement.ts`) skips two cells of one region, and the side-chain carve
cuts a cycle only at a branch spot from `RECOVERY_ATTEMPT` (30) on (`attachChain`'s `mayCarve`,
`src/game/siteAssembler.ts`).

## Decisions (settled)

All binding (designer, 2026-10-08 unless noted). Each names the task that builds it.

- **D1. Order.** Phase 3 is on the branch, so every task runs in order: task 6 binds `unladen: "narrowPassage"` and
  task 7 edits phase 3's `passageCrossing`.
- **D2. Every one-way takes empty hands; `-[unladen]-` stands alone** (designer correction; spec "The rules",
  contract §3.2). One rule in `movesFrom` for every one-way, and play turns a carrying walk away at every launch.
  `-[unladen]-` beside `>>` is refused `unladenOnDrop`, beside another owner `unladenCombined` (`unladenFaults`,
  `src/game/lockAuthoring.ts`). No task tags a drop or adds a one-way field: `absorbUnladen`, `dropConditionsOn`,
  `OneWayObstacle.unladen`, `oneWays[].unladen`, `stonePasses`, a one-way's `handsFull` and the door face's "empty
  hands" marker are gone and stay gone.
- **D3. Loops in both carves** (Q1, refined). A corridor that circles back on ground within one lock region, going
  round no gate, is fine in every carve, laid and side-chain (task 4). A gate loop (a gate ON the loop) is the laid
  carve's job (tasks 1-3); a floor written longhand keeps `obstacleOffRoute` for one, and `offRouteChains` is
  unchanged. A loop that goes round a gate is `gateBypassed` (D4).
- **D4. A gate an open loop goes round is refused by name before the carve (`gateBypassed`)** (Q2), on every floor
  (task 2).
- **D5. The carve principle: as much freedom as the layout allows** (Q3a, and "a LOT of flexibility so it succeeds
  more often"). The only constraint on where an obstacle (the narrow passage, a door) stands in its corridor is that
  the corridor's obstacles keep their order; a corridor may circle back within its region. Wherever this plan
  chooses, it takes the more flexible option. Pinned in task 1 (`ORDERED_LOOP`) and task 4; written into
  `carveAgreement.ts` (task 4) and the design doc (task 14).
- **D6. The squeeze starts from the nearer side** (Q3b; task 7). The side he starts on is the traversal's `from`, and
  the squeeze's choreography already follows it (`squeezeWay`, `src/app/SiteMap/useSqueeze.ts`; `poseOf`,
  `SqueezeRider.tsx`); no choreography changes.
- **D7. stoneGate takes dev pyramid 12, expert, every region `free`** (Q4; task 6), bound `{ weights: "stonePlate",
  activator: "torch", unladen: "narrowPassage" }`. The dev floor exists mainly to test lock mechanisms. The comment at the top of `src/game/locks/stoneGate.lock` is the
  designer's and is left alone.
- **D8. Each lock has a single nest spot** ("I don't expect a lot of nesting, but it could increase puzzle
  difficulty"; tasks 8-9). It is a connection written `a -&> b` (never `-&-` or `<&-`), the inner's `in` at `a`, its
  `out` at `b`, on any connection of the lock. A second spot is `nestSpotsRepeated`.
- **D9. A spot on a busy connection is ignored, not refused** (task 8): where `-&>` shares its connection with a gate,
  a drop or any barrier, the lock has no nest spot and the connection carves as written. `yarn run lock` prints
  `nest spot ignored: a -&> b also carries <item>` (Q5).
- **D10. A spot nothing nests in is a plain corridor** (task 8).
- **D11. A pass-through lock is refused only for a one-way on its own in→out route** (Q6; task 10:
  `oneWayOnPassThroughRoute`). An off-route one-way is allowed, and that pass-through is walked fused with its pool's
  level, as a shared nesting is (task 12).
- **D12. A contained lock keeps its stones by its own design, not by an invisible edge** (Q7; task 12). Its way out
  must not be passable with a stone in hand ("the stones should be mandatory placed to exit, so you can't exit with a
  stone"): the walk refuses a nesting whose inner's out region is reachable carrying (`stoneCrossesOut`). Carrying a
  stone back out through the inner's way in is allowed; the floor's own ways out still take empty hands, and the floor
  walk proves soundness (the contained lock is walked fused with the floor's level). No `crossesContainedEdge`, no
  `keepsStones`, no play stop at an edge.
- **D13. "Leaves the inner lock with a stone only by solving it for one" (shared) is proved by the walk** (Q8): one
  pool, the floor's ways out take empty hands, and a pooled strand is refused naming both instances. No extra check.
- **D14. No new state bound** (Q9): `MAX_LOCK_STATES` refuses a fused level that passes it, `tooLarge` inside
  `pooled`.
- **D15. A nested lock joins the pool of the nearest lock it stands in that holds stones, at any depth** (Q10;
  `stoneNestings`, task 10).
- **D16. No `yarn run lock --nest` now** (Q11): the stone cases surface in the bake's lock sweep, the floor's refusals
  and the Lock playground (task 13).
- **D17. No dev floor for nested stones** (Q12): made-up fixtures prove each case, the playground plays them.

## Rulings made without the designer

- **Ruling: `topologyFaults` takes a last optional argument `{ laid?: boolean }`.** `checkLock` (a lock is always
  laid when it is baked) and the assembler on a floor with a plan pass `laid: true`. — Why: the seat question has
  two honest answers, one per carve, and only the caller knows which carve follows. — Cost if wrong: one argument.
- **Ruling: on a laid floor, a fork's seams are its chains' seams first, then every other join of its region the
  route does not take, in connection order (`forkSeams`).** — Why: on an acyclic layout the second list is empty,
  so every floor that carves today gets the same seams in the same order. — Cost if wrong: an ordering change.
- **Ruling: `gateBypassed` asks only two-way joins: a connection carrying any edge gate is no way round, and a region
  under a region barrier is not passed through (nor asked from).** — Why: that is the ground `gateDoorFaults`
  floods (`twoWayNeighbours`; a drop is never ground), and the barrier's doors stand at every entrance. — Cost if
  wrong: a few more locks reach the carve and fail there as they do today.
- **Ruling: no `CHANGELOG.md` entry and no save change.** — Why: stoneGate plays only on the dev journey and in
  Storybook until phase 6; no world floor changes, nests a lock or holds stones. The nest spot
  is authoring vocabulary no catalogue lock writes yet.
- **Ruling: `PlacedLock.inside` becomes `{ instance }`, and `PlacedInstance.inside`/`PlanNesting` name the spot's
  connection (`between`).** — Why: the spot says where a lock nests; `PlanNesting` has no reader but its tests. No
  world spec nests. — Cost if wrong: one field.
- **Ruling: the seat rules placement asks of a region today (`atPort`, `regionBarred`, `regionHoldsMechanic`,
  `notPassThrough`, `directionAmbiguous`, `regionUnknown`, `regionShared`) go, with `sidesOf` and `regionsHeldBy`.** —
  Why: a splice into a barrier-free connection needs none of them, and the arrow says which end is the inner's `in`.
  What is left is `noNestSpot`, `nestSpotTaken` and the cycle at placement, and `nestSpotOnNoConnection` when the lock
  is read. — Cost if wrong: a refusal re-added.
- **Ruling: the test fixtures `leverLock` and `strandingLock` mark `foyer -&> hall` as their nest spot.** — Why:
  every test that nests one lock in another nests in them, and the spot's corridor is the plain `["foyer", "hall"]`
  they already have, so every test that places them unnested carves the same floor. `sluiceLock` is world content and
  is not touched: the tests that nested in it go. — Cost if wrong: two fixture lines.
- **Ruling: "on its route" is the inner lock's own `regionRoute` (`src/game/regions.ts`), in to out** (task 10). — Why:
  it is the route every other rule of this phase reads; a one-way whose connection is a link of it stands where the
  carried stone must pass. — Cost if wrong: one function.
- **Ruling: a contained nesting is walked fused with the floor's own level** (task 12). — Why: its stones may leave
  by its way in (D12) and reach every lock it stands in, up to the floor's way out, so no level below the floor's knows
  the hand. — Cost if wrong: more states for a contained floor; never an unsound verdict.
- **Ruling: the walk spec's `leaveWith` is renamed `emptyHands`, and `mayLeave` `handsEmpty` (task 12).** — Why: it is
  read by the floor's way out AND every one-way, so a level that relaxes the way out must keep it. — Cost if wrong: a
  rename.
- **Ruling: the pooled control takes the pool instance's id, `<pool>.stones`, and the first plate's slot like any
  weights record.** — Why: the record is filed under its first plate (`xplate:<id>`), so a pooled floor saves as one
  arrangement with no new field. — Cost if wrong: a rename.

## Global Constraints

- **Generation proves nothing.** Each carved loop is proved sound by `walkFloorLock` (`src/game/floorLockWalk.ts`)
  in the tests, and by the bake's lock sweep (`findStrandingLocks`) on the dev floor. A test that only asserts "it
  carved" is not enough.
- **No tests on authored content.** Tests use small made-up locks written inline. `yarn run lock` checks
  `src/game/locks/*.lock`. Never assert what stoneGate (or any catalogue or world-spec lock, `sluiceLock` included)
  contains.
- **Stable world:** a plain `yarn generate-world` leaves `src/data/generatedWorld.ts` byte-identical. This plan edits
  files the carve imports (`scripts/carveLedger.ts` hashes every transitive import: `src/game/obstacles.ts`,
  `regions.ts`, `siteAssembler.ts`, `carveAgreement.ts`, and in tasks 8-12 `lockAuthoring.ts`, `lockNotation.ts`,
  `lockCompile.ts`, `floorLocks.ts`, `mechanics/weights.ts`, `floorLock.ts`, `lockWalk.ts`, `floorLockWalk.ts`), so
  `src/data/carveLedger.json` changes in its `"hash"` lines only; that refresh is committed (task 6, again in task
  14). Where the world could move, and why it does not: no carve changes how it grows (task 4 only pins and
  documents); `gateBypassed` on every floor refuses nothing a world floor has (task 2 checks); an unused nest spot is a plain corridor and no world lock writes one;
  `stoneArrangements` is refactored (task 11), but no world floor holds stones and the dev floors' arrangement keys are
  pinned by `weights.spec.ts`; `walkFloorLock` changes only for nested floors. A `"refusal"` line changing in the
  ledger means a world floor's search ended differently: stop and find the task.
- **Every one-way takes empty hands; `-[unladen]-` stands alone** (D2). No task adds a field, tag or binding to a
  one-way, and no task reads `unladen` as anything but the narrow passage's keyword.
- **The carve is free where the layout is silent** (D5): a corridor's obstacles keep their order, wherever along it
  the carve stands each; a corridor may circle back within its region. Prefer the more flexible option.
- **Authoring encounters never changes corridor structure** (`docs/game-design/world-spec-stability.md`). Nothing
  here reads an encounter; the seat and seam questions read the layout and the obstacles only.
- **Mod off = same carve, bare nodes, open corridors.** `topologyFaults` and `forkSeams` read core
  vocabulary only; the toggle-off sweeps (`src/mods/topology/toggleOff.verify.ts`,
  `carveNeverDependsOnAMod.verify.ts`) must stay green with stoneGate on the dev floor.
- **Comments state the current rule and why**, never history ("replaces", "used to", "now").
- **Count work, never wall-clock**, in tests: no duration assertions. State-space claims are asserted as state
  counts (`walk.states`, `reachableStates(...).order.length`).
- **One source for each rule** (spec, "The rules"): the arrangement search lives in `weights.ts` only, the spot's
  rules in `lockAuthoring.ts` (`nestSpotOf`, `nestSpotFaults`) only; walk, authoring and placement all call them.
- **Commits:** one short line, then the trailer lines exactly:
  ```
  git commit -m "<type(scope)>: <what changed>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
  ```
- **Shell:** commands run in zsh; an unmatched glob is an error, so quote globs passed to tools.
- **Known failures, not yours:** `src/mods/puzzleSeeds.verify.ts` fails 3 tests ("the switch's three shapes…",
  "owes the switch a board…", "names the floor and the shape…"). Leave them.
- **`yarn run lock`**, not `yarn lock` with flags before it: `yarn -s lock` prints Yarn's own help.

## Review Focus

1. **A loop with one door.** A designer writes a loop and gates one side only; they must read which gate and why
   before any carve, not `gateDoorMisplaced` at a cell. Test in task 2 (`gateBypassed`, unit and through
   `compileLock`).
2. **A fork whose two ways meet again.** The junction must still have exactly its two gated exits. Test in task 3
   (`ARMS_REJOIN` carves, two gated exits, walk sound).
3. **A floor written longhand with a gate loop.** It keeps its refusal (`obstacleOffRoute`), not a crash; a loop inside
   one region is fine there. Test in task 1 ("still refuses that gate on a floor carved as side chains"), the existing
   `siteAssembler.spec.ts` "still refuses an obstacle on a connection the carve produces no seam for" (unchanged), and
   task 4.
4. **Two obstacles on the corridor that closes a loop.** They must stand in their written order. Test in task 1
   (`ORDERED_LOOP`).
5. **A stone carried round a loop.** The walk must find the way round with the stone and back to set it down. Test in
   task 1 (`ROUND_THE_ROOM`, walk sound, no dead region).

One nest spot (tasks 8-9):

6. **A lock placed unnested that marks a spot.** It must carve exactly as the same lock with the spot written `--`.
   Test in task 8 (the compiled fragments are equal).
7. **A designer marks two spots, writes `-&-`, or puts the spot beside a gate or a drop.** Two spots and the wrong
   spelling are refused on their line; a busy spot is ignored with a note, never silently. Test in task 8.
8. **A bench floor (`freeRegions`) on a lock with a spot.** The spot must survive. Test in task 8.

Nested stones (tasks 10-13):

9. **Two stones in hand.** The pooled floor must have exactly one weights control, and no arrangement may name the
   hand twice. Test in task 11.
10. **A stone down a drop inside a nesting.** A level built without `emptyHands`, or a pass-through holding a drop
   walked without the host's stones, would let a stone ride it. Test in task 12 ("never lets a stone ride a drop") and
   task 10 (route and off-route one-ways).
11. **Leaving the floor with a stone, through a nesting.** The floor's own level must keep `emptyHands`. Test in task
   12.
12. **A contained lock whose way out lets a stone through.** It must be refused by name, and one that lets a stone out
   only by its way in must walk (sound or not, as the product walk says). Test in task 12.
13. **A pooled level too large to walk.** It must be refused by name, not hang the bake. Test in task 12 (a lowered
   ceiling handed in, never a timing).
14. **A floor with no nesting.** Every change here must leave it walked exactly as before. The existing
   `nestedLocks.spec.ts` "a floor without nesting is walked exactly as it was" stays green unchanged.

---

### Task 1: A laid floor seats a gate on every connection

**Files:**
- Modify: `src/game/obstacles.ts` (`topologyFaults`: options argument; `seatable` on a laid floor; doc comment)
- Modify: `src/game/lockCompile.ts:357-362` (`topologyOf` passes `{ laid: true }`)
- Modify: `src/game/siteAssembler.ts:821-827` (passes `{ laid: plan !== undefined }`; import `resolveMechanicKind`)
- Create: `src/game/gateLoops.spec.ts`
- Test: `src/game/obstacles.spec.ts`

**Interfaces:**
- Produces: `topologyFaults(layout, obstacles, controls, forks = [], barrierOrder = [], kinds = resolveMechanicKind,
  options: TopologyOptions = {}): TopologyFault[]` and `export type TopologyOptions = { laid?: boolean }` in
  `@/game/obstacles`. Tasks 2 and 3 read `laid` inside `topologyFaults`.
- Produces (test file, extended by tasks 2, 3 and 4): `src/game/gateLoops.spec.ts` with the fixtures
  `ROUND_THE_SIDE`, `ORDERED_LOOP`, `ROUND_THE_ROOM`, and helpers `doorCells(grid)`, `firstDoorFrom(grid, label, ids)`,
  `carveStones(text)`, `expectSound(grid)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/obstacles.spec.ts`:

```ts
describe("a floor laid from a lock plan", () => {
  // `cellar` meets the route twice, at `hall` and at `vault`. The lay stands a corridor on both joins.
  const loop: RegionGraph = {
    regions: [
      { name: "mouth", appetite: "free" },
      { name: "hall", appetite: "free" },
      { name: "vault", appetite: "free" },
      { name: "cellar", appetite: "free" },
    ],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
      ["hall", "cellar"],
      ["vault", "cellar"],
    ],
    in: "mouth",
    out: "vault",
  }
  // `cellar` holds two branches, `attic` and `crypt`; a side chain is laid as one line, a lock plan as a tree.
  const pendant: RegionGraph = {
    regions: [
      { name: "mouth", appetite: "free" },
      { name: "hall", appetite: "free" },
      { name: "vault", appetite: "free" },
      { name: "cellar", appetite: "free" },
      { name: "attic", appetite: "free" },
      { name: "crypt", appetite: "free" },
    ],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
      ["hall", "cellar"],
      ["cellar", "attic"],
      ["cellar", "crypt"],
    ],
    in: "mouth",
    out: "vault",
  }
  const bothSides = [gate("g1", ["vault", "cellar"]), gate("g2", ["hall", "cellar"])]

  it("seats a gate on the join that closes a loop", () => {
    const faults = topologyFaults(loop, bothSides, [lever("s1", { left: ["g1"], right: ["g2"] })], [], [], undefined, {
      laid: true,
    })
    expect(faults).toEqual([])
  })

  it("still refuses that gate on a floor carved as side chains", () => {
    const faults = topologyFaults(loop, bothSides, [lever("s1", { left: ["g1"], right: ["g2"] })])
    expect(faults).toEqual([{ type: "obstacleOffRoute", id: "g1" }])
  })

  it("seats a gate on the second branch of a pendant", () => {
    const faults = topologyFaults(
      pendant,
      [gate("g1", ["cellar", "crypt"])],
      [lever("s1", { left: ["g1"], right: [] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([])
    expect(topologyFaults(pendant, [gate("g1", ["cellar", "crypt"])], [lever("s1", { left: ["g1"], right: [] })])).toEqual(
      [{ type: "obstacleOffRoute", id: "g1" }]
    )
  })
})
```

Create `src/game/gateLoops.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import { parseLock } from "./lockNotation"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import { BINDING, carveLockFloor } from "./testSupport/lockFixtures"
import { stoneFloor } from "./testSupport/stoneFixtures"
import type { FloorGrid } from "./siteTypes"

// MADE-UP LOCKS WHOSE GATED JOINS CLOSE A LOOP, never catalogue ones: a test pins the rule, `yarn run lock` checks
// the catalogue. Every region takes `free`, so the floor holds the lock and nothing else.

/** A lever with two ways to the hall: straight through one door, or round by the side room through the other. */
const ROUND_THE_SIDE =
  "in -[L]- hall\nhall -- out\nin -- side\nside -[L:a]- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

/** A stone on the room's plate holds the way in open; lifted, it opens the way back round by `back`. */
/** ROUND_THE_SIDE with two barriers on the join that closes the loop: the lever's door, then a torch's. */
const ORDERED_LOOP =
  "in -[L]- hall\nhall -- out\nin -- side\nside -[L:a]- -[T]- hall\nL toggle @in\nT activator @in\nin ?\nhall ?\nout ?\nside ?"

/** The first of `ids` whose door a walk from a cell of the authored region `label` meets, passing through no door. */
const firstDoorFrom = (grid: FloorGrid, label: string, ids: readonly string[]): string | undefined => {
  const STEP = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const
  const isDoor = (r: number, c: number) => {
    const cell = grid.cells[r]?.[c]
    return cell?.type === "room" && cell.requiredKeyId !== undefined
  }
  const queue: [number, number][] = []
  const seen = new Set<string>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if ((cell.type === "room" || cell.type === "corridor") && cell.region === label && !isDoor(r, c)) {
        queue.push([r, c])
        seen.add(`${r},${c}`)
      }
    })
  )
  for (let at = 0; at < queue.length; at++) {
    const [r, c] = queue[at]
    const cell = grid.cells[r][c]
    if (isDoor(r, c)) {
      const found = ids.find(id => cell.type === "room" && cell.requiredKeyId!.endsWith(`:${id}`))
      if (found) return found
      continue
    }
    if (cell.type !== "room" && cell.type !== "corridor") continue
    for (const dir of cell.dirs) {
      const [nr, nc] = [r + STEP[dir][0], c + STEP[dir][1]]
      if (!grid.cells[nr]?.[nc] || seen.has(`${nr},${nc}`)) continue
      seen.add(`${nr},${nc}`)
      queue.push([nr, nc])
    }
  }
  return undefined
}

const ROUND_THE_ROOM =
  "in -- hall\nhall -[p]- room\nroom -- back\nback -[p:empty]- hall\nhall -- out\np plate @room stone\nin ?\nhall ?\nroom ?\nback ?\nout ?"

const doorCells = (grid: FloorGrid) =>
  grid.cells.flat().filter(cell => cell.type === "room" && cell.requiredKeyId !== undefined)

/** A stone lock carved at the first of twelve seeds that carves it. */
const carveStones = (text: string): FloorGrid => {
  const refused: unknown[] = []
  for (let n = 1; n <= 12; n++) {
    const result = assembleFloor("test", stoneFloor(text), n * 7919)
    if (result.success) return result.grid
    refused.push(result.reasons)
  }
  throw new Error(`carved at none of 12 seeds: ${JSON.stringify(refused[0])}`)
}

const expectSound = (grid: FloorGrid) => {
  const walk = walkFloorLock(grid)!
  if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
  expect(deadFloorRegions(grid)).toEqual([])
}

describe("a lock whose gates close a loop", () => {
  it("carves with a door on each way to the hall, and walks sound", () => {
    const grid = carveLockFloor(parseLock(ROUND_THE_SIDE, "roundTheSide").lock, BINDING)
    expect(doorCells(grid)).toHaveLength(2)
    expectSound(grid)
  })

  // D5: the carve stands each obstacle anywhere along its corridor, in the order the corridor carries them.
  it("keeps the order of two obstacles on the join that closes the loop", () => {
    const grid = carveLockFloor(parseLock(ORDERED_LOOP, "orderedLoop").lock, BINDING)
    expectSound(grid)
    const both = ["orderedLoop.side-hall", "orderedLoop.side-hall#2"]
    expect(firstDoorFrom(grid, "orderedLoop.side", both)).toBe("orderedLoop.side-hall")
    expect(firstDoorFrom(grid, "orderedLoop.hall", both)).toBe("orderedLoop.side-hall#2")
  })

  it("carves a stone's two doors on one loop, and walks the stone round and back", () => {
    const grid = carveStones(ROUND_THE_ROOM)
    expect(doorCells(grid)).toHaveLength(2)
    expectSound(grid)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts`
Expected: FAIL. In `obstacles.spec.ts` "seats a gate on the join that closes a loop" and "seats a gate on the second
branch of a pendant" get `[{ type: "obstacleOffRoute", id: "g1" }]` (and a type error on the seventh argument, which
vitest does not stop on). In `gateLoops.spec.ts` both throw "carved at none of 12 seeds" with a `lockRefused` reason
whose fault is `obstacleOffRoute` (`side-hall`, `back-hall`), and so does `ORDERED_LOOP`. (If a door's
`requiredKeyId` does not end `:<namespaced gate id>`, read one off a carved grid and match the way it is written.)

- [ ] **Step 3: Implement**

In `src/game/obstacles.ts`, above `topologyFaults`, add:

```ts
/** `laid`: the floor is laid from a lock plan (layLocks.ts), which stands a corridor on every connection. */
export type TopologyOptions = { laid?: boolean }
```

Replace the doc comment's second paragraph of `topologyFaults` (from "`obstacleOffRoute` is the honest limit" to
"picks one mouth, not two).") with:

```ts
 * A SEAM IS A CONNECTION TWO ADJACENT CELLS MEET ALONG, and which connections have one depends on the carve. A
 * floor laid from a lock plan (`laid`) stands a corridor on every connection, loops included, so every connection
 * is a seam. A floor carved as side chains meets only along the main path and along each chain's own links (the
 * mouth where it leaves its parent region, and every join within it: offRouteChains, regions.ts, the order
 * `regionOfStep` distributes a chain's own cells in); a connection off both, such as a branch's SECOND meeting with
 * the route, is refused `obstacleOffRoute`, because the side-chain carve never turns it into a physical join.
```

Change the signature to take the options last:

```ts
export const topologyFaults = (
  layout: RegionGraph | undefined,
  obstacles: readonly Obstacle[],
  controls: readonly Control[],
  forks: readonly ForkDemand[] = [],
  barrierOrder: readonly BarrierOrder[] = [],
  kinds: ResolveMechanicKind = resolveMechanicKind,
  { laid = false }: TopologyOptions = {}
): TopologyFault[] => {
```

Replace the block that builds `seatable` (lines 357-363 at `2afa135a`, from `const route = regionRoute(layout)` to
the end of the `for (const { mouth, regions } of offRouteChains(layout, drops))` loop) with:

```ts
  const seatable = new Set<string>(laid ? joined : [])
  if (!laid) {
    const route = regionRoute(layout)
    for (let i = 0; i < route.length - 1; i++) seatable.add(connectionKey(route[i], route[i + 1]))
    for (const { mouth, regions } of offRouteChains(layout, drops)) {
      const ordered = [mouth, ...regions]
      for (let i = 0; i < ordered.length - 1; i++) seatable.add(connectionKey(ordered[i], ordered[i + 1]))
    }
  }
```

If `regionRoute` has no other use in the file afterwards, TypeScript still needs it here; keep the import.

In `src/game/lockCompile.ts`, `topologyOf`:

```ts
const topologyOf = (lock: Lock, kinds: ResolveMechanicKind): LockFault[] => {
  const { regionLayout, obstacles, controls, forks, barrierOrder } = translate(lock, {}, undefined, kinds)
  // A lock is always laid from its plan when it is baked (siteAssembler.ts, layLockPlan).
  return topologyFaults(regionLayout, obstacles, controls, forks, barrierOrder, kinds, { laid: true })
    .filter(fault => fault.type !== "forkSwitchNoEncounter")
    .map(fault => ({ type: "topology", fault }))
}
```

In `src/game/siteAssembler.ts`, add `import { resolveMechanicKind } from "./mechanics"` beside the other `./`
imports (it is not imported there yet), and change the call at line 821 (`const topologyProblems = topologyFaults(`):

```ts
  const topologyProblems = topologyFaults(
    regionLayout,
    authoredConfig.obstacles ?? [],
    authoredConfig.controls ?? [],
    authoredConfig.forks ?? [],
    authoredConfig.barrierOrder ?? [],
    resolveMechanicKind,
    { laid: plan !== undefined }
  )
```

- [ ] **Step 4: Run them to see them pass, and the neighbours stay green**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts src/game/lockCompile.spec.ts src/game/siteAssembler.spec.ts src/game/regionBarrier.spec.ts src/game/barrierOrder.spec.ts src/game/sequenceAuthoring.spec.ts`
Expected: PASS. `siteAssembler.spec.ts` "still refuses an obstacle on a connection the carve produces no seam for"
is a longhand floor and still gets `obstacleOffRoute`. If `ROUND_THE_SIDE` or `ROUND_THE_ROOM` still refuses, read
the reason: `gateDoorMisplaced` or `regionsNotJoined` means the lay or the carve does not hold a loop after all;
stop and report the reason and seed, do not loosen `gateDoorFaults`.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/obstacles.ts src/game/obstacles.spec.ts src/game/lockCompile.ts src/game/siteAssembler.ts src/game/gateLoops.spec.ts
git commit -m "feat(topology): a laid floor seats a gate on the join that closes a loop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 2: A gate an open loop goes round is refused by name

**Files:**
- Modify: `src/game/obstacles.ts` (`TopologyFault` gains `gateBypassed`; the check in `topologyFaults`)
- Modify: `src/game/siteTypes.ts` (the mirrored `AssemblerReason` member, beside `obstacleOffRoute` at line 771)
- Test: `src/game/obstacles.spec.ts`, `src/game/gateLoops.spec.ts`

**Interfaces:**
- Consumes: `topologyFaults(..., { laid })` (task 1).
- Produces: `TopologyFault` member `{ type: "gateBypassed"; id: string; between: [string, string] }`, the same
  member in `AssemblerReason`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("a floor laid from a lock plan", …)` in `src/game/obstacles.spec.ts` (it reuses `loop`):

```ts
  it("names a gate an open way goes round, since no doorway could hold it", () => {
    const faults = topologyFaults(
      loop,
      [gate("g1", ["vault", "cellar"])],
      [lever("s1", { left: ["g1"], right: [] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([{ type: "gateBypassed", id: "g1", between: ["vault", "cellar"] }])
  })

  it("names it on a floor carved as side chains too (D4)", () => {
    const faults = topologyFaults(loop, [gate("g1", ["vault", "cellar"])], [lever("s1", { left: ["g1"], right: [] })])
    expect(faults).toContainEqual({ type: "gateBypassed", id: "g1", between: ["vault", "cellar"] })
  })

  it("is no way round through a barred region", () => {
    const ring: RegionGraph = {
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
        { name: "cellar", appetite: "free" },
        { name: "attic", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
        ["vault", "cellar"],
        ["cellar", "attic"],
        ["attic", "hall"],
      ],
      in: "mouth",
      out: "vault",
    }
    const flooded: Obstacle = { id: "flood", kind: "gate", at: { on: "region", region: "attic" } }
    const faults = topologyFaults(
      ring,
      [gate("g1", ["vault", "cellar"]), flooded],
      [lever("s1", { left: ["g1"], right: ["flood"] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([])
  })
```

Append to `src/game/gateLoops.spec.ts` (add `import { compileLock } from "./lockCompile"` to the imports):

```ts
/** One door with an open way round it. */
const OPEN_WAY_ROUND = "in -[L]- hall\nhall -- out\nin -- side\nside -- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

describe("a gate an open loop goes round", () => {
  it("is refused by name before a wall is carved", () => {
    const result = compileLock(parseLock(OPEN_WAY_ROUND, "openWayRound").lock, BINDING)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.faults).toContainEqual({
      type: "topology",
      fault: { type: "gateBypassed", id: "in-hall", between: ["in", "hall"] },
    })
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts`
Expected: FAIL: the first gets `[]`, the side-chain one lacks `gateBypassed`, `compileLock` returns `ok: true`. The
barred-region test passes already (it is the guard against an over-eager check).

- [ ] **Step 3: Implement**

In `src/game/obstacles.ts`, add to `TopologyFault` after `obstacleOffRoute`:

```ts
  /** A gate whose two regions an open way joins: no edge gate on it and no barred region along
   * it, so its two sides are one ground and no carve can stand its door between two (gateDoorFaults,
   * carveAgreement.ts). `id` is the gate. */
  | { type: "gateBypassed"; id: string; between: [string, string] }
```

In `src/game/siteTypes.ts`, add after `| { type: "obstacleOffRoute"; id: string }` (line 771):

```ts
  | { type: "gateBypassed"; id: string; between: [string, string] }
```

In `topologyFaults`, directly after the `for (const obstacle of obstacles) { … }` loop that ends with the
`obstacleOffRoute` push (and before `const owned = new Set<string>()`), add:

```ts
  // AN OPEN WAY ROUND A GATE, on any floor (every floor that can hold a loop is laid): the walk from one side of the
  // gate to the other over joins that carry no edge gate and through no barred region. Its two sides are then one
  // ground, so the carve would refuse its door at every seed; it is refused here by name instead.
  const gatedJoins = new Set(
    obstacles.flatMap(o => (isEdgeGate(o) ? [connectionKey(o.at.between[0], o.at.between[1])] : []))
  )
  const barred = new Set(obstacles.flatMap(o => (isRegionGate(o) ? [o.at.region] : [])))
  const openNeighbours = new Map<string, string[]>()
  for (const [a, b] of layout.connections) {
    if (gatedJoins.has(connectionKey(a, b)) || barred.has(a) || barred.has(b)) continue
    openNeighbours.set(a, [...(openNeighbours.get(a) ?? []), b])
    openNeighbours.set(b, [...(openNeighbours.get(b) ?? []), a])
  }
  const openlyJoined = (from: string, to: string): boolean => {
    const seen = new Set([from])
    const queue = [from]
    for (let at = 0; at < queue.length; at++)
      for (const next of openNeighbours.get(queue[at]) ?? []) {
        if (next === to) return true
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    return false
  }
  for (const obstacle of obstacles) {
    if (!isEdgeGate(obstacle)) continue
    const [a, b] = obstacle.at.between
    if (!joined.has(connectionKey(a, b)) || barred.has(a) || barred.has(b)) continue
    if (openlyJoined(a, b)) faults.push({ type: "gateBypassed", id: obstacle.id, between: [a, b] })
  }
```

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts src/game/lockCompile.spec.ts src/game/siteAssembler.spec.ts src/game/regionBarrier.spec.ts src/game/barrierOrder.spec.ts`
Expected: PASS. A pre-existing test that now also gets `gateBypassed` is a fixture with an open loop round a door on
any floor: read it, and if it really is one, add the fault to its expectation and say so in the report.

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts; echo $?`
Expected: `0`. Every world floor carves today, so none has a gate an open way goes round; a non-zero exit means one
is now refused `gateBypassed`: stop and report which floor.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/obstacles.ts src/game/siteTypes.ts src/game/obstacles.spec.ts src/game/gateLoops.spec.ts
git commit -m "feat(topology): a gate an open loop goes round is refused by name" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 3: A fork's ways may meet again

**Files:**
- Modify: `src/game/regions.ts` (`forkSeams`)
- Modify: `src/game/obstacles.ts` (`seamsFor` in `topologyFaults` reads `forkSeams`)
- Modify: `src/game/siteAssembler.ts:1170-1184` (a laid floor's `{ in }` fork takes `forkSeams(…, { laid: true })`)
- Test: `src/game/regions.spec.ts`, `src/game/gateLoops.spec.ts`

**Interfaces:**
- Consumes: `topologyFaults(..., { laid })` (task 1).
- Produces: `forkSeams(graph: RegionGraph, region: string, oneWays?: ReadonlyArray<readonly [string, string]>,
  options?: { laid?: boolean }): [string, string][]` in `@/game/regions`, each pair `[region, other]`.

- [ ] **Step 1: Write the failing tests**

In `src/game/regions.spec.ts`, add `forkSeams` to the import from `./regions` and append:

```ts
describe("the seams a fork in a region has", () => {
  it("are the first joins of the chains hanging off it, on a floor carved as side chains", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "a"],
        ["in", "b"],
        ["a", "b"],
      ],
      ["in", "out", "a", "b"],
      { in: "in", out: "out" }
    )
    expect(forkSeams(g, "in")).toEqual([["in", "a"]])
  })

  it("are every join of it the route does not take, on a laid floor, a loop's own included", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "a"],
        ["in", "b"],
        ["a", "b"],
      ],
      ["in", "out", "a", "b"],
      { in: "in", out: "out" }
    )
    expect(forkSeams(g, "in", [], { laid: true })).toEqual([
      ["in", "a"],
      ["in", "b"],
    ])
  })

  it("are the same either way where nothing closes a loop", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "a"],
        ["in", "b"],
      ],
      ["in", "out", "a", "b"],
      { in: "in", out: "out" }
    )
    expect(forkSeams(g, "in", [], { laid: true })).toEqual(forkSeams(g, "in"))
  })
})
```

Append to `src/game/gateLoops.spec.ts`:

```ts
/** A fork whose two ways meet again beyond it. */
const ARMS_REJOIN = "in -[Y]- a\nin -[Y]- b\na -- b\nin -- out\nY fork @in\nin ?\na ?\nb ?\nout ?"

describe("a fork whose two ways meet again", () => {
  it("carves its junction with a gated exit on each way, and walks sound", () => {
    const grid = carveLockFloor(parseLock(ARMS_REJOIN, "armsRejoin").lock, BINDING)
    const junction = grid.cells.flat().find(cell => cell.type === "room" && cell.mechanismId === "armsRejoin.Y")
    expect(junction?.type === "room" && junction.exits?.filter(exit => exit.gateKeyId !== undefined)).toHaveLength(2)
    expectSound(grid)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/regions.spec.ts src/game/gateLoops.spec.ts`
Expected: FAIL: `forkSeams` is not exported; `ARMS_REJOIN` throws "carved at none of 12 seeds" with
`gateOwnedOffSeam` on `in-b`.

- [ ] **Step 3: Implement**

In `src/game/regions.ts`, after `offRouteChains`, add:

```ts
/**
 * THE WAYS OUT OF `region` A JUNCTION THERE OFFERS BESIDE THE ROUTE, each as `[region, other]`.
 *
 * On a floor carved as side chains, a way out is the first join of a chain whose mouth is `region` (a chain joined
 * to its mouth by a drop alone has no corridor to leave by). On a floor laid from a lock plan (`laid`) every
 * connection is a corridor, so every other join of `region` the route does not take is a way out too: the second
 * meeting of a loop. The chains' seams come first, so a layout with no loop gets the same seams in the same order
 * either way.
 */
export const forkSeams = (
  graph: RegionGraph,
  region: string,
  oneWays: ReadonlyArray<readonly [string, string]> = [],
  { laid = false }: { laid?: boolean } = {}
): [string, string][] => {
  const keyOf = (a: string, b: string) => JSON.stringify([a, b].sort())
  const joined = new Set(graph.connections.map(([a, b]) => keyOf(a, b)))
  const chained = offRouteChains(graph, oneWays)
    .filter(chain => chain.mouth === region && chain.regions.length > 0 && joined.has(keyOf(region, chain.regions[0])))
    .map((chain): [string, string] => [region, chain.regions[0]])
  if (!laid) return chained
  const route = regionRoute(graph)
  const taken = new Set([
    ...route.slice(1).map((next, i) => keyOf(route[i], next)),
    ...chained.map(([a, b]) => keyOf(a, b)),
  ])
  const looped: [string, string][] = []
  for (const [a, b] of graph.connections) {
    if ((a !== region && b !== region) || a === b || taken.has(keyOf(a, b))) continue
    taken.add(keyOf(a, b))
    looped.push([region, a === region ? b : a])
  }
  return [...chained, ...looped]
}
```

In `src/game/obstacles.ts`, import `forkSeams` beside `offRouteChains, regionRoute` from `./regions`, and replace the
body of `seamsFor` (lines 455-467 at `2afa135a`) with:

```ts
  const seamsFor = (region: string): Set<string> => {
    const known = seamsOf.get(region)
    if (known) return known
    const seams = new Set(forkSeams(layout, region, drops, { laid }).map(([a, b]) => connectionKey(a, b)))
    seamsOf.set(region, seams)
    return seams
  }
```

In `src/game/siteAssembler.ts`, add `forkSeams` to the `./regions` import, and in the `{ in }` fork loop
(line 1175 onward, from `const seams: [string, string][] = []` to the end of `layoutChains.forEach`) replace the seam
collection. At `2afa135a` the loop already skips `sectionIdxs` on a laid floor (`if (!plan && i < …)`); the laid
branch below never reaches it, so the side-chain branch drops the `!plan`:

```ts
      const seams: [string, string][] = []
      const sectionIdxs: number[] = []
      // A laid floor's junction is laid for its plan's arms, which may meet again beyond it; a floor carved as side
      // chains matches each seam to the side section hosting its chain.
      if (plan) seams.push(...forkSeams(regionLayout, region, drops, { laid: true }))
      else
        layoutChains.forEach((chain, i) => {
          if (chain.mouth !== region || chain.regions.length === 0 || !joined(region, chain.regions[0])) return
          seams.push([region, chain.regions[0]])
          if (i < config.sideSections.length) sectionIdxs.push(i)
        })
```

(`regionLayout` is narrowed by the `notInLayout` guard above it. If TypeScript does not narrow it, hoist
`const layout = regionLayout` above the loop with an `if (!layout) …` matching that guard's refusal; do not add a
non-null assertion.)

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/game/regions.spec.ts src/game/gateLoops.spec.ts src/game/obstacles.spec.ts src/game/lockCompile.spec.ts src/game/siteAssembler.spec.ts src/game/regionBarrier.spec.ts src/game/laidFloor.spec.ts src/game/layLocks.spec.ts`
Expected: PASS, the fork-switch refusals in `siteAssembler.spec.ts` (`gateOwnedOffSeam`, `forkSwitchSeamUngated`,
`fewerThanTwoSeams`) unchanged.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/regions.ts src/game/regions.spec.ts src/game/obstacles.ts src/game/siteAssembler.ts src/game/gateLoops.spec.ts
git commit -m "feat(topology): a laid fork's ways may meet again beyond it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 4: A loop inside one region is fine in every carve

D3: corridors that circle back on ground within one region, going round no gate, are fine in every carve, laid and
side-chain. Gate loops (a gate ON the loop) are the laid carve's (tasks 1-3); a loop round a gate is `gateBypassed`
(task 2). At `99a68952` the checks already read regions, never cells (`adjacencyFaults` skips two cells of one region;
`regionsOf` makes them one compiled region), so this task pins that both carves' checks and the walk accept an
in-region loop, and writes the carve principle (D5) where the carve reads it. It changes no carve: the side-chain
carve cuts a cycle only at a branch spot in recovery (`attachChain`'s `mayCarve`, `RECOVERY_ATTEMPT`,
`src/game/siteAssembler.ts`), and widening that would move world floors (recorded for the designer, task 14).

**Files:**
- Modify: `src/game/carveAgreement.ts` (the carve principle, in `adjacencyFaults`' doc comment)
- Test: `src/game/gateLoops.spec.ts`

**Interfaces:**
- Consumes: `adjacencyFaults(cells, layout)` (`src/game/carveAgreement.ts`); `expandFloorLocks`
  (`@/game/floorLocks`); `ROUND_THE_SIDE`, `carveLockFloor`, `expectSound` (task 1).
- Produces: nothing new.

- [ ] **Step 1: Write the tests**

Append to `src/game/gateLoops.spec.ts` (add `import { adjacencyFaults } from "./carveAgreement"`,
`import { expandFloorLocks } from "./floorLocks"` and `import type { Direction } from "./siteTypes"`):

```ts
const OPPOSITE = { n: "s", s: "n", e: "w", w: "e" } as const
const STEP = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const

/** The grid with one more passage, between the first two grid-neighbours of one region that no way joins, neither a
 * door: a loop inside that region. Undefined where the carve left no such pair. */
const withRegionLoop = (grid: FloorGrid): FloorGrid | undefined => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++)
      for (const dir of ["e", "s"] as Direction[]) {
        const [nr, nc] = [r + STEP[dir][0], c + STEP[dir][1]]
        const [a, b] = [grid.cells[r][c], grid.cells[nr]?.[nc]]
        if (!b || (a.type !== "room" && a.type !== "corridor") || (b.type !== "room" && b.type !== "corridor")) continue
        if (a.region === undefined || a.region !== b.region || a.dirs.has(dir)) continue
        if ((a.type === "room" && a.requiredKeyId) || (b.type === "room" && b.requiredKeyId)) continue
        const cells = grid.cells.map(row => [...row])
        cells[r][c] = { ...a, dirs: new Set([...a.dirs, dir]) }
        cells[nr][nc] = { ...b, dirs: new Set([...b.dirs, OPPOSITE[dir]]) }
        return { ...grid, cells }
      }
  return undefined
}

const SIMPLE = "in -- hall\nhall -[L]- out\nL toggle @in\nin ?\nhall ?\nout ?"
const configOf = (text: string, name: string) => ({
  pathPuzzles: 0,
  difficulty: "expert" as const,
  end: "treasure" as const,
  exitOrStaircase: "exit" as const,
  sideSections: [],
  realisations: BINDING,
  locks: [{ lock: parseLock(text, name).lock }],
})

describe("a loop inside one region", () => {
  it.each([
    ["laid from a lock", () => carveLockFloor(parseLock(ROUND_THE_SIDE, "roundTheSide").lock, BINDING), ROUND_THE_SIDE, "roundTheSide"],
    ["carved as side chains", () => {
      // The same lock written longhand: its own expansion, with no `locks` left, which the side-chain carve takes.
      const expanded = expandFloorLocks(configOf(SIMPLE, "simple"))
      if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
      for (let n = 1; n <= 12; n++) {
        const result = assembleFloor("test", expanded.config, n * 7919)
        if (result.success) return result.grid
      }
      throw new Error("carved at none of 12 seeds")
    }, SIMPLE, "simple"],
  ] as const)("is fine on a floor %s: no adjacency fault, and the walk is unchanged", (_, carve, text, name) => {
    const grid = carve()
    const looped = withRegionLoop(grid)
    if (!looped) throw new Error("the carve left no two neighbours of one region unjoined")
    const expanded = expandFloorLocks(configOf(text, name))
    if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
    const layout = expanded.config.regionLayout!
    expect(adjacencyFaults(looped.cells, layout)).toEqual(adjacencyFaults(grid.cells, layout))
    expectSound(looped)
    expect(walkFloorLock(looped)).toEqual(walkFloorLock(grid))
  })
})
```

(If `adjacencyFaults` takes another cells type than `FloorGrid["cells"]`, pass what it takes; if the floor walk is
not imported in this file yet, import `walkFloorLock` from `./floorLockWalk`.)

- [ ] **Step 2: Run them**

Run: `yarn vitest run src/game/gateLoops.spec.ts`
Expected: PASS at once: the checks and the walk read regions, never cells. This is the guard that keeps an in-region
loop fine. If it fails, a check refuses a loop inside one region: report which and the fault it names; lifting that
refusal is this task's change, nothing else.

- [ ] **Step 3: Write the carve principle where the carve reads it**

In `src/game/carveAgreement.ts`, `adjacencyFaults`' doc comment gains, at its end:

```ts
 *
 * THE CARVE IS FREE WHERE THE LAYOUT IS SILENT (designer, 2026-10-08): a corridor may circle back on ground of its own
 * region, and an obstacle may stand anywhere along its corridor, so long as the corridor's obstacles keep their order.
 * Only region adjacency and that order are the layout's; everything else is the carve's to choose, so it succeeds
 * more often.
```

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/game/gateLoops.spec.ts src/game/carveAgreement.ts
git commit -m "test(topology): a loop inside one region is fine in every carve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 5: The tool no longer calls a gate loop unbuildable

**Files:**
- Modify: `src/game/lockWalkSpec.ts` (`notBuildable` loses "gate loop"; `hasGateLoop` goes)
- Test: `src/game/lockWalkSpec.spec.ts` ("names what the engine cannot build yet")

**Interfaces:** none new. `notBuildable(lock: Lock): string[]` keeps its signature; the lock playground
(`src/app/SiteMap/lockPlayground.testing.tsx`) then carves a lock with a loop instead of showing "not buildable yet".

- [ ] **Step 1: Change the test**

In `src/game/lockWalkSpec.spec.ts`, in "names what the engine cannot build yet", the loop line becomes:

```ts
    expect(notBuildable(parseLock("in -[H]- hall\nhall -- out\nout -- in\nH toggle @in").lock)).toEqual([])
```

Run: `yarn vitest run src/game/lockWalkSpec.spec.ts`
Expected: FAIL, `["gate loop"]`.

- [ ] **Step 2: Implement**

In `src/game/lockWalkSpec.ts` delete `hasGateLoop` (its doc comment and the function, ending at line 198 at `2afa135a`) and
the `...(hasGateLoop(lock) ? ["gate loop"] : []),` line in `notBuildable`, leaving `sequence` and `region gate`. Then `grep -n "joinOf\|barriersOf" src/game/lockWalkSpec.ts`: drop from
the imports any name with no other use.

Run: `yarn vitest run src/game/lockWalkSpec.spec.ts && yarn check-types && yarn lint`
Expected: PASS, clean.

Run: `yarn run lock stoneGate 2>&1 | head -8`
Expected: no `⚠ not buildable yet` line (at `2afa135a` it prints `⚠ not buildable yet: gate loop`).

- [ ] **Step 3: Commit**

```bash
git add src/game/lockWalkSpec.ts src/game/lockWalkSpec.spec.ts
git commit -m "feat(lock): a gate loop is buildable" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 6: stoneGate on the dev floor

**Files:**
- Modify: `src/worldGen/spec/dev.ts` (pyramid 12: stoneGate)
- Modify: `src/worldGen/data.ts:72` (`DEV_JOURNEYS` `levelCount: 12`)
- Modify (the dev journey's counts, which these sweeps pin): `src/worldGen/devJourney.verify.ts`,
  `src/worldGen/floorLockWalkUnchanged.verify.ts`, `src/worldGen/singlePlaceMechanisms.verify.ts`,
  `src/worldGen/lockFloorInspector.verify.ts`, `src/mods/topology/carveNeverDependsOnAMod.verify.ts`
- Modify: `src/data/carveLedger.json` (hash refresh from the plain bake)
- Test: none of its own. The proof is the dev bake, its lock sweep and `yarn verify-content`, never a content
  assertion.

**Interfaces:**
- Consumes: `catalogueLock(name)` from `./locks/catalogue` and `freeRegions(lock)` from `@/game/lockAuthoring`
  (both imported in `dev.ts` already); phase 3's binding key `unladen` (`PASSAGE_KIND`) and realisation
  `narrowPassage` (`src/mods/topology/game/narrowPassage/meta.ts`).

- [ ] **Step 1: Check what this task stands on**

Run: `git status --short src/data/`
Expected: nothing (no uncommitted playtest bake).

Run: `yarn run lock stoneGate 2>&1 | head -4`
Expected: `✓ every region is reachable` and `✓ solvable`. If not, the designer's lock changed: stop and report.

- [ ] **Step 2: Author the floor**

`src/worldGen/spec/dev.ts`: append to `devRules`, after pyramid 11 (twoStones):

```ts
  // 12 — stoneGate, read from its .lock file. Lifting the stone off the altar opens the back way and shuts the door
  // in; a stone parked on the backroom shelf lets the explorer squeeze through the narrow passage; both stones are
  // spent twice. Its gated joins close loops. Every region takes `free`, as on the other lock benches.
  //
  // Bound at the pyramid: the stones are stone plates, the activator a torch, empty hands a narrow passage.
  journey(DEV_JOURNEY_ID)
    .pyramid(12, {
      difficulty: "expert",
      pathPuzzles: 0,
      realisations: { weights: "stonePlate", activator: "torch", unladen: "narrowPassage" },
    })
    .floor(0, {
      locks: [{ lock: freeRegions(catalogueLock("stoneGate")) }],
    }),
```

`src/worldGen/data.ts` line 72: `levelCount: 11` becomes `levelCount: 12`.

- [ ] **Step 3: Bake with the dev journey and read the seed the bake chose**

Run: `INCLUDE_DEV=1 yarn generate-world 2>&1 | tail -20`
Expected: exits 0, no `✗` line, `Lock sweep: walked 14 of 14 floor(s)`. If it prints `unsatisfiable: dev_topology
level 12 …`, stop and report the refusal it names (a `lockNotLaid` names the part the lay could not place); do not
work around it.

Run: `grep -n -B3 '"name":"stoneGate"' src/data/generatedWorld.ts`
Expected: the floor's `seed: <n>,` (and `packing: <p>,`) just above its `locks:` line.

Add the seed to the stoneGate floor in `dev.ts`, after `locks`, with the comment that matches what the bake did:

```ts
      // Recorded from the bake's own carve search (searchCarvePair): at the default packing the floor's own
      // address seed carves on attempt 0, walks sound and leaves no dead region. A dev floor has no baked output
      // to carry the pin.
      seed: <n>,
```

If the seed is not the floor's own address seed, say "the first seed that carves … is <k> past the floor's address
seed" (as pyramid 10's comment does); if the packing printed is not `0.1`, also author `packing: <p>` and say so (as
pyramid 3 does).

Then restore the committed world, which holds no dev journey, and prove it unchanged:

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts; echo $?`
Expected: `0`.

Run: `git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -vc '"hash"'`
Expected: `0` (every changed ledger line is a `"hash"` line). If a `"refusal"` line changed, a world floor's carve
search now ends differently: stop and find which task moved it.

- [ ] **Step 4: Update the dev journey's counts in the sweeps**

One more floor, holding a lock with no drop and no switch. The numbers below are those at `2afa135a` (checked); if
a later commit moved one, add one to what is there.

`src/worldGen/devJourney.verify.ts`:
- every `toHaveLength(11)` becomes `toHaveLength(12)`, including the one in `"walks eleven of them on the dev journey
  itself"`, whose title becomes `"walks twelve of them on the dev journey itself"`;
- `"walks thirteen once the dev journey stands its eleven, and finds no strand"` becomes `"walks fourteen once the dev
  journey stands its twelve, and finds no strand"` with `toHaveLength(14)`;
- the difficulties list gains a final `"expert"`;
- the switch test's title and comment add stoneGate beside twoStones (`…, the procession's, twoStones' and
  stoneGate's, none of which needs one`), and `const noJunction = new Set([1, 3, 6, 7, 9, 10])` becomes
  `new Set([1, 3, 6, 7, 9, 10, 11])`;
- the side-section comment adds stoneGate to its lock floors, and `toEqual([2, 0, 2, 0, 2, 2, 3, 1, 2, 0, 0])` becomes
  `toEqual([2, 0, 2, 0, 2, 2, 3, 1, 2, 0, 0, 0])`;
- the lock sweep's header comment: "the eleven the dev journey adds" becomes "the twelve the dev journey adds".

`src/worldGen/floorLockWalkUnchanged.verify.ts`: `expect(dev).toHaveLength(11)` becomes `toHaveLength(12)`.

`src/worldGen/singlePlaceMechanisms.verify.ts`: `expect(dev).toHaveLength(11)` becomes `toHaveLength(12)`;
`expect(several).toEqual([10, 11])` becomes `toEqual([10, 11, 12])` (the stones move at every plate).

`src/worldGen/lockFloorInspector.verify.ts`: `toEqual([2, 4, 10, 11])` becomes `toEqual([2, 4, 10, 11, 12])`.

`src/mods/topology/carveNeverDependsOnAMod.verify.ts`: `Array.from({ length: 11 }, …)` in `FLOORS_WITH_MECHANICS`
becomes `{ length: 12 }`, and its three `toHaveLength(11)` become `toHaveLength(12)`. `FLOORS_WITH_DROPS` is
unchanged.

Run: `yarn verify-content 2>&1 | grep -E "×|Test Files|Tests "`
Expected: only the three known `src/mods/puzzleSeeds.verify.ts` failures. Every dev-journey sweep passes,
`toggleOff` and `carveNeverDependsOnAMod` included: with the topology mod off, stoneGate's plates are bare, its torch
bare and its passage open ground, on the same walls.

- [ ] **Step 5: Commit**

```bash
git add src/worldGen/spec/dev.ts src/worldGen/data.ts src/worldGen/devJourney.verify.ts src/worldGen/floorLockWalkUnchanged.verify.ts src/worldGen/singlePlaceMechanisms.verify.ts src/worldGen/lockFloorInspector.verify.ts src/mods/topology/carveNeverDependsOnAMod.verify.ts src/data/carveLedger.json
git diff --cached --exit-code -- src/data/generatedWorld.ts
git commit -m "feat(topology): stoneGate on the dev floor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 7: The squeeze starts from the nearer side

Where a gate loop makes both sides of a passage walkable, the explorer walks to the side nearer him and squeezes
from there, never round the loop to the far one. The side he starts on becomes the traversal's `from`, and the
squeeze's choreography already reads its heading off the traversal (`squeezeWay`, `src/app/SiteMap/useSqueeze.ts`;
`poseOf`, `src/app/SiteMap/SqueezeRider.tsx`): head-on going north he starts on the wall's face and fades behind it,
going south he comes out from behind it; sideways he slides along behind the wall, slower
(`SQUEEZE_SIDEWAYS_MS_PER_LEG`) and lifted (`SQUEEZE_SIDEWAYS_LIFT`). So this task changes which side he starts on
and nothing in the squeeze itself.

**Files:**
- Modify: `src/game/passages.ts` (`passageCrossing` takes an optional cost)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (the passage tap passes the path length)
- Test: `src/game/passages.spec.ts`

**Interfaces:**
- Consumes: `passageCrossing(grid, row, col, canStand): PassageCrossing | undefined`,
  `passageSides(grid, row, col)`, `headingOf(from, to)` (all `src/game/passages.ts`); `findPath(grid, from, to)`
  (`src/game/gridNavigation.ts:207`).
- Produces: `passageCrossing(grid, row, col, canStand, costOf?: (row: number, col: number) => number)`.

- [ ] **Step 1: Check what this task stands on**

Run: `grep -n "export const passageCrossing" -A12 src/game/passages.ts`
Expected: phase 3's function, picking `near` with `sides.find(([r, c]) => canStand(r, c))` (checked at `2afa135a`).

Run: `grep -n "const crossing = passageCrossing" -A14 src/app/SiteMap/useSiteNavigation.ts`
Expected: the passage branch of `onCellClick` builds its `Traversal` as `from: crossing.near`, `to: crossing.far`,
`dir: headingOf(crossing.via, crossing.far)`, `via: crossing.via` (checked at `2afa135a`). That is what makes the
squeeze follow the side chosen here; if it builds the traversal another way, stop and report.

- [ ] **Step 2: Write the failing tests**

In `src/game/passages.spec.ts`, inside `describe("passageCrossing", …)`, beside phase 3's "starts on the first side
where he can stand on both" (which uses the `straight` fixture, sides `[0, 0]` and `[0, 2]`, and stays: it is the tie):

```ts
  it("starts on the nearer side where he can stand on both", () => {
    expect(passageCrossing(straight, 0, 1, () => true, (_r, c) => (c === 2 ? 1 : 5))?.near).toEqual([0, 2])
    expect(passageCrossing(straight, 0, 1, () => true, () => 3)?.near).toEqual([0, 0])
  })

  it("squeezes away from the side he starts on, toward the other", () => {
    const crossing = passageCrossing(straight, 0, 1, () => true, (_r, c) => (c === 2 ? 1 : 5))!
    expect(crossing.far).toEqual([0, 0])
    expect(headingOf(crossing.via, crossing.far)).toBe("w")
  })
```

Run: `yarn vitest run src/game/passages.spec.ts`
Expected: FAIL, the first gets `[0, 0]`, the second `far` `[0, 2]` (the cost is ignored).

- [ ] **Step 3: Implement**

In `src/game/passages.ts`, `passageCrossing` gains the cost and picks the cheapest standable side, the first in
`dirs` order on a tie. Its doc comment's last sentence becomes "Both are standable only where a gate closes a loop;
he starts from the one `costOf` rates nearer, the first on a tie, and squeezes toward the other." The function:

```ts
export const passageCrossing = (
  grid: FloorGrid,
  row: number,
  col: number,
  canStand: (row: number, col: number) => boolean,
  costOf: (row: number, col: number) => number = () => 0
): PassageCrossing | undefined => {
  const cell = grid.cells[row]?.[col]
  const sides = passageSides(grid, row, col)
  if (!sides || cell?.type !== "room" || !cell.passage) return undefined
  const near = sides
    .filter(([r, c]) => canStand(r, c))
    .reduce<Place | undefined>((best, side) => (best && costOf(...best) <= costOf(...side) ? best : side), undefined)
  if (!near) return undefined
  return { near, via: [row, col], far: near === sides[0] ? sides[1] : sides[0], realisation: cell.passage.realisation }
}
```

In `src/app/SiteMap/useSiteNavigation.ts`, in the passage branch of `onCellClick`
(`const crossing = passageCrossing(grid, row, col, (r, c) => walkable.has(`${r},${c}`))`):

```ts
        const crossing = passageCrossing(
          grid,
          row,
          col,
          (r, c) => walkable.has(`${r},${c}`),
          (r, c) => findPath(grid, explorerPos, [r, c]).length
        )
```

(`findPath` is imported there already. Both sides passed to `costOf` are standable, so both have a path.)

Run: `yarn vitest run src/game/passages.spec.ts src/app/SiteMap && yarn check-types && yarn lint`
Expected: PASS, clean: phase 3's crossing tests (the way back from the far side included) and the squeeze specs
(`useSqueeze.spec.ts`, `SqueezeRider.spec.tsx`) unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/game/passages.ts src/game/passages.spec.ts src/app/SiteMap/useSiteNavigation.ts
git commit -m "feat(map): the squeeze starts from the nearer side" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 8: A lock marks one nest spot, on a connection

The designer's decision (2026-10-08, revised): each lock has a single spot for nesting, and it is a CONNECTION, not a
region. A nested lock has an `in` and an `out`, so it is spliced into a corridor: `a -&> b` says another lock may stand
between `a` and `b`, the arrow pointing from its `in` (at `a`) to its `out` (at `b`), as a one-way's arrow points (D8).
`a -&- b` and `b <&- a` are refused by name when the lock is read: the spot has one spelling. Where
nothing nests, the spot is the plain corridor `a -- b` (D10). A second spot is refused (`nestSpotsRepeated`). A spot
on a connection that also carries a gate, a drop or any other barrier is not refused but ignored: the lock has no
nest spot, the connection carves as written, and `yarn run lock` says so in one line (D9). The spot may
be on any connection, on the route or off it (D8).

**Files:**
- Modify: `src/game/lockAuthoring.ts` (`Lock.nestSpot`; `nestSpotOf`, `nestSpotBusy`; `NestSpotFault`, `nestSpotFaults`)
- Modify: `src/game/lockNotation.ts` (`-&>` on a join; `LOCK_SYNTAX`; the refused lines)
- Modify: `src/game/lockCompile.ts` (`LockFault` gains `NestSpotFault`; `lockFaults` asks `nestSpotFaults`)
- Modify: `src/game/lockDraw.ts` (the spot's corridor is drawn `&`)
- Modify: `scripts/lock.ts` (prints `nest spot: a -&> b`, or `nest spot ignored: a -&> b also carries <item>`)
- Create: `src/game/nestSpot.spec.ts`

**Interfaces:**
- Produces, in `@/game/lockAuthoring`:
  - `Lock` gains `readonly nestSpot?: { readonly from: RegionId; readonly to: RegionId }`: the connection another lock
    may be spliced into, its `in` meeting `from` and its `out` meeting `to`. The connection itself stays in
    `connections` as a plain corridor, so a lock nothing nests in compiles and carves exactly as if `-&>` were `--`.
  - `export const nestSpotBusy = (lock: Lock): BarrierId[]`: the barriers on the spot's connection (empty when it has
    none, no spot, or no such connection)
  - `export const nestSpotOf = (lock: Lock): { from: RegionId; to: RegionId } | undefined`: the spot a lock may be
    spliced into, undefined when it has none or its connection is busy. Every reader but `yarn run lock`'s note asks
    this, never `lock.nestSpot`.
  - `export type NestSpotFault = { type: "nestSpotOnNoConnection"; from: string; to: string }`;
    `export const nestSpotFaults = (lock: Lock): NestSpotFault[]`
- `parseLock` refuses a second `-&>` (`nestSpotsRepeated`; a `Lock` holds one `nestSpot`, so only the text can say
  two) and keeps the first.
- Task 9 reads `nestSpotOf`; task 13 reads it through placement.

- [ ] **Step 1: Write the failing tests**

Create `src/game/nestSpot.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { freeRegions, nestSpotBusy, nestSpotFaults, nestSpotOf } from "./lockAuthoring"
import { compileLock } from "./lockCompile"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"
import { BINDING } from "./testSupport/lockFixtures"

// MADE-UP LOCKS WITH A NEST SPOT, never catalogue ones: a test pins the rule, `yarn run lock` checks the catalogue.

/** A lever lock whose way from `in` to `hall` is where another lock may be spliced in. */
const NESTING = "in -&> hall\nhall -[L]- out\nL toggle @in\nin ?\nhall ?\nout ?"

describe("a lock's nest spot", () => {
  it("is the one connection written -&>, read from left to right", () => {
    const { lock, refused } = parseLock(NESTING, "nesting")
    expect(refused).toEqual([])
    expect(lock.nestSpot).toEqual({ from: "in", to: "hall" })
    expect(lock.connections).toContainEqual(["in", "hall"])
  })

  it.each(["in -&- hall", "hall <&- in"])("refuses %s by name: the spot is written with its arrow, in -&> hall", text => {
    expect(() => parseLock(`${text}\nhall -- out`, "spelled")).toThrow("line 1: a nest spot is written a -&> b")
  })

  it("is absent from a lock that writes none", () => {
    expect(parseLock("in -- hall\nhall -- out").lock.nestSpot).toBeUndefined()
  })

  it("may stand off the route, where the designer puts it", () => {
    const { lock, refused } = parseLock("in -- out\nin -&> side", "aside")
    expect(refused).toEqual([])
    expect(nestSpotFaults(lock)).toEqual([])
  })

  it("is one per lock: a second is refused on its own line, and the first is kept", () => {
    const { lock, refused } = parseLock("in -&> a\na -&> b\nb -- out", "twice")
    expect(refused).toEqual(["line 2: a lock has one nest spot, and in -&> a is one already"])
    expect(lock.nestSpot).toEqual({ from: "in", to: "a" })
  })

  it.each([
    ["a gate", "in -&> -[L]- hall\nhall -- out\nL toggle @in", ["in-hall"]],
    ["a drop", "in -&> >> hall\nhall -- out\nhall -- in2\nin2 -- in", ["in>hall"]],
  ])("ignores a spot on a connection that also carries %s: the lock has none, and nothing is refused", (_, text, barriers) => {
    const { lock, refused } = parseLock(text, "busy")
    expect(refused).toEqual([])
    expect(nestSpotFaults(lock)).toEqual([])
    expect(nestSpotOf(lock)).toBeUndefined()
    expect(nestSpotBusy(lock)).toEqual(barriers)
  })

  it("carves a busy spot's connection as written without &", () => {
    const busy = "in -&> -[L]- hall\nhall -- out\nL toggle @in"
    expect(compileLock(parseLock(busy, "n").lock, BINDING, { namespace: "n" })).toEqual(
      compileLock(parseLock(busy.replace("-&> ", ""), "n").lock, BINDING, { namespace: "n" })
    )
  })

  it("refuses a spot naming a connection the lock does not have, as written in JSON", () => {
    const lock = { ...parseLock(NESTING, "n").lock, nestSpot: { from: "in", to: "out" } }
    expect(nestSpotFaults(lock)).toEqual([{ type: "nestSpotOnNoConnection", from: "in", to: "out" }])
    const result = compileLock(lock, BINDING)
    expect(result.ok === false && result.faults).toContainEqual({ type: "nestSpotOnNoConnection", from: "in", to: "out" })
  })

  it("compiles as a plain corridor where nothing nests, so the lock carves as if it were written --", () => {
    const spot = compileLock(parseLock(NESTING, "n").lock, BINDING, { namespace: "n" })
    const plain = compileLock(parseLock(NESTING.replace("-&>", "--"), "n").lock, BINDING, { namespace: "n" })
    expect(spot).toEqual(plain)
  })

  it("survives a bench floor, which frees every region", () => {
    expect(freeRegions(parseLock(NESTING, "n").lock).nestSpot).toEqual({ from: "in", to: "hall" })
  })

  it("is drawn as & on its corridor", () => {
    expect(drawLock(parseLock(NESTING, "n").lock)).toContain("&")
    expect(drawLock(parseLock(NESTING.replace("-&>", "--"), "n").lock)).not.toContain("&")
  })
})
```

(The gate and drop ids are the ones `parseLock` gives a join's barriers, `<from>-<to>` and `<from>><to>`; if it
prints others, use those and say so. The drop lock gives `hall` a way back so the lock still reads whole.)

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/nestSpot.spec.ts`
Expected: FAIL: `nestSpotFaults` is not exported, and `parseLock` reads `-&>` as no edge (`cannot read "in -&> hall"`).

- [ ] **Step 3: Implement**

In `src/game/lockAuthoring.ts`, `Lock` gains, after `out`:

```ts
  /** The one connection another lock may be spliced into (written `a -&> b`): its `in` meets `from`, its `out`
   * meets `to`. The connection stays in `connections` as a plain corridor, which is what it is where nothing nests. */
  readonly nestSpot?: { readonly from: RegionId; readonly to: RegionId }
```

and, after `unladenFaults`:

```ts
const spotConnection = (lock: Lock): LockConnection | undefined => {
  if (!lock.nestSpot) return undefined
  const { from, to } = lock.nestSpot
  return lock.connections.find(c => {
    const [a, b] = joinOf(c)
    return (a === from && b === to) || (a === to && b === from)
  })
}

/** The barriers that share the nest spot's connection: a spot on a busy connection is no spot (designer,
 * 2026-10-08), and the connection carves as written. */
export const nestSpotBusy = (lock: Lock): BarrierId[] => {
  const connection = spotConnection(lock)
  return connection ? [...barriersOf(connection)] : []
}

/** The connection another lock may be spliced into, or undefined: no spot written, or its connection is busy. */
export const nestSpotOf = (lock: Lock): { from: RegionId; to: RegionId } | undefined =>
  lock.nestSpot && spotConnection(lock) && nestSpotBusy(lock).length === 0 ? lock.nestSpot : undefined

/** A nest spot naming a connection the lock does not have (a JSON lock's typo; the notation cannot write one). */
export type NestSpotFault = { type: "nestSpotOnNoConnection"; from: RegionId; to: RegionId }

export const nestSpotFaults = (lock: Lock): NestSpotFault[] =>
  lock.nestSpot && !spotConnection(lock) ? [{ type: "nestSpotOnNoConnection", ...lock.nestSpot }] : []
```

`freeRegions` spreads `...lock`, so it keeps `nestSpot` with no change.

In `src/game/lockNotation.ts`:
- `EDGE` becomes `/\s*(--|>>|-&>|-&-|<&-|-\[[^\]]*\]-)\s*/` (the two wrong spellings are read only to be refused);
- in `join`, first: `if (ops.some(op => op === "-&-" || op === "<&-")) fail(n, "a nest spot is written a -&> b, from the nested lock's in to its out")`;
- `LOCK_SYNTAX` gains, after the `-[unladen]-` line:
  ```
    in -&> hall                   the nest spot: another lock may be spliced in here, its in at in, its out at hall;
                                  one per lock, a plain corridor where nothing nests, ignored beside a barrier
  ```
- beside `joins`: `const spots: { from: string; to: string; n: number }[] = []`;
- in `join`, before `const barriers = ops`: `if (ops.includes("-&>")) spots.push({ from, to, n })`, and the barrier
  filter skips it too: `.filter(op => op !== "--" && op !== "-&>")`;
- the returned lock gains `...(spots.length > 0 ? { nestSpot: { from: spots[0].from, to: spots[0].to } } : {})`;
- after the `unladenFaults` loop, before `return`:
  ```ts
  // A LOCK HAS ONE NEST SPOT (nestSpotsRepeated): only the text can say two, so only the parse refuses it.
  for (const extra of spots.slice(1))
    refused.push(`line ${extra.n}: a lock has one nest spot, and ${spots[0].from} -&> ${spots[0].to} is one already`)
  for (const fault of nestSpotFaults(lock))
    refused.push(`line ${spots[0].n}: ${fault.from} -&> ${fault.to} is no connection of the lock`)
  ```
  (import `nestSpotFaults` from `./lockAuthoring`).

In `src/game/lockCompile.ts`: import `nestSpotFaults` and `type NestSpotFault` from `./lockAuthoring`; `LockFault`
gains `| NestSpotFault` beside `| UnladenFault`; in `lockFaults`, after `faults.push(...unladen)`:
`faults.push(...nestSpotFaults(lock))`. `translate` is unchanged: the spot is a plain connection.

In `src/game/lockDraw.ts`, `sketchOf`'s connection loop: a connection without a drop whose pair is the lock's
`nestSpotOf` gets the token `&` (it has no barriers, so its token is otherwise empty; a busy spot is drawn as its
barriers, with no `&`):

```ts
    const nest = nestSpotOf(lock)
    const spot = nest && keyOf(a, b) === keyOf(nest.from, nest.to)
    if (!drop) {
      edges[String(c)] = { from: a, to: b, token: spot ? "&" : barriers.map(token).join(" ") }
      return
    }
```

(with a local `const keyOf = (a: string, b: string) => [a, b].sort().join("|")` if the file has none).

In `scripts/lock.ts`, in `checks`, after the `at the start …` line:
`` ...nestSpotLines(lock), `` with, above `report` (import `nestSpotBusy`, `nestSpotOf` from
`../src/game/lockAuthoring`):

```ts
/** The nest spot, or why it is ignored: a spot on a busy connection is no spot, and says so (D9). */
const nestSpotLines = (lock: Lock): string[] => {
  const spot = nestSpotOf(lock)
  if (spot) return [`nest spot: ${spot.from} -&> ${spot.to}`]
  const busy = nestSpotBusy(lock)
  return lock.nestSpot && busy.length > 0
    ? [`nest spot ignored: ${lock.nestSpot.from} -&> ${lock.nestSpot.to} also carries ${busy.join(", ")}`]
    : []
}
```

(`Lock` imported as a type from `../src/game/lockAuthoring`).

- [ ] **Step 4: Run them to see them pass, and every lock spec stays green**

Run: `yarn vitest run src/game/nestSpot.spec.ts src/game/lockNotation.spec.ts src/game/lockDraw.spec.ts src/game/lockCompile.spec.ts src/game/nestedLocks.spec.ts src/game/lockWalkSpec.spec.ts`
Expected: PASS (`nestedLocks.spec.ts` unchanged by this task: placement still seats in a region until task 9).

Run: `printf 'in -&> hall\nhall -[L]- out\nL toggle @in\n' | yarn run lock -`
Expected: a `nest spot: in -&> hall` line, and the drawing marks that corridor `&`.

Run: `printf 'in -&> -[L]- hall\nhall -- out\nL toggle @in\n' | yarn run lock -`
Expected: a `nest spot ignored: in -&> hall also carries in-hall` line, no `✗`, and no `&` in the drawing.

Run: `yarn run lock 2>&1 | grep -c "nest spot"`
Expected: `0` (no catalogue lock writes `-&>`).

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/lockNotation.ts src/game/lockCompile.ts src/game/lockDraw.ts scripts/lock.ts src/game/nestSpot.spec.ts
git commit -m "feat(lock): a lock marks one nest spot on a connection, written -&>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 9: A nested lock is spliced into its host's nest spot

Placement stops seating a lock in a host region and splices it into the host's spot instead: the spot's connection
`[host.from, host.to]` leaves the layout and two take its place, `[host.from, inner.in]` and `[inner.out, host.to]`.
The host keeps every region, so the route walks host, inner, host whether the spot is on the route or off it. The spot
carries no barrier (`nestSpotOf` ignores a busy one, task 8), so no gate, drop or `barrierOrder` moves. `PlacedLock.inside` loses its `region`: the
spot says where.

**Files:**
- Modify: `src/game/floorLocks.ts` (`PlacedLock.inside`, `PlacedInstance.inside`, `LockNestingFault`, `seatNested`,
  the splice in `expandFloorLocks`; `regionsHeldBy` and `sidesOf` go, unread)
- Modify: `src/game/lockPlan.ts` (`PlanNesting` names the spot's connection)
- Modify: `src/game/testSupport/floorLockFixtures.ts` (`leverLock` and `strandingLock`: `nestSpot: { from: "foyer",
  to: "hall" }`)
- Modify: `src/game/nestedLocks.spec.ts`, `src/game/layLocks.spec.ts`, `src/game/lockPlan.spec.ts` (placements drop
  `region`; the layout and refusal tests)

**Interfaces:**
- Consumes: `nestSpotOf`, `nestSpotFaults` (task 8).
- Produces:
  - `PlacedLock = { lock: Lock; as?: string; inside?: { instance: string } }`
  - `PlacedInstance.inside?: { host: string; between: [string, string] }` and `PlanNesting = { host: string; between:
    [string, string]; instance: string }`, both namespaced, `between` in the spot's direction (`[from, to]`)
  - `LockNestingFault = { type: "hostUnknown"; host } | { type: "noNestSpot"; host } | { type: "cycle"; through } |
    { type: "nestSpotTaken"; host; with }` (task 10 adds `oneWayOnPassThroughRoute`). A spot that contradicts its host is the
    host's own refusal: `lockRefused` with `nestSpotOnNoConnection` (task 8); a spot on a busy connection is no spot,
    so nesting there is `noNestSpot`.

- [ ] **Step 1: Change the fixtures and the tests**

`src/game/testSupport/floorLockFixtures.ts`: `leverLock` and `strandingLock` gain `nestSpot: { from: "foyer", to:
"hall" }` (their doc comments gain "; another lock may be spliced in between `foyer` and `hall`"). Their
`connections` are unchanged: `["foyer", "hall"]` is the spot's plain corridor.

Every test placement drops `region`: `inside: { instance: "x" }` becomes `inside: { instance: "x" }`
(`grep -rn "region: \"" src/game/nestedLocks.spec.ts src/game/layLocks.spec.ts src/game/lockPlan.spec.ts` finds them;
`insideHall(host)` in `nestedLocks.spec.ts` becomes `insideOf(host) => ({ instance: host })`, and the local
`inner(inside)` helper takes `{ instance }`).

In `src/game/nestedLocks.spec.ts`:
- "takes the host region out of the layout and re-points its joins …" becomes:
  ```ts
  it("splices the inner into the host's nest spot: in at the spot's first region, out at its second", () => {
    const { config, nesting } = expanded(leverInLever)

    expect(config.regionLayout!.regions.map(region => region.name)).toEqual([
      FLOOR_ENTRANCE,
      "lever.foyer",
      "lever.hall",
      "lever.landing",
      "inner.foyer",
      "inner.hall",
      "inner.landing",
      FLOOR_EXIT,
    ])
    expect(config.regionLayout!.connections).toEqual([
      [FLOOR_ENTRANCE, "lever.foyer"],
      ["lever.foyer", "inner.foyer"],
      ["inner.landing", "lever.hall"],
      ["lever.hall", "lever.landing"],
      ["inner.foyer", "inner.hall"],
      ["inner.hall", "inner.landing"],
      ["lever.landing", FLOOR_EXIT],
    ])
    expect(config.obstacles!.map(({ id, at }) => [id, at])).toEqual([
      ["lever.hallDoor", { on: "connection", between: ["lever.hall", "lever.landing"] }],
      ["inner.hallDoor", { on: "connection", between: ["inner.hall", "inner.landing"] }],
    ])
    expect(nesting).toEqual([
      {
        instance: "inner",
        host: "lever",
        regions: ["inner.foyer", "inner.hall", "inner.landing"],
        in: "inner.foyer",
        out: "inner.landing",
      },
    ])
  })
  ```
- In `describe("a nesting that cannot be seated is refused by name", …)`: "names a host instance the floor does not
  place" stays; "names a host region the host does not have", the port `it.each`, "refuses a region the host bars as a
  whole", "refuses a region a host mechanic stands in", "refuses a region that is not a stretch of the route" and
  "refuses a region whose two neighbours are equally far from the host's in" go (a nesting names no region; task 8
  refuses a bad spot), with `ringLock`, `middleLeverLock` and, if nothing else uses it, the `sluiceLock` import. In
  their place:
  ```ts
  it("refuses a host with no nest spot", () => {
    const { nestSpot: _spot, ...plain } = { ...leverLock(), name: "plain" }
    expect(refusedWith([{ lock: plain }, inner({ instance: "plain" })])).toEqual([
      { type: "lockNestingRefused", instance: "inner", fault: { type: "noNestSpot", host: "plain" } },
    ])
  })

  it("treats a spot on a busy connection as no spot", () => {
    const busy: Lock = { ...leverLock(), name: "busy", nestSpot: { from: "hall", to: "landing" } }
    expect(refusedWith([{ lock: busy }, inner({ instance: "busy" })])).toEqual([
      { type: "lockNestingRefused", instance: "inner", fault: { type: "noNestSpot", host: "busy" } },
    ])
  })
  ```
- "refuses a second lock in a region that already holds one, naming the first" becomes "refuses a second lock in a
  spot that already holds one, naming the first", expecting `fault: { type: "nestSpotTaken", host: "lever", with:
  "first" }`. The cycle tests stay (with `insideOf`).
- In `describe("stones on a floor with nested locks", …)` the stone lock's text `"in -- yard\nyard -- hall…"` becomes
  `"in -- yard\nyard -&> hall…"`, so the lever is still spliced in and the floor still meets `STONES_NESTED` (task 12
  deletes the block).

In `src/game/lockPlan.spec.ts`, "lays a nested lock in its host's region, which gives up its place on the route"
becomes "lays a nested lock in its host's nest spot, between the spot's two regions": its `nested` expectation becomes
`[{ host: "lever", between: ["lever.foyer", "lever.hall"], instance: "inner" }]`, and its `route`/`corridors`
expectations become what the plan prints once you have checked by hand that `lever.hall` is on the route after
`inner.landing` and that no corridor joins `lever.foyer` to `lever.hall` directly. Name the changed lines in the report.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/nestedLocks.spec.ts src/game/lockPlan.spec.ts src/game/layLocks.spec.ts`
Expected: FAIL: a type error on `inside` without `region` (vitest runs on), `regionUnknown` for every placement, and
the layout still drops `lever.hall`.

- [ ] **Step 3: Implement**

In `src/game/floorLocks.ts` (import `nestSpotOf` from `./lockAuthoring`):
- `PlacedLock = { lock: Lock; as?: string; inside?: { instance: string } }`, its doc comment: "`inside` splices the
  lock into the nest spot of another placement (`Lock.nestSpot`) instead of the floor's sequence. Neither lock knows:
  the host is written exactly as it would be alone.";
- `PlacedInstance.inside?: { host: string; between: [string, string] }`;
- `LockNestingFault` becomes:
  ```ts
  /** EVERY WAY A NESTING IS REFUSED, naming the host or instance to fix. Authored names. A spot that contradicts its
   * host is the host's own refusal (`nestSpotFaults`, compileLock), never a nesting's. */
  export type LockNestingFault =
    | { type: "hostUnknown"; host: string }
    /** The host has no nest spot: none written (`-&>`), or one on a busy connection, which is no spot. */
    | { type: "noNestSpot"; host: string }
    | { type: "cycle"; through: string[] }
    /** A spot holds one lock; `with` is the placement that got there first. */
    | { type: "nestSpotTaken"; host: string; with: string }
  ```
- `type Seat = { instance: string; host: string; from: string; to: string }`, and `seatNested`'s first loop body after
  the `hostUnknown` check becomes:
  ```ts
    // A LOCK IS SPLICED INTO ITS HOST'S NEST SPOT, the one connection its author wrote `-&>`. Whether the spot can
    // hold a lock is asked when the host is read (`nestSpotFaults`), so a spot that contradicts it is refused there.
    const spot = nestSpotOf(hostLock)
    if (!spot) {
      refuse(instance, { type: "noNestSpot", host })
      continue
    }
    const first = taken.get(host)
    if (first === undefined) taken.set(host, instance)
    else refuse(instance, { type: "nestSpotTaken", host, with: first })
    seats.push({ instance, host, from: spot.from, to: spot.to })
  ```
  (`taken` is keyed by host.) Delete `regionsHeldBy` and `sidesOf`, which nothing reads now, and any import only
  they used.
- in `expandFloorLocks`, the seat loop (`for (const { instance, host, region, near, far } of nested.seats)`) becomes
  the splice:
  ```ts
  // A NESTED LOCK IS SPLICED INTO ITS HOST'S NEST SPOT: the spot's corridor gives way to two, from the spot's first
  // region to the inner's `in` and from the inner's `out` to the spot's second. The spot carries no barrier, so
  // nothing else of the host moves.
  for (const { instance, host, from, to } of nested.seats) {
    const inner = fragments.get(instance)!.regionLayout
    const [a, b] = [`${host}.${from}`, `${host}.${to}`]
    const hosted = fragments.get(host)!
    fragments.set(host, {
      ...hosted,
      regionLayout: {
        ...hosted.regionLayout,
        connections: hosted.regionLayout.connections.flatMap(pair =>
          (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
            ? [[a, inner.in] as const, [inner.out, b] as const]
            : [pair]
        ),
      },
    })
  }
  ```
  and its doc comment's last paragraph becomes "A NESTED LOCK IS SPLICED INTO ITS HOST'S NEST SPOT: the spot's
  corridor gives way to one from its first region to the inner's `in` and one from the inner's `out` to its second, so
  the route walks host, inner, host. Nested locks are no part of the floor's sequence.";
- `placed`'s `inside` becomes `{ host: seat.host, between: [`${seat.host}.${seat.from}`, `${seat.host}.${seat.to}`] }`.

In `src/game/lockPlan.ts`: `PlanNesting = { host: string; between: [string, string]; instance: string }` (doc: "A lock
spliced into its host's nest spot, between the spot's two regions."), and line 184's map reads
`inside ? [{ host: inside.host, between: inside.between, instance }] : []`.

The floor walk needs no change for the splice: a nesting is still the inner's own regions and ports
(`LockNesting`), and the host's level walks it as ground between the spot's two regions.

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/game/nestedLocks.spec.ts src/game/layLocks.spec.ts src/game/lockPlan.spec.ts src/game/floorLocks.spec.ts src/game/nestSpot.spec.ts src/game`
Expected: PASS. "walks the host, the inner and the host again along the main route of every carve" stays green as
written (`[FLOOR_ENTRANCE, "lever", "inner", "lever", FLOOR_EXIT]`). A walk or state-count test that now fails moved
because the inner stands before `hall` rather than in its place: read it, and if the new number is the host's states
on the new layout, update it and name it in the report; if a walk turned unsound, stop and report.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/floorLocks.ts src/game/lockPlan.ts src/game/testSupport/floorLockFixtures.ts src/game/nestedLocks.spec.ts src/game/layLocks.spec.ts src/game/lockPlan.spec.ts
git commit -m "feat(locks): a nested lock is spliced into its host's nest spot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 10: Each nesting knows its stone case; a pass-through lock holds no one-way on its route

Tasks 10-13 implement the spec's "Nested locks (designer, 2026-10-08)". They do not depend on tasks 1-7 (they read
the gate-loop work nowhere) but do on tasks 8-9: every host below marks its nest spot `-&>`, and `leverLock`'s spot is
`foyer -&> hall`.

**Files:**
- Modify: `src/game/floorLocks.ts` (`StoneNesting`, `stoneNestings`; `LockNesting.stones`; `LockNestingFault` gains
  `oneWayOnPassThroughRoute`; `expandFloorLocks` refuses it and writes the case)
- Create: `src/game/nestedStones.spec.ts`

**Interfaces:**
- Consumes: `inside: { instance }`, `noNestSpot` and `leverLock`'s spot `foyer -&> hall` (task 9).
- Produces, in `@/game/floorLocks`:
  - `export type StoneNesting = { case: "passThrough"; pool: string; oneWays?: true } | { case: "contained" } | { case:
    "shared"; pool: string }` (`oneWays`: the pass-through holds a one-way, off its route; task 12 fuses it)
  - `export const stoneNestings = (placements: readonly PlacedLock[]): Map<string, StoneNesting>` (nested
    placements only; a nesting with no stones on either side is absent)
  - `LockNesting` gains `stones?: StoneNesting` (absent when neither side holds stones, so every nesting today reads
    exactly as before). `FloorGrid.lockNesting` is `readonly LockNesting[]` (`siteTypes.ts:357`), so the grid carries
    it with no further change.
  - `LockNestingFault` member `{ type: "oneWayOnPassThroughRoute"; pool: string; oneWays: string[] }` (the one-way
    ids on the pass-through lock's own in→out route, as its `Lock.oneWays` keys them). An off-route one-way is allowed
    (D11); the walk fuses that pass-through with its pool's level (task 12).
  - In `expandFloorLocks`, `const stoneCases = stoneNestings(placements)` declared once, right after `seatNested`;
    task 11 reads it.
- Produces (test file, extended by tasks 11-12): `src/game/nestedStones.spec.ts` with `HOST_STONES`, `CELL`, `GATED`,
  `STRANDING_HOST`, `NESTED_BINDING`, the placements `PASS_THROUGH`, `CONTAINED`, `SHARED`, and the helpers `stones`,
  `carve`, `carved`, `expanded`.

- [ ] **Step 1: Write the failing test**

Create `src/game/nestedStones.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { expandFloorLocks, stoneNestings } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import { parseLock } from "./lockNotation"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { leverLock } from "./testSupport/floorLockFixtures"
import { BINDING } from "./testSupport/lockFixtures"

// MADE-UP LOCKS NESTED IN EACH OTHER, never catalogue ones: a test pins the rule, `yarn run lock` checks the catalogue.
// Every region takes `free`, so the floor holds the locks and nothing else.

/** Stones around a nest spot from `yard` to `hall`: a stone on the shelf by the way in, a door on that waits for a
 * stone on `p`. */
const HOST_STONES =
  "in -- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard ?\nhall ?\nout ?"
/** A stone lock to nest: its stone on a shelf by its way in, its door on waiting for it on `p`. */
const CELL = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"
/** A stone lock that opens only for a stone carried in: `s` by its way in opens the way on, its own stone lies
 * beyond. Alone it cannot be solved; nested in a stone lock, the pool solves it. */
const GATED = "in -[s]- hall\nhall -- out\ns plate @in\nt plate @hall stone\nin ?\nhall ?\nout ?"
/** HOST_STONES with a torch by the way in that shuts the way on for good: a player who lights it first strands. */
const STRANDING_HOST =
  "in -[T:off]- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nT activator @in\nin ?\nyard ?\nhall ?\nout ?"

const NESTED_BINDING = { ...BINDING, weights: "stonePlate" }

const stones = (text: string, name: string) => parseLock(text, name).lock

/** The outer lock holds stones, the inner none: the stone is carried through it. */
const PASS_THROUGH: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: leverLock(), as: "inner", inside: { instance: "host" } },
]
/** The inner lock holds stones, the outer none: they never leave it. */
const CONTAINED: PlacedLock[] = [
  { lock: leverLock() },
  { lock: stones(CELL, "cell"), as: "inner", inside: { instance: "lever" } },
]
/** Both hold stones: one pool. */
const SHARED: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: stones(GATED, "gated"), as: "inner", inside: { instance: "host" } },
]

const floorOf = (locks: PlacedLock[]): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: NESTED_BINDING,
  locks,
})

const carve = (locks: PlacedLock[], seed: number) =>
  assembleFloor("nested-stones", floorOf(locks), seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: "nested-stones", floorIndex: 0 },
  })

const SEEDS = 12
const carved = (locks: PlacedLock[]): FloorGrid[] =>
  Array.from({ length: SEEDS }, (_, n) => carve(locks, n + 1)).flatMap(result => (result.success ? [result.grid] : []))

const expanded = (locks: PlacedLock[]) => {
  const result = expandFloorLocks(floorOf(locks))
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return result
}

describe("a nested lock's stones are read against the locks it stands in", () => {
  it("passes a stone through a lock without stones that stands in a lock with them", () => {
    expect(stoneNestings(PASS_THROUGH)).toEqual(new Map([["inner", { case: "passThrough", pool: "host" }]]))
  })

  it("contains the stones of a lock no lock around it shares", () => {
    expect(stoneNestings(CONTAINED)).toEqual(new Map([["inner", { case: "contained" }]]))
  })

  it("pools the stones of a lock standing in a lock with stones", () => {
    expect(stoneNestings(SHARED)).toEqual(new Map([["inner", { case: "shared", pool: "host" }]]))
  })

  it("reads past a lock without stones to the nearest that has them, and pools with the outermost", () => {
    const chain: PlacedLock[] = [
      { lock: stones(HOST_STONES, "host") },
      { lock: leverLock(), as: "middle", inside: { instance: "host" } },
      { lock: stones(CELL, "cell"), as: "deep", inside: { instance: "middle" } },
    ]
    expect(stoneNestings(chain)).toEqual(
      new Map([
        ["middle", { case: "passThrough", pool: "host" }],
        ["deep", { case: "shared", pool: "host" }],
      ])
    )
  })

  it("leaves a nesting without stones unmarked, so the floor's nesting reads as it did", () => {
    const plain: PlacedLock[] = [{ lock: leverLock() }, { lock: leverLock(), as: "inner", inside: { instance: "lever" } }]
    expect(stoneNestings(plain)).toEqual(new Map())
    expect(expanded(plain).nesting?.[0]).not.toHaveProperty("stones")
  })

  it("writes the case on the floor's nesting", () => {
    expect(expanded(SHARED).nesting?.[0].stones).toEqual({ case: "shared", pool: "host" })
  })
})

// A PASS-THROUGH LOCK NEVER TURNS A STONE AWAY: nothing that takes only empty hands stands in it.
describe("a pass-through lock never turns a stone away", () => {
  it("refuses a lock without stones that asks for empty hands, naming the lock", () => {
    const result = carve(
      [
        { lock: stones(HOST_STONES, "host") },
        { lock: stones("in -[unladen]- out\nin ?\nout ?", "crack"), as: "inner", inside: { instance: "host" } },
      ],
      1
    )
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.reasons).toContainEqual({
        type: "lockRefused",
        instance: "inner",
        fault: { type: "carryWithoutStones", barrier: "in-out" },
      })
  })

  it("refuses a one-way on its own route, since every one-way takes empty hands, naming it and the pool", () => {
    const result = carve(
      [
        { lock: stones(HOST_STONES, "host") },
        { lock: stones("in >> out\nin ?\nout ?", "chute"), as: "inner", inside: { instance: "host" } },
      ],
      1
    )
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.reasons).toContainEqual({
        type: "lockNestingRefused",
        instance: "inner",
        fault: { type: "oneWayOnPassThroughRoute", pool: "host", oneWays: ["in>out"] },
      })
  })

  it("allows a one-way off its route: the stone passes by the corridor, the drop is a side way back", () => {
    const ledge = "in -- out\nin -- ledge\nledge -- top\ntop >> in\nin ?\nout ?\nledge ?\ntop ?"
    const placed: PlacedLock[] = [
      { lock: stones(HOST_STONES, "host") },
      { lock: stones(ledge, "ledge"), as: "inner", inside: { instance: "host" } },
    ]
    expect(() => expanded(placed)).not.toThrow()
    expect(stoneNestings(placed).get("inner")).toEqual({ case: "passThrough", pool: "host", oneWays: true })
  })

  it("leaves a one-way in a contained lock to the walk, which takes it with empty hands", () => {
    const dropping = "in -- hall\nhall >> out\nshelf plate @in stone\nin ?\nhall ?\nout ?"
    expect(() =>
      expanded([{ lock: leverLock() }, { lock: stones(dropping, "drop"), as: "inner", inside: { instance: "lever" } }])
    ).not.toThrow()
  })
})
```

The first pins a refusal that exists (`carryWithoutStones`, `lockCompile.ts`); if `parseLock` throws on
`in -[unladen]- out` with no plate, write that lock as a `Lock` literal (one gate owned by `unladen`, no `weights`)
instead; the fault is `compileLock`'s.

- [ ] **Step 2: Run it to see it fail**

Run: `yarn vitest run src/game/nestedStones.spec.ts`
Expected: FAIL, `stoneNestings` is not exported. Once it is, "refuses a one-way on its own route" still fails until
step 3's refusal ("allows a one-way off its route" passes once `stoneNestings` exists); "refuses a lock without stones that asks for empty hands" passes from the start (it pins a refusal that
exists; if it fails, report the reason it got instead).

- [ ] **Step 3: Implement**

In `src/game/floorLocks.ts`, after `LockNesting`:

```ts
/**
 * HOW A NESTED LOCK'S STONES MEET THOSE OF THE LOCKS IT STANDS IN (stones spec, "Nested locks"), read against the
 * nearest of them that holds stones, at any depth: a stone carried through a lock without stones reaches whatever
 * stands inside that one too. `pool` is the outermost lock of that chain holding stones, whose level a shared
 * nesting is walked in and whose control the pooled stones take.
 */
export type StoneNesting =
  /** It holds none, and a lock it stands in does: a stone from outside is carried through it. `oneWays`: it holds a
   * one-way (off its route; one on it is refused), so the walk takes it with its pool. */
  | { case: "passThrough"; pool: string; oneWays?: true }
  /** It holds stones, and no lock it stands in does: they never leave it. */
  | { case: "contained" }
  /** It holds stones, and so does a lock it stands in: one pool across them. */
  | { case: "shared"; pool: string }
```

Change `LockNesting` to:

```ts
export type LockNesting = {
  instance: string
  host: string
  regions: string[]
  in: string
  out: string
  /** Absent when neither it nor any lock it stands in holds stones. */
  stones?: StoneNesting
}
```

`LockNestingFault` gains, after `nestSpotTaken`:

```ts
  /** A lock without stones that stands in one with them lets a stone through, so no one-way stands on its own route
   * from in to out: every one-way takes empty hands. `oneWays` names them. One off the route is allowed. */
  | { type: "oneWayOnPassThroughRoute"; pool: string; oneWays: string[] }
```

After `seatNested`, add:

```ts
/** The stone case of every nested placement that has one. Cycles are refused before this is asked
 * (`seatNested`); the walk up stops at one anyway. */
export const stoneNestings = (placements: readonly PlacedLock[]): Map<string, StoneNesting> => {
  const byName = new Map(placements.map(placed => [instanceName(placed), placed]))
  const found = new Map<string, StoneNesting>()
  for (const placed of placements) {
    if (!placed.inside) continue
    const instance = instanceName(placed)
    const seen = new Set([instance])
    let pool: string | undefined
    for (let at = byName.get(placed.inside.instance); at && !seen.has(instanceName(at)); ) {
      seen.add(instanceName(at))
      if (at.lock.weights) pool = instanceName(at)
      at = at.inside ? byName.get(at.inside.instance) : undefined
    }
    const holds = placed.lock.weights !== undefined
    const oneWays = Object.keys(placed.lock.oneWays ?? {}).length > 0
    if (pool !== undefined)
      found.set(instance, holds ? { case: "shared", pool } : { case: "passThrough", pool, ...(oneWays ? { oneWays: true as const } : {}) })
    else if (holds) found.set(instance, { case: "contained" })
  }
  return found
}
```

In `expandFloorLocks` (import `regionRoute` from `./regions` beside `type Region`), right after
`reasons.push(...nested.reasons)`:

```ts
  // A PASS-THROUGH LOCK LETS A STONE THROUGH (stones spec, "Nested locks"): every one-way takes empty hands, so a
  // one-way on its own route from in to out would turn the host's stone away. One off the route is a side way the
  // stone never has to take; the floor walk takes that lock fused with its pool's level (floorLockWalk.ts).
  const stoneCases = stoneNestings(placements)
  for (const placed of placements) {
    const stones = stoneCases.get(instanceName(placed))
    if (stones?.case !== "passThrough") continue
    const { lock } = placed
    const route = regionRoute({
      regions: Object.keys(lock.regions).map((name): Region => ({ name, appetite: "free" })),
      connections: lock.connections.map(joinOf),
      in: lock.in,
      out: lock.out,
    })
    const onRoute = (a: string, b: string) => route.some((r, i) => i > 0 && ((route[i - 1] === a && r === b) || (route[i - 1] === b && r === a)))
    const oneWays = Object.entries(lock.oneWays ?? {})
      .filter(([, { from, to }]) => onRoute(from, to))
      .map(([id]) => id)
    if (oneWays.length > 0)
      reasons.push({
        type: "lockNestingRefused",
        instance: instanceName(placed),
        fault: { type: "oneWayOnPassThroughRoute", pool: stones.pool, oneWays },
      })
  }
```

and in the `nesting` map:

```ts
  const nesting: LockNesting[] = nested.seats.map(({ instance, host }) => {
    const layout = fragments.get(instance)!.regionLayout
    const stones = stoneCases.get(instance)
    return {
      instance,
      host,
      regions: layout.regions.map(region => region.name),
      in: layout.in,
      out: layout.out,
      ...(stones ? { stones } : {}),
    }
  })
```

- [ ] **Step 4: Run it to see it pass, and the nesting specs stay green**

Run: `yarn vitest run src/game/nestedStones.spec.ts src/game/nestedLocks.spec.ts && yarn check-types && yarn lint`
Expected: PASS (the existing `nesting` `toEqual` in `nestedLocks.spec.ts` has no stones and gets no `stones` key), clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/floorLocks.ts src/game/nestedStones.spec.ts
git commit -m "feat(locks): a nested lock knows whether its stones pass through, stay or share" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 11: A shared nesting's stones are one pool

**Files:**
- Modify: `src/game/mechanics/weights.ts` (the arrangement search moves into `arrange`; `poolStones`)
- Modify: `src/game/floorLocks.ts` (`expandFloorLocks` pools each shared nesting's weights controls)
- Test: `src/game/mechanics/weights.spec.ts`, `src/game/nestedStones.spec.ts`

**Interfaces:**
- Consumes: `stoneNestings` and the `stoneCases` declared after `seatNested` in `expandFloorLocks` (task 10);
  `compileLock(lock, binding, { namespace })` from `../lockCompile`.
- Produces, in `@/game/mechanics/weights`: `export const poolStones = (id: string, controls: readonly WeightsControl[],
  any: ReadonlySet<string>): WeightsControl` — every plate of each control, one hand, each gate's terms read off the
  one arrangement; `any` names the gates whose mode is `"any"`. `stoneArrangements(lock)` keeps its signature and
  output.
- Produces: on a floor with a shared nesting, `config.controls` holds ONE weights control per pool, id `<pool>.stones`.

- [ ] **Step 1: Write the failing tests**

In `src/game/mechanics/weights.spec.ts`, add `poolStones` to the import from `./weights`, add
`import { compileLock } from "../lockCompile"`, `import { parseLock } from "../lockNotation"` (if not imported
already) and `import { isWeights } from "../obstacles"`, then append:

```ts
describe("poolStones", () => {
  const controlOf = (text: string, namespace: string) => {
    const result = compileLock(parseLock(text, namespace).lock, { weights: "stonePlate" }, { namespace })
    if (!result.ok) throw new Error(JSON.stringify(result.faults))
    return result.fragment.controls.filter(isWeights)[0]
  }
  const a = controlOf("in -[p]- out\np plate @in\nshelf plate @in stone\nin ?\nout ?", "a")
  const b = controlOf("in -[q]- out\nq plate @in\nrest plate @in stone\nin ?\nout ?", "b")
  const pooled = poolStones("a.stones", [a, b], new Set())

  it("is each lock's own control where the pool holds one lock", () => {
    expect(poolStones("a.stones", [a], new Set())).toEqual(a)
  })

  it("holds every plate of both locks, and both stones where they start", () => {
    expect(pooled.plates.map(plate => plate.id)).toEqual(["a.p", "a.shelf", "b.q", "b.rest"])
    expect(pooled.initial).toBe("a.shelf b.rest")
  })

  it("sets a stone lifted in one lock on a plate of the other", () => {
    expect(pooled.moves).toContainEqual({ from: "a.shelf b.rest", to: "b.rest + hand", plate: "a.shelf" })
    expect(pooled.moves).toContainEqual({ from: "b.rest + hand", to: "b.q b.rest", plate: "b.q" })
  })

  it("never lifts a second stone while one is in hand", () => {
    const fromCarrying = pooled.moves.filter(move => pooled.carrying.includes(move.from))
    expect(fromCarrying.length).toBeGreaterThan(0)
    for (const move of fromCarrying) expect(pooled.carrying).not.toContain(move.to)
  })

  it("opens a lock's gate on a stone on its plate, wherever the stone came from", () => {
    expect(pooled.opens["b.q b.rest"]).toEqual(["b.in-out"])
  })
})
```

In `src/game/nestedStones.spec.ts`, add `import { isWeights } from "./obstacles"` and append:

```ts
describe("a shared nesting's stones are one pool", () => {
  it("compiles one weights control for both locks, under the pool's id", () => {
    const weights = (expanded(SHARED).config.controls ?? []).filter(isWeights)
    expect(weights.map(control => control.id)).toEqual(["host.stones"])
    expect(weights[0].plates.map(plate => plate.id)).toEqual(["host.p", "host.shelf", "inner.s", "inner.t"])
  })

  it("leaves a pass-through's and a contained lock's stones in their own control", () => {
    expect((expanded(PASS_THROUGH).config.controls ?? []).filter(isWeights).map(c => c.id)).toEqual(["host.stones"])
    expect((expanded(CONTAINED).config.controls ?? []).filter(isWeights).map(c => c.id)).toEqual(["inner.stones"])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/nestedStones.spec.ts`
Expected: FAIL: `poolStones` is not exported; the shared floor has two weights controls (`host.stones`,
`inner.stones`). If a gate id prints differently from `b.in-out` (the notation names a gate `<from>-<to>`), use the
id `compileLock` gives and say so in the report.

- [ ] **Step 3: Implement**

In `src/game/mechanics/weights.ts`, add `import type { WeightTerm } from "../siteTypes"` if it is not imported (it is,
beside `MechanismRecord`), and replace `stoneArrangements` with the search taken out into `arrange`:

```ts
/** A gate's terms on the stones, and whether one term is enough. */
type StoneGate = { id: string; terms: WeightTerm[]; any: boolean }

/**
 * EVERY ARRANGEMENT OF THE STONES THE PLAYER CAN REACH, and every move between them: one stone in hand at
 * most, lifted from its plate and set down only on an empty one. The one place the stone rules live; the
 * tool's walk, the engine's record and a pool of several locks' stones are all built from it.
 */
const arrange = (plates: readonly { id: string; stone: boolean }[], gates: readonly StoneGate[]): Arrangements => {
  const ids = plates.map(plate => plate.id).sort()
  const start: Stones = { weighted: new Set(plates.filter(plate => plate.stone).map(plate => plate.id)), hand: false }
  const found = new Map<string, Stones>([[keyOf(start), start]])
  const moves: StoneMove[] = []
  for (const queue = [start]; queue.length > 0;) {
    const here = queue.shift()!
    for (const plate of ids) {
      if (here.weighted.has(plate) === here.hand) continue
      const weighted = new Set(here.weighted)
      if (here.hand) weighted.add(plate)
      else weighted.delete(plate)
      const next = { weighted, hand: !here.hand }
      const key = keyOf(next)
      if (!found.has(key)) {
        found.set(key, next)
        queue.push(next)
      }
      moves.push({ from: keyOf(here), to: key, plate })
    }
  }
  const opening = (stones: Stones) =>
    gates
      .filter(({ terms, any }) =>
        any ? terms.some(t => termHolds(t, stones)) : terms.every(t => termHolds(t, stones))
      )
      .map(({ id }) => id)
  return {
    states: [...found.keys()],
    initial: keyOf(start),
    moves,
    opens: Object.fromEntries([...found].map(([key, stones]) => [key, opening(stones)])),
    carrying: [...found].filter(([, stones]) => stones.hand).map(([key]) => key),
    underfoot: [...found].flatMap(([key, stones]) =>
      ids
        .filter(plate => !stones.weighted.has(plate))
        .map(plate => ({
          from: key,
          plate,
          opens: opening({ weighted: new Set([...stones.weighted, plate]), hand: stones.hand }),
        }))
    ),
    terms: Object.fromEntries(gates.map(({ id, terms }) => [id, terms])),
  }
}

/** The arrangements of one lock's stones. */
export const stoneArrangements = (lock: Lock): Arrangements => {
  const weights = lock.weights!
  const gates = Object.entries(lock.gates).flatMap(([id, gate]): StoneGate[] => {
    const terms = gate.owners
      .filter(owner => isWeightOwner(lock, owner))
      .map((owner): WeightTerm =>
        Object.hasOwn(weights.plates, owner)
          ? { kind: "plate", plate: owner, wants: weights.plates[owner].opens.empty.includes(id) ? "empty" : "stone" }
          : { kind: "unladen" }
      )
    return terms.length > 0 ? [{ id, terms, any: gate.mode === "any" }] : []
  })
  return arrange(
    Object.entries(weights.plates).map(([id, plate]) => ({ id, stone: plate.stone })),
    gates
  )
}

/**
 * THE STONES OF SEVERAL LOCKS AS ONE POOL (stones spec, "Nested locks": shared): every plate of each, one hand, and
 * each gate's terms read off the one arrangement. A stone lifted in one lock may be set down in the other. `any`
 * names the gates whose mode is "any", which a compiled control does not carry.
 */
export const poolStones = (
  id: string,
  controls: readonly WeightsControl[],
  any: ReadonlySet<string>
): WeightsControl => {
  const plates = controls.flatMap(control => control.plates).sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
  const gates = controls.flatMap(control =>
    Object.entries(control.terms).map(([gate, terms]) => ({ id: gate, terms, any: any.has(gate) }))
  )
  const encounter = controls.find(control => control.encounter !== undefined)?.encounter
  return {
    id,
    control: "weights",
    plates,
    ...arrange(plates, gates),
    ...(encounter === undefined ? {} : { encounter }),
  }
}
```

If `poolStones("a.stones", [a])` is not `toEqual(a)` only in key order of the returned object, that is no failure
(`toEqual` ignores key order); a difference in `states`, `moves` or `opens` order is one: `arrange` must walk plates in
sorted id order, as `stoneArrangements` did.

In `src/game/floorLocks.ts`, import `isWeights` from `./obstacles` and `poolStones` from `./mechanics/weights`. After
the `for (const { instance, host, region, near, far } of nested.seats) { … }` loop that re-points the joins, add:

```ts
  // A SHARED NESTING'S STONES ARE ONE POOL: the weights controls of the pool and of every lock sharing it become one,
  // under the pool's id, so play holds one stone at most across them and a stone moves from one lock's plates to the
  // other's.
  const members = new Map<string, string[]>()
  for (const [instance, stones] of stoneCases)
    if (stones.case === "shared") members.set(stones.pool, [...(members.get(stones.pool) ?? []), instance])
  const anyGates = new Set(
    [...fragments.values()].flatMap(fragment =>
      fragment.obstacles.flatMap(obstacle => (obstacle.kind === "gate" && obstacle.mode === "any" ? [obstacle.id] : []))
    )
  )
  for (const [pool, sharing] of members) {
    const locks = [pool, ...sharing]
    const pooled = poolStones(
      `${pool}.stones`,
      locks.flatMap(name => fragments.get(name)!.controls.filter(isWeights)),
      anyGates
    )
    for (const name of locks) {
      const fragment = fragments.get(name)!
      fragments.set(name, {
        ...fragment,
        controls: [...fragment.controls.filter(control => !isWeights(control)), ...(name === pool ? [pooled] : [])],
      })
    }
  }
```

It reads task 10's `stoneCases`; do not declare it a second time.

- [ ] **Step 4: Run them to see them pass, and every stone spec stays green**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/nestedStones.spec.ts src/game/weightsPlates.spec.ts src/game/stonePlay.spec.ts src/game/lockWalkSpec.spec.ts src/game/nestedLocks.spec.ts`
Expected: PASS. A changed arrangement key or move order in an existing weights test means `arrange` is not the same
search: fix `arrange`, never the test.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/floorLocks.ts src/game/nestedStones.spec.ts
git commit -m "feat(stones): a shared nesting's stones are one pool" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 12: The composed walk follows the stones; `STONES_NESTED` goes

The walk spec's `leaveWith` carries two rules, the way out AND every one-way, so it is first renamed for what it
says: when the hands are empty. Then the composed walk fuses each nesting into the level its stones reach (D11, D12,
D13), keeps the cut where nothing inside reads a hand, refuses a contained lock whose way out lets a stone through
(`stoneCrossesOut`, D12), and the blanket refusal goes. There is no invisible edge and no play change: a contained
lock's stones may leave by its way in, and the floor's own walk proves what follows.

**Files:**
- Modify: `src/game/lockWalk.ts` (`leaveWith` → `emptyHands`; `mayLeave` → exported `handsEmpty`; `reachableStates`
  and `walkLock` take an optional `maxStates`)
- Modify (the rename only): `src/game/floorLock.ts`, `src/game/lockWalkSpec.ts`, `src/game/lockWalk.spec.ts`,
  `src/game/lockWalkSpec.spec.ts`, `src/game/weightsPlates.spec.ts`, `src/game/stoneDrop.spec.ts`
- Modify: `src/game/floorLockWalk.ts` (the rename; `cutOf` fuses; `levelOf` keeps each level's `emptyHands`;
  `stoneCrossesOut` and `pooled` failures; `holdsStones`/`STONES_NESTED` deleted; a `maxStates` option)
- Modify: `src/game/nestedLocks.spec.ts` (the "stones on a floor with nested locks" describe goes)
- Test: `src/game/nestedStones.spec.ts`

**Interfaces:**
- Consumes: `LockNesting.stones` with `passThrough.oneWays` (task 10), the pooled control (task 11).
- Produces: `LockSpec.emptyHands` (was `leaveWith`), `export const handsEmpty(spec, config): boolean`;
  `FloorWalkFailure` members `{ type: "pooled"; instances: string[]; failure: FloorWalkFailure }` and
  `{ type: "stoneCrossesOut"; instance: string; at: LockState }`; `walkFloorLock(grid: FloorGrid, options?: {
  maxStates?: number }): FloorWalkResult | undefined`; `reachableStates(spec, maxStates = MAX_LOCK_STATES)`,
  `walkLock(spec, maxStates = MAX_LOCK_STATES)`.

- [ ] **Step 1: Rename the hands rule**

Run: `grep -rln "leaveWith\|mayLeave" src scripts`
Expected (at `99a68952`): `src/game/floorLockWalk.ts`, `src/game/lockWalkSpec.spec.ts`, `src/game/weightsPlates.spec.ts`,
`src/game/lockWalk.spec.ts`, `src/game/stoneDrop.spec.ts`, `src/game/lockWalkSpec.ts`, `src/game/floorLock.ts`,
`src/game/lockWalk.ts`. If the list differs, rename in what it prints.

Run: `sed -i '' -e 's/leaveWith/emptyHands/g' -e 's/mayLeave/handsEmpty/g' <each file the grep printed>`

Then in `src/game/lockWalk.ts`:
- `LockSpec`'s field comment becomes:
  ```ts
    /** The hands are empty only in a config outside every `notIn`. Every one-way and the way out take empty hands,
     * so a stone never rides a drop and never leaves its floor. A level that is no floor still has its one-ways: it
     * keeps this whenever it holds stones. */
    emptyHands?: { mechanism: MechanismId; notIn: StateId[] }[]
  ```
- `const handsEmpty` becomes `export const handsEmpty`, its comment "Whether the hands are empty in this config: no
  mechanism `emptyHands` names is in a state it refuses.";
- `checkLockSpec`'s two messages become `` `empty hands wait on no mechanism: ${mechanism}` `` and
  `` `empty hands refuse a state ${mechanism} does not have: ${state}` ``, and the two expectations in
  `src/game/lockWalk.spec.ts` that quote them (`"the way out waits on no mechanism: ghost"`, `"the way out refuses a
  state hand does not have: ghost"`) follow.

Run: `yarn vitest run src/game/lockWalk.spec.ts src/game/lockWalkSpec.spec.ts src/game/weightsPlates.spec.ts src/game/stoneDrop.spec.ts src/game/stonePlay.spec.ts src/game/nestedLocks.spec.ts && yarn check-types`
Expected: PASS, clean: a rename moves no walk.

- [ ] **Step 2: Write the failing tests**

Append to `src/game/nestedStones.spec.ts` (import `deadFloorRegions`, `describeFloorWalkFailure`, `walkFloorLock` from
`./floorLockWalk`, `deadRegions`, `reachableStates`, `walkLock` from `./lockWalk`, and `floorLock` from `./floorLock`):

```ts
const productStates = (grid: FloorGrid): number => {
  const found = reachableStates(floorLock(grid)!)
  if (found === "tooLarge") throw new Error("product too large")
  return found.order.length
}

const expectSound = (grid: FloorGrid) => {
  const walk = walkFloorLock(grid)!
  if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
  return walk
}

/** A pass-through lock with a one-way off its route (task 10): a side way back that the stone never has to take. */
const LEDGE = "in -- out\nin -- ledge\nledge -- top\ntop >> in\nin ?\nout ?\nledge ?\ntop ?"
const PASS_BY_LEDGE: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: stones(LEDGE, "ledge"), as: "inner", inside: { instance: "host" } },
]

describe("a nested floor with stones is walked where its stones reach", () => {
  it.each([
    ["a pass-through", PASS_THROUGH],
    ["a pass-through with a one-way off its route", PASS_BY_LEDGE],
    ["a contained lock", CONTAINED],
    ["a shared pool", SHARED],
  ])("walks %s sound on every carve, as the product walk does", { timeout: 60_000 }, (_, locks) => {
    const grids = carved(locks)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expectSound(grid)
      expect(walkLock(floorLock(grid)!).sound).toBe(true)
      expect(deadFloorRegions(grid)).toEqual(deadRegions(floorLock(grid)!))
    }
  })

  it("walks a pass-through holding no one-way in fewer states than the product: the host walks it as ground", { timeout: 60_000 }, () => {
    for (const grid of carved(PASS_THROUGH)) expect(expectSound(grid).states).toBeLessThan(productStates(grid))
  })

  it.each([
    ["a pass-through with a one-way off its route", PASS_BY_LEDGE],
    ["a contained lock, whose stones may leave by its way in", CONTAINED],
    ["a shared pool", SHARED],
  ])("walks %s fused, in the product's states", { timeout: 60_000 }, (_, locks) => {
    for (const grid of carved(locks)) expect(expectSound(grid).states).toBe(productStates(grid))
  })

  it("keeps the floor's way out for empty hands on a nested floor", { timeout: 60_000 }, () => {
    // The door on waits for the shelf to be EMPTY: the only way past carries the stone, and the way out refuses it.
    const carriedOut: PlacedLock[] = [
      { lock: stones("in -[shelf:empty]- yard\nyard -&> out\nshelf plate @in stone\nin ?\nyard ?\nout ?", "host") },
      { lock: leverLock(), as: "inner", inside: { instance: "host" } },
    ]
    const grids = carved(carriedOut)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(false)
      expect(walkFloorLock(grid)!.sound).toBe(false)
    }
  })

  // EMPTY HANDS ARE ONE RULE FOR THE WAY OUT AND EVERY ONE-WAY: every level that holds stones keeps `emptyHands`.
  // The only way to this lock's plate is a drop, so only a stone riding it could open the door: sound if a level
  // dropped the rule, stranded while it holds.
  const RIDE = "in -- top\ntop >> low\nlow -[p]- out\np plate @low\nshelf plate @top stone\nin ?\ntop ?\nlow ?\nout ?"
  it.each<[string, PlacedLock[]]>([
    ["a contained lock", [{ lock: leverLock() }, { lock: stones(RIDE, "ride"), as: "inner", inside: { instance: "lever" } }]],
    ["a shared pool", [{ lock: stones(HOST_STONES, "host") }, { lock: stones(RIDE, "ride"), as: "inner", inside: { instance: "host" } }]],
  ])("never lets a stone ride a drop inside %s", { timeout: 60_000 }, (_, locks) => {
    const grids = carved(locks)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(false)
      expect(walkFloorLock(grid)!.sound).toBe(false)
    }
  })

  // D12: A CONTAINED LOCK KEEPS ITS STONES BY ITS OWN DESIGN. Here nothing holds the stone in: its way out is open,
  // so a stone can be carried through it.
  it("refuses a contained lock whose way out lets a stone through, naming it", { timeout: 60_000 }, () => {
    const leaky = "in -- hall\nhall -- out\nshelf plate @in stone\nin ?\nhall ?\nout ?"
    const grids = carved([{ lock: leverLock() }, { lock: stones(leaky, "leaky"), as: "inner", inside: { instance: "lever" } }])
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      const walk = walkFloorLock(grid)!
      expect(walk).toMatchObject({ sound: false, failure: { type: "stoneCrossesOut", instance: "inner" } })
      if (!walk.sound) expect(describeFloorWalkFailure(walk.failure)).toMatch(/^a stone can be carried out of inner/)
    }
  })

  it("names both locks of a pool when the pooled floor strands", { timeout: 60_000 }, () => {
    const stranding: PlacedLock[] = [
      { lock: stones(STRANDING_HOST, "host") },
      { lock: stones(GATED, "gated"), as: "inner", inside: { instance: "host" } },
    ]
    const grids = carved(stranding)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      const walk = walkFloorLock(grid)!
      expect(walk).toMatchObject({ sound: false, failure: { type: "pooled", instances: ["host", "inner"] } })
      if (!walk.sound) expect(describeFloorWalkFailure(walk.failure)).toMatch(/^the stones host, inner share: /)
    }
  })

  it("refuses a pooled level too large to walk by name, not by hanging", { timeout: 60_000 }, () => {
    const [grid] = carved(SHARED)
    expect(walkFloorLock(grid, { maxStates: 10 })).toEqual({
      sound: false,
      failure: { type: "pooled", instances: ["host", "inner"], failure: { type: "tooLarge" } },
    })
  })
})
```

In `src/game/nestedLocks.spec.ts`, delete the whole `describe("stones on a floor with nested locks", …)` block (it
pins the refusal this task lifts; the pass-through tests above replace it) and any import only it used.

- [ ] **Step 3: Run them to see them fail**

Run: `yarn vitest run src/game/nestedStones.spec.ts`
Expected: FAIL: every nested stone floor gets `{ type: "entangled", problem: "stones on a floor with nested locks" }`;
`maxStates` is not an option. "never lets a stone ride a drop" and "keeps the floor's way out" pass already (the
blanket refusal is unsound too); they are the guards that keep passing once it goes. If a floor carves at none of the
seeds, print the first refusal and stop.

- [ ] **Step 4: Implement**

In `src/game/lockWalk.ts`: `reachableStates = (spec: LockSpec, maxStates = MAX_LOCK_STATES)` with
`if (ceiling > maxStates) return "tooLarge"`; `walkLock = (spec: LockSpec, maxStates = MAX_LOCK_STATES)` passing it on.

In `src/game/floorLockWalk.ts`:

1. Import `handsEmpty` and `MAX_LOCK_STATES` beside `reachableStates` from `./lockWalk`. Add to `FloorWalkFailure`:
   ```ts
     /** A level several nested locks are walked in together fails; `instances` are the locks fused into it. */
     | { type: "pooled"; instances: string[]; failure: FloorWalkFailure }
     /** A contained lock's way out is reachable with a stone in hand: it does not keep its stones (D12). */
     | { type: "stoneCrossesOut"; instance: string; at: LockState }
   ```
   and to `describeFloorWalkFailure`:
   ```ts
       case "pooled":
         return `the stones ${failure.instances.join(", ")} share: ${describeFloorWalkFailure(failure.failure)}`
       case "stoneCrossesOut":
         return `a stone can be carried out of ${failure.instance} by its way out, at ${failure.at.region}`
   ```
2. The header comment gains a paragraph:
   ```ts
   // STONES FOLLOW THE CUT where nothing inside a nested lock reads a hand: a nesting without stones, or a
   // pass-through with no one-way (floorLocks.ts refuses one on its route, and a narrow passage in it). Anywhere else
   // the nesting is walked fused with the level its stones reach: a shared one, and a pass-through with a one-way off
   // its route, in its pool's level; a contained one in the floor's own, since its stones may leave by its way in.
   // Every level that holds stones keeps `emptyHands`, so its drops take empty hands whatever its way out is.
   ```
3. `Cut` gains `fusedInto: Map<string, Owner>` (an instance walked in another's level) and `pools: Map<Owner,
   string[]>` (a level's node → the locks fused into it, its pool first), and `cutOf` starts:
   ```ts
     const nesting = grid.lockNesting ?? []
     const nested = new Set(nesting.map(n => n.instance))
     const hostIn = new Map(nesting.map(n => [n.instance, n.host]))
     const fusedInto = new Map<string, Owner>()
     const pools = new Map<Owner, string[]>()
     /** Walks `instance`, and every nested lock between it and `pool`, in `pool`'s level (the floor's when `pool` is
      * no nested lock, or undefined). */
     const fuse = (instance: string, pool: string | undefined) => {
       const into: Owner = pool !== undefined && nested.has(pool) ? pool : FLOOR
       for (let at: string | undefined = instance; at !== undefined && at !== pool && nested.has(at); at = hostIn.get(at)) {
         if (fusedInto.has(at)) continue
         fusedInto.set(at, into)
         pools.set(into, [...(pools.get(into) ?? (pool === undefined ? [] : [pool])), at])
       }
     }
     for (const { instance, stones } of nesting) {
       if (stones?.case === "shared" || (stones?.case === "passThrough" && stones.oneWays)) fuse(instance, stones.pool)
       else if (stones?.case === "contained") fuse(instance, undefined)
     }
     const walkedAs = (instance: string): Owner => (fusedInto.has(instance) ? fusedInto.get(instance)! : instance)
     const { of } = regionsOf(grid)
     const instanceOfLabel = new Map(
       nesting.flatMap(n => n.regions.map(region => [region, walkedAs(n.instance)] as const))
     )
     const hostOf = new Map<string, Owner>(
       nesting.map(n => [n.instance, nested.has(n.host) ? walkedAs(n.host) : FLOOR])
     )
   ```
   (`instanceOfLabel.get(label) ?? FLOOR` below still reads a FLOOR-fused label as the floor's: `null ?? null`.)
   Return `fusedInto` and `pools` in the `Cut`.
4. `levelOf`: every level keeps the `emptyHands` of the stones it holds. A nested level's way out is its port (`in`
   and `out` are both the port), so the way-out rule is a no-op there; its one-ways still read `emptyHands`, which is
   why it is never dropped:
   ```ts
     // Every one-way reads these, not only the way out.
     const emptyHands = (lock.emptyHands ?? []).filter(({ mechanism }) => Object.hasOwn(mechanisms, mechanism))
     return {
       …,
       ...(emptyHands.length > 0 ? { emptyHands } : {}),
       in: port ?? lock.in,
       out: port ?? lock.out,
     }
   ```
5. `nestedFree(cut, instance, spec, maxStates)`: unchanged but for `reachableStates(spec, maxStates)`.
6. `levelsOf(grid, lock, maxStates)`: skip fused instances, wrap a fused level's failure, check every contained lock's
   way out on the floor's level, and hand the wrapper back so `walkFloorLock` wraps the floor level's failure too (its
   return type gains `pooled` on the `ok: true` side; `compose` passes `maxStates` through):
   ```ts
     const pooled = (node: Owner, failure: FloorWalkFailure): FloorWalkFailure => {
       const instances = cut.pools.get(node)
       return instances ? { type: "pooled", instances, failure } : failure
     }
     for (const { instance } of grid.lockNesting ?? []) {
       if (cut.fusedInto.has(instance)) continue
       const spec = levelOf(cut, instance, grid.lockNesting)
       const free = nestedFree(cut, instance, spec, maxStates)
       if ("failure" in free)
         return { ok: false, failure: { type: "nested", instance, failure: pooled(instance, free.failure) } }
       counts[instance] = free.states
       levels.push({ instance, spec })
     }
     const floorSpec = levelOf(cut, FLOOR, grid.lockNesting)
     levels.push({ instance: undefined, spec: floorSpec })
     // A CONTAINED LOCK KEEPS ITS STONES BY ITS OWN DESIGN (D12): its way out is never stood in with a stone in hand.
     // It is walked in the floor's level, so that level's states say whether any stands there carrying.
     const contained = (grid.lockNesting ?? []).filter(n => n.stones?.case === "contained")
     if (contained.length > 0) {
       const found = reachableStates(floorSpec, maxStates)
       if (found !== "tooLarge")
         for (const { instance, out } of contained) {
           const port = cut.portOf(out)
           const at = found.order.find(state => state.region === port && !handsEmpty(floorSpec, state.config))
           if (at) return { ok: false, failure: { type: "stoneCrossesOut", instance, at } }
         }
     }
     return { ok: true, levels, counts, pooled }
   ```
   (A `tooLarge` floor level is refused by the floor's own walk right after, inside `pooled`.)
7. Delete `holdsStones` and `STONES_NESTED` and their comment. `walkFloorLock`:
   ```ts
   export const walkFloorLock = (
     grid: FloorGrid,
     { maxStates = MAX_LOCK_STATES }: { maxStates?: number } = {}
   ): FloorWalkResult | undefined => {
     const lock = floorLock(grid)
     if (!lock) return undefined
     if (!grid.lockNesting || grid.lockNesting.length === 0) return walkLock(lock, maxStates)
     const composed = compose(grid, lock, maxStates)
     if (!composed.ok) return { sound: false, failure: composed.failure }
     const walk = walkLock(composed.levels[composed.levels.length - 1].spec, maxStates)
     return walk.sound
       ? { sound: true, states: walk.states, nested: composed.counts }
       : { sound: false, failure: composed.pooled(FLOOR, walk.failure) }
   }
   ```
   `deadFloorRegions` loses its `holdsStones` line.

A `nested` count for a fused instance is absent from `FloorWalkResult.nested`; the existing nesting tests have no
stones, so their `toEqual`s are unchanged.

- [ ] **Step 5: Run them to see them pass, and the nesting tests stay green**

Run: `yarn vitest run src/game/nestedStones.spec.ts src/game/nestedLocks.spec.ts src/game/lockWalk.spec.ts src/game/gateLoops.spec.ts`
Expected: PASS. If the pass-through floor's walk and the product walk disagree, the cut is not exact for it: stop,
report the floor's seed and both failures, and do not fuse the case to make them agree.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockWalk.ts src/game/floorLock.ts src/game/floorLockWalk.ts src/game/lockWalkSpec.ts src/game/lockWalk.spec.ts src/game/lockWalkSpec.spec.ts src/game/weightsPlates.spec.ts src/game/stoneDrop.spec.ts src/game/nestedLocks.spec.ts src/game/nestedStones.spec.ts
git commit -m "feat(stones): a nested floor is walked where its stones reach" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

(If step 1's grep printed other files, stage those by path too.)

---

### Task 13: Nested stones in the Lock playground

The playground splices the second lock into the picked lock's nest spot: the spot says where, so the story names
only which lock goes in it. A picked lock with no spot shows the floor's refusal (`noNestSpot`), as any refusal shows.

**Files:**
- Modify: `src/app/SiteMap/playgroundCarve.testing.ts` (`playgroundFloor` takes an optional nested lock)
- Modify: `src/app/SiteMap/lockPlayground.testing.tsx` (`LockPlayground` takes `nest`)
- Modify: `src/app/SiteMap/LockPlayground.stories.tsx` (three stories, one per case)
- Test: `src/app/SiteMap/lockPlayground.spec.tsx`

**Interfaces:**
- Consumes: `PlacedLock.inside: { instance }` (task 9); `freeRegions` keeps `nestSpot` (task 8).
- Produces: `playgroundFloor(lock: Lock, binding: RealisationBinding, nest?: Lock): FloorConfig` (the nested lock
  is spliced into `lock`'s spot, as instance `inner`); `LockPlayground` prop `nest?: string` (a key of `locks`; the picked
  lock is the host).

- [ ] **Step 1: Write the failing test**

In `src/app/SiteMap/lockPlayground.spec.tsx`, append (import `playgroundFloor`, `defaultBinding` from
`./playgroundCarve.testing` and `parseLock` from `@/game/lockNotation` if missing):

```ts
describe("a lock nested in the playground's lock", () => {
  it("is spliced into the picked lock's nest spot, every region free", () => {
    const host = parseLock("in -&> hall\nhall -[L]- out\nL toggle @in\nin *\nhall ?\nout ?", "host").lock
    const inner = parseLock("in -- out\nshelf plate @in stone\nin *\nout ?", "cell").lock
    const config = playgroundFloor(host, defaultBinding(), inner)
    expect(config.locks?.map(placed => [placed.as, placed.inside])).toEqual([
      [undefined, undefined],
      ["inner", { instance: "host" }],
    ])
    expect(Object.values(config.locks![1].lock.regions).every(region => region.takes === "free")).toBe(true)
    expect(config.locks![0].lock.nestSpot).toEqual({ from: "in", to: "hall" })
  })
})
```

Run: `yarn vitest run src/app/SiteMap/lockPlayground.spec.tsx`
Expected: FAIL, one placement.

- [ ] **Step 2: Implement**

`src/app/SiteMap/playgroundCarve.testing.ts`:

```ts
/** The lock alone on an expert floor with no puzzles, every region free, as the dev floors bench a lock; `nest` is
 * spliced into its nest spot. A lock with no spot is placed with `nest` anyway, so the floor refuses it by name
 * (`noNestSpot`). */
export const playgroundFloor = (lock: Lock, binding: RealisationBinding, nest?: Lock): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [
    { lock: freeRegions(lock) },
    ...(nest
      ? [{ lock: freeRegions(nest), as: "inner", inside: { instance: lock.name } }]
      : []),
  ],
  realisations: binding,
})
```


`src/app/SiteMap/lockPlayground.testing.tsx`, `LockPlayground`: the props type gains `nest?: string`; beside
`parsed`:

```ts
  const inner = useMemo(() => {
    if (!nest) return undefined
    try {
      return { ok: true as const, ...parseLock(locks[nest], nest) }
    } catch (error) {
      return { ok: false as const, message: (error as Error).message }
    }
  }, [locks, nest])
  const config = useMemo(
    () =>
      parsed.ok && (inner === undefined || inner.ok)
        ? playgroundFloor(parsed.lock, binding, inner?.lock)
        : null,
    [parsed, inner, binding]
  )
```

and the refusal reads the inner's parse first: `inner && !inner.ok ? inner.message : !parsed.ok ? …` (the rest as it
is; an inner's own `refused` lines join the picked lock's). `unbuilt` adds the inner's `drafts` and
`notBuildable(inner.lock)` when `inner?.ok`.

`src/app/SiteMap/LockPlayground.stories.tsx`, append:

```tsx
// MADE-UP LOCKS NESTED IN EACH OTHER, one story per stone case (stones spec, "Nested locks"). The picked lock is the
// host; `nest` is spliced into its nest spot (`-&>`).
const HOST_STONES =
  "in -- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard ?\nhall ?\nout ?"
const LEVER = "in -&> hall\nhall -[L]- out\nL toggle @in\nin ?\nhall ?\nout ?"
const CELL = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"
const GATED = "in -[s]- hall\nhall -- out\ns plate @in\nt plate @hall stone\nin ?\nhall ?\nout ?"

// Park the stone, solve the lever inside, fetch the stone and carry it through to the door beyond.
export const StonePassesThrough: Story = {
  args: { locks: { host: HOST_STONES, lever: LEVER }, initial: "host", nest: "lever" },
}

// The stone lock inside keeps its stones by its own design: its door out opens only with the stone set on `p`, so
// nothing is carried out by its way out; a stone may be carried back out by its way in.
export const StoneStaysInside: Story = {
  args: { locks: { lever: LEVER, cell: CELL }, initial: "lever", nest: "cell" },
}

// One pool: carry the host's stone in, set it on `s`, take the inner's own stone out to the door beyond.
export const StonesShared: Story = {
  args: { locks: { host: HOST_STONES, gated: GATED }, initial: "host", nest: "gated" },
}
```

- [ ] **Step 3: Run and look**

Run: `yarn vitest run src/app/SiteMap/lockPlayground.spec.tsx && yarn check-types && yarn lint`
Expected: PASS, clean.

Run `yarn storybook`, open `Topology/Lock playground` → `Stone Stays Inside`, and screenshot with `npx playwright
screenshot` (the Playwright MCP is down). Read the screenshot back: the floor carves (no red refusal). Lift the stone and
walk it back out by the stone lock's way in into the lever lock: nothing stops him (D12); set it on `p` and leave by
the stone lock's way out with empty hands. Describe what you see in the report; if a story does not carve within `CARVE_BUDGET`, record its refusal under "Open after
phase 4" (task 14) and leave the story in.

- [ ] **Step 4: Commit**

```bash
git add src/app/SiteMap/playgroundCarve.testing.ts src/app/SiteMap/lockPlayground.testing.tsx src/app/SiteMap/LockPlayground.stories.tsx src/app/SiteMap/lockPlayground.spec.tsx
git commit -m "feat(playground): a lock nested in another's spot, one story per stone case" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 14: Look at it, say so, and the whole gate

**Files:**
- Modify: `docs/mods/floor-topology-design.md` (lines 701-704, "Gates may form loops"; the table row at line 899)
- Modify: `docs/mods/mechanic-contract.md` (§3.2 "Stones on plates": the narrow passage's prompt, `emptyHands`, a
  bullet for nested locks; §7 "The lock format": the nest spot)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 4 row; "Open after phase 1"; "Open after
  phase 3"; "Open after phase 4")
- Modify: `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (§1 "Nested locks": the nest spot, the
  pass-through's one-ways, the box; §3, a note under the bake bullet)
- Modify: `docs/playtest-backlog.md`
- Modify: `src/data/carveLedger.json` (if tasks 4-13 moved the fingerprint)

- [ ] **Step 1: Look at it**

Run: `INCLUDE_DEV=1 yarn generate-world` (never commit that bake), then `yarn storybook` and take two screenshots with
`npx playwright screenshot` (the Playwright MCP is down):
- `App/SiteMap/JourneyInspector` → `Inspector`, the dev journey, pyramid 12, floor 0: the floor's loops, five plates
  (two in `passage`), the torch, the narrow passage.
- `Topology/Lock playground`, lock `stoneGate`: it carves, or "carving, N seeds tried" ends in a refusal. If it
  carves, tap the narrow passage's wall from `hall2`'s side and from `hall3`'s: each time the explorer walks to the
  side nearer him and squeezes from there (task 7).
- (Task 13 already looked at the three nested stone stories; no second look here.)

Read each screenshot back and describe it in the report. If the playground does not carve stoneGate within its
budget (`CARVE_BUDGET = 200`, `playgroundCarve.testing.ts`), record that under "Open after phase 4" with the refusal
it shows; do not fix it here. Then restore the world: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts`.

- [ ] **Step 2: The design doc and the contract**

`docs/mods/floor-topology-design.md`, "**Gates may form loops.**" paragraph (lines 701-704) becomes:

```markdown
**Gates may form loops.** A loop of gated joins is a puzzle in its own right: with plates and
`:empty` conditions, the way round one side opens as the other shuts. The walk proves a loop like any
other lock. A lock floor is laid before it is carved, and the lay stands a corridor on every join, so a
gated join that closes a loop is laid like any other, and a fork's ways may meet again beyond it. A gate
an open way goes round is refused by name (`gateBypassed`): its two sides are one ground, so no doorway
holds it. A gate loop is the laid carve's job: a layout written longhand, without a lock, is carved as
side chains and refuses a gate on a loop's second meeting (`obstacleOffRoute`). A corridor that circles
back on ground of its own region, round no gate, is fine in every carve.

**The carve is free where the layout is silent** (designer, 2026-10-08). The only constraint on where an
obstacle stands in its corridor is that the corridor's obstacles keep their order; a corridor may circle
back within its region. The more freedom the carve has, the more often it succeeds.
```

The table row "A gated join closing a loop is carved" (line 899): its second cell becomes `` `topologyFaults` on a
laid floor seats every join and refuses `gateBypassed`; `gateDoorFaults` holds each door between two grounds; the walk
proves the loop sound ``. Prettier reflows the table: edit the row by line and read the file back.

`docs/mods/mechanic-contract.md` §3.2:
- the "**A narrow passage.**" bullet: `offers "Go through the crack"` becomes `offers "Squeeze through" (nl "Wurm je er
  door"), and he squeezes from the side nearer him: head-on behind the wall's face, or sideways along it`;
- the "**The way out is left with empty hands.**" bullet: `` `leaveWith` on the walk spec names the states that forbid
  leaving `` becomes `` `emptyHands` on the walk spec names the states that are not empty hands; every one-way and the
  way out read it, on every level of a nested floor ``;
- after that bullet:

```markdown
- **Nested locks.** A lock nests only in its host's nest spot, spliced into that connection (§7). Each nesting is read against the nearest
  lock it stands in that holds stones (`stoneNestings`, `LockNesting.stones`). A **pass-through** lock (no
  stones of its own) lets a stone through, so nothing in it takes only empty hands: it cannot write
  `-[unladen]-` (`carryWithoutStones`) and holds no one-way on its own route (`oneWayOnPassThroughRoute`); one
  off its route is allowed, and the walk takes that lock fused with its pool's level. A **contained** lock
  (stones, no lock around it holds any) keeps them by its own design: its way out is never stood in with a stone
  in hand (the walk refuses it `stoneCrossesOut`), while a stone may be carried back out by its way in; the walk
  takes it fused with the floor's own level. No invisible edge and no play rule. A **shared** lock (stones, and
  so does a lock around it) pools them: one weights control, `<pool>.stones` (`poolStones`), one hand, and a
  stone set on either lock's plates; the walk takes it fused with its pool's level, so its way out lets a stone
  through. A fused level's failure is named `pooled`. Every level keeps `emptyHands`: a drop inside any nested
  lock takes empty hands, and the floor's own ways out do in every case.
```

§7 "The lock format": the intro's last sentence `placed (§5), and so is nesting one lock inside another.` becomes
`placed (§5), and so is which lock nests in it, though only in its nest spot (below).`; and before "### Connections"
add:

```markdown
### The nest spot

A lock marks at most one connection as its **nest spot**, `"nestSpot": { "from": "a", "to": "b" }`, written
`a -&> b` in the notation (never `-&-` or `<&-`): the one place another lock may be nested in it, where it is
placed. Nesting is rare, and a spot is where it can raise a lock's difficulty without the author guessing
where a floor might put it. A nested lock is spliced into the connection: its `in` meets `from`, its `out`
meets `to`, as the arrow points. The spot may be any connection of the lock, on its route or off it. A spot
on a connection that also carries a gate, a drop or any other barrier is ignored: the lock has no nest spot,
the connection carves as written, and `yarn lock` notes "nest spot ignored". A second spot is refused
`nestSpotsRepeated`, a spot on no connection `nestSpotOnNoConnection`, both when the lock is read
(`yarn lock`, `compileLock`). The connection stays in `connections`, so where nothing nests the spot is a
plain corridor.
```

- [ ] **Step 3: The roadmap and the spec**

`docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (edit the table row by line and read it back): phase 4's row
says "(done <date>, [plan](2026-10-08-stonegate-phase-4-gate-loops.md))" after **Gate loops in the carve**. Under
"## Decisions taken", add: "- **One nest spot per lock, on a connection** (designer, 2026-10-08): written
`a -&> b`, the inner lock's `in` at `a` and its `out` at `b`, on any connection without a barrier; a lock nests only
there. Phase 4 builds it." Add an "## Open after phase 4" section above "## Open per phase":
- a layout written longhand (no `locks`) still refuses a gate on a loop's second meeting: gate loops are the laid
  carve's (D3); a loop inside one region is fine in every carve;
- the side-chain carve cuts a cycle only at a branch spot from `RECOVERY_ATTEMPT` on; giving it more freedom from the
  first attempt (D5) would move world floors, so it waits for the designer's word on a world reshape;
- masonsRamp, counterweight and stoneOnAPlate are still not on the dev floor;
- whether the lock playground carves stoneGate on its bench floor (from step 1);
- no catalogue lock marks a nest spot yet; `yarn run lock` shows and checks a spot, but cannot say which stone case
  a nesting is; that surfaces in the bake's lock sweep, the floor's refusals and the Lock playground (D16);
- "on its route" for a pass-through lock is its own `regionRoute`; a lock with two equal routes is read on one;
- two stone locks placed one after the other (not nested) are two weights records, so play could hold a stone of
  each; no floor places two;
- any playground nested-stone story that did not carve within `CARVE_BUDGET` (task 13 step 3).

In the same file, delete the "Open after phase 1" bullet "Any floor with `lockNesting` that holds stones is refused
…", and the "Open after phase 3" bullet "Where a gate loop makes both sides of a passage walkable (phase 4), the
crossing starts from the first side in the cell's `dirs`." (task 7). Edit by line and read the file back.

`docs/superpowers/specs/2026-10-04-stones-acceptance.md` §1, "Nested locks":
- "A lock nested inside another sits on the outer lock's route." becomes: "Each lock has a single spot for nesting
  (designer, 2026-10-08): a connection, written `a -&> b`, on the lock's route or off it. A lock nested inside another
  is spliced into that connection, its `in` at `a` and its `out` at `b`. A spot on a connection that also carries a
  barrier is ignored (the lock has no spot there, and `yarn lock` says so); a lock with two spots and the spellings
  `-&-` and `<&-` are refused by name. A spot nothing nests in is a plain corridor. Nesting is rare; a spot is where it
  can raise a lock's difficulty."
- the pass-through bullet's last sentence gains: "A one-way on the pass-through lock's own route from in to out is
  refused by name (`oneWayOnPassThroughRoute`): every one-way takes empty hands. One off its route is allowed."
- the contained bullet's "(its way out takes empty hands, as a lock's way out always does)" becomes "(by its own
  design: the stones must be placed to leave by its way out, and a nesting whose way out lets a stone through is
  refused by name, `stoneCrossesOut`; carrying a stone back out by its way in is allowed, and the floor's own ways out
  still take empty hands)".
- tick the box "The solver walks a nested floor with its stones as one pool and proves each case above; a nesting
  that breaks its rule is refused by name." (tasks 10-12).

§3: leave the box "The four stone locks and the stoneOnAPlate lesson bake on the dev floor" unticked and add under
it an indented line: "stoneGate bakes on the dev floor (pyramid 12), its gate loops laid like any join."

- [ ] **Step 4: The playtest backlog.** Add at the top of `docs/playtest-backlog.md` (below the intro paragraph):

```markdown
## stoneGate phase 4 — gate loops, nest spots

- **Dev journey, pyramid 12 (stoneGate).** Play it to the end: lift the stone off the altar (the back way opens, the
  door in shuts), park a stone on the backroom shelf, squeeze through the narrow passage, spend both stones twice,
  leave by the way out. Leave mid-way and come back: every stone where you set it.
- **The narrow passage on the loop.** Tap its wall from either side: the explorer walks to the nearer side and
  squeezes through from there (head-on behind the wall's face, or sideways along it), never round the loop first.
- **Nested stones (Storybook, `Topology/Lock playground`).** `Stone Passes Through`: park the stone, solve the lever
  inside, carry the stone through. `Stone Stays Inside`: the inner lock's door out opens only with its stone placed;
  carry the stone back out by its way in and in again — does a stone wandering into the outer lock read as fair?
  `Stones Shared`: carry the host's stone in, set it on the inner plate, take the inner's stone out to the door.
```

- [ ] **Step 5: Commit the docs**

```bash
git add docs/mods/floor-topology-design.md docs/mods/mechanic-contract.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md docs/superpowers/specs/2026-10-04-stones-acceptance.md docs/playtest-backlog.md
git commit -m "docs: gate loops are laid like any join, one nest spot per lock, nested stones by rule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 6: The world stays put**

`git status --short src/data/` must print nothing. Then:

```bash
yarn generate-world
git diff --exit-code --stat src/data/generatedWorld.ts
git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -vc '"hash"'
```

Expected: the second prints nothing and exits 0; the third prints `0`. If the ledger moved (tasks 4-13 changed a
file the carve imports), commit it:

```bash
git add src/data/carveLedger.json
git commit -m "chore: refresh the carve ledger hashes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 7: The whole gate in a clean worktree**

```bash
git worktree add /tmp/stonegate-phase4 HEAD && cd /tmp/stonegate-phase4 && yarn install --immutable && yarn verify && yarn verify-content && yarn build
```

Expected: all pass but the three known `puzzleSeeds.verify.ts` failures. If `yarn verify`'s `lint --fix` rewrote a
file, copy the change back, commit it ("style: lint") in the real worktree, and run the gate again. If betterer
reports moved line positions, run `yarn betterer --update` in the real worktree and commit `.betterer.results`
("chore: refresh the betterer line positions"). Then `cd -`, `git worktree remove /tmp/stonegate-phase4`, `git push`,
and check `gh pr checks` if a PR exists for the branch.

---

## Self-review notes

- **Roadmap phase 4 row:** `topologyFaults` accepts a gated join closing a loop (task 1), the fork seams (task 3),
  `offRouteChains` unchanged (D3; recorded in task 14); stoneGate bakes on the dev floor (task 6).
- **Designer answers:** D3 tasks 1-4; D4 task 2; D5 tasks 1 and 4 (and the design doc, task 14); D6 task 7; D7 task 6;
  D8-D10 tasks 8-9; D11 tasks 10 and 12; D12 task 12; D13-D15 tasks 10-12; D16-D17 nothing to build.
- **Spec §3:** "stoneGate bakes on the dev floor, and the world bake stays byte-identical for every floor that has
  no stones" (task 6 steps 3-4, task 14 step 6). "With the realisation mod off, the carve is identical" for stoneGate
  (task 6 step 4). "Done when" playing stoneGate on the dev floor: baked here, played by the designer from the
  playtest backlog (task 14 step 4).
- **Spec "The rules" (empty hands):** no task tags a one-way; every one-way keeps its one rule through the rename and on
  every level (task 12, "never lets a stone ride a drop"); play is unchanged.
- **Spec §1 "Nested locks":** classified (task 10); pass through: a one-way on its route refused, one off it walked
  fused (tasks 10 and 12), `-[unladen]-` refused (`carryWithoutStones`); contained: its way out never carries a stone
  (`stoneCrossesOut`), its way in may, walked fused with the floor's level (task 12); shared: one pool (task 11), fused
  with the pool's level, the floor's ways out take empty hands (task 12); every case agrees with the product walk on
  every carve (task 12). "Leaves the inner lock with a stone only by solving it for one" is proved by the walk (D13).
- **Stable world:** no carve changes how it grows; `gateBypassed` on every floor is checked against the world bake
  (task 2); no world floor nests, marks a spot or holds stones; the ledger's hash lines move (task 6, task 14 step 6).
- **Count work:** state-space claims are state counts (task 12: fewer than the product for a pass-through without
  one-ways, equal for every fused case); the size bound is tested with a lowered `maxStates`, never a clock.
- **Review Focus → tests:** 1 task 2; 2 task 3; 3 tasks 1 and 4 and the existing longhand spec; 4 task 1; 5 task 1; 6,
  7, 8 task 8; 9 task 11; 10 tasks 10 and 12; 11, 12, 13 task 12; 14 the existing `nestedLocks.spec.ts`.
- **Type consistency:** `TopologyOptions = { laid?: boolean }` (task 1) is read by tasks 2 and 3; `forkSeams(graph,
  region, oneWays, { laid })` (task 3); `gateBypassed` has one shape in `TopologyFault` and `AssemblerReason` (task 2);
  `passageCrossing`'s fifth argument defaults (task 7). `Lock.nestSpot`, `nestSpotOf`, `nestSpotBusy`,
  `nestSpotFaults` (task 8) are read by tasks 9 and 13; `PlacedLock.inside: { instance }` (task 9) by every later
  placement; `LockNestingFault` (task 9) gains `oneWayOnPassThroughRoute` (task 10). `StoneNesting` (with
  `passThrough.oneWays`) and `stoneCases` (task 10) are read by tasks 11 and 12; `poolStones(id, controls, any)`
  (task 11); `LockSpec.emptyHands`, `handsEmpty`, the `pooled` and `stoneCrossesOut` failures (task 12).
- **Not covered:** a gate loop inside a nested lock (no lock nests one); a loop closed by a drop (a drop is no ground,
  so it never makes a gate bypassed); two stone locks one after the other on a floor (two hands; recorded in task 14);
  a carve that cuts in-region cycles more freely from its first attempt (it would move world floors; recorded in task
  14 for the designer); a catalogue lock with a nest spot (none writes one).
