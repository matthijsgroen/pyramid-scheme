# Region graph (step 5, slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the region graph and the three questions asked of it — which regions are main-path, which are unreachable, and whether the floor's content fits the regions' appetites — as pure functions with no dependency on the carve.

**Architecture:** One new domain file, `src/game/regions.ts`, holding the types and three pure functions. Nothing imports it yet; nothing in the world changes. Later slices (authoring, the carve pass, gates and composition) call into it. Graphs here are tiny — a container has a handful of regions — so the plain O(V·(V+E)) dominator is the right algorithm and a real dominator algorithm would be unrequested complexity.

**Tech Stack:** TypeScript, vitest. No new dependencies.

**Spec:** `docs/game-design/regions-and-containers.md` — read it before Task 1. `docs/authored-locks-roadmap.md` §5 is its background.

## Global Constraints

- `yarn check-types` is the truth. IDE diagnostics in this repo have been wrong on every occasion; never trust them, run the command.
- Lint with `yarn eslint <paths>`. **`yarn lint --fix <path>` does NOT scope** — the script is `eslint . --max-warnings 17`, so a path is appended to `.` and it rewrites the whole repo.
- `yarn generate-world` must stay byte-identical at md5 `f67c3ea9303b04a1d7c9a558d0561620` (`md5 -q src/data/generatedWorld.ts`). This slice changes no world output at all.
- NEVER run `INCLUDE_DEV=1 yarn generate-world` — it writes the dev journey into the tree. `yarn validate-world` writes nothing and is safe with the flag.
- `src/game/` is the domain layer: it imports no React, no `src/app/`, no `src/ui/`. An eslint rule enforces this and will fail you.
- Comments state CURRENT state and why, never history. No "replaces X", no "used to be Y" — that is the PR description's job.
- Tests carry intent in the test NAME and the assertion, not in doc-comment prose blocks.
- Commit path-scoped (`git commit -- <paths>`), never `git add -A` or `git commit -a`.
- Every guard must be watched failing before it is trusted. A test that passes whether or not the bug is present is worthless, and this branch has shipped several.

---

### Task 1: The region graph and its appetite vocabulary

**Files:**
- Create: `src/game/regions.ts`
- Test: `src/game/regions.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `RegionAppetite`, `Region`, `RegionGraph`, `appetiteAccepts(appetite: RegionAppetite, kind: ContentKind): boolean`, `ContentKind = "reward" | "puzzle"`.

- [ ] **Step 1: Write the failing test**

```ts
// src/game/regions.spec.ts
import { describe, expect, it } from "vitest"
import { appetiteAccepts } from "./regions"

describe("what a region will take", () => {
  it("takes the kind it names, and anything when it is free", () => {
    expect(appetiteAccepts("reward", "reward")).toBe(true)
    expect(appetiteAccepts("puzzles", "puzzle")).toBe(true)
    expect(appetiteAccepts("free", "reward")).toBe(true)
    expect(appetiteAccepts("free", "puzzle")).toBe(true)
  })

  // `nothing` is a promise the region stays empty; `free` is indifference. Collapsing the two would
  // lose an instruction the builder is given.
  it("takes nothing at all where the region is promised empty", () => {
    expect(appetiteAccepts("nothing", "reward")).toBe(false)
    expect(appetiteAccepts("nothing", "puzzle")).toBe(false)
  })

  it("does not take a kind another appetite names", () => {
    expect(appetiteAccepts("reward", "puzzle")).toBe(false)
    expect(appetiteAccepts("puzzles", "reward")).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/regions.spec.ts`
Expected: FAIL — cannot find module `./regions`.

- [ ] **Step 3: Write the implementation**

```ts
// src/game/regions.ts

/**
 * WHAT A REGION WILL TAKE, AND NOTHING ABOUT WHAT FILLS IT. A region names a kind; the floor authors
 * how many; the builder matches the two (docs/game-design/regions-and-containers.md).
 *
 * `nothing` and `free` are different instructions and must not be collapsed: `nothing` is a promise
 * the region stays empty — a corridor, a junction, a place to stand — and `free` is indifference,
 * where the builder may put what is spare or leave it.
 *
 * This vocabulary is meant to grow. It is one union, read through `appetiteAccepts` and guarded for
 * exhaustiveness, so adding a kind is a compile error everywhere that must handle it.
 */
export type RegionAppetite = "reward" | "puzzles" | "nothing" | "free"

/** What a floor has to place. Named separately from the appetite because one appetite (`puzzles`)
 * takes many of one kind, and one kind (`reward`) is taken by two appetites. */
export type ContentKind = "reward" | "puzzle"

export type Region = { name: string; appetite: RegionAppetite }

/**
 * A container's coarse layout: its regions, what joins them, and the two ports it is entered and left
 * through. Connections are undirected — a one-way is furniture the topology mod puts ON a connection,
 * not a different kind of join.
 */
export type RegionGraph = {
  regions: readonly Region[]
  connections: ReadonlyArray<readonly [string, string]>
  /** The port a walker enters by. */
  in: string
  /** The port a walker leaves by. */
  out: string
}

export const appetiteAccepts = (appetite: RegionAppetite, kind: ContentKind): boolean => {
  switch (appetite) {
    case "nothing":
      return false
    case "free":
      return true
    case "reward":
      return kind === "reward"
    case "puzzles":
      return kind === "puzzle"
    default: {
      // An appetite with no case above would silently take nothing, which reads as a deliberate
      // `nothing` and hides the omission. This makes it a compile error instead.
      const unhandled: never = appetite
      return unhandled
    }
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `yarn vitest run src/game/regions.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Watch the exhaustiveness guard fire**

Temporarily add `| "hoard"` to `RegionAppetite`, then run `yarn check-types`.
Expected: FAIL with `TS2322` on the `const unhandled: never = appetite` line — NOT merely an unused-variable warning. Remove `| "hoard"` and confirm `yarn check-types` is clean again.

A guard nobody has watched fire is not a guard. Record the exact error text in your report.

- [ ] **Step 6: Commit**

```bash
yarn eslint src/game/regions.ts src/game/regions.spec.ts
yarn check-types
git commit -- src/game/regions.ts src/game/regions.spec.ts -m "feat: a region says what it will take, and a new kind is a compile error"
```

---

### Task 2: Which regions the way out cannot be reached without

**Files:**
- Modify: `src/game/regions.ts`
- Test: `src/game/regions.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph` from Task 1.
- Produces: `mainPathRegions(graph: RegionGraph): Set<string>`.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/game/regions.spec.ts — add mainPathRegions to the existing import
import { appetiteAccepts, mainPathRegions, type RegionGraph } from "./regions"

const graph = (
  connections: Array<[string, string]>,
  names: string[],
  ports: { in: string; out: string }
): RegionGraph => ({
  regions: names.map(name => ({ name, appetite: "free" as const })),
  connections,
  ...ports,
})

describe("the regions the way out cannot be reached without", () => {
  it("names every region on a single corridor of them", () => {
    const g = graph(
      [
        ["in", "middle"],
        ["middle", "out"],
      ],
      ["in", "middle", "out"],
      { in: "in", out: "out" }
    )

    expect(mainPathRegions(g)).toEqual(new Set(["in", "middle", "out"]))
  })

  // The useful meaning of "main path" under cycles: a side path is one you can skip. Neither branch
  // of a fork that rejoins is needed, because the other one answers.
  it("names neither branch of a fork that rejoins, because either one will do", () => {
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

    expect(mainPathRegions(g)).toEqual(new Set(["in", "out"]))
  })

  it("does not name a pocket hanging off the route, which is skippable by definition", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "pocket"],
      ],
      ["in", "pocket", "out"],
      { in: "in", out: "out" }
    )

    expect(mainPathRegions(g)).toEqual(new Set(["in", "out"]))
  })

  it("names nothing at all when the way out cannot be reached from the way in", () => {
    const g = graph([["in", "stub"]], ["in", "stub", "out"], { in: "in", out: "out" })

    expect(mainPathRegions(g)).toEqual(new Set())
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/regions.spec.ts -t "the way out cannot be reached without"`
Expected: FAIL — `mainPathRegions` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
// append to src/game/regions.ts

/** Every region reachable from `from` over the connections, with `without` treated as absent. */
const reachable = (graph: RegionGraph, from: string, without?: string): Set<string> => {
  const neighbours = new Map<string, string[]>()
  for (const [a, b] of graph.connections) {
    if (a === without || b === without) continue
    if (!neighbours.has(a)) neighbours.set(a, [])
    if (!neighbours.has(b)) neighbours.set(b, [])
    neighbours.get(a)!.push(b)
    neighbours.get(b)!.push(a)
  }
  const seen = new Set<string>()
  if (from === without) return seen
  const queue = [from]
  seen.add(from)
  while (queue.length > 0) {
    for (const next of neighbours.get(queue.shift()!) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return seen
}

/**
 * THE REGIONS A PLAYER CANNOT REACH THE WAY OUT WITHOUT ENTERING — the main path, derived rather than
 * authored.
 *
 * Asked by taking each region away in turn and seeing whether `out` is still reachable from `in`. A
 * region whose absence cuts the route is one the route needs. That says the useful thing under cycles,
 * where "the main path" is otherwise ambiguous: a side path is one you can skip.
 *
 * Derived on purpose. An authored role is a second statement of what the graph already implies, and
 * two statements of one fact drift apart.
 *
 * Taking each region away costs a walk of the graph, and a container holds a handful of regions — so
 * the plain form is the right one here, and a real dominator algorithm would be complexity nobody
 * asked for.
 */
export const mainPathRegions = (graph: RegionGraph): Set<string> => {
  const main = new Set<string>()
  if (!reachable(graph, graph.in).has(graph.out)) return main
  for (const { name } of graph.regions) {
    if (!reachable(graph, graph.in, name).has(graph.out)) main.add(name)
  }
  return main
}
```

Note: taking `in` or `out` away cuts the route by construction, so both land in the set without a special case.

- [ ] **Step 4: Run it and watch it pass**

Run: `yarn vitest run src/game/regions.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
yarn eslint src/game/regions.ts src/game/regions.spec.ts
yarn check-types
git commit -- src/game/regions.ts src/game/regions.spec.ts -m "feat: the main path is the regions the way out cannot be reached without"
```

---

### Task 3: Regions nothing reaches

**Files:**
- Modify: `src/game/regions.ts`
- Test: `src/game/regions.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph` from Task 1, the private `reachable` from Task 2, and Task 2's test helper
  `graph(connections, names, ports)` — which builds a `RegionGraph` whose every region is `free`. If
  you are doing this task without Task 2 in front of you, that helper is at the top of its describe
  block in `src/game/regions.spec.ts`.
- Produces: `strandedRegions(graph: RegionGraph): string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/game/regions.spec.ts — add strandedRegions to the existing import
describe("regions nothing reaches", () => {
  it("finds none where every region is joined to the way in", () => {
    const g = graph(
      [
        ["in", "middle"],
        ["middle", "out"],
      ],
      ["in", "middle", "out"],
      { in: "in", out: "out" }
    )

    expect(strandedRegions(g)).toEqual([])
  })

  // Loot in a region no walk reaches is loot nobody can collect, which is why this is required
  // rather than advisory.
  it("names a region joined to nothing, in the order it was authored", () => {
    const g = graph([["in", "out"]], ["in", "out", "orphan", "alsoOrphan"], { in: "in", out: "out" })

    expect(strandedRegions(g)).toEqual(["orphan", "alsoOrphan"])
  })

  it("names a region joined only to another region nothing reaches", () => {
    const g = graph(
      [
        ["in", "out"],
        ["orphan", "behindOrphan"],
      ],
      ["in", "out", "orphan", "behindOrphan"],
      { in: "in", out: "out" }
    )

    expect(strandedRegions(g)).toEqual(["orphan", "behindOrphan"])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/regions.spec.ts -t "regions nothing reaches"`
Expected: FAIL — `strandedRegions` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
// append to src/game/regions.ts

/**
 * THE REGIONS NO WALK FROM THE WAY IN ARRIVES AT, by the name they were authored under.
 *
 * Required rather than advisory: once regions carry the floor's content, a region nothing reaches is
 * loot a player can never collect (docs/game-design/regions-and-containers.md).
 *
 * This is the STRUCTURAL question — is the region joined on at all — and it is the whole of the check
 * while connections carry no gates. The state-aware form, where a gate may be shut in every state a
 * mechanism can reach, needs the lock and arrives with it.
 */
export const strandedRegions = (graph: RegionGraph): string[] => {
  const arrived = reachable(graph, graph.in)
  return graph.regions.filter(({ name }) => !arrived.has(name)).map(({ name }) => name)
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `yarn vitest run src/game/regions.spec.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
yarn eslint src/game/regions.ts src/game/regions.spec.ts
yarn check-types
git commit -- src/game/regions.ts src/game/regions.spec.ts -m "feat: a region nothing reaches is named, because loot there is uncollectable"
```

---

### Task 4: Whether the floor's content fits, and what to say when it does not

**Files:**
- Modify: `src/game/regions.ts`
- Test: `src/game/regions.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph`, `ContentKind`, `appetiteAccepts` from Task 1.
- Produces: `FloorDemand = { rewards: number; puzzleRooms: number }`, `fitContent(graph, demand): { fits: true; placed: Map<string, ContentKind[]> } | { fits: false; unplaced: ContentKind }`.

**Capacity rule — assumed, and flagged in the report:** a `reward` region takes exactly ONE reward ("a reward belongs here"); a `puzzles` region takes any number of puzzle rooms; a `free` region takes one item of either kind; `nothing` takes none. If a later slice needs different capacities this is where they live.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/game/regions.spec.ts — the existing import needs fitContent AND the RegionAppetite
// type, which the helper below is typed with:
//   import { appetiteAccepts, fitContent, mainPathRegions, strandedRegions, type RegionAppetite, type RegionGraph } from "./regions"
const withAppetites = (...regions: Array<[string, RegionAppetite]>): RegionGraph => ({
  regions: regions.map(([name, appetite]) => ({ name, appetite })),
  connections: regions.slice(1).map(([name], i) => [regions[i][0], name] as const),
  in: regions[0][0],
  out: regions[regions.length - 1][0],
})

describe("fitting a floor's content to what its regions will take", () => {
  it("puts each reward in a region that asked for one", () => {
    const g = withAppetites(["in", "nothing"], ["vault", "reward"], ["out", "nothing"])
    const result = fitContent(g, { rewards: 1, puzzleRooms: 0 })

    expect(result.fits).toBe(true)
    expect(result.fits && result.placed.get("vault")).toEqual(["reward"])
  })

  it("puts every puzzle room in the one region that takes them", () => {
    const g = withAppetites(["in", "nothing"], ["hall", "puzzles"], ["out", "nothing"])
    const result = fitContent(g, { rewards: 0, puzzleRooms: 3 })

    expect(result.fits && result.placed.get("hall")).toEqual(["puzzle", "puzzle", "puzzle"])
  })

  // The builder may refuse, but it may never decide quietly: a third reward with two places to put one
  // is the author's mistake, and it is named before a wall is carved rather than dropped.
  it("refuses by kind when a region asked for is not there", () => {
    const g = withAppetites(["in", "nothing"], ["vault", "reward"], ["out", "nothing"])

    expect(fitContent(g, { rewards: 2, puzzleRooms: 0 })).toEqual({ fits: false, unplaced: "reward" })
  })

  it("refuses a puzzle room where every region is promised empty", () => {
    const g = withAppetites(["in", "nothing"], ["out", "nothing"])

    expect(fitContent(g, { rewards: 0, puzzleRooms: 1 })).toEqual({ fits: false, unplaced: "puzzle" })
  })

  it("spends a free region only once the region that asked for the kind is full", () => {
    const g = withAppetites(["in", "free"], ["vault", "reward"], ["out", "nothing"])
    const result = fitContent(g, { rewards: 2, puzzleRooms: 0 })

    expect(result.fits && result.placed.get("vault")).toEqual(["reward"])
    expect(result.fits && result.placed.get("in")).toEqual(["reward"])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/regions.spec.ts -t "fitting a floor's content"`
Expected: FAIL — `fitContent` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
// append to src/game/regions.ts

/** What a floor has to place. The floor authors these counts; the regions say only what kind they take. */
export type FloorDemand = { rewards: number; puzzleRooms: number }

/** How many of one kind a region will hold: a named appetite takes its own, `free` takes one of
 * anything, and `puzzles` is the one that takes a chain of them. */
const capacityFor = (appetite: RegionAppetite, kind: ContentKind): number => {
  if (!appetiteAccepts(appetite, kind)) return 0
  return appetite === "puzzles" ? Number.POSITIVE_INFINITY : 1
}

/**
 * WHERE EACH PIECE OF THE FLOOR'S CONTENT GOES, OR THE KIND THAT HAD NOWHERE TO GO.
 *
 * A region that asked for the kind is filled before a `free` one, so indifference is spent last and an
 * author who named a place for a reward gets it.
 *
 * Returns the unplaced KIND rather than a count, because the failure is reported by name before a wall
 * is carved and the author needs to know what did not fit, not how much: the builder may refuse, but
 * it may never decide quietly (docs/game-design/regions-and-containers.md).
 */
export const fitContent = (
  graph: RegionGraph,
  demand: FloorDemand
): { fits: true; placed: Map<string, ContentKind[]> } | { fits: false; unplaced: ContentKind } => {
  const placed = new Map<string, ContentKind[]>()
  const roomLeft = new Map<string, number>()

  const place = (kind: ContentKind, count: number): ContentKind | null => {
    const named = graph.regions.filter(r => r.appetite !== "free" && appetiteAccepts(r.appetite, kind))
    const free = graph.regions.filter(r => r.appetite === "free" && appetiteAccepts(r.appetite, kind))
    for (let n = 0; n < count; n++) {
      const into = [...named, ...free].find(
        r => (roomLeft.get(r.name) ?? capacityFor(r.appetite, kind)) > 0
      )
      if (!into) return kind
      roomLeft.set(into.name, (roomLeft.get(into.name) ?? capacityFor(into.appetite, kind)) - 1)
      placed.set(into.name, [...(placed.get(into.name) ?? []), kind])
    }
    return null
  }

  const unplaced = place("reward", demand.rewards) ?? place("puzzle", demand.puzzleRooms)
  return unplaced ? { fits: false, unplaced } : { fits: true, placed }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `yarn vitest run src/game/regions.spec.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Prove the refusal is not vacuous**

Temporarily change `if (!into) return kind` to `if (!into) continue`, then run
`yarn vitest run src/game/regions.spec.ts`.
Expected: the two refusal tests go RED. Restore the line and confirm all 15 pass.

Report the verbatim failure. A refusal that cannot fire is the defect class this whole design is trying not to add to.

- [ ] **Step 6: Confirm the world did not move**

```bash
yarn generate-world && md5 -q src/data/generatedWorld.ts
git status --short src/data/generatedWorld.ts
```
Expected: `f67c3ea9303b04a1d7c9a558d0561620`, and `git status` lists nothing. This slice adds a file nothing imports yet; if the world moved, something is wired that should not be.

- [ ] **Step 7: Commit**

```bash
yarn eslint src/game/regions.ts src/game/regions.spec.ts
yarn check-types
yarn test
git commit -- src/game/regions.ts src/game/regions.spec.ts -m "feat: content that will not fit its regions is refused by the kind that had nowhere to go"
```

---

## What this slice deliberately does NOT do

Named so a reviewer does not read them as gaps:

- **No authoring.** `FloorConfig` gains no `regions` field, the DSL gains no verb, the serializer emits nothing. That is slice 2.
- **No carve.** No wall moves; `generate-world` is byte-identical. The layout pass is slice 3.
- **No gates, no mechanisms, no composition.** Connections carry no furniture and a region holds no nested container. That is slice 4, and it is where `strandedRegions` gains its state-aware form and `mainPathRegions` is asked per container between its ports.
- **No `lockWalk` change.** Forbidding OCCUPATION of a region is `waterline`'s and stays parked.

## The slices after this one

Each needs its own plan, written when the one before it lands:

1. **This plan — the region graph.** Pure functions, no world change.
2. **Authoring.** `regions` and `connections` on `FloorConfig`, the DSL verb, the serializer, and the refusals wired into `siteAssembler` as named `AssemblerReason`s.

   **Carried from slice 1's final review, to be refused here:** a connection may name a region that
   `regions[]` never declares. Such a region carries the route for reachability but is never a
   candidate for removal, so a genuine cut region reads as neither main-path nor stranded. Slice 1
   cannot produce that input because it has no authoring surface; slice 2 is where authoring arrives,
   so it is where the refusal belongs.
3. **The carve pass.** A new core pass, recursive with loops from the start, owning `edgeAllowed`'s rejoin rule, `doorsToEnter` and fog restore rather than inheriting them.
4. **Gates and composition.** Gates on connections (topology mod), containers placed inside a region from outside, and the proof that a nested container is not walked as a product.
