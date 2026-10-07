# stoneGate Phase 4: Gate Loops in the Carve — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a lock whose gated joins close a loop is accepted by the floor topology, carves, is proved sound by the
floor walk, and stoneGate (`src/game/locks/stoneGate.lock`) bakes on the dev floor as pyramid 12.

**Architecture:** a lock floor is laid before it is carved (`layLockPlan`, `src/game/layLocks.ts`): every connection
of the plan becomes a laid corridor, loops included, and the grown maze can never join two regions. What refuses a
gate loop today is older than the lay: `topologyFaults` (`src/game/obstacles.ts`) only seats a gate on a route link
or on a link of a side chain (`offRouteChains`, `src/game/regions.ts`), the model of the side-chain carve, and a
fork's seams are read off those same chains. This phase tells `topologyFaults` when the floor is laid: then every
connection is a seat, a fork's seams are every join of its region the route does not take (`forkSeams`), and a gate
an open loop goes round is refused by name (`gateBypassed`), since no carve could stand its door between two
grounds. The carve, `gateDoorFaults` and the floor walk already work on any graph and need no change; the walk is
what proves each carved loop sound. A floor carved as side chains (no `locks`) keeps every refusal it has.

**Tech Stack:** TypeScript, Vitest, `yarn run lock` (`scripts/lock.ts`), `yarn generate-world` (Node bake).

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (§3 Carve and bake; "Done when").
**Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 4 row; "Decisions taken": gate loops
are allowed). **Design:** `docs/mods/floor-topology-design.md` ("The rules that keep a lock buildable": "Gates may
form loops").

**Written against `608a067e`** (branch `topology/mechanics`; phases 1 and 2 done, phase 3 planned and being
implemented on this branch). Every path, symbol and line cited below was checked at that commit, except the phase 3
names, which are marked **(phase 3)** and come from
`docs/superpowers/plans/2026-10-08-stonegate-phase-3-narrow-passage.md`. The two untracked files at the repository
root (`circle.lock`, `stoneGate.lock`) are the designer's scratch: never stage them. Stage strictly by path, never
`git add -A` or `git add .`.

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

## Questions before running

The designer answers these in the morning. The plan is written assuming each recommendation.

1. **When does this run?** Recommendation: **after phase 3's last commit is on the branch.** stoneGate's
   `hall3 -[unladen]- hall2` binds to the narrow passage only once phase 3 exists, and after phase 3 a lock with a
   passage and no `unladen` binding is refused `unboundRole`; task 5 binds `unladen: "narrowPassage"` and task 6
   edits phase 3's `passageCrossing`. Alternative: run tasks 1-4 now (they touch nothing phase 3 touches except
   `notBuildable`, one line), bake stoneGate without an `unladen` binding (at `608a067e` an `unladen` gate compiles
   as a door shut while carrying and needs no binding), and leave task 6 and the binding to a follow-up.
2. **Only laid floors accept a gate loop; `offRouteChains` stays as it is.** Recommendation: yes. The roadmap row
   names `offRouteChains`, but on a lock floor nothing carves from it: the lay reads the plan, and the only readers
   left are `topologyFaults`' seat test, the fork seams and `PlanRegion.mouth` (which the lay never reads). A floor
   written longhand (a `regionLayout` with no `locks`) is carved as side chains, which cannot stand the second meeting
   of a loop; it keeps `obstacleOffRoute`. Alternative: teach the side-chain carve to close loops, which has no
   consumer (no shipped or dev floor writes a layout longhand with a loop).
3. **A gate an open loop goes round is refused by name before the carve (`gateBypassed`).** Recommendation: yes,
   on laid floors. Today such a lock fails every carve with `gateDoorMisplaced`, sixty attempts per seed, and the
   author reads a cell coordinate. Alternative: leave it to the carve's own check.
4. **The crossing of a narrow passage starts from the nearer side (task 6).** Recommendation: yes. Phase 3 starts
   it from the first side in the wall cell's `dirs` and handed the choice to phase 4; on stoneGate both sides of the
   passage between `hall3` and `hall2` are walkable, so a tap could send the explorer the long way round the loop
   only to squeeze back. Alternative: a playtest backlog line instead.
5. **stoneGate takes dev pyramid 12, expert, every region `free`** (as twoStones on pyramid 11), bound
   `{ weights: "stonePlate", activator: "torch", unladen: "narrowPassage" }`. The comment at the top of
   `src/game/locks/stoneGate.lock` ("not placed yet, not buildable yet (stones, gate loop)") is the designer's and is
   left alone.

## Rulings made without the designer

- **Ruling: `topologyFaults` takes a last optional argument `{ laid?: boolean }`.** `checkLock` (a lock is always
  laid when it is baked) and the assembler on a floor with a plan pass `laid: true`. — Why: the seat question has
  two honest answers, one per carve, and only the caller knows which carve follows. — Cost if wrong: one argument.
- **Ruling: on a laid floor, a fork's seams are its chains' seams first, then every other join of its region the
  route does not take, in connection order (`forkSeams`).** — Why: on an acyclic layout the second list is empty,
  so every floor that carves today gets the same seams in the same order; the loop's joins are only appended. —
  Cost if wrong: an ordering change in one function.
- **Ruling: `gateBypassed` asks only two-way joins: a connection carrying any edge gate is no way round, and a region
  under a region barrier is not passed through (nor asked from).** — Why: that is the ground `gateDoorFaults`
  floods (`twoWayNeighbours`; a drop is never ground), and the barrier's doors stand at every entrance. — Cost if
  wrong: a few more locks reach the carve and fail there as they do today.
- **Ruling: no `CHANGELOG.md` entry and no save change.** — Why: stoneGate plays only on the dev journey and in
  Storybook until phase 6; no world floor changes.

## Global Constraints

- **Generation proves nothing.** Each carved loop is proved sound by `walkFloorLock` (`src/game/floorLockWalk.ts`)
  in the tests, and by the bake's lock sweep (`findStrandingLocks`) on the dev floor. A test that only asserts "it
  carved" is not enough.
- **No tests on authored content.** Tests use small made-up locks written inline. `yarn run lock` checks
  `src/game/locks/*.lock`. Never assert what stoneGate (or any catalogue lock) contains.
- **Stable world:** a plain `yarn generate-world` leaves `src/data/generatedWorld.ts` byte-identical. This plan edits
  files in the carve fingerprint (`src/game/obstacles.ts`, `src/game/regions.ts`, `src/game/siteAssembler.ts`), so
  `src/data/carveLedger.json` changes in its `"hash"` lines only; that refresh is committed (task 5, again in task 7
  if task 6 moved it).
- **Authoring encounters never changes corridor structure** (`docs/game-design/world-spec-stability.md`). Nothing
  here reads an encounter; the seat and seam questions read the layout and the obstacles only.
- **Mod off = same carve, bare nodes, open corridors.** `topologyFaults` and `forkSeams` read core vocabulary only;
  the toggle-off sweeps (`src/mods/topology/toggleOff.verify.ts`, `carveNeverDependsOnAMod.verify.ts`) must stay
  green with stoneGate on the dev floor.
- **Comments state the current rule and why**, never history ("replaces", "used to", "now").
- **Count work, never wall-clock**, in tests: no duration assertions.
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
2. **A fork whose two ways meet again.** The junction must still have exactly its two gated exits, and the fork-switch
   one state per exit. Test in task 3 (`ARMS_REJOIN` carves, two gated exits, walk sound).
3. **A floor written longhand with a loop.** It must keep its refusal (`obstacleOffRoute`), not crash in the carve.
   Test in task 1 ("still refuses that gate on a floor carved as side chains") and the existing
   `siteAssembler.spec.ts` "still refuses an obstacle on a connection the carve produces no seam for", which must
   stay green unchanged.
4. **A loop through a barred region.** A way round that passes a region barrier is not open; the gate must not be
   refused. Test in task 2 ("is no way round through a barred region").
5. **A stone carried round a loop.** The plate's two doors on one loop: the walk must find the way round with the
   stone and back to set it down. Test in task 1 (`ROUND_THE_ROOM`, walk sound, no dead region).

---

### Task 1: A laid floor seats a gate on every connection

**Files:**
- Modify: `src/game/obstacles.ts` (`topologyFaults`: options argument; `seatable` on a laid floor; doc comment)
- Modify: `src/game/lockCompile.ts:331-336` (`topologyOf` passes `{ laid: true }`)
- Modify: `src/game/siteAssembler.ts:814-820` (passes `{ laid: plan !== undefined }`; import `resolveMechanicKind`)
- Create: `src/game/gateLoops.spec.ts`
- Test: `src/game/obstacles.spec.ts`

**Interfaces:**
- Produces: `topologyFaults(layout, obstacles, controls, forks = [], barrierOrder = [], kinds = resolveMechanicKind,
  options: TopologyOptions = {}): TopologyFault[]` and `export type TopologyOptions = { laid?: boolean }` in
  `@/game/obstacles`. Tasks 2 and 3 read `laid` inside `topologyFaults`.
- Produces (test file, extended by tasks 2 and 3): `src/game/gateLoops.spec.ts` with the fixtures
  `ROUND_THE_SIDE`, `ROUND_THE_ROOM`, and helpers `doorCells(grid)`, `carveStones(text)`.

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
whose fault is `obstacleOffRoute` (`side-hall`, `back-hall`).

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

Replace the block that builds `seatable` (lines 354-360 at `608a067e`, from `const route = regionRoute(layout)` to
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
imports, and change the call at line 814:

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
- Modify: `src/game/siteTypes.ts` (the mirrored `AssemblerReason` member, beside `obstacleOffRoute` at line 768)
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
Expected: FAIL: the first gets `[]`, `compileLock` returns `ok: true`. The barred-region test passes already (it is
the guard against an over-eager check).

- [ ] **Step 3: Implement**

In `src/game/obstacles.ts`, add to `TopologyFault` after `obstacleOffRoute`:

```ts
  /** On a laid floor, a gate whose two regions an open way joins: no edge gate on it and no barred region along
   * it, so its two sides are one ground and no carve can stand its door between two (gateDoorFaults,
   * carveAgreement.ts). `id` is the gate. */
  | { type: "gateBypassed"; id: string; between: [string, string] }
```

In `src/game/siteTypes.ts`, add after `| { type: "obstacleOffRoute"; id: string }` (line 768):

```ts
  | { type: "gateBypassed"; id: string; between: [string, string] }
```

In `topologyFaults`, directly after the `for (const obstacle of obstacles) { … }` loop that ends with the
`obstacleOffRoute` push (and before `const owned = new Set<string>()`), add:

```ts
  // AN OPEN WAY ROUND A GATE, on a laid floor, where every connection is a corridor: the walk from one side of the
  // gate to the other over joins that carry no edge gate and through no barred region. Its two sides are then one
  // ground, so the carve would refuse its door at every seed; it is refused here by name instead.
  if (laid) {
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
  }
```

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts src/game/lockCompile.spec.ts src/game/siteAssembler.spec.ts src/game/regionBarrier.spec.ts src/game/barrierOrder.spec.ts`
Expected: PASS. A pre-existing test that now also gets `gateBypassed` is a fixture with an open loop round a door on
a lock floor: read it, and if it really is one, add the fault to its expectation and say so in the report.

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
- Modify: `src/game/siteAssembler.ts:1142-1166` (a laid floor's `{ in }` fork takes `forkSeams(…, { laid: true })`)
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
body of `seamsFor` (lines 450-463 at `608a067e`) with:

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
(line 1157 onward) replace the seam collection:

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

### Task 4: The tool no longer calls a gate loop unbuildable

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

In `src/game/lockWalkSpec.ts` delete `hasGateLoop` (its doc comment and the function, lines 184-195 at `608a067e`) and
the `...(hasGateLoop(lock) ? ["gate loop"] : []),` line in `notBuildable`, leaving whatever entries phase 3 left
(after phase 3: `sequence` and `region gate`). Then `grep -n "joinOf\|barriersOf" src/game/lockWalkSpec.ts`: drop from
the imports any name with no other use.

Run: `yarn vitest run src/game/lockWalkSpec.spec.ts && yarn check-types && yarn lint`
Expected: PASS, clean.

Run: `yarn run lock stoneGate 2>&1 | head -8`
Expected: no `⚠ not buildable yet` line (with phase 3 in; before it, `⚠ not buildable yet: unladen passage`).

- [ ] **Step 3: Commit**

```bash
git add src/game/lockWalkSpec.ts src/game/lockWalkSpec.spec.ts
git commit -m "feat(lock): a gate loop is buildable" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 5: stoneGate on the dev floor

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
  (both imported in `dev.ts` already); phase 3's binding key `unladen` and realisation `narrowPassage` **(phase 3)**.

- [ ] **Step 1: Check what this task stands on**

Run: `git status --short src/data/ && grep -rn "narrowPassage" src/mods --include='*.ts' -l | head -3`
Expected: the first prints nothing (no uncommitted playtest bake); the second lists phase 3's realisation. If it lists
nothing, phase 3 is not in: drop `unladen: "narrowPassage"` from the binding below (question 1's alternative) and say
so in the report.

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

One more floor, holding a lock with no drop and no switch. The numbers below are those at `608a067e`; if phase 3 or
another commit moved one, add one to what is there.

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

### Task 6: The crossing starts from the nearer side **(phase 3)**

Only with phase 3 in (question 1). Where a gate loop makes both sides of a passage walkable, the explorer walks to
the side nearer him and squeezes from there, never round the loop to the far one.

**Files:**
- Modify: `src/game/passages.ts` **(phase 3)** (`passageCrossing` takes an optional cost)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (the passage tap passes the path length)
- Test: `src/game/passages.spec.ts` **(phase 3)**

**Interfaces:**
- Consumes **(phase 3)**: `passageCrossing(grid, row, col, canStand): PassageCrossing | undefined`,
  `passageSides(grid, row, col)`; `findPath(grid, from, to)` (`src/game/gridNavigation.ts:207`).
- Produces: `passageCrossing(grid, row, col, canStand, costOf?: (row: number, col: number) => number)`.

- [ ] **Step 1: Check what this task stands on**

Run: `grep -n "export const passageCrossing" -A14 src/game/passages.ts`
Expected: phase 3's function, picking `near` with `sides.find(([r, c]) => canStand(r, c))`. If the file does not
exist, skip this task and record it under "Open after phase 4" (task 7).

- [ ] **Step 2: Write the failing test**

In `src/game/passages.spec.ts`, inside `describe("passageCrossing", …)`, beside phase 3's "starts on the first side
where he can stand on both" (which uses the `straight` fixture, sides `[0, 0]` and `[0, 2]`):

```ts
  it("starts on the nearer side where he can stand on both", () => {
    expect(passageCrossing(straight, 0, 1, () => true, (_r, c) => (c === 2 ? 1 : 5))?.near).toEqual([0, 2])
    expect(passageCrossing(straight, 0, 1, () => true, () => 3)?.near).toEqual([0, 0])
  })
```

Run: `yarn vitest run src/game/passages.spec.ts`
Expected: FAIL, the first gets `[0, 0]`.

- [ ] **Step 3: Implement**

In `src/game/passages.ts`, `passageCrossing` gains the cost and picks the cheapest standable side, the first in
`dirs` order on a tie. Its doc comment's last sentence becomes "Both are standable only where a gate closes a loop;
he starts from the one `costOf` rates nearer, the first on a tie." The picking line:

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

In `src/app/SiteMap/useSiteNavigation.ts`, in the passage branch of `onCellClick` **(phase 3)**:

```ts
        const crossing = passageCrossing(
          grid,
          row,
          col,
          (r, c) => walkable.has(`${r},${c}`),
          (r, c) => findPath(grid, explorerPos, [r, c]).length
        )
```

Run: `yarn vitest run src/game/passages.spec.ts src/app/SiteMap && yarn check-types && yarn lint`
Expected: PASS, clean (phase 3's crossing tests, the way back from the far side included, unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/game/passages.ts src/game/passages.spec.ts src/app/SiteMap/useSiteNavigation.ts
git commit -m "feat(map): the crossing starts from the nearer side" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 7: Look at it, say so, and the whole gate

**Files:**
- Modify: `docs/mods/floor-topology-design.md` (lines 698-701, "Gates may form loops"; the table row at line 896)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 4 row; "Open after phase 4")
- Modify: `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (§3, a note under the bake bullet)
- Modify: `docs/playtest-backlog.md`
- Modify: `src/data/carveLedger.json` (only if task 6 moved the fingerprint)

- [ ] **Step 1: Look at it**

Run: `INCLUDE_DEV=1 yarn generate-world` (never commit that bake), then `yarn storybook` and take two screenshots with
`npx playwright screenshot` (the Playwright MCP is down):
- `App/SiteMap/JourneyInspector` → `Inspector`, the dev journey, pyramid 12, floor 0: the floor's loops, five plates
  (two in `passage`), the torch, the narrow passage.
- `Topology/Lock playground`, lock `stoneGate`: it carves, or "carving, N seeds tried" ends in a refusal.

Read each screenshot back and describe it in the report. If the playground does not carve stoneGate within its
budget (`CARVE_BUDGET = 200`, `playgroundCarve.testing.ts`), record that under "Open after phase 4" with the refusal
it shows; do not fix it here. Then restore the world: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts`.

- [ ] **Step 2: The design doc**

`docs/mods/floor-topology-design.md`, "**Gates may form loops.**" paragraph (lines 698-701) becomes:

```markdown
**Gates may form loops.** A loop of gated joins is a puzzle in its own right: with plates and
`:empty` conditions, the way round one side opens as the other shuts. The walk proves a loop like any
other lock. A lock floor is laid before it is carved, and the lay stands a corridor on every join, so a
gated join that closes a loop is laid like any other, and a fork's ways may meet again beyond it. A gate
an open way goes round is refused by name (`gateBypassed`): its two sides are one ground, so no doorway
holds it. A layout written longhand, without a lock, is carved as side chains and still refuses a gate
on a loop's second meeting (`obstacleOffRoute`).
```

The table row "A gated join closing a loop is carved" (line 896): its second cell becomes `` `topologyFaults` on a
laid floor seats every join and refuses `gateBypassed`; `gateDoorFaults` holds each door between two grounds; the walk
proves the loop sound ``. Prettier reflows the table: edit the row by line and read the file back.

- [ ] **Step 3: The roadmap and the spec**

`docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (edit the table row by line and read it back): phase 4's row
says "(done <date>, [plan](2026-10-08-stonegate-phase-4-gate-loops.md))" after **Gate loops in the carve**. Add an
"## Open after phase 4" section above "## Open per phase":
- a layout written longhand (no `locks`) still refuses a gate on a loop's second meeting; `offRouteChains` is the
  side-chain carve's grouping and is unchanged;
- masonsRamp, counterweight and stoneOnAPlate are still not on the dev floor;
- whether the lock playground carves stoneGate on its bench floor (from step 1);
- task 6's outcome if it was skipped.

`docs/superpowers/specs/2026-10-04-stones-acceptance.md` §3: leave the box "The four stone locks and the stoneOnAPlate
lesson bake on the dev floor" unticked and add under it an indented line: "stoneGate bakes on the dev floor (pyramid
12), its gate loops laid like any join."

- [ ] **Step 4: The playtest backlog.** Add at the top of `docs/playtest-backlog.md` (below the intro paragraph):

```markdown
## stoneGate phase 4 — gate loops

- **Dev journey, pyramid 12 (stoneGate).** Play it to the end: lift the stone off the altar (the back way opens, the
  door in shuts), park a stone on the backroom shelf, squeeze through the narrow passage, spend both stones twice,
  leave by the way out. Leave mid-way and come back: every stone where you set it.
- **The narrow passage on the loop.** Tap its wall from either side: the explorer walks to the nearer side and
  squeezes, never round the loop first.
```

- [ ] **Step 5: Commit the docs**

```bash
git add docs/mods/floor-topology-design.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md docs/superpowers/specs/2026-10-04-stones-acceptance.md docs/playtest-backlog.md
git commit -m "docs: gate loops are laid like any join" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 6: The world stays put**

`git status --short src/data/` must print nothing. Then:

```bash
yarn generate-world
git diff --exit-code --stat src/data/generatedWorld.ts
git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -vc '"hash"'
```

Expected: the second prints nothing and exits 0; the third prints `0`. If the ledger moved (task 6 changed a
fingerprinted file), commit it:

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
file, copy the change back, commit it ("style: lint") in the real worktree, and run the gate again. Then `cd -`,
`git worktree remove /tmp/stonegate-phase4`, `git push`, and check `gh pr checks` if a PR exists for the branch.

---

## Self-review notes

- **Roadmap phase 4 row:** `topologyFaults` accepts a gated join closing a loop (task 1), the fork seams (task 3),
  `offRouteChains` (question 2: unchanged, the lay does not read it; recorded in task 7); stoneGate bakes on the dev
  floor (task 5).
- **Spec §3:** "stoneGate bakes on the dev floor, and the world bake stays byte-identical for every floor that has
  no stones" (task 5 steps 3-4, task 7 step 6). "With the realisation mod off, the carve is identical" for stoneGate
  (task 5 step 4, the toggle-off sweeps). "Done when" playing stoneGate on the dev floor: baked here, played by the
  designer from the playtest backlog (task 7 step 4).
- **Soundness:** every carved loop in the tests is walked (`expectSound` in tasks 1 and 3); stoneGate is walked by
  the bake's lock sweep (task 5 step 3) and `devJourney.verify.ts` (task 5 step 4).
- **Review Focus → tests:** 1 task 2; 2 task 3; 3 task 1 and the existing longhand spec; 4 task 2; 5 task 1.
- **Type consistency:** `TopologyOptions = { laid?: boolean }` (task 1) is read by tasks 2 and 3; `forkSeams(graph,
  region, oneWays, { laid })` returns `[region, other][]` (task 3), read by `seamsFor` as keys and by the assembler as
  `ForkIn.seams`; `gateBypassed` has the same shape in `TopologyFault` and `AssemblerReason` (task 2);
  `passageCrossing`'s fifth argument (task 6) defaults so phase 3's callers compile unchanged.
- **Not covered:** a gate loop inside a nested lock (no lock nests one); a loop closed by a drop (a drop is no
  ground, so it never makes a gate bypassed, and the lay lays it as before).
