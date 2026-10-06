# One-Way Edges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An author names two of a floor's sections and gets a passage between them the player can fall down but not climb back up.

**Architecture:** A one-way is a grid edge written in one direction only. Every mover already honours that for free — `reachableFrom`, `findPath`, `walkableFrom` and `completeCell` all step on the **source** cell's `dirs` and none check the target for a reciprocal entry — so no traversal code changes. What the work is: authoring the demand, satisfying it in the carve (two sections must end up with node cells two apart, which is a constraint on the attempt exactly as `forks` is), reading it back out for the walk, and making it legible in the ascii view the specs read.

**Tech Stack:** TypeScript, Vitest (co-located `*.spec.ts`), `src/game/` and `src/worldGen/` domain layers, the world-gen DSL.

**Spec:** `docs/mods/floor-topology-design.md` — "One-ways", and the P2 row of the primitive table. The sequencing and what this step deliberately leaves to the next one is in `docs/authored-locks-roadmap.md`.

## Global Constraints

- **This lands on the develop-only journey, never on an authored pyramid.** Until the drawing step (roadmap step 2), a one-way's mouth draws as an ordinary open corridor from below — a passage the player can see and cannot take. `src/data/generatedWorld.ts` must come out byte-identical through Tasks 1-4; Task 5 authors the dev journey, which is built only under `INCLUDE_DEV=1` and is not in that file.
- `src/game/` and `src/worldGen/` are the pure domain layer: no React, no DOM, no i18n, no imports from `src/app`, `src/ui` or `src/mods/<name>/`.
- Comments state current behaviour and why — never history, never narration of the work, and **never the `§` character** (a betterer guard at zero backlog fails the build on one in a comment under `src/**`).
- Commit subject line only, `type: what changed`, ≤72 chars, then a blank line and the two attribution lines this repository's sessions use.
- No CHANGELOG entry: nothing here is player-visible until a shipped floor authors a drop.
- Per task: `yarn test <path>`, `yarn check-types`. The controlling session runs `yarn test`, `yarn lint`, `yarn betterer`, `yarn generate-world` and `yarn validate-world`.
- **Every test must be able to go red.** Where a task asserts a passage exists, it also asserts the reverse step does not. A one-way whose test would pass on a two-way corridor is the defect this branch has shipped four times.

---

## File Structure

| File                              | Responsibility                                                      |
| --------------------------------- | ------------------------------------------------------------------- |
| `src/game/gridNavigation.ts`      | `renderAscii` draws a one-dir cell as the arrow it is               |
| `src/game/siteTypes.ts`           | `FloorConfig.oneWays` — the authored demand                         |
| `src/worldGen/types.ts`, `dsl.ts` | the same field reaching a built floor config                        |
| `src/worldGen/buildSite.ts`       | carries it through every branch that builds a floor                 |
| `src/worldGen/serializer.ts`      | emits it — `floorFieldEmitters` is exhaustive over `FloorConfig`    |
| `src/game/siteAssembler.ts`       | satisfies the demand in the carve, or rejects the attempt           |
| `src/game/floorLock.ts`           | reports directed edges as `LockSpec.oneWays`, so the walk sees them |
| `src/worldGen/spec/dev.ts`        | the develop-only floor that stands one                              |

---

### Task 1: A one-way reads as an arrow in the ascii view

**Files:**

- Modify: `src/game/gridNavigation.ts`
- Test: `src/game/gridNavigation.spec.ts`

**Interfaces:**

- Produces: nothing new is exported. `renderAscii(grid)` gains a branch: a corridor cell whose `dirs` holds exactly one direction draws `↑ ↓ → ←` pointing the way you may travel, instead of falling through to `·`.

Every later task in this plan reads its result out of `renderAscii`, and today a single-dir cell is indistinguishable from a dead end. This goes first so the rest of the plan has eyes.

- [ ] **Step 1: Write the failing test**

Add to `src/game/gridNavigation.spec.ts`:

```ts
import { renderAscii } from "./gridNavigation"
import type { FloorGrid, GridCell } from "./siteTypes"

const corridor = (dirs: string[]): GridCell =>
  ({ type: "corridor", dirs: new Set(dirs), state: "visible" }) as unknown as GridCell

const empty = (): GridCell => ({ type: "empty" }) as unknown as GridCell

const gridOf = (cells: GridCell[][]): FloorGrid =>
  ({ rows: cells.length, cols: cells[0].length, cells, entrancePos: [0, 0], exitPos: [0, 0] }) as unknown as FloorGrid

describe("renderAscii", () => {
  it("draws a cell you may only leave one way as the arrow it is", () => {
    const drawn = renderAscii(gridOf([[corridor(["s"]), corridor(["n"]), corridor(["e"]), corridor(["w"])]]))
    expect(drawn.trim()).toBe("↓↑→←")
  })

  it("still draws an ordinary corridor as a line, not an arrow", () => {
    const drawn = renderAscii(gridOf([[corridor(["e", "w"]), empty(), corridor(["n", "s"])]]))
    expect(drawn).not.toContain("→")
    expect(drawn).not.toContain("↓")
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/gridNavigation.spec.ts -t renderAscii`
Expected: FAIL — the one-dir cells draw `····`, because no branch matches and the function falls through to `·` (`gridNavigation.ts`, the `line += "·"` at the end of the corridor branch).

- [ ] **Step 3: Implement**

In `renderAscii`'s corridor branch in `src/game/gridNavigation.ts`, before the final `line += "·"` fallthrough:

```ts
// A cell with one way out is a one-way's far side: you may leave it only in the direction it
// names, and the arrow says which. Without this it draws as an anonymous dot and a spec
// reading the map cannot tell a drop from a dead end.
if (d.size === 1) {
  const [only] = d
  line += only === "n" ? "↑" : only === "s" ? "↓" : only === "e" ? "→" : "←"
  continue
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/game/gridNavigation.spec.ts`
Expected: PASS, including every test that was already there — several specs read `renderAscii` output, and a dead-end corridor that previously drew `·` now draws an arrow. **If an existing spec breaks, do not edit its expectation until you have checked whether the cell it is describing is genuinely a one-dir cell.** If it is, the new glyph is more truthful and the expectation should change; say so in your report with the spec named.

- [ ] **Step 5: Types and commit**

```bash
yarn check-types
git add src/game/gridNavigation.ts src/game/gridNavigation.spec.ts
git commit -m "feat: a cell with one way out draws as the arrow it is"
```

---

### Task 2: A floor authors the drops it wants

**Files:**

- Modify: `src/game/siteTypes.ts`, `src/worldGen/types.ts`, `src/worldGen/dsl.ts`
- Test: `src/worldGen/oneWayAuthoring.spec.ts` (create)

**Interfaces:**

- Produces: `FloorConfig.oneWays?: { from: string; to: string }[]` on both the game-side and world-gen-side `FloorConfig`, carrying **section addresses** — a `label` where a section has one, the positional `s0` / `s1.2` where it does not (`sectionAddresses` in `src/game/siteAssembler.ts:160`). `"main"` names the main path.

Nothing carves yet. This task proves the field survives the DSL's cascade into a built floor config, which is the same thing `src/worldGen/switchAuthoring.spec.ts` proves for `forks` and `switches`.

- [ ] **Step 1: Write the failing test**

Create `src/worldGen/oneWayAuthoring.spec.ts`. Model it on `src/worldGen/switchAuthoring.spec.ts`'s first test, which resolves a journey-pyramid rule with a chained `.floor()` and reads the built config back — copy that file's `specRules`/`builtFloors` shape, changing the authored fields:

```ts
import { describe, expect, it } from "vitest"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { resolvePyramidConstraint } from "./constraintResolver"
import { buildSite } from "./buildSite"

const JOURNEY = "spec_oneway_journey"
const TIER = "junior"

const specRules: Rule[] = [
  journey(JOURNEY)
    .pyramid(2, { difficulty: TIER })
    .floor(0, {
      pathPuzzles: 2,
      sideSections: [sidePath({ puzzles: 1, label: "upper" }), sidePath({ puzzles: 1, label: "lower" })],
      oneWays: [{ from: "upper", to: "lower" }],
    }),
]

const builtFloors = () =>
  buildSite({
    journeyId: JOURNEY,
    tier: TIER,
    pyramidIndex: 1,
    levelCount: 4,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(specRules, JOURNEY, TIER, 1, 4),
    difficulty: TIER,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

describe("one-ways authored in the DSL", () => {
  it("reach the built floor config as the rule wrote them", () => {
    expect(builtFloors()[0].oneWays).toEqual([{ from: "upper", to: "lower" }])
  })

  it("name sections by the label they were authored with", () => {
    const labels = builtFloors()[0].sideSections.map(section => section.label)
    expect(labels).toEqual(["upper", "lower"])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/worldGen/oneWayAuthoring.spec.ts`
Expected: FAIL — `oneWays` is not a field, so it is a type error and the value never reaches the built config.

- [ ] **Step 3: Implement**

Add to `FloorConfig` in `src/game/siteTypes.ts`, beside `forks`:

```ts
  /** WHAT THE CARVE MUST PROVIDE: a passage from one named section to another that the player may
   * take only in that direction. Both ends name a section address — a `label` where a section has
   * one, the positional `s0`/`s1.2` where it does not, and `main` for the main path.
   *
   * Structural, like `forks`: the two sections have to come out of the carve with node cells two
   * apart, so an attempt that cannot place one is re-carved and a floor no attempt can satisfy fails
   * rather than losing the passage quietly. Where a drop lands is a design decision, which is why it
   * is authored rather than found — see docs/mods/floor-topology-design.md. */
  oneWays?: { from: string; to: string }[]
```

Mirror it in `src/worldGen/types.ts`'s `FloorConfig` (the looser world-gen copy), and pass it through `src/worldGen/dsl.ts` wherever `forks` is passed through — `forks` appears there at two points and `oneWays` belongs beside both. If `PathOpts` does not already accept `label`, add it there too so `sidePath({ label })` type-checks.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/worldGen/oneWayAuthoring.spec.ts src/worldGen/switchAuthoring.spec.ts src/worldGen/dsl.spec.ts`
Expected: PASS.

- [ ] **Step 5: Prove nothing moved, then commit**

Run: `yarn check-types`
Expected: clean. A new optional field that nothing reads cannot change a carve; if `git status` shows `src/data/generatedWorld.ts` modified at any point in this task, stop and report.

```bash
git add src/game/siteTypes.ts src/worldGen/types.ts src/worldGen/dsl.ts src/worldGen/oneWayAuthoring.spec.ts
git commit -m "feat: a floor authors the one-way drops it wants"
```

---

### Task 3: The carve places the drop, or refuses the attempt

**Files:**

- Modify: `src/game/siteAssembler.ts`
- Test: `src/game/oneWayCarve.spec.ts` (create)

**Interfaces:**

- Consumes: `FloorConfig.oneWays` from Task 2.
- Produces: an assembled floor whose `from` section holds a node cell with a `dirs` entry toward a connector, the connector holding only that same onward direction, and the `to` section's node holding **no** entry back. Plus a new `AssemblerReason` variant `{ type: "oneWayUnsatisfied"; from: string; to: string }` in `src/game/siteTypes.ts`, returned when the attempts run out.

**How the grid is shaped, because it decides the whole task:** nodes sit **two cells apart**, with a connector corridor cell between them (`siteAssembler.ts` materialises this at 1688-1795; `closeWaysOut` at 2033 reads a neighbour node at `neighborKey` and the switch's own `exits` walk `dr * 2`). So "adjacent sections" means a node of `from` and a node of `to` exactly two apart on one axis, with the cell between them currently `empty`. The passage is written as: `from`'s node gains the direction toward the connector; the connector gains **only** the onward direction; `to`'s node gains nothing.

That asymmetry is the whole feature. The connector carrying only the forward direction is what stops a player who is standing in it from walking back, and `to`'s node carrying nothing is what stops them entering from below.

- [ ] **Step 1: Write the failing test**

Create `src/game/oneWayCarve.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"

const floorWithDrop = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
  ],
  oneWays: [{ from: "upper", to: "lower" }],
})

// Which cells a carve offers is the seed's choice, so seeds are tried until one satisfies the
// authored drop — and running out is a throw, never a silent skip.
const assembled = (config: FloorConfig): FloorGrid => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("spec:1", config, seed, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success) return result.grid
  }
  throw new Error("no seed carved the authored drop")
}

const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<string, string> = { n: "s", s: "n", e: "w", w: "e" }

/** Every cell pair the grid joins in one direction and not the other. */
const oneWayEdges = (grid: FloorGrid) => {
  const found: { from: [number, number]; to: [number, number]; dir: string }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      for (const dir of cell.dirs) {
        const [dr, dc] = MOVES[dir as string]
        const target = grid.cells[r + dr]?.[c + dc]
        if (!target || target.type === "empty") continue
        if (!target.dirs.has(OPPOSITE[dir as string]))
          found.push({ from: [r, c], to: [r + dr, c + dc], dir: dir as string })
      }
    }
  return found
}

describe("a floor that authors a one-way", () => {
  it("carves a passage that is open one way and shut the other", () => {
    const edges = oneWayEdges(assembled(floorWithDrop()))
    expect(edges.length).toBeGreaterThan(0)
  })

  it("leaves the section the drop lands in with no way back up it", () => {
    const grid = assembled(floorWithDrop())
    for (const edge of oneWayEdges(grid)) {
      const target = grid.cells[edge.to[0]][edge.to[1]]
      expect(target.dirs.has(OPPOSITE[edge.dir])).toBe(false)
    }
  })

  it("joins the two sections the author named, and no others", () => {
    const grid = assembled(floorWithDrop())
    const addressAt = ([r, c]: [number, number]) => {
      const cell = grid.cells[r][c]
      return cell.type === "empty" ? undefined : cell.sectionAddress
    }
    // The drop leaves a cell of `upper` and, one connector later, arrives in `lower`.
    const spans = oneWayEdges(grid).map(edge => [addressAt(edge.from), addressAt(edge.to)])
    expect(spans.some(([from]) => from === "upper")).toBe(true)
  })

  it("carves an ordinary floor with no one-way in it at all", () => {
    const plain = { ...floorWithDrop(), oneWays: undefined }
    expect(oneWayEdges(assembled(plain))).toEqual([])
  })

  it("fails by name when a drop names a section the floor does not have", () => {
    // A misnamed end is an authoring slip, not a seed problem: no attempt could ever satisfy it, so
    // it is refused once rather than re-carved sixty times.
    const misnamed: FloorConfig = { ...floorWithDrop(), oneWays: [{ from: "upper", to: "nowhere" }] }
    const result = assembleFloor("spec:1", misnamed, 1, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
  })

  it("fails by name when no attempt can place the drop", () => {
    // Both ends exist, but a floor with nothing on it gives the carve no two sections to hold two
    // cells apart — so every attempt is rejected and the floor says which drop it could not place.
    const cramped: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", label: "only" }],
      oneWays: [{ from: "only", to: "main" }],
    }
    const result = assembleFloor("spec:1", cramped, 1, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    // If this floor DOES carve, the drop was placeable after all — say so rather than asserting a
    // failure the carve is entitled to avoid.
    if (result.success) {
      expect(result.grid.cells.flat().some(cell => cell.type !== "empty" && cell.dirs.size === 1)).toBe(true)
      return
    }
    expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
  })
})
```

The "no one-way at all" test is the one that keeps the others honest: it asserts that a floor authoring nothing grows no one-way, so a bug that made _every_ corridor directed would go red rather than making the first three pass harder.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/oneWayCarve.spec.ts`
Expected: FAIL — nothing reads `oneWays`, so no directed edge exists and the first test finds none.

- [ ] **Step 3: Implement**

Three changes in `src/game/siteAssembler.ts`, at the places the carve already does the analogous thing for `forks`:

1. **Before the retry loop** (beside the config-derived checks at 492-554): an authored `from`/`to` naming a section address the floor does not have is an authoring error, not a seed problem — return `{ success: false, reasons: [{ type: "oneWayUnsatisfied", from, to }] }` straight away. `sectionAddresses(config)` at :492 already computes every address the floor has; `"main"` is `MAIN_SECTION_ADDRESS` (:140).
2. **Inside the loop, after sections and sub-sections are placed and before the grid is materialised** (the fork demand does its equivalent at 1637-1686): for each authored one-way, look through the node cells of `from` and of `to` — `cellSectionAddress` (:1157, filled at :1245/:1268/:1289) maps a cell to its address — for a pair two apart on one axis whose middle cell is empty. Take the first such pair in a deterministic order (sort the candidates by row then column, so the same seed always picks the same one). If a one-way finds no pair, `continue` — the attempt is rejected and re-seeded, exactly as `reservedForks.length < forkDemands.length` does at :1686.
3. **At materialisation** (1688-1795): write the chosen edges. The `from` node gains the direction toward the connector; the connector cell is written as a corridor whose `dirs` holds **only** the onward direction; the `to` node is left untouched.

After the attempts run out (2137-2145), add `oneWayUnsatisfied` to the reasons the failure carries, beside `forksUnsatisfied`, so a floor that never managed it says which drop it could not place.

Add the reason to `AssemblerReason` in `src/game/siteTypes.ts`.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/game/oneWayCarve.spec.ts src/game/siteAssembler.spec.ts src/game/sectionAddress.spec.ts`
Expected: PASS. `siteAssembler.spec.ts` is in the run because this task edits the carve; **if any of its tests change behaviour, stop and report** — no floor without `oneWays` may carve differently than it did before.

- [ ] **Step 5: Prove the world did not move, then commit**

The controlling session runs `yarn generate-world` and checks `src/data/generatedWorld.ts` is byte-identical. Report that you have not run it and that it is owed.

```bash
yarn check-types
git add src/game/siteAssembler.ts src/game/siteTypes.ts src/game/oneWayCarve.spec.ts
git commit -m "feat: the carve places an authored one-way, or refuses the attempt"
```

---

### Task 4: The walk sees the drop

**Files:**

- Modify: `src/game/floorLock.ts`
- Test: `src/game/floorLock.spec.ts`

**Interfaces:**

- Consumes: the directed edges Task 3 writes.
- Produces: `floorLock(grid)` fills `LockSpec.oneWays` with one entry per directed edge, `from` and `to` being the regions those cells fall in.

**This task is not optional, and the reason is worth understanding.** `findStrandingLocks` walks every floor that produces a lock. The develop journey stands a switch on every floor, so the floor Task 5 authors **will** be walked. `regionsOf` partitions by keyed doors, so the ground past a drop is a region of its own **only when something else gates it**. Where it is, and the drop is not reported, the walk believes that pocket has no way in and calls a sound floor stranding or unsolvable — and a correct floor would stop the build. Where the target is ungated it is already wired into the same maze as its neighbours, the drop is a shortcut across ground the flood has joined anyway, and emitting nothing is the right answer.

- [ ] **Step 1: Write the failing test**

Add to `src/game/floorLock.spec.ts`, reusing the fixtures and the `assembled` helper already in that file:

```ts
it("reports a one-way as a move the walk can take", () => {
  const withDrop: FloorConfig = {
    ...switchFloor(),
    sideSections: [
      ...switchFloor().sideSections,
      { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
      { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
    ],
    oneWays: [{ from: "upper", to: "lower" }],
  }
  const lock = floorLock(assembled(withDrop, standsASwitch))!
  expect(lock.oneWays?.length).toBeGreaterThan(0)
  for (const oneWay of lock.oneWays!) {
    expect(lock.regions).toContain(oneWay.from)
    expect(lock.regions).toContain(oneWay.to)
    expect(oneWay.from).not.toBe(oneWay.to)
  }
})

it("reports no one-ways for a floor that authors none", () => {
  const lock = floorLock(assembled(switchFloor(), standsASwitch))!
  expect(lock.oneWays ?? []).toEqual([])
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/floorLock.spec.ts -t "one-way"`
Expected: FAIL — `floorLock` never sets `oneWays`, so it is `undefined`.

- [ ] **Step 3: Implement**

In `src/game/floorLock.ts`, after regions are computed and before the `LockSpec` is returned, walk the grid for cell pairs joined in one direction and not the other — the same shape as the spec's own `oneWayEdges` helper, using the `MOVES` table already in that file — and emit one `{ from, to }` per pair, using the region each cell belongs to. Skip a pair whose two cells fall in the same region: inside a region the player walks freely and a drop between two of its cells is not a move the walk needs to know about.

```ts
// A PASSAGE THE PLAYER MAY TAKE ONLY ONE WAY. The ground past a drop is a region of its own only
// when something else gates it off; without this the walk would believe a genuinely gated pocket has
// no way in and would refuse a floor that is perfectly sound. A pair landing in one region is
// skipped — inside a region the player already walks freely.
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/game/floorLock.spec.ts src/game/lockWalk.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn check-types
git add src/game/floorLock.ts src/game/floorLock.spec.ts
git commit -m "feat: a floor's one-ways reach the walk"
```

---

### Task 5: A develop-only floor stands one

**Files:**

- Modify: `src/worldGen/spec/dev.ts`
- Test: `src/worldGen/devJourney.verify.ts`

**Interfaces:**

- Consumes: everything above.

Pyramid 3 of the develop journey is already reserved for this — its comment reads "sandSlide. Waiting for the one-way drop that makes a walked corridor unwalkable back." That is the floor to author.

**Expect the drop NOT to appear in that floor's lock, and do not treat it as a bug.** `ledge` and `sink` are both plain ungated side paths, so they are one region and a drop between them is correctly emitted as nothing. What this task proves is that the floor carves at its runtime seed and the build's lock sweep does not refuse it — not that a region crossing exists. A floor whose drop does show up in the lock needs a gate on the far side, which is roadmap step 5's business, not this one's.

- [ ] **Step 1: Write the failing test**

Add to `src/worldGen/devJourney.verify.ts`:

```ts
it("stands a one-way drop on the floor that was waiting for one", () => {
  const floor = devFloors(3)[0]
  expect(floor.oneWays).toEqual([{ from: "ledge", to: "sink" }])
  expect(floor.sideSections.map(section => section.label)).toEqual(expect.arrayContaining(["ledge", "sink"]))
})
```

Match `devFloors` to whatever that spec already uses to read a dev pyramid's built floors; if it has no such helper, build the config the way its existing tests do and read `[0]`.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/worldGen/devJourney.verify.ts`
Expected: FAIL — pyramid 3 authors no `oneWays`.

- [ ] **Step 3: Implement**

In `src/worldGen/spec/dev.ts`, give pyramid 3 two labelled branches and the drop between them. Keep `devSite`'s shape for the other pyramids; this one needs its own rule because its branches are named:

```ts
  // 3 — the one-way drop. The ledge's own way on is a fall into the sink, and the sink has no way
  // back up it: the passage is drawn from both sides today, which is why this stands here and on no
  // authored pyramid until it is drawn as a drop.
  journey(DEV_JOURNEY_ID).pyramid(3, {
    difficulty: "expert",
    pathPuzzles: 2,
    sideSections: [sidePath({ puzzles: 1, label: "ledge" }), sidePath({ puzzles: 1, label: "sink" })],
    forks: FORKS,
    switches: SWITCHES,
    oneWays: [{ from: "ledge", to: "sink" }],
  }),
```

Replace the `devSite(3, "expert")` entry with it, and update that entry's comment so the list still reads as one thing per line.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/worldGen/devJourney.verify.ts src/worldGen/oneWayAuthoring.spec.ts`
Expected: PASS.

- [ ] **Step 5: Ask the whole world**

This is the controlling session's to run, and the task's report should say it is owed:

- `INCLUDE_DEV=1 yarn generate-world` — the dev floor carves at its runtime seed, and the lock sweep walks it without reporting a strand.
- `yarn generate-world` then `git diff --stat src/data/generatedWorld.ts` — no diff. The dev journey is not in that file, so a diff means something in Tasks 1-4 moved an authored floor.

- [ ] **Step 6: Commit**

```bash
git add src/worldGen/spec/dev.ts src/worldGen/devJourney.verify.ts
git commit -m "feat: the develop journey stands a one-way drop"
```

---

## What this plan deliberately leaves out

- **Drawing it.** A one-way's mouth still draws as an ordinary opening from below, because `isPassable` collapses a boundary into one symmetric boolean and `buildTileRegions` draws one rect per boundary. That is roadmap step 2, it needs art, and it is the gate before any authored pyramid stands a drop.
- **Two-way authored links.** `oneWays` is directed because every use the design has is directed. A shortcut that joins two sections both ways is a different feature with a different meaning, and it can have its own field when something wants one.
- **Where exactly the drop lands within a section.** The author names two sections; the builder picks the first adjacent pair in a deterministic order. Finer placement — the worked example's "between the fork's left gate and the newly opened one" — is a region-level statement and belongs to the container in roadmap step 5.
