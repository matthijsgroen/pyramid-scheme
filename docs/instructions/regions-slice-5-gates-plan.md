# Gates on connections (step 5, slice 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A floor authors an OBSTACLE standing on a connection between two regions and a CONTROL that decides which obstacles stand open, and the carve builds both — so a lever in one region opens a door between two others.

**Architecture:** Three separate nouns joined by authored ids. A **control** has named states; an **obstacle** is furniture at a place in the layout; the **wiring** says which obstacles each state opens. The assembler compiles the three into what the floor already knows how to carry — a gate ROOM wearing a `requiredKeyId`, and a `MechanismRecord` on the control's room — so `floorLock`, `lockWalk`, `openDoorsFor`, `siteValidator` and the map need no change at all. Core's `RegionGraph` is untouched: obstacles and controls are two new `FloorConfig` fields the topology mod owns, so toggle-off drops them and the identical walls carve with every connection open.

**Tech Stack:** TypeScript, vitest. No new dependencies.

**Spec:** `docs/game-design/regions-and-containers.md`, and `docs/authored-locks-roadmap.md` §5 for the background. Slice 4's carried list at the end of `docs/instructions/regions-slice-4-plan.md`.

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics in this repo have been wrong on every single occasion** — they report faults in files that do not exist. Never trust them; run the command.
- Lint with `yarn eslint <paths>`. **`yarn lint --fix <path>` does NOT scope** — the script is `eslint . --max-warnings 17`, so a path is appended to `.` and it rewrites the repo.
- `yarn generate-world` must stay byte-identical at md5 `f67c3ea9303b04a1d7c9a558d0561620`. Check with `yarn generate-world && md5 -q src/data/generatedWorld.ts` (or `md5sum`).
- **NEVER run `INCLUDE_DEV=1 yarn generate-world`.** `yarn validate-world` writes nothing and is safe with the flag.
- `src/game/` is the domain layer: no React, no `src/app/`, no `src/ui/`.
- Comments state CURRENT state and why, never history. No "replaces X", no "used to be Y".
- **Tests assert EVERY element of a collection, never a representative one.** Five plans in this series got this wrong and review caught all five.
- **Commit as `git commit -m "message" -- <paths>`** — `-m` BEFORE `--`, or `--` swallows it.
- **Implementers: never run `git add`, `git commit` or `git stash`.** Concurrent agents in one worktree commit each other's staged work; it has happened and swept 15 unrelated files into one commit. Leave the working tree dirty and report what you changed; the controlling session commits path-scoped.
- **Every refusal must be watched failing.** Break the thing it guards, see it go red, quote the output in your report. A guard nobody watched fail is not a guard — four shipped defects were found that way, including refusals that could never fire.
- **Measure, do not reason.** Every time reasoning and measurement disagreed this week, measurement was right.

**THE RULE THIS SERVES:** the builder may refuse, but it may never decide quietly.

---

## The decision this slice was blocked on, and what was ruled

**Ruled 2026-09-28: the obstacle and the control are separate, each with its own authored id.**

- An obstacle lives in its own list and is referenced BY ID. Core's `RegionGraph.connections` stays bare string pairs, so a mod's furniture never appears in a core type.
- A control is generic and N-state from the start, because `MechanismRecord` (`siteTypes.ts:321`) is already `states: string[]` + `initial`, and `lockWalk`'s `Mechanism.opens` (`lockWalk.ts:22`) is already `Record<StateId, GateId[]>`. The authoring shape below is that vocabulary, one layer up. A wheel needs art, not a second authoring path.
- `SubSection.gate` (`GateConfig`, floor-key/tomb-key) is untouched and stays on sections.

This is the same separation the save format already has, measured: `useJourneys.ts:76` stores `mechanismStates: Record<"<levelNr>:<mechanismAddress>", stateId>` — "the position, never the consequence... which doors that position opens is read off the floor". **So no obstacle kind this slice adds, and none a later slice adds, can move a save key.** What moves a save key is a control's authored place moving, and nothing else.

## What was measured before this plan was written

- **A branching region layout is refused today.** Four regions, `entrance` forking to `rightLower`/`leftLower` and rejoining at `wayOut`, gives `[{"type":"regionNotSeated","regions":["leftLower"]},{"type":"layoutNotFound"}]`. Only main-path steps seat regions (`siteAssembler.ts:1570-1583`); a chain takes the region of the cell it grows from. **`doubleBack` therefore still will not assemble after this slice** — the path-SHAPING work is its other half. Every fixture in this plan is a LINEAR region chain, which is what carves today.
- **A gate is a room, not a concept.** `floorLock.ts:17` reads a door off the assembled grid as "a room with `requiredKeyId`/`requiredKeyIds`". `openDoorsFor` (`mechanismDoors.ts:7`) reads mechanisms off room cells. So an obstacle that compiles to a gate room and a control that compiles to a `MechanismRecord` need no change anywhere downstream.
- **The precedent for compiling authoring into ordinary floor furniture already exists:** `withHandleGates` (`siteAssembler.ts:555-581`) rewrites a handle-driven section to carry a plain `gate: {type:"floor-key", keyId}` so "the rest of the carve meets an ordinary authored floor-key gate... and the gate room is written by the one place that writes gate rooms". This slice is that move, applied to the main path.
- **A lever already stands on the main path.** `leverRooms(MAIN_SECTION_ADDRESS)` (`siteAssembler.ts:790, 866, 1046`) grows the main path by one cell and takes `contentIndices[0]`. Region control rooms and gate rooms grow it the same way.
- **`doorsToEnter` already exists and is the right quantity** (`siteAssembler.ts:1481`): the set of doors a cell must earn to be stood on. `edgeAllowed` (`:1529`) is the conservative special case of "both ends behind the same doors" — it compares membership of `gatedCellKeys` rather than the door sets themselves.

---

### Task 1: The authoring shape, and every way it can be wrong

**Files:**
- Create: `src/game/obstacles.ts`
- Create: `src/game/obstacles.spec.ts`
- Modify: `src/game/siteTypes.ts` (`FloorConfig`, `AssemblerReason`)
- Modify: `src/game/siteAssembler.ts` (raise the faults beside the region refusals at `:655-683`)
- Test: `src/game/obstacles.spec.ts`, plus one assembler test in `src/game/regionCarve.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph`, `regionRoute` from `src/game/regions.ts`.
- Produces:
  ```ts
  export type Obstacle = {
    id: string
    kind: "gate"
    at: { on: "connection"; between: readonly [string, string] }
  }
  export type Control = {
    id: string
    in: string
    states: string[]
    initial: string
    returnsToInitial: boolean
    opens: Record<string, string[]>
    encounter?: string
  }
  export type TopologyFault =
    | { type: "obstacleIdRepeated"; id: string }
    | { type: "obstacleNamesNoConnection"; id: string }
    | { type: "obstacleOffRoute"; id: string }
    | { type: "obstacleUnowned"; id: string }
    | { type: "controlUnsatisfied"; id: string; what: string }
  export const topologyFaults: (
    layout: RegionGraph | undefined,
    obstacles: readonly Obstacle[],
    controls: readonly Control[]
  ) => TopologyFault[]
  ```

**Why two discriminants (`kind` and `at.on`) when only one combination exists:** they are two different axes and the catalogue already names cases on both. A one-way that a control reverses is `kind: "oneWay"`, `on: "connection"`; a flood is `kind: "flood"`, `on: "region"`. Both are unions read through an exhaustive `switch` with a `default: never` guard, so adding either is a compile error at every site that must handle it rather than a silent fallthrough. **There is no `condition` vocabulary yet:** `opens` says which obstacles stand open, exactly as `lockWalk`'s `Mechanism.opens` does. A direction is not open-or-shut, so the day `oneWay` lands, `opens` is what has to grow — that is named here so nobody is surprised by it, and inventing the wider shape before there is a second condition would be guessing at it.

- [ ] **Step 1: Write the module with its types and the fault check**

Create `src/game/obstacles.ts`:

```ts
import type { RegionGraph } from "./regions"
import { regionRoute } from "./regions"

/**
 * WHAT STANDS IN THE WAY, AND WHAT DECIDES WHETHER IT DOES — two separate things joined by an
 * authored id (docs/game-design/regions-and-containers.md).
 *
 * An obstacle is furniture the topology mod stands at a place in the floor's layout. A control is a
 * thing with named states. The wiring between them is the control's `opens`: which obstacles stand
 * open while it is in each state. Keeping them apart is what lets one control drive several
 * obstacles, several controls drive one, and a new kind of obstacle arrive without a new kind of
 * control.
 *
 * Core's RegionGraph names none of this. A region is core and a gate is the topology mod's, so the
 * mod points AT the layout by region name and never hangs anything on it.
 */
export type Obstacle = {
  /** Authored, stable across a re-carve, unique on the floor, and the wire a control names. */
  id: string
  /** WHAT IT IS. One union, exhaustively checked, meant to grow: a one-way a control reverses and a
   * flood that shuts a region rather than a boundary are the two the catalogue already names. */
  kind: "gate"
  /** WHERE IT STANDS. The second axis: a gate and a one-way stand on a connection, a flood on a
   * region. Also one union, also exhaustively checked. */
  at: { on: "connection"; between: readonly [string, string] }
}

/**
 * A MECHANISM AS THE AUTHOR WRITES IT. `states`/`initial`/`returnsToInitial` are MechanismRecord's,
 * and `opens` is lockWalk's Mechanism.opens one layer up — the same vocabulary, so nothing has to be
 * translated between what is authored and what is walked.
 */
export type Control = {
  id: string
  /** The region the control stands in. A region, not a section address: the mod points at the layout. */
  in: string
  states: string[]
  initial: string
  returnsToInitial: boolean
  /** Which obstacles stand OPEN in each state. A state listing none shuts every obstacle this control
   * owns. Keys are states, values are obstacle ids. */
  opens: Record<string, string[]>
  /** The family whose room the player taps. Defaults to the handle. The behaviour is `states`; this is
   * only what stands there. */
  encounter?: string
}

export type TopologyFault =
  | { type: "obstacleIdRepeated"; id: string }
  | { type: "obstacleNamesNoConnection"; id: string }
  | { type: "obstacleOffRoute"; id: string }
  | { type: "obstacleUnowned"; id: string }
  | { type: "controlUnsatisfied"; id: string; what: string }

/** The two ends of a connection in a stable order, so `["a","b"]` and `["b","a"]` are one connection. */
const connectionKey = (a: string, b: string): string => JSON.stringify([a, b].sort())

/**
 * EVERY WAY THE AUTHORED TOPOLOGY DOES NOT RESOLVE, answered from the config alone so it is refused
 * before a wall is carved. Nothing here depends on a seed: which regions exist, what joins them and
 * which route the main path threads are all fixed by the config.
 *
 * `obstacleOffRoute` is the honest limit of what can be built today rather than a rule of the design:
 * a region is a stretch of the MAIN PATH, so cells only ever meet along the threaded route, and a
 * connection off it has no boundary to stand a gate at. It stops firing on its own when the
 * path-shaping work lets a layout branch.
 */
export const topologyFaults = (
  layout: RegionGraph | undefined,
  obstacles: readonly Obstacle[],
  controls: readonly Control[]
): TopologyFault[] => {
  const faults: TopologyFault[] = []
  if (obstacles.length === 0 && controls.length === 0) return faults
  if (!layout) {
    for (const o of obstacles) faults.push({ type: "obstacleNamesNoConnection", id: o.id })
    for (const c of controls) faults.push({ type: "controlUnsatisfied", id: c.id, what: c.in })
    return faults
  }

  const joined = new Set(layout.connections.map(([a, b]) => connectionKey(a, b)))
  const route = regionRoute(layout)
  const onRoute = new Set<string>()
  for (let i = 0; i < route.length - 1; i++) onRoute.add(connectionKey(route[i], route[i + 1]))

  const seenObstacle = new Set<string>()
  for (const obstacle of obstacles) {
    if (seenObstacle.has(obstacle.id)) faults.push({ type: "obstacleIdRepeated", id: obstacle.id })
    seenObstacle.add(obstacle.id)
    const key = connectionKey(obstacle.at.between[0], obstacle.at.between[1])
    if (!joined.has(key)) faults.push({ type: "obstacleNamesNoConnection", id: obstacle.id })
    else if (!onRoute.has(key)) faults.push({ type: "obstacleOffRoute", id: obstacle.id })
  }

  const regions = new Set(layout.regions.map(r => r.name))
  const owned = new Set<string>()
  const seenControl = new Set<string>()
  for (const control of controls) {
    if (seenControl.has(control.id)) faults.push({ type: "controlUnsatisfied", id: control.id, what: control.id })
    seenControl.add(control.id)
    if (!regions.has(control.in)) faults.push({ type: "controlUnsatisfied", id: control.id, what: control.in })
    const states = new Set(control.states)
    if (!states.has(control.initial))
      faults.push({ type: "controlUnsatisfied", id: control.id, what: control.initial })
    for (const [state, opens] of Object.entries(control.opens)) {
      if (!states.has(state)) faults.push({ type: "controlUnsatisfied", id: control.id, what: state })
      for (const id of opens) {
        if (!seenObstacle.has(id)) faults.push({ type: "controlUnsatisfied", id: control.id, what: id })
        owned.add(id)
      }
    }
  }

  // EVERY OBSTACLE HAS AN OWNER, which is checkLockSpec's rule (lockWalk.ts, "gate ... has no owner")
  // asked one layer earlier: an obstacle nothing opens is a wall, and a wall is authored as a layout
  // with no connection rather than as a gate nobody can pass.
  for (const obstacle of obstacles) if (!owned.has(obstacle.id)) faults.push({ type: "obstacleUnowned", id: obstacle.id })

  return faults
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/game/obstacles.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { topologyFaults } from "./obstacles"
import type { Control, Obstacle } from "./obstacles"
import type { RegionGraph } from "./regions"

// A linear chain plus one connection the route does not take, so "on the layout" and "on the route"
// are two different questions this fixture can tell apart.
const layout: RegionGraph = {
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
  ],
  in: "mouth",
  out: "vault",
}

const gate = (id: string, between: readonly [string, string]): Obstacle => ({
  id,
  kind: "gate",
  at: { on: "connection", between },
})

const lever = (id: string, opens: Record<string, string[]>): Control => ({
  id,
  in: "mouth",
  states: ["left", "right"],
  initial: "left",
  returnsToInitial: true,
  opens,
})

describe("authored topology that resolves", () => {
  it("finds no fault in a gate on the route with a control that opens it", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { left: ["g1"], right: [] })])

    expect(faults).toEqual([])
  })

  it("finds no fault in one control driving two gates from different states", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["mouth", "hall"]), gate("g2", ["hall", "vault"])],
      [lever("s1", { left: ["g1"], right: ["g2"] })]
    )

    expect(faults).toEqual([])
  })

  it("finds no fault in two controls driving one gate", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["hall", "vault"])],
      [lever("s1", { left: ["g1"], right: [] }), { ...lever("s2", { left: ["g1"], right: [] }), id: "s2" }]
    )

    expect(faults).toEqual([])
  })

  it("finds no fault at all when the floor authors neither", () => {
    expect(topologyFaults(undefined, [], [])).toEqual([])
  })
})

describe("authored topology that does not resolve", () => {
  it("names an obstacle id used twice", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["mouth", "hall"]), gate("g1", ["hall", "vault"])],
      [lever("s1", { left: ["g1"], right: [] })]
    )

    expect(faults).toContainEqual({ type: "obstacleIdRepeated", id: "g1" })
  })

  it("names an obstacle standing on a connection the layout does not have", () => {
    const faults = topologyFaults(layout, [gate("g1", ["mouth", "vault"])], [lever("s1", { left: ["g1"], right: [] })])

    expect(faults).toEqual([{ type: "obstacleNamesNoConnection", id: "g1" }])
  })

  it("names an obstacle on a connection the route never threads", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "cellar"])], [lever("s1", { left: ["g1"], right: [] })])

    expect(faults).toEqual([{ type: "obstacleOffRoute", id: "g1" }])
  })

  it("names an obstacle no control opens in any state", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { left: [], right: [] })])

    expect(faults).toEqual([{ type: "obstacleUnowned", id: "g1" }])
  })

  it("names a control standing in no region of the layout", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["hall", "vault"])],
      [{ ...lever("s1", { left: ["g1"], right: [] }), in: "attic" }]
    )

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "attic" }])
  })

  it("names a control starting in a state it does not have", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["hall", "vault"])],
      [{ ...lever("s1", { left: ["g1"], right: [] }), initial: "middle" }]
    )

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "middle" }])
  })

  it("names a control opening gates in a state it does not have", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { sideways: ["g1"] })])

    expect(faults).toContainEqual({ type: "controlUnsatisfied", id: "s1", what: "sideways" })
  })

  it("names a control opening an obstacle that does not exist", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { left: ["g1", "g9"] })])

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "g9" }])
  })

  it("names every obstacle and control when the floor authors no layout at all", () => {
    const faults = topologyFaults(undefined, [gate("g1", ["a", "b"])], [lever("s1", { left: ["g1"] })])

    expect(faults).toEqual([
      { type: "obstacleNamesNoConnection", id: "g1" },
      { type: "controlUnsatisfied", id: "s1", what: "mouth" },
    ])
  })
})
```

- [ ] **Step 3: Run the tests and watch them fail for the right reason**

Run: `yarn vitest run src/game/obstacles.spec.ts`
Expected: they pass once Step 1's module exists. **If any passes before you write the module, you wrote the module first — that is fine; what matters is Step 5.**

- [ ] **Step 4: Wire the fields and the reasons into the assembler**

In `src/game/siteTypes.ts`, beside `regionLayout` in `FloorConfig`:

```ts
  /** WHAT STANDS BETWEEN THE FLOOR'S REGIONS, and what decides whether it does — the topology mod's,
   * pointing at core's `regionLayout` by region name (src/game/obstacles.ts). An obstacle is named
   * once here and referred to by id; a control names which obstacles each of its states opens. Both
   * drop when the mod is not registered, and the identical walls then carve with every connection
   * open. */
  obstacles?: Obstacle[]
  controls?: Control[]
```

with `import type { Control, Obstacle } from "./obstacles"` beside the existing `regions` import.

In `AssemblerReason`, beside the region reasons:

```ts
  /** An authored obstacle or control does not resolve against the floor's region layout — the id that
   * failed is named, because the author needs to know which one. See src/game/obstacles.ts's
   * TopologyFault, whose members these are. */
  | { type: "obstacleIdRepeated"; id: string }
  | { type: "obstacleNamesNoConnection"; id: string }
  | { type: "obstacleOffRoute"; id: string }
  | { type: "obstacleUnowned"; id: string }
  | { type: "controlUnsatisfied"; id: string; what: string }
```

In `src/game/siteAssembler.ts`, directly after the region-layout refusals (the `strandedRegions` block ending at `:683`):

```ts
  // REFUSED BEFORE A WALL IS CARVED, like the region checks above and for the same reason: which
  // regions exist, what joins them and which route the main path threads are all fixed by the config,
  // so a misnamed id is answered once here rather than blamed on sixty carves that could never have
  // satisfied it.
  const topologyProblems = topologyFaults(regionLayout, authoredConfig.obstacles ?? [], authoredConfig.controls ?? [])
  if (topologyProblems.length > 0) return { success: false, reasons: topologyProblems }
```

- [ ] **Step 5: Watch each refusal fail against a real floor**

Append to `src/game/regionCarve.spec.ts`. These go through `assembleFloor`, so they prove the faults reach a caller — the unit tests above only prove the function computes them.

```ts
describe("authored topology the floor cannot carry", () => {
  const gated = (
    obstacles: FloorConfig["obstacles"],
    controls: FloorConfig["controls"]
  ): FloorConfig => ({ ...floor(threeRegions), obstacles, controls })

  const reasonsOf = (config: FloorConfig) => {
    const result = assembleFloor("test-journey", config, SEED)
    return result.success ? [] : result.reasons
  }

  it("refuses an obstacle on a connection the layout does not have", () => {
    expect(
      reasonsOf(
        gated(
          [{ id: "g1", kind: "gate", at: { on: "connection", between: ["mouth", "vault"] } }],
          [{ id: "s1", in: "mouth", states: ["a", "b"], initial: "a", returnsToInitial: true, opens: { a: ["g1"] } }]
        )
      )
    ).toEqual([{ type: "obstacleNamesNoConnection", id: "g1" }])
  })

  it("refuses an obstacle nothing opens", () => {
    expect(
      reasonsOf(
        gated(
          [{ id: "g1", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }],
          [{ id: "s1", in: "mouth", states: ["a", "b"], initial: "a", returnsToInitial: true, opens: { a: [] } }]
        )
      )
    ).toEqual([{ type: "obstacleUnowned", id: "g1" }])
  })

  it("refuses a control standing in no region", () => {
    expect(
      reasonsOf(
        gated(
          [{ id: "g1", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }],
          [{ id: "s1", in: "attic", states: ["a", "b"], initial: "a", returnsToInitial: true, opens: { a: ["g1"] } }]
        )
      )
    ).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "attic" }])
  })
})
```

Run: `yarn vitest run src/game/regionCarve.spec.ts src/game/obstacles.spec.ts`
Expected: PASS.

Now **break each guard and watch it go red**, one at a time: comment out the `topologyProblems` block in the assembler and re-run — all three assembler tests must fail. Put it back. Then, in `topologyFaults`, delete the `obstacleUnowned` loop and re-run — only "refuses an obstacle nothing opens" must fail. Put it back. **Quote both outputs in your report.**

- [ ] **Step 6: Types and lint**

Run: `yarn check-types && yarn eslint src/game/obstacles.ts src/game/obstacles.spec.ts src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts`
Expected: clean.

- [ ] **Step 7: Report, do not commit**

Report which files you changed and paste the red output from Step 5. The controlling session commits:

```bash
git commit -m "feat: a floor authors obstacles and the controls that open them" -- src/game/obstacles.ts src/game/obstacles.spec.ts src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts
```

---

### Task 2: A gate room stands at the boundary between two regions

**Files:**
- Modify: `src/game/siteAssembler.ts`
- Test: `src/game/regionGates.spec.ts` (create)

**Interfaces:**
- Consumes: Task 1's `Obstacle`, `FloorConfig.obstacles`; `regionRoute`/`regionOfStep` from `regions.ts`; the `stepRegion` labelling at `siteAssembler.ts:1553`.
- Produces: a gate ROOM cell on the main path at each on-route obstacle's boundary, `tags: ["gate"]`, `requiredKeyId: gateKeyOf(obstacle)`, where
  ```ts
  const gateKeyOf = (id: string) => `obstacle:${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}:${id}`
  ```

**The id rule, and why it is this one:** a gate key is derived from where the floor was AUTHORED plus the obstacle's AUTHORED id — neither of which a re-carve can move. That is the rule `handle:` and `switch:` stems already follow (`siteAssembler.ts:710-713`), and it is what stops a saved lever position coming to fit a door it was never thrown for.

**Where the gate room goes:** the FIRST main-path node of the far region. A region is a stretch of the main path, so a connection on the route is the seam between two consecutive stretches, and the cell the player must walk into to leave one for the other is where the bars belong.

**The ordering surgery this needs, and the hazard in it:** today `contentIndices`/`leverIndex` are computed at `:1046-1057` and `route`/`stepRegion` at `:1553`. The gate cells have to be known before content is placed, so **move the `route`/`stepRegion`/`unseated` block up to just before `:1046`** and place content on the nodes that are left. The main path must also be sized for the extra cells at `:866`.

**The collision this creates, and the rule for it:** `spreadContentIndices(contentCount, 1, mainPath.length)` spaces content evenly along the path, and a region seam can land on one of those positions. A gate room and a puzzle cannot both stand in one cell. **The content index moves, not the gate** — the seam is where the regions actually change and is not free to slide, while content is spread for rhythm and one node either way is exactly the kind of thing the carve already decides. Content moves FORWARD to the next free node, deterministically, so one layout always places the same way.

**Fingerprint hazard:** every floor in the shipped world authors no `regionLayout`, so `route` is `[]`, `stepRegion` is `[]` and `gateIndices` is empty — the arithmetic must be byte-identical for them. **Step 6 measures this; do not assume it.**

- [ ] **Step 1: Write the failing test**

Create `src/game/regionGates.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid, RoomCell } from "./siteTypes"

const SEED = 99

const threeRegions: FloorConfig["regionLayout"] = {
  regions: [
    { name: "mouth", appetite: "free" },
    { name: "hall", appetite: "free" },
    { name: "vault", appetite: "free" },
  ],
  connections: [
    ["mouth", "hall"],
    ["hall", "vault"],
  ],
  in: "mouth",
  out: "vault",
}

// One gate between hall and vault, one lever in mouth that opens it on `right` and shuts it on `left`.
const gatedFloor = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  regionLayout: threeRegions,
  obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }],
  controls: [
    { id: "s1", in: "mouth", states: ["left", "right"], initial: "right", returnsToInitial: true, opens: { right: ["vaultDoor"] } },
  ],
})

const carve = (config: FloorConfig): FloorGrid => {
  const result = assembleFloor("test-journey", config, SEED)
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

const rooms = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flatMap(row => row.filter((cell): cell is RoomCell => cell.type === "room"))

const GATE_KEY = "obstacle:test-journey#0#0:vaultDoor"

describe("a gate standing on a connection", () => {
  it("carves exactly one room wearing the obstacle's key", () => {
    const gates = rooms(carve(gatedFloor())).filter(room => room.requiredKeyId === GATE_KEY)

    expect(gates).toHaveLength(1)
  })

  it("tags that room as a gate, so the map and openWaysOut both know it", () => {
    const gate = rooms(carve(gatedFloor())).find(room => room.requiredKeyId === GATE_KEY)!

    expect(gate.tags).toContain("gate")
  })

  it("stands it in the far region of the connection", () => {
    const gate = rooms(carve(gatedFloor())).find(room => room.requiredKeyId === GATE_KEY)!

    expect(gate.region).toBe("vault")
  })

  it("stands it on the first cell of that region, so nothing of the region is in front of the bars", () => {
    const grid = carve(gatedFloor())
    const gate = rooms(grid).find(room => room.requiredKeyId === GATE_KEY)!
    const vaultOrdinals = grid.cells
      .flat()
      .filter(cell => cell.type !== "empty" && cell.region === "vault" && cell.ordinal !== undefined)
      .map(cell => Number((cell as RoomCell).ordinal))

    expect(Number(gate.ordinal)).toBe(Math.min(...vaultOrdinals))
  })

  it("carves no gate room at all when the floor authors no obstacle", () => {
    const { obstacles: _obstacles, controls: _controls, ...plain } = gatedFloor()
    const gates = rooms(carve(plain)).filter(room => room.requiredKeyId?.startsWith("obstacle:"))

    expect(gates).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/regionGates.spec.ts`
Expected: FAIL — the four gate tests find no room wearing that key. Quote the failure.

- [ ] **Step 3: Move the region route above content placement**

In `src/game/siteAssembler.ts`, cut the block that currently begins with the `// WHICH REGION EACH CELL STANDS IN` comment (`:1548`) through the `unseated` refusal and its `continue`, and paste it immediately BEFORE the `leverOnMain` line at `:1046`. Leave the `cellRegion` map population where it is — only `route`, `stepRegion` and the `unseated` check move, because only those are needed to know where the boundaries are.

- [ ] **Step 4: Size the path and place the gate rooms**

Where the main path length is computed (`:866`), add the on-route obstacles:

```ts
  // A GATE ROOM IS A CELL LIKE ANY OTHER AND THE PATH HAS TO BE LONG ENOUGH TO HOLD IT, the same way
  // a lever standing on the main path lengthens it. Sized here, before the carve, because the carve
  // is what has to produce the cells.
  const mainGateCount = (authoredConfig.obstacles ?? []).length
```

and add `+ mainGateCount` to the main-path length expression.

After `stepRegion` is available (its new home from Step 3), derive the boundary cells:

```ts
  // WHERE ONE REGION STOPS AND THE NEXT BEGINS. The route threads the regions in order, so a
  // connection on it is the seam between two consecutive stretches and the first cell of the far
  // stretch is the one the player has to walk into — which is where the bars belong.
  const gateIndexByObstacle = new Map<string, number>()
  for (const obstacle of authoredConfig.obstacles ?? []) {
    const [a, b] = obstacle.at.between
    for (let step = 1; step < stepRegion.length; step++) {
      const before = stepRegion[step - 1]
      const here = stepRegion[step]
      if (before === here) continue
      if ((before === a && here === b) || (before === b && here === a)) {
        gateIndexByObstacle.set(obstacle.id, step)
        break
      }
    }
  }
  // A seam the carve did not produce — the route threads the connection, but this attempt's path is
  // too short for both stretches to appear. Later attempts pack more nodes onto the main path, so
  // this is retried rather than refused: `mainPath.length` GROWS across the attempt budget.
  if (gateIndexByObstacle.size < (authoredConfig.obstacles ?? []).length) {
    if (!gateSeamMissing)
      gateSeamMissing = (authoredConfig.obstacles ?? [])
        .filter(o => !gateIndexByObstacle.has(o.id))
        .map(o => o.id)
    continue
  }
  const gateIndices = new Set(gateIndexByObstacle.values())
```

with, beside `unseatedRegions` at `:988`:

```ts
  // The first attempt's obstacles whose seam the path did not produce, kept the same way and for the
  // same reason: the path lengthens across the attempt budget, so what one attempt cannot seat a
  // later one may.
  let gateSeamMissing: string[] | undefined
```

and, where `unseatedRegions` is reported after the attempt budget, the matching report:

```ts
    ...(gateSeamMissing ? [{ type: "obstacleSeamNotCarved" as const, ids: gateSeamMissing }] : []),
```

Add that reason to `AssemblerReason`:

```ts
  /** The route threads the connection these obstacles stand on, but no carve produced a cell on each
   * side of the seam, so there was nowhere to stand the bars. `ids` are the obstacles left unplaced. */
  | { type: "obstacleSeamNotCarved"; ids: string[] }
```

Then move content off the gate cells. Immediately after `const contentIndices = spreadContentIndices(contentCount, 1, mainPath.length)` (`:1049`):

```ts
    // A GATE ROOM AND A PUZZLE CANNOT BOTH STAND IN ONE CELL, and it is the content that moves: a
    // seam is where the regions actually change, while content is spread for rhythm and one node
    // either way is the kind of thing the carve already decides. Forward to the next free node, so
    // one layout always places the same way.
    const placedContent: number[] = []
    for (const wanted of contentIndices) {
      let index = wanted
      while (index < mainPath.length - 1 && (gateIndices.has(index) || placedContent.includes(index))) index += 2
      if (index >= mainPath.length - 1) break
      placedContent.push(index)
    }
    // The path had no free node left for every piece of content. Retried rather than refused: the
    // path lengthens across the attempt budget.
    if (placedContent.length < contentCount) continue
```

then use `placedContent` in place of `contentIndices` for `goalIndex`, `leverIndex` and `puzzleIndices` on the three lines below it. **The step is 2, not 1** — only even/even lattice positions hold a node, which is the same reason the switch cuts its door into the node two cells out (`mechanismDoors.ts`, `sealWaysOut`). Confirm that against `spreadContentIndices` before you rely on it; if it deals indices one apart, use 1.

**Fingerprint safety:** with no `regionLayout`, `gateIndices` is empty, no index is ever occupied twice by construction, so `placedContent` equals `contentIndices` element for element. Step 6 measures that claim.

Where the main path's room specs are written (`:1640-1660`), give a gate cell the gate spec ahead of the lever branch:

```ts
      if (gateIndices.has(mi)) {
        const [obstacleId] = [...gateIndexByObstacle].find(([, index]) => index === mi)!
        roomSpecs.set(posKey(r, c), {
          roomType: "encounter" as const,
          family: keyGate.familyId,
          tags: ["gate"],
          requiredKeyId: gateKeyOf(obstacleId),
        })
      } else if (leverOnMain && mi === leverIndex) {
```

`keyGate` is the already-resolved `resolveEncounter("key-gate", "key-gate")` at `:820`. Read the existing key-gate room spec at `:1715-1725` and copy its field names exactly rather than the sketch above — if it sets anything else (a mark, a difficulty, a section hash), set it here too.

- [ ] **Step 5: Run the tests**

Run: `yarn vitest run src/game/regionGates.spec.ts src/game/regionCarve.spec.ts`
Expected: PASS, all of them.

- [ ] **Step 6: MEASURE the world fingerprint**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts`
Expected: `f67c3ea9303b04a1d7c9a558d0561620`.

**If it moved, the reordering in Step 3 changed content placement for floors with no layout, which is a defect in this task and not an acceptable cost.** Find it: `git diff src/data/generatedWorld.ts | head -40` names the floors that moved. Do not proceed to Task 3 until the md5 is back.

- [ ] **Step 7: Watch the new refusal fail**

Temporarily author a fourth region on the route and a `pathPuzzles: 0` floor so the path is shorter than the route needs, run the gate spec, and confirm `obstacleSeamNotCarved` comes back naming the obstacle — not `layoutNotFound` alone. Quote it. Remove the temporary fixture.

- [ ] **Step 8: Types, lint, full suite, report**

Run: `yarn check-types && yarn eslint src/game/siteAssembler.ts src/game/siteTypes.ts src/game/regionGates.spec.ts && yarn test`
Expected: clean, 3714+ passing.

Report; the controlling session commits:

```bash
git commit -m "feat: an obstacle on a connection carves a gate room at the seam" -- src/game/siteAssembler.ts src/game/siteTypes.ts src/game/regionGates.spec.ts
```

---

### Task 3: A control stands in a region and drives its obstacles

**Files:**
- Modify: `src/game/siteAssembler.ts`
- Test: `src/game/regionGates.spec.ts`

**Interfaces:**
- Consumes: Task 1's `Control`, Task 2's `gateKeyOf` and `stepRegion`.
- Produces: a room on the main path inside `control.in`, carrying `mechanism: MechanismRecord` whose `states`/`initial`/`returnsToInitial` are the control's and whose `positions` are `{ state, gateKeyId }` — one entry per obstacle per state that opens it.

**Why `positions` and not `opens`:** `MechanismRecord.positions` (`siteTypes.ts:340`) is the compiled form the walk and `openDoorsFor` already eat, and several entries may share a state. `opens: { right: ["a","b"] }` compiles to two entries both tagged `right`. Nothing downstream changes.

- [ ] **Step 1: Write the failing test**

Append to `src/game/regionGates.spec.ts`:

```ts
import { openDoorsFor } from "./mechanismDoors"
import { cellAddress } from "./cellAddress"

describe("a control standing in a region", () => {
  const controlRoom = (grid: FloorGrid): RoomCell => rooms(grid).find(room => room.mechanism !== undefined)!

  it("stands one room in the region the control names", () => {
    expect(controlRoom(carve(gatedFloor())).region).toBe("mouth")
  })

  it("carries every state the control authors, in order", () => {
    expect(controlRoom(carve(gatedFloor())).mechanism!.states).toEqual(["left", "right"])
  })

  it("starts in the state the control authors", () => {
    expect(controlRoom(carve(gatedFloor())).mechanism!.initial).toBe("right")
  })

  it("carries one position per obstacle each state opens, and none for a state that opens nothing", () => {
    expect(controlRoom(carve(gatedFloor())).mechanism!.positions).toEqual([{ state: "right", gateKeyId: GATE_KEY }])
  })

  it("opens the gate in the state that names it and nothing in the other", () => {
    const grid = carve(gatedFloor())
    const room = controlRoom(grid)
    const at = grid.cells.flatMap((row, r) =>
      row.map((cell, c) => (cell === room ? cellAddress(grid, 0, r, c) : null))
    ).find((a): a is string => a !== null)!

    expect(openDoorsFor(grid, 0, new Map([[at, "right"]]))).toEqual(new Set([GATE_KEY]))
    expect(openDoorsFor(grid, 0, new Map([[at, "left"]]))).toEqual(new Set())
  })

  it("opens the gate on arrival, with no stored position at all, because that is the initial state", () => {
    const grid = carve(gatedFloor())

    expect(openDoorsFor(grid, 0, new Map())).toEqual(new Set([GATE_KEY]))
  })
})

// THREE STATES, not two: the authoring is generic, and a wheel is the case this proves is already
// carried — it needs art, not a second authoring path.
describe("a control with more than two states", () => {
  const threeWay = (): FloorConfig => ({
    ...gatedFloor(),
    obstacles: [
      { id: "gA", kind: "gate", at: { on: "connection", between: ["mouth", "hall"] } },
      { id: "gB", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } },
    ],
    controls: [
      {
        id: "w1",
        in: "mouth",
        states: ["n", "e", "s"],
        initial: "n",
        returnsToInitial: true,
        opens: { n: ["gA"], e: ["gB"], s: ["gA", "gB"] },
      },
    ],
  })

  it("carries all three states and every position each one opens", () => {
    const grid = carve(threeWay())
    const mechanism = rooms(grid).find(room => room.mechanism !== undefined)!.mechanism!
    const keyA = "obstacle:test-journey#0#0:gA"
    const keyB = "obstacle:test-journey#0#0:gB"

    expect(mechanism.states).toEqual(["n", "e", "s"])
    expect(mechanism.positions).toEqual([
      { state: "n", gateKeyId: keyA },
      { state: "e", gateKeyId: keyB },
      { state: "s", gateKeyId: keyA },
      { state: "s", gateKeyId: keyB },
    ])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/regionGates.spec.ts`
Expected: FAIL — no room carries a mechanism. Quote it.

- [ ] **Step 3: Compile the controls**

Beside the handle compilation (`:724-780`), build one `MechanismRecord` per control:

```ts
  // A CONTROL IS COMPILED INTO THE RECORD THE WALK ALREADY EATS. `opens` names obstacles by their
  // authored ids; `positions` names the gate keys those ids mint, one entry per obstacle per state
  // that opens it — several entries may share a state, which is what lets one position open a set.
  const controlRecords = (authoredConfig.controls ?? []).map(control => ({
    control,
    record: {
      states: control.states,
      initial: control.initial,
      returnsToInitial: control.returnsToInitial,
      positions: control.states.flatMap(state =>
        (control.opens[state] ?? []).map(id => ({ state, gateKeyId: gateKeyOf(id) }))
      ),
    } satisfies MechanismRecord,
  }))
```

Note the iteration order: **over `states`, not over `Object.entries(opens)`** — so the compiled order follows what the author declared rather than object key order, and the test above can assert the whole array.

Size the main path for the control rooms at `:866` (`+ controlRecords.length`, alongside `mainGateCount`).

After `placedContent` is known (Task 2's Step 4), choose each control's cell — the first CONTENT node inside its region. A content node, not any node: a control is a room the player taps, and the main path's rooms are exactly the content positions, which is why `leverOnMain` takes `contentIndices[0]` today (`:1054`).

```ts
    // A CONTROL STANDS IN A REGION, so its room is the first content node of that stretch. First
    // rather than last: a lever opens what lies further on, so the walk has to reach it before the
    // doors it owns are worth reaching — the same reason a handle on the main path takes the first
    // content node.
    const controlIndexById = new Map<string, number>()
    const takenByControl = new Set<number>()
    for (const { control } of controlRecords) {
      const index = placedContent.find(
        mi => stepRegion[mi] === control.in && !takenByControl.has(mi) && mi !== goalIndex
      )
      if (index === undefined) continue
      controlIndexById.set(control.id, index)
      takenByControl.add(index)
    }
    // A region this attempt gave no free content node to. Retried rather than refused, for the reason
    // slice 4 measured: `mainPath.length` GROWS across the attempt budget — packing widens at 8/16/24
    // — so a refusal decided on attempt 0 refuses layouts its own recovery would have seated.
    if (controlIndexById.size < controlRecords.length) {
      if (!controlNotSeated)
        controlNotSeated = controlRecords
          .filter(({ control }) => !controlIndexById.has(control.id))
          .map(({ control }) => control.id)
      continue
    }
```

Note `contentCount` at `:1047` must also grow by `controlRecords.length`, exactly as it grows by `leverRooms(MAIN_SECTION_ADDRESS)` today — a control room is content in the sense that matters here, which is that a node is spent on it.

with `let controlNotSeated: string[] | undefined` declared beside `gateSeamMissing`, reported after the attempt budget in the same shape, and a new reason:

```ts
  /** No carve put a main-path room inside the region these controls stand in. `ids` are the controls
   * left unseated. */
  | { type: "controlNotSeated"; ids: string[] }
```

`nodeIndices` above is whatever the surrounding code already calls the list of main-path node positions — read `:1046-1057` and use the existing name rather than inventing one.

Then write the room spec where the main path's specs are written, beside the gate branch from Task 2:

```ts
      } else if (controlAtIndex.has(mi)) {
        const { control, record } = controlAtIndex.get(mi)!
        roomSpecs.set(posKey(r, c), {
          roomType: "encounter" as const,
          family: resolveEncounter(control.encounter, HANDLE_FAMILY).familyId,
          tags: [HANDLE_FAMILY],
          mechanism: record,
        })
```

where `controlAtIndex` is the inverse of `controlIndexById`, built once beside it:

```ts
    const controlAtIndex = new Map(
      controlRecords.map(entry => [controlIndexById.get(entry.control.id)!, entry] as const)
    )
```

`HANDLE_FAMILY` is the `"handle"` constant at `:553`; `leverSpec` at `:811-816` is the shape to copy field for field.

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/game/regionGates.spec.ts`
Expected: PASS.

- [ ] **Step 5: Watch `controlNotSeated` fail**

Author a control whose region is on the route but which this carve gives no free node to (a two-step path with a gate already on it). Confirm the reason comes back naming the control id, and that it is reported AFTER the attempt budget rather than from attempt 0 — add a temporary `console.log` of the attempt number if you need to see it, and remove it. Quote the output.

- [ ] **Step 6: Fingerprint, types, lint, suite, report**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` → `f67c3ea9303b04a1d7c9a558d0561620`
Run: `yarn check-types && yarn eslint src/game/siteAssembler.ts src/game/siteTypes.ts src/game/regionGates.spec.ts && yarn test`

```bash
git commit -m "feat: a control stands in a region and drives the obstacles it names" -- src/game/siteAssembler.ts src/game/siteTypes.ts src/game/regionGates.spec.ts
```

---

### Task 4: The doors a region stands behind

**Files:**
- Modify: `src/game/obstacles.ts`, `src/game/obstacles.spec.ts`, `src/game/siteAssembler.ts`
- Test: `src/game/obstacles.spec.ts`, `src/game/regionGates.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph`, `Obstacle`.
- Produces:
  ```ts
  export const doorsToEnterRegion: (
    layout: RegionGraph,
    obstacles: readonly Obstacle[]
  ) => Map<string, Set<string>>
  ```
  Keyed by region name; the value is the ids of the obstacles a player MUST pass to stand in it.

**Why it is "must pass" and not "is adjacent to":** `doorsToEnter` in the assembler means "the doors between the way in and this cell" (`:1484`). An obstacle bounds a region only if there is no way round it — which is the same remove-one-and-see question `mainPathRegions` already asks, asked of a connection instead of a region.

- [ ] **Step 1: Write the failing test**

Append to `src/game/obstacles.spec.ts`:

```ts
describe("the doors a region stands behind", () => {
  it("names nothing for a region in front of every gate", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["hall", "vault"])])

    expect(doors.get("mouth")).toEqual(new Set())
    expect(doors.get("hall")).toEqual(new Set())
  })

  it("names the gate for the region behind it", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["hall", "vault"])])

    expect(doors.get("vault")).toEqual(new Set(["g1"]))
  })

  it("names every gate on a chain of them, not just the nearest", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["mouth", "hall"]), gate("g2", ["hall", "vault"])])

    expect(doors.get("mouth")).toEqual(new Set())
    expect(doors.get("hall")).toEqual(new Set(["g1"]))
    expect(doors.get("vault")).toEqual(new Set(["g1", "g2"]))
    expect(doors.get("cellar")).toEqual(new Set(["g1"]))
  })

  it("names no gate a player can walk round", () => {
    // mouth—hall—vault and mouth—vault: the hall gate bounds nothing, because vault is reachable
    // without it.
    const ring: RegionGraph = {
      ...layout,
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
        ["mouth", "vault"],
      ],
    }
    const doors = doorsToEnterRegion(ring, [gate("g1", ["hall", "vault"])])

    expect(doors.get("vault")).toEqual(new Set())
  })

  it("gives every declared region an entry, so a caller never has to guess at an absent one", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["hall", "vault"])])

    expect([...doors.keys()].sort()).toEqual(["cellar", "hall", "mouth", "vault"])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/obstacles.spec.ts`
Expected: FAIL — `doorsToEnterRegion is not a function`.

- [ ] **Step 3: Implement it**

In `src/game/obstacles.ts`:

```ts
/**
 * THE OBSTACLES A PLAYER MUST PASS TO STAND IN EACH REGION — not the ones beside it.
 *
 * Asked by taking each obstacle's connection away in turn and seeing which regions the way in can
 * still reach: a region that becomes unreachable is one that obstacle bounds, and a region a player
 * can walk round to is bounded by nothing. That is the same remove-one question `mainPathRegions`
 * asks, asked of a connection instead of a region.
 *
 * Every declared region gets an entry, empty where nothing bounds it, so a caller never has to decide
 * what an absent one means.
 */
export const doorsToEnterRegion = (
  layout: RegionGraph,
  obstacles: readonly Obstacle[]
): Map<string, Set<string>> => {
  const doors = new Map(layout.regions.map(r => [r.name, new Set<string>()]))
  for (const obstacle of obstacles) {
    const without = layout.connections.filter(
      ([a, b]) =>
        connectionKey(a, b) !== connectionKey(obstacle.at.between[0], obstacle.at.between[1])
    )
    const arrived = reachableOver(without, layout.in)
    for (const { name } of layout.regions) if (!arrived.has(name)) doors.get(name)!.add(obstacle.id)
  }
  return doors
}
```

`reachableOver(connections, from)` is a small flood over a connection list. `regions.ts` has a private `reachable` that takes a graph; **do not export it and do not widen it** — a four-line local flood here keeps core's module free of the mod's question. Write it above `doorsToEnterRegion`.

- [ ] **Step 4: Run it**

Run: `yarn vitest run src/game/obstacles.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into the carve**

In `siteAssembler.ts`, where `cellRegion` is populated (`:1569-1583`), register each region-gated cell with `needsDoor` and `gatedCellKeys`:

```ts
    // A CELL IN A GATED REGION STANDS BEHIND EVERY OBSTACLE BOUNDING IT, written into the same map
    // the authored gates and traps use — so a one-way falling into a gated region, a stray tree edge
    // beside one and the fog are all answered by one notion of "what must be earned to stand here".
    const regionDoors = regionLayout ? doorsToEnterRegion(regionLayout, authoredConfig.obstacles ?? []) : undefined
    if (regionDoors)
      for (const [cellKey, region] of cellRegion) {
        for (const id of regionDoors.get(region) ?? []) {
          gatedCellKeys.add(cellKey)
          needsDoor(cellKey, gateKeyOf(id))
        }
      }
```

placed after `cellRegion` is fully populated (main path AND chains, so a chain inside a gated region is gated with it) and before `edgeAllowed` is defined.

- [ ] **Step 6: Assert it against a real floor**

Append to `src/game/regionGates.spec.ts`:

```ts
import type { Direction } from "./siteTypes"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** Every cell of `region` that opens onto a cell outside it, as "r,c". The gate room should be the
 * only one: a gate is a region's only legitimate entrance, so anything else here is a way round it. */
const waysIn = (grid: FloorGrid, region: string): string[] => {
  const found: string[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty" || cell.region !== region) continue
      for (const dir of cell.dirs) {
        const [dr, dc] = MOVES[dir]
        const other = grid.cells[r + dr]?.[c + dc]
        if (!other || other.type === "empty" || other.region === region) continue
        found.push(`${r},${c}`)
        break
      }
    }
  return found
}

describe("what a gated region shuts off", () => {
  it("has exactly one way in, and it is the gate room", () => {
    const grid = carve(gatedFloor())
    const gate = rooms(grid).find(room => room.requiredKeyId === GATE_KEY)!
    const gateAt = grid.cells.flatMap((row, r) => row.map((cell, c) => (cell === gate ? `${r},${c}` : null)))

    expect(waysIn(grid, "vault")).toEqual(gateAt.filter((a): a is string => a !== null))
  })
})
```

**Watch it fail:** comment out the `needsDoor`/`gatedCellKeys` registration from Step 5 and re-run — the vault gains ways in that are not the gate room. Quote the list it prints.

- [ ] **Step 7: Fingerprint, types, lint, suite, report**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` → `f67c3ea9303b04a1d7c9a558d0561620`
Run: `yarn check-types && yarn eslint src/game/obstacles.ts src/game/obstacles.spec.ts src/game/siteAssembler.ts src/game/regionGates.spec.ts && yarn test`

```bash
git commit -m "feat: a cell in a gated region stands behind the obstacles bounding it" -- src/game/obstacles.ts src/game/obstacles.spec.ts src/game/siteAssembler.ts src/game/regionGates.spec.ts
```

---

### Task 5: A rejoin between two cells behind the same doors

**Files:**
- Modify: `src/game/obstacles.ts`, `src/game/obstacles.spec.ts`, `src/game/siteAssembler.ts` (`edgeAllowed`, `:1529-1533`)
- Test: `src/game/obstacles.spec.ts`, `src/game/regionGates.spec.ts`

**Interfaces:**
- Consumes: `standsBehind` (`:1485`), `gatedCellKeys`, Task 4's region door wiring.
- Produces:
  ```ts
  export const crossesNoDoor: (behindA: ReadonlySet<string>, behindB: ReadonlySet<string>) => boolean
  ```

**Why the predicate is EXPORTED and unit-tested rather than tested through the carve:** `edgeAllowed` is a closure over a maze, and from a finished grid a wall the maze never carved is indistinguishable from one this rule dropped — the distinguishing quantity, `passages`, is internal. A test that cannot tell those apart proves nothing. So the rule is a pure two-set question tested directly, and the carve-level test asserts only what a carve CAN show: the gated region is still one connected piece.

**What is wrong today, measured in §5:** `edgeAllowed` drops any unintended edge where either endpoint is gated. Over 200 seeds: 411 ungated rejoin links, **0** sealed. A region layout is all gated regions, so two cells INSIDE one gated region cannot be joined by a leftover maze edge — and the point of a region is that it is ground the player walks freely.

**The rule it should be:** an unintended edge is allowed when both ends stand behind **the same doors**. Crossing it then passes no gate, so it is not a bypass. Today's rule is the special case where both sets are empty.

**THE HAZARD, and it is real:** two sub-sections of one gated parent, neither carrying a gate of its own, have EQUAL non-empty door sets — so this widening can newly allow a rejoin in the SHIPPED world and move the fingerprint. Step 4 measures it. **If it moves, scope the widening to floors that author a `regionLayout`** (the same way region labelling is scoped, `:1549`) and measure again. Do not force it, and do not accept a moved fingerprint.

- [ ] **Step 1: Write the failing test**

Append to `src/game/obstacles.spec.ts`:

```ts
describe("an edge that crosses no door", () => {
  const behind = (...ids: string[]) => new Set(ids)

  it("allows two cells in front of every door", () => {
    expect(crossesNoDoor(behind(), behind())).toBe(true)
  })

  it("allows two cells behind the same one door", () => {
    expect(crossesNoDoor(behind("g1"), behind("g1"))).toBe(true)
  })

  it("allows two cells behind the same two doors, named in either order", () => {
    expect(crossesNoDoor(behind("g1", "g2"), behind("g2", "g1"))).toBe(true)
  })

  it("refuses an edge from open ground into a gated region", () => {
    expect(crossesNoDoor(behind(), behind("g1"))).toBe(false)
    expect(crossesNoDoor(behind("g1"), behind())).toBe(false)
  })

  it("refuses an edge that skips the second of two doors", () => {
    expect(crossesNoDoor(behind("g1"), behind("g1", "g2"))).toBe(false)
  })

  it("refuses an edge between two regions behind different doors, being past one earning nothing toward the other", () => {
    expect(crossesNoDoor(behind("g1"), behind("g2"))).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/obstacles.spec.ts`
Expected: FAIL — `crossesNoDoor is not a function`.

- [ ] **Step 3: Write it, and use it**

In `src/game/obstacles.ts`:

```ts
/**
 * WHETHER STEPPING BETWEEN TWO CELLS PASSES A DOOR — the question `edgeAllowed` asks of a leftover
 * maze edge, which is a bypass only where it SKIPS one.
 *
 * Two cells standing behind the same doors are two cells the player already moves between having
 * earned the same things, so an edge joining them opens nothing that was shut. That is exactly what a
 * region is: ground walked freely. An edge between different sets is still refused, including two
 * DIFFERENT doors — being past one earns nothing toward another.
 */
export const crossesNoDoor = (behindA: ReadonlySet<string>, behindB: ReadonlySet<string>): boolean => {
  if (behindA.size !== behindB.size) return false
  for (const door of behindA) if (!behindB.has(door)) return false
  return true
}
```

In `siteAssembler.ts`:

```ts
    const edgeAllowed = (r: number, c: number, nr: number, nc: number): boolean => {
      if (!passages.has(pkey(r, c, nr, nc))) return false
      if (intendedEdgeKeys.has(pkey(r, c, nr, nc))) return true
      if (!gatedCellKeys.has(posKey(r, c)) && !gatedCellKeys.has(posKey(nr, nc))) return true
      return crossesNoDoor(standsBehind(posKey(r, c)), standsBehind(posKey(nr, nc)))
    }
```

- [ ] **Step 4: MEASURE the fingerprint**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts`

- If `f67c3ea9303b04a1d7c9a558d0561620`: done, continue.
- **If it moved:** this is the hazard above, not a surprise. Scope `sameDoors` to floors authoring a layout — `if (!regionLayout) return false` as its first line — and measure again. Report which floors moved (`git diff --stat src/data/generatedWorld.ts`) either way.

- [ ] **Step 5: Prove the carve still refuses what it should**

Task 4's `waysIn` test already asserts the gated region has exactly one way in, and it must still pass — that is the guard against this widening opening a bypass. Add one more, with TWO gated regions in sequence so the sets differ rather than being empty-vs-full:

```ts
describe("two gated regions in sequence", () => {
  // mouth—hall gated by gA, hall—vault gated by gB: hall stands behind {gA}, vault behind {gA,gB}.
  // Different sets, so no leftover edge may join them.
  it("gives each region exactly one way in, and it is its own gate room", () => {
    const grid = carve(twoGatesFloor())
    expect(waysIn(grid, "hall")).toEqual([cellAt(grid, "obstacle:test-journey#0#0:gA")])
    expect(waysIn(grid, "vault")).toEqual([cellAt(grid, "obstacle:test-journey#0#0:gB")])
  })
})
```

where `cellAt(grid, key)` returns the `"r,c"` of the room wearing that `requiredKeyId`, and `twoGatesFloor()` is `gatedFloor()` with the two-obstacle/one-control shape from Task 3's three-state fixture.

Then break it: make `crossesNoDoor` return `true` unconditionally and confirm BOTH this and Task 4's `waysIn` test go red. Quote them. Put it back.

- [ ] **Step 6: Types, lint, suite, report**

Run: `yarn check-types && yarn eslint src/game/obstacles.ts src/game/obstacles.spec.ts src/game/siteAssembler.ts src/game/regionGates.spec.ts && yarn test`

```bash
git commit -m "fix: a leftover edge between two cells behind the same doors is not a bypass" -- src/game/obstacles.ts src/game/obstacles.spec.ts src/game/siteAssembler.ts src/game/regionGates.spec.ts
```

---

### Task 6: The fog does not come back through a shut gate

**Files:**
- Modify: `src/app/SiteMap/useAssembledFloor.ts` (`applyExplored`)
- Test: `src/app/SiteMap/useAssembledFloor.spec.ts`

**Interfaces:**
- Consumes: the gated floor from Task 2 and `applyExplored(grid, floor, exploredCells)`.
- Produces: no new export.

**What is wrong, and it is falsifiable on a linear floor:** `applyExplored` restores every cell "behind the high-water mark" — the furthest ROOM of each section the save named, measured along this carve (`useAssembledFloor.ts:57-77`). The main path is one section, and a region gate stands on it. A player who walked past the gate and then shut it reloads with **every corridor past the bars lit**, because the mark is one number per section and the gate is not a section boundary. `isSealedWayOut` handles exactly one case of this — a way out a switch shut — and a region gate is not that.

**FIRST, PROVE IT.** This task starts by breaking it on purpose. If you cannot make it go red, **stop and report that**: the fix does not belong in this slice, because a guard nobody watched fail is not a guard.

- [ ] **Step 1: Write the test that should fail and run it**

Assemble the Task 2 gated floor, build an `exploredCells` record naming a room PAST the gate plus the gate room itself, apply it with the gate shut, and assert that no cell whose `region` is `vault` comes back explored except the ones the save names by key.

Run it. **Expected: FAIL, with vault corridors lit.** Quote the failure.

If it PASSES: the mark does not reach past the gate on this floor. Try a longer vault (raise `pathPuzzles`), and a save that names the last room rather than the first. If it still passes, **report "fog restore does not break on a linear region gate; skipping" and move to Task 7** — record it in the carried section instead of building a guard nothing can fail.

- [ ] **Step 2: Fix the smallest thing that makes it pass**

The mark must not carry past a shut boundary. The existing shape to follow is `named`'s `isSealedWayOut` rejection (`:50-55`): a cell that is currently a shut gate stops the mark. Extend the high-water pass so a cell whose `walkPosition` is beyond the nearest shut gate room in its section is not restored — read `isSealedWayOut` and mirror its reasoning rather than inventing a second notion of "shut".

- [ ] **Step 3: Run it**

Expected: PASS. Then break the fix and watch the test go red again. Quote both.

- [ ] **Step 4: Types, lint, suite, report**

Run: `yarn check-types && yarn eslint src/app/SiteMap/useAssembledFloor.ts src/app/SiteMap/useAssembledFloor.spec.ts && yarn test`

```bash
git commit -m "fix: the fog does not come back through a gate that is shut" -- src/app/SiteMap/useAssembledFloor.ts src/app/SiteMap/useAssembledFloor.spec.ts
```

---

### Task 7: Authorable end to end, and it drops when the mod does

**Files:**
- Modify: `src/worldGen/types.ts`, `src/worldGen/dsl.ts`, `src/worldGen/buildSite.ts`, `src/worldGen/serializer.ts`, `src/worldGen/modOwnedAuthoring.ts`, `src/worldGen/spec/dev.ts`
- Test: `src/worldGen/dsl.spec.ts`, `src/worldGen/devJourney.spec.ts`, `src/mods/topology/toggleOff.spec.ts`

**Interfaces:**
- Consumes: Task 1's `Obstacle` and `Control` types.
- Produces: `FloorConstraint.obstacles`/`.controls`, their serializer emitters, and dev pyramid 8.

- [ ] **Step 1: Carry the fields through world generation**

`src/worldGen/types.ts`: add `obstacles?: Obstacle[]` and `controls?: Control[]` to its `FloorConfig`, importing the types from `@/game/obstacles`.

`src/worldGen/dsl.ts`: add both to `FloorConstraint` beside `handles` (`:182`) and `regionLayout` (`:184`), with the same doc-comment style.

`src/worldGen/buildSite.ts`: add both beside `regionLayout` at **every one of the seven places it appears** — `:99`, `:139`, `:284`, `:337`, `:390`, `:480`, `:554`. Grep for `regionLayout` in that file and confirm you have matched every hit; a missed one is a field that silently vanishes on one authoring path.

`src/worldGen/serializer.ts`: add emitters beside `regionLayout` (`:132`):

```ts
  obstacles: v => (v.length ? `obstacles: [${v.map(serializeObject).join(", ")}]` : null),
  controls: v => (v.length ? `controls: [${v.map(serializeObject).join(", ")}]` : null),
```

Check `serializeObject` against a `Control`'s nested `opens` record and an `Obstacle`'s nested `at` — if it does not round-trip them, write the emitter out longhand. **Prove it round-trips** rather than assuming: Step 3 does that.

- [ ] **Step 2: Drop them when the mod is not registered**

In `src/worldGen/modOwnedAuthoring.ts`, in `dropUnownedAuthoring`:

```ts
  // WHOLLY THE TOPOLOGY MOD'S. Unlike a section's gate, which may be core's when it names no owner,
  // an obstacle and a control exist only because the mod does — so both drop together and the regions
  // carve with every connection open, which is this mod's acceptance gate (docs/mods/TARGET.md).
  ...(registeredModIds.has("topology") ? {} : { obstacles: undefined, controls: undefined }),
```

Add to `src/mods/topology/toggleOff.spec.ts`:

```ts
  it("drops obstacles and controls when the topology mod is not registered", () => {
    const dropped = dropUnownedAuthoring(gatedFloor, new Set(["mosaic"]), undefined)

    expect(dropped.obstacles).toBeUndefined()
    expect(dropped.controls).toBeUndefined()
  })

  it("keeps both when it is", () => {
    const kept = dropUnownedAuthoring(gatedFloor, new Set(["topology"]), undefined)

    expect(kept.obstacles).toEqual(gatedFloor.obstacles)
    expect(kept.controls).toEqual(gatedFloor.controls)
  })

  it("carves the identical walls with the mod off", () => {
    const withMod = assembleFloor("dev", gatedFloor, 99)
    const without = assembleFloor("dev", dropUnownedAuthoring(gatedFloor, new Set(), undefined), 99)

    expect(wallsOf(withMod)).toEqual(wallsOf(without))
  })
```

`wallsOf` compares each cell's `dirs` — copy whatever the existing toggle-off tests in that file already use for "the same floor". **The third test is the acceptance gate for this whole slice**: the gate room disappears and nothing else moves. If the walls differ, the gate room's cell was taken from content rather than added to the path, and Task 2 sized the path wrong.

- [ ] **Step 3: The bench — dev pyramid 8**

In `src/worldGen/spec/dev.ts`, after pyramid 7:

```ts
  // 8 — a gate on a connection. A lever in `mouth` opens the door between `hall` and `vault`; thrown
  // the other way it shuts again with the player on either side of it. The first obstacle that is not
  // a section's own entrance — it stands between two REGIONS, which is what a container's boundary is.
  journey(DEV_JOURNEY_ID).pyramid(8, {
    difficulty: "master",
    pathPuzzles: 0,
    sideSections: [sidePath({ puzzles: 0 })],
    regionLayout: {
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
      ],
      in: "mouth",
      out: "vault",
    },
    obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }],
    controls: [
      {
        id: "s1",
        in: "mouth",
        states: ["left", "right"],
        initial: "right",
        returnsToInitial: true,
        opens: { right: ["vaultDoor"] },
      },
    ],
  }),
```

Read the file header first: **this journey authors no reward, and puzzles default to zero.** Keep both.

Add to `src/worldGen/devJourney.spec.ts`, in the style of its existing `regionLayout` and `handles` assertions (`:254`, `:294`), one test asserting pyramid 8's `obstacles` and one asserting its `controls` — the whole arrays, deep-equal.

- [ ] **Step 4: Prove the round trip**

Run: `INCLUDE_DEV=1 yarn validate-world`
Expected: valid, `Stair sweep: 111`, and **`Lock sweep: walked 9 of 8` → it should now read `walked 9 of 9`.** The new floor is a lock, so the sweep must both find it and walk it. If the count did not rise, the floor's lock was not detected — that is a real finding, report it rather than adjusting the expectation.

**NEVER run `INCLUDE_DEV=1 yarn generate-world`.**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` → `f67c3ea9303b04a1d7c9a558d0561620` (the dev journey is not in the default world, so this must not move).

- [ ] **Step 5: Types, lint, suite, report**

Run: `yarn check-types && yarn eslint src/worldGen/types.ts src/worldGen/dsl.ts src/worldGen/buildSite.ts src/worldGen/serializer.ts src/worldGen/modOwnedAuthoring.ts src/worldGen/spec/dev.ts src/worldGen/dsl.spec.ts src/worldGen/devJourney.spec.ts src/mods/topology/toggleOff.spec.ts && yarn test`

```bash
git commit -m "feat: a gate on a connection is authorable, and drops with its mod" -- src/worldGen src/mods/topology/toggleOff.spec.ts
```

---

### Task 8: One mechanism-building path, not two

**Files:**
- Modify: `src/game/siteAssembler.ts`
- Test: `src/game/handleAuthoring.spec.ts`, `src/worldGen/handleAuthoring.spec.ts`

**Interfaces:**
- Consumes: Task 3's control compilation.
- Produces: no authoring change. `FloorConfig.handles` keeps its exact shape and its exact gate key ids.

**Why this task exists:** two paths that both mint mechanisms drift, which is the defect class this branch has spent a week clearing. `handles` is the two-state case of a control, so it should desugar into one rather than compile beside it.

**Why it is LAST, and droppable:** nothing in `doubleBack` needs it, and it is the only task here that can move a gate key id. If the slice runs long, carry it instead — say so plainly rather than half-doing it.

**The hard constraint:** a handle's gate keys stay `handle:<journeyId>#<levelIndex>#<floorIndex>#<n>:<address>` exactly. A handle drives SECTIONS, not connections, so the desugar produces a control whose `opens` names section-shaped obstacle ids; the obstacle those ids denote is the section's own gate, which `withHandleGates` already writes. **Do not route handle gates through the connection path** — they are a different obstacle kind (a gate on a section's entrance) and this slice does not build that kind.

- [ ] **Step 1: Pin the current output first**

Before changing anything, add a test to `src/game/handleAuthoring.spec.ts` asserting the full `MechanismRecord` a handle compiles to today — `states`, `initial`, `returnsToInitial` and every entry of `positions` with its exact `gateKeyId` string. Run it; it must pass against current `main`. This is the thing the refactor must not move.

- [ ] **Step 2: Desugar**

Build the handle's `MechanismRecord` by constructing a `Control` from it (`states: ["left","right"]`, `initial: handle.starts ?? "left"`, `returnsToInitial: true`, `opens: { left: <left's gate keys>, right: <right's> }`) and passing it through Task 3's compile step, rather than pushing `positions` inline at `:763`.

- [ ] **Step 3: Run the pinned test**

Run: `yarn vitest run src/game/handleAuthoring.spec.ts src/worldGen/handleAuthoring.spec.ts`
Expected: PASS, unchanged.

- [ ] **Step 4: Fingerprint, types, lint, suite, report**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` → `f67c3ea9303b04a1d7c9a558d0561620`
Run: `INCLUDE_DEV=1 yarn validate-world` → valid, lock sweep unchanged from Task 7
Run: `yarn check-types && yarn eslint src/game/siteAssembler.ts src/game/handleAuthoring.spec.ts && yarn test`

```bash
git commit -m "refactor: a handle is the two-state case of a control" -- src/game/siteAssembler.ts src/game/handleAuthoring.spec.ts
```

---

### Task 9: The lever is two sprites, and the arm turns

**Files:**
- Modify: `src/app/SiteMap/` — the standing layer that draws props (read `docs/instructions/map-rendering.md` for which layer and which primitive)
- Test: the SiteMap spec covering the standing layer, plus a story

**Interfaces:**
- Consumes: `expert/leverBaseBack`, `expert/leverArm` and `expert/leverBaseFront` tiles (the owner's paint loop; queue entries are in `docs/instructions/repaint-queue.md`), and the control's current state, which `openDoorsFor` already reads off `mechanismStates`.
- Produces: no new export — one sprite becomes three, the middle one carrying a `transform`.

**THE STACKING ORDER IS THE POINT, and it is in depth:** `leverBaseBack`, then `leverArm`, then `leverBaseFront`. At this camera's shear the arm's lower stretch lies inside the mound's painted area, so an arm behind the WHOLE base is hidden there and reads as starting at the dome's crown — a stick balanced on a bell, which is the failure `prim_lever`'s docstring records fighting in its first build. Between the halves, the arm rises out of the mound with the near lip crossing its foot.

**The two halves are one painting.** The base is painted once and imported twice against two masks, so the near and far sides of one mound cannot disagree about light or palette. Do not treat them as two art assets.

**Blocked until the three tiles exist.** If they have not landed when this task comes up, skip it and say so — do not invent placeholder art, and do not fall back to the single-piece `leverLeft`/`leverRight` tiles, which are superseded.

**Why two sprites rather than two painted states:** the lever's angle is a pure function of state the renderer already reads every frame, so a `transform: rotate()` plus a `transition` gives the swing with no new state at all. It also removes a defect the single tiles have: two separately painted states drifted apart in palette (their domes do not match), and one painted arm cannot disagree with itself.

**Why a transform is safe here specifically:** `docs/instructions/map-rendering.md` exists because moving things inside one big `<svg>` invalidated the map — 602 paint events per 5s against 96 for HTML layers. A `transform` on a composited HTML box is the case that measurement argues FOR: it animates without repainting the map. **Do not animate anything but `transform` and `opacity`**, and measure the paint count before and after using the recipe in that document. A regression in that number fails this task.

- [ ] **Step 1: Write the failing test**

Assert that a lever room renders THREE sprites in the depth order above, that the arm's `transform` carries the angle for the control's current state, and that the angle differs between two states. Assert the rotation for EVERY state the control declares, not one of them — a wheel has more than two, and the renderer must not be written for a binary. Assert the stacking order explicitly: a test that only checks three sprites exist would pass with the arm drawn in front of the mound, which is the bug this arrangement exists to prevent.

- [ ] **Step 2: Run it, watch it fail, implement**

The arm sprite is layered between the two halves of the mound, its `transform-origin` is the pivot the scaffold defines (`50% 76.6%`, which sits inside the mound rather than at its crown), and its rotation is the state's angle. All three sprites share one frame to the pixel, so they stack at the same origin with no per-tile offset — if you find yourself computing one, the frame has been lost and the import dropped `--no-trim`. Where the angle comes from is the one design decision this task owns: a binary handle's two sides are ±36°, and an N-state control has no such convention. **Derive it from the control's state list rather than hardcoding two cases** — the states are ordered, so an index into them maps onto the throw. Say in a comment what the mapping is and why.

- [ ] **Step 3: The transition**

`transition: transform <duration> ease` on the arm, nothing else. Respect `prefers-reduced-motion`: the arm still moves to the right angle, it just gets there instantly.

- [ ] **Step 4: Measure the paint count**

Follow the recipe in `docs/instructions/map-rendering.md`. Report the before and after numbers. A rise fails the task.

- [ ] **Step 5: Types, lint, suite, report**

Run: `yarn check-types && yarn eslint <touched paths> && yarn test`

```bash
git commit -m "feat: the lever's arm turns when it is thrown" -- <touched paths>
```

---

## What this slice carries to the next one

- **A branching layout is still refused** — measured, `regionNotSeated`. Only main-path steps seat regions, so `doubleBack` needs the path-SHAPING work as well as this. `obstacleOffRoute` (Task 1) is the refusal that names it from the obstacle's side, and it stops firing on its own when shaping lands.
- **`fitContent` and `mainPathRegions` still have no production caller** — deferred, not dead. Shaping owns reconciling them with the after-the-carve check.
- **A control's mark is still `markFor(n)` by ordinal**, so inserting a control reshuffles glyphs. The obstacle and control now have AUTHORED ids, which is exactly what a mark should be derived from — that is the fix, and it belongs with whoever owns the mark work.
- **`handles` is not dropped by `dropUnownedAuthoring`** — it survives the topology mod leaving the build, which obstacles and controls now do not. Pre-existing; Task 8's desugar does not change it, because the drop is keyed on the field, not the mechanism.
- **A one-way a control reverses, and a flood on a region**, are the two obstacle kinds the vocabulary was shaped for. Both need `opens` to grow from "which stand open" to "what condition each is in", which is the one place this slice deliberately did not build ahead of a second case.
- **Three degenerate layouts nothing refuses** — a self-loop connection, a duplicated connection, an empty-string region name. Unchanged by this slice.
