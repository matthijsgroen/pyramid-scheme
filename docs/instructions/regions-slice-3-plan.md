# Regions in the carve (step 5, slice 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every cell a floor carves knows which region it is in, and content that lands in a region whose appetite forbids it is refused by name.

**Architecture:** A region is a STRETCH of the carve, not an area set aside (`docs/game-design/regions-and-containers.md`). The main path threads the region graph from `in` to `out` and may cross several regions; a side path belongs to the region it grows from. Two pure functions in `src/game/regions.ts` decide the route and the stretches; the assembler labels cells and refuses what cannot be accounted for. No gate is placed — gates are the topology mod's and arrive in slice 4.

**Tech Stack:** TypeScript, vitest. No new dependencies.

**Spec:** `docs/game-design/regions-and-containers.md`, especially "A region is a stretch of the carve, not an area set aside". Slices 1 and 2 are in `src/game/regions.ts` and `FloorConfig.regionLayout`; read both before Task 1.

## Global Constraints

- `yarn check-types` is the truth. IDE diagnostics in this repo have been wrong on every occasion; never trust them, run the command.
- Lint with `yarn eslint <paths>`. **`yarn lint --fix <path>` does NOT scope** — the script is `eslint . --max-warnings 17`, so a path is appended to `.` and it rewrites the whole repo.
- `yarn generate-world` must stay byte-identical at md5 `f67c3ea9303b04a1d7c9a558d0561620`. Only the develop journey authors a layout, and the plain build omits it — so the shipped world must not move at any point in this slice.
- NEVER run `INCLUDE_DEV=1 yarn generate-world`. `yarn validate-world` writes nothing and is safe with the flag.
- `src/game/` is the domain layer: no React, no `src/app/`, no `src/ui/`.
- Comments state CURRENT state and why, never history.
- Tests carry intent in the test NAME and the assertion.
- **Assert every element, not a representative one.** Three times across slices 1 and 2 a test asserted the first item of a collection and a bug in the second would have passed. Where you assert a collection, assert all of it.
- Commit path-scoped (`git commit -- <paths>`), never `git add -A` or `git commit -a`.
- Every refusal must be watched failing before it is trusted.

**WHAT THIS SLICE DOES NOT DO.** It places no gate, grows no path, and moves no wall. A floor that authors a layout carves exactly the floor it carves today — its cells merely know which region they are in, and impossible content is refused. Actively lengthening a path or hanging a side path to satisfy an appetite is a later slice; so are gates, composition, and the three behaviours (`edgeAllowed`'s rejoin rule, `doorsToEnter`, fog restore) that only bite once regions are gated.

---

### Task 1: The route the main path threads

**Files:**
- Modify: `src/game/regions.ts`
- Test: `src/game/regions.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph` and the private `reachable` helper from slice 1.
- Produces: `regionRoute(graph: RegionGraph): string[]` — the regions the main path passes through, `in` first and `out` last.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/game/regions.spec.ts — add regionRoute to the existing import
describe("the route the main path threads", () => {
  it("runs from the way in to the way out along a corridor of regions", () => {
    const g = graph(
      [
        ["in", "middle"],
        ["middle", "out"],
      ],
      ["in", "middle", "out"],
      { in: "in", out: "out" }
    )

    expect(regionRoute(g)).toEqual(["in", "middle", "out"])
  })

  // A pocket is not on the way anywhere: the main path threads the regions it must, and a side path
  // grows into the rest.
  it("leaves out a pocket that hangs off the route", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "pocket"],
      ],
      ["in", "pocket", "out"],
      { in: "in", out: "out" }
    )

    expect(regionRoute(g)).toEqual(["in", "out"])
  })

  // Two ways round, and the route has to pick one. Declaration order decides, so the same layout
  // always threads the same way.
  it("takes the earlier-declared branch when a fork rejoins, so the route is deterministic", () => {
    const g = graph(
      [
        ["in", "left"],
        ["in", "right"],
        ["left", "out"],
        ["right", "out"],
      ],
      ["in", "left", "right", "out"],
      { in: "in", out: "out" }
    )

    expect(regionRoute(g)).toEqual(["in", "left", "out"])
  })

  it("is the one region twice over where the way in is also the way out", () => {
    const g = graph([], ["only"], { in: "only", out: "only" })

    expect(regionRoute(g)).toEqual(["only"])
  })

  it("has no route at all where the way out cannot be reached", () => {
    const g = graph([["in", "stub"]], ["in", "stub", "out"], { in: "in", out: "out" })

    expect(regionRoute(g)).toEqual([])
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `yarn vitest run src/game/regions.spec.ts -t "the route the main path threads"`
Expected: FAIL — `regionRoute` is not exported.

- [ ] **Step 3: Write it**

```ts
// append to src/game/regions.ts

/**
 * THE REGIONS THE MAIN PATH PASSES THROUGH, in order, from the way in to the way out.
 *
 * A region is a stretch of the carve rather than an area set aside, so the main path crosses several
 * of them and a side path grows into whatever the route does not touch
 * (docs/game-design/regions-and-containers.md).
 *
 * The shortest route is taken, which necessarily includes every region the way out cannot be reached
 * without — the same regions `mainPathRegions` names. Where two routes are equally short, the one
 * whose regions were DECLARED first wins, so one layout always threads the same way and a floor does
 * not reshuffle because a seed changed.
 *
 * Empty when the way out cannot be reached at all; `strandedRegions` is what reports that as a fault.
 */
export const regionRoute = (graph: RegionGraph): string[] => {
  if (graph.in === graph.out) return reachable(graph, graph.in).has(graph.out) ? [graph.in] : []
  const order = new Map(graph.regions.map((r, i) => [r.name, i]))
  const neighbours = new Map<string, string[]>()
  for (const [a, b] of graph.connections) {
    if (!neighbours.has(a)) neighbours.set(a, [])
    if (!neighbours.has(b)) neighbours.set(b, [])
    neighbours.get(a)!.push(b)
    neighbours.get(b)!.push(a)
  }
  const cameFrom = new Map<string, string>()
  const seen = new Set([graph.in])
  const queue = [graph.in]
  while (queue.length > 0) {
    const at = queue.shift()!
    if (at === graph.out) break
    // Declaration order among equally short routes, so the same layout always threads the same way.
    for (const next of [...(neighbours.get(at) ?? [])].sort((x, y) => (order.get(x) ?? 0) - (order.get(y) ?? 0))) {
      if (seen.has(next)) continue
      seen.add(next)
      cameFrom.set(next, at)
      queue.push(next)
    }
  }
  if (!seen.has(graph.out)) return []
  const route = [graph.out]
  while (route[0] !== graph.in) route.unshift(cameFrom.get(route[0])!)
  return route
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `yarn vitest run src/game/regions.spec.ts`
Expected: PASS — the existing cases plus five new ones.

- [ ] **Step 5: Prove the tie-break is real**

Reverse the sort comparator (`(y, x)` instead of `(x, y)`) and re-run. Expected: the rejoining-fork test flips to `["in", "right", "out"]` and fails. Restore. Quote what you saw — a determinism rule nobody watched decide is not a rule.

- [ ] **Step 6: Commit**

```bash
yarn eslint src/game/regions.ts src/game/regions.spec.ts
yarn check-types
git commit -- src/game/regions.ts src/game/regions.spec.ts -m "feat: the main path threads the regions between the way in and the way out"
```

---

### Task 2: Which stretch of the path is which region

**Files:**
- Modify: `src/game/regions.ts`
- Test: `src/game/regions.spec.ts`

**Interfaces:**
- Consumes: `regionRoute` from Task 1.
- Produces: `regionOfStep(route: readonly string[], steps: number): string[]` — the region each step of the main path belongs to, one entry per step.

**The rule:** the steps are dealt evenly across the route's regions in order, and where they do not divide evenly the EARLIER regions take the extra. A route longer than the path gets as many regions as there are steps, in order — the tail of the route is then not on the main path at all, which is a fault the assembler reports in Task 4, not something this function decides.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/game/regions.spec.ts — add regionOfStep to the existing import
describe("which stretch of the main path is which region", () => {
  it("deals the steps evenly when they divide", () => {
    expect(regionOfStep(["a", "b"], 4)).toEqual(["a", "a", "b", "b"])
  })

  it("gives the extra step to the earlier region when they do not divide", () => {
    expect(regionOfStep(["a", "b"], 5)).toEqual(["a", "a", "a", "b", "b"])
  })

  it("spreads the remainder one each from the front, not all onto the first", () => {
    expect(regionOfStep(["a", "b", "c"], 5)).toEqual(["a", "a", "b", "b", "c"])
  })

  it("puts every step in the one region of a one-region route", () => {
    expect(regionOfStep(["only"], 3)).toEqual(["only", "only", "only"])
  })

  it("runs out of steps before the route ends, giving each step a region and no more", () => {
    expect(regionOfStep(["a", "b", "c"], 2)).toEqual(["a", "b"])
  })

  it("has nothing to deal where the route is empty", () => {
    expect(regionOfStep([], 3)).toEqual([])
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `yarn vitest run src/game/regions.spec.ts -t "which stretch of the main path"`
Expected: FAIL — `regionOfStep` is not exported.

- [ ] **Step 3: Write it**

```ts
// append to src/game/regions.ts

/**
 * WHICH REGION EACH STEP OF THE MAIN PATH STANDS IN, one entry per step.
 *
 * The steps are dealt evenly along the route, and where they do not divide the earlier regions take
 * the extra one each from the front rather than the first region taking all of it — so a long region
 * followed by a short one is something the author asked for, never an artefact of the division.
 *
 * A route with more regions than the path has steps gets as many as there are steps. That the tail of
 * the route never reaches the main path is a fault, but it is the assembler's to report against a real
 * floor, not this function's to decide.
 */
export const regionOfStep = (route: readonly string[], steps: number): string[] => {
  if (route.length === 0 || steps <= 0) return []
  if (route.length >= steps) return route.slice(0, steps)
  const each = Math.floor(steps / route.length)
  const extra = steps % route.length
  return route.flatMap((name, i) => Array<string>(each + (i < extra ? 1 : 0)).fill(name))
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `yarn vitest run src/game/regions.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn eslint src/game/regions.ts src/game/regions.spec.ts
yarn check-types
git commit -- src/game/regions.ts src/game/regions.spec.ts -m "feat: the steps of the main path are dealt along the route it threads"
```

---

### Task 3: Every carved cell knows its region

**Files:**
- Modify: `src/game/siteTypes.ts` (RoomCell and CorridorCell), `src/game/siteAssembler.ts`
- Test: `src/game/regionCarve.spec.ts` (create)

**Interfaces:**
- Consumes: `regionRoute`, `regionOfStep`, `FloorConfig.regionLayout`.
- Produces: `region?: string` on carved cells.

**Where it goes:** beside `sectionAddress` on both cell types, and filled in the assembler where `cellSectionAddress` is filled. A main-path cell takes its region from its step; a section's cells take the region of the cell the section attaches to, so a side path belongs to the region it grows from.

**A floor with no `regionLayout` labels nothing** — the field stays `undefined` on every cell, which is what keeps the shipped world byte-identical.

- [ ] **Step 1: Add the field**

In `src/game/siteTypes.ts`, beside `sectionAddress` on BOTH `RoomCell` and `CorridorCell`:

```ts
  /** Which region of the floor's authored layout this cell stands in, where the floor authors one
   * (FloorConfig.regionLayout). A region is a stretch of the carve: the main path crosses several, and
   * a side path belongs to the region it grows from. Absent on a floor that authors no layout. */
  region?: string
```

- [ ] **Step 2: Write the failing test**

```ts
// src/game/regionCarve.spec.ts
import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, GridCell } from "./siteTypes"

const SEED = 99

const threeRegions = {
  regions: [
    { name: "mouth", appetite: "nothing" as const },
    { name: "hall", appetite: "puzzles" as const },
    { name: "vault", appetite: "reward" as const },
  ],
  connections: [
    ["mouth", "hall"] as const,
    ["hall", "vault"] as const,
  ],
  in: "mouth",
  out: "vault",
}

const floor = (regionLayout?: FloorConfig["regionLayout"]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  regionLayout,
})

const carvedCells = (config: FloorConfig): GridCell[] => {
  const result = assembleFloor("test-journey", config, SEED)
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid.cells.flat().filter(cell => cell.type === "room" || cell.type === "corridor")
}

describe("a carved cell knows its region", () => {
  it("labels every carved cell when the floor authors a layout", () => {
    const unlabelled = carvedCells(floor(threeRegions)).filter(cell => cell.region === undefined)

    expect(unlabelled).toEqual([])
  })

  it("uses every region of the route and none that is not on it", () => {
    const used = new Set(carvedCells(floor(threeRegions)).map(cell => cell.region))

    expect([...used].sort()).toEqual(["hall", "mouth", "vault"])
  })

  it("labels nothing at all when the floor authors no layout", () => {
    const labelled = carvedCells(floor(undefined)).filter(cell => cell.region !== undefined)

    expect(labelled).toEqual([])
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `yarn vitest run src/game/regionCarve.spec.ts`
Expected: the first two FAIL (every cell's `region` is undefined); the third PASSES.

- [ ] **Step 4: Label the cells**

In `src/game/siteAssembler.ts`, import `regionRoute` and `regionOfStep` from `./regions`, then:

**(a)** near where `mainPathIndexByKey` is built, deal the main path's steps:

```ts
// A region is a stretch of the carve, so the main path's steps are dealt along the route it threads
// and a side path takes the region of the cell it grows from.
const authoredRegions = authoredConfig.regionLayout
const stepRegion = authoredRegions ? regionOfStep(regionRoute(authoredRegions), mainPath.length) : []
const cellRegion = new Map<string, string>()
mainPath.forEach(([r, c], step) => {
  const region = stepRegion[step]
  if (region !== undefined) cellRegion.set(posKey(r, c), region)
})
```

**(b)** where the chains are walked (the same loop that fills `cellSectionAddress` for a chain's cells), give every cell of a chain the region of the cell it attaches to:

```ts
const grownFrom = cellRegion.get(posKey(chain.attachedAt[0], chain.attachedAt[1]))
if (grownFrom !== undefined) for (const [r, c] of chain.cells) cellRegion.set(posKey(r, c), grownFrom)
```

**(c)** at the one place a cell is built — beside `const sectionAddress = cellSectionAddress.get(cellKey) ?? MAIN_SECTION_ADDRESS` — read it:

```ts
const region = cellRegion.get(cellKey)
```

and add `...(region !== undefined ? { region } : {}),` to BOTH the `RoomCell` and the `CorridorCell` object literals built there. Unlike `sectionAddress` there is no default: a floor that authors no layout leaves every cell's `region` absent, which is what keeps the shipped world byte-identical.

- [ ] **Step 5: Run it and watch it pass**

Run: `yarn vitest run src/game/regionCarve.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: The world must not move**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` — expect `f67c3ea9303b04a1d7c9a558d0561620` and a clean `git status` for it.
Run: `yarn test` — expect the full suite green.

- [ ] **Step 7: Commit**

```bash
yarn eslint src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts
yarn check-types
git commit -- src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts -m "feat: a carved cell knows the region it stands in"
```

---

### Task 4: Content in a region that will not take it is refused

**Files:**
- Modify: `src/game/siteTypes.ts` (AssemblerReason), `src/game/siteAssembler.ts`
- Test: `src/game/regionCarve.spec.ts`

**Interfaces:**
- Consumes: the `region` labelling from Task 3, `appetiteAccepts` from slice 1.
- Produces: one `AssemblerReason` member and the check that raises it.

**The rule:** a room that holds content must stand in a region whose appetite takes that kind. A puzzle room in a `nothing` region is refused; so is a reward in a region that takes puzzles. An EMPTY region is never a fault — an appetite says what a region will take, not what it must contain.

- [ ] **Step 1: Add the reason**

In `AssemblerReason`:

```ts
  /** A room stands in a region whose appetite does not take what it holds — a puzzle where the layout
   * promised nothing, a reward where it asked for puzzles. The floor's content and its layout disagree,
   * and which is wrong is the author's to say. See FloorConfig.regionLayout. */
  | { type: "regionWillNotTake"; region: string; kind: ContentKind }
```

Import `ContentKind` from `./regions` if it is not already imported there.

- [ ] **Step 2: Write the failing test**

```ts
// append to src/game/regionCarve.spec.ts
describe("content a region will not take", () => {
  // `nothing` is a promise the region stays empty, so a puzzle standing in one is the floor and its
  // layout disagreeing — and the builder says so rather than quietly moving the puzzle.
  it("refuses a puzzle standing where the layout promised nothing", () => {
    const everywhereEmpty = {
      regions: [
        { name: "mouth", appetite: "nothing" as const },
        { name: "vault", appetite: "nothing" as const },
      ],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }
    const result = assembleFloor("test-journey", floor(everywhereEmpty), SEED)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.reasons).toContainEqual({
      type: "regionWillNotTake",
      region: expect.any(String),
      kind: "puzzle",
    })
  })

  it("carves a floor whose puzzles stand where the layout takes puzzles", () => {
    expect(assembleFloor("test-journey", floor(threeRegions), SEED).success).toBe(true)
  })

  // An appetite says what a region WILL take, never what it must hold.
  it("does not mind a region that takes puzzles standing empty", () => {
    const roomyLayout = {
      regions: [
        { name: "mouth", appetite: "puzzles" as const },
        { name: "hall", appetite: "puzzles" as const },
        { name: "vault", appetite: "puzzles" as const },
      ],
      connections: [
        ["mouth", "hall"] as const,
        ["hall", "vault"] as const,
      ],
      in: "mouth",
      out: "vault",
    }
    const bare: FloorConfig = { ...floor(roomyLayout), pathPuzzles: 0, sideSections: [] }

    expect(assembleFloor("test-journey", bare, SEED).success).toBe(true)
  })
})
```

- [ ] **Step 3: Run them and watch them fail**

Run: `yarn vitest run src/game/regionCarve.spec.ts -t "content a region will not take"`
Expected: the first FAILS (the floor carves instead of refusing); the other two PASS.

- [ ] **Step 4: Write the check**

After the cells are built and before the grid is returned:

```ts
// WHAT A ROOM HOLDS AGAINST WHAT ITS REGION WILL TAKE. A room is content by what is in it, not by
// where it sits: `encounter` is the room a player does something in, and a reward is a reward
// wherever it lands. Reported per region and kind rather than per room — five puzzles standing in one
// region that promised nothing is one disagreement between the floor and its layout, not five.
if (authoredRegions) {
  const appetiteOf = new Map(authoredRegions.regions.map(r => [r.name, r.appetite]))
  const willNotTake = new Map<string, { region: string; kind: ContentKind }>()
  for (const row of cells2D)
    for (const cell of row) {
      if (cell.type !== "room" || cell.region === undefined) continue
      const appetite = appetiteOf.get(cell.region)
      if (appetite === undefined) continue
      const holds: ContentKind[] = []
      if (cell.roomType === "encounter") holds.push("puzzle")
      if (cell.reward !== undefined) holds.push("reward")
      for (const kind of holds)
        if (!appetiteAccepts(appetite, kind)) willNotTake.set(`${cell.region}|${kind}`, { region: cell.region, kind })
    }
  if (willNotTake.size > 0)
    return {
      success: false,
      reasons: [...willNotTake.values()].map(({ region, kind }) => ({ type: "regionWillNotTake" as const, region, kind })),
    }
}
```

`appetiteAccepts` and `ContentKind` come from `./regions`. Note this names EVERY disagreement, matching the region-authoring checks in this same file rather than returning on the first.

- [ ] **Step 5: Run them and watch them pass**

Run: `yarn vitest run src/game/regionCarve.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Prove the refusal is not vacuous**

Change the check to collect nothing (`continue` where it pushes), re-run, and confirm the first test of this describe block goes red. Restore. Quote the verbatim failure.

- [ ] **Step 7: The world, the dev bench, and the full suite**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` — expect `f67c3ea9303b04a1d7c9a558d0561620`, `git status` clean for it.
Run: `INCLUDE_DEV=1 yarn validate-world` — expect `✓ World spec valid`, `Stair sweep: 111 …`, `Lock sweep: walked 8 of 8`. **The develop journey's pyramid 1 authors a layout with a `puzzles` region and a `reward` region while authoring no puzzles and no loot, so it must pass this check by standing empty.** If it refuses, the check is treating an empty region as a fault and that is the bug.
Run: `yarn test` — expect the full suite green.

- [ ] **Step 8: Commit**

```bash
yarn eslint src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts
yarn check-types
git commit -- src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts -m "feat: content standing in a region that will not take it is refused by name"
```

---

## Carried to the slice after this one

- **The builder does not yet GROW anything.** The spec's "a path may be lengthened, may gain side paths, may take puzzles or a chest, however the site builder sees fit" is not built: this slice labels what the carve already produces and refuses what disagrees. Actively shaping a floor to satisfy an appetite is the next step, and it is what makes a region more than a label.
- **Gates, and the three behaviours that come with them** — `edgeAllowed`'s rejoin rule, `doorsToEnter`, fog restore. All three bite only once a connection carries a gate.
- **The degenerate layouts from slice 2's review** — a self-loop connection, a duplicated connection, an empty-string region name. A carve gives them meaning, so it can decide them on evidence.
