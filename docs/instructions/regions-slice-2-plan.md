# Region authoring (step 5, slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A floor can author a region layout, it survives the round trip through world generation, and every way of authoring a broken one is refused by name before a wall is carved.

**Architecture:** `FloorConfig` gains ONE field, `layout?: RegionGraph`, reusing the type slice 1 already defined rather than re-declaring its shape. The DSL carries it at both constraint levels, the serializer emits it, and `siteAssembler` refuses four kinds of broken layout alongside the refusals it already makes. Regions still shape no walls — the carve is slice 3.

**Tech Stack:** TypeScript, vitest. No new dependencies.

**Spec:** `docs/game-design/regions-and-containers.md`. Slice 1's code is `src/game/regions.ts`; read both before Task 1.

## Global Constraints

- `yarn check-types` is the truth. IDE diagnostics in this repo have been wrong on every occasion; never trust them, run the command.
- Lint with `yarn eslint <paths>`. **`yarn lint --fix <path>` does NOT scope** — the script is `eslint . --max-warnings 17`, so a path is appended to `.` and it rewrites the whole repo.
- `yarn generate-world` must stay byte-identical at md5 `f67c3ea9303b04a1d7c9a558d0561620` (`md5 -q src/data/generatedWorld.ts`). No shipped floor authors a layout, so adding the field must move nothing.
- NEVER run `INCLUDE_DEV=1 yarn generate-world` — it writes the dev journey into the tree. `yarn validate-world` writes nothing and is safe with the flag.
- `src/game/` is the domain layer: no React, no `src/app/`, no `src/ui/`. An eslint rule enforces it.
- Comments state CURRENT state and why, never history.
- Tests carry intent in the test NAME and the assertion, not in doc-comment prose blocks.
- Commit path-scoped (`git commit -- <paths>`), never `git add -A` or `git commit -a`.
- Every refusal must be watched failing before it is trusted.

**ONE SOURCE OF TRUTH, ENFORCED.** `handles` is declared as an inline type in four places (`src/worldGen/types.ts:113`, `src/game/siteTypes.ts:451`, `src/worldGen/dsl.ts:181` and `:310`), one of them commented as "mirrors" another. Do NOT repeat that here. `layout` is typed as `RegionGraph` imported from `src/game/regions.ts` at every one of those sites. If you find yourself writing the shape of a region twice, stop — that is the defect this slice is explicitly avoiding.

---

### Task 1: A floor may carry a layout

**Files:**
- Modify: `src/game/siteTypes.ts` (FloorConfig), `src/worldGen/types.ts` (FloorConfig), `src/worldGen/serializer.ts`
- Test: `src/worldGen/serializer.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph` from `src/game/regions.ts` (slice 1).
- Produces: `FloorConfig.layout?: RegionGraph` in both type families; `serializeRegionGraph`.

**Why the serializer cannot be forgotten:** `floorFieldEmitters` in `src/worldGen/serializer.ts` is typed `{ [K in keyof Required<FloorConfig>]: ... }`, so adding `layout` to `FloorConfig` is a COMPILE ERROR until an emitter exists. Let that error happen and then satisfy it — do not pre-empt it.

- [ ] **Step 1: Add the field to both type families**

In `src/game/siteTypes.ts`, beside `handles`, import `RegionGraph` from `./regions` and add:

```ts
  /**
   * THE FLOOR'S COARSE LAYOUT: named regions, what joins them, and the two ports it is entered and
   * left through (docs/game-design/regions-and-containers.md).
   *
   * A region declares only an APPETITE — what it will take — and never what fills it. Typed as
   * `RegionGraph` rather than restated here, so the shape has one definition and the vocabulary can
   * grow in one place.
   */
  layout?: RegionGraph
```

In `src/worldGen/types.ts`, beside its own `handles`, import `RegionGraph` from `@/game/regions` and add:

```ts
  /** The floor's coarse layout — see game/regions.ts's RegionGraph, which is this field's type
   * rather than a shape restated here. */
  layout?: RegionGraph
```

- [ ] **Step 2: Run check-types and watch the serializer error appear**

Run: `yarn check-types`
Expected: FAIL naming `floorFieldEmitters` — `layout` is missing from the mapped type. This is the guard working; it is why no task needs to remember the serializer.

- [ ] **Step 3: Write the failing serializer test**

```ts
// src/worldGen/serializer.spec.ts — add to the existing imports as needed
it("emits an authored layout so a region survives the round trip", () => {
  const floor = {
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    exitOrStaircase: "exit" as const,
    sideSections: [],
    layout: {
      regions: [
        { name: "mouth", appetite: "nothing" as const },
        { name: "vault", appetite: "reward" as const },
      ],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    },
  }

  const emitted = generateFile({ testJourney: [[floor]] })

  expect(emitted).toContain(`{ name: "mouth", appetite: "nothing" }`)
  expect(emitted).toContain(`connections: [["mouth", "vault"]]`)
  expect(emitted).toContain(`in: "mouth"`)
  expect(emitted).toContain(`out: "vault"`)
})
```

`serializer.spec.ts` drives `generateFile(configs)` — there is no per-floor export, and you must NOT add one. Wrap the floor above as `generateFile({ testJourney: [[floor]] })` and assert against the returned string, the way the file's existing describe blocks do.

- [ ] **Step 4: Run it and watch it fail**

Run: `yarn vitest run src/worldGen/serializer.spec.ts`
Expected: FAIL — no layout in the output.

- [ ] **Step 5: Write the emitter**

```ts
// src/worldGen/serializer.ts, beside the other helpers
const serializeRegionGraph = (g: RegionGraph): string =>
  `{ regions: [${g.regions
    .map(r => `{ name: ${JSON.stringify(r.name)}, appetite: ${JSON.stringify(r.appetite)} }`)
    .join(", ")}], connections: [${g.connections
    .map(([a, b]) => `[${JSON.stringify(a)}, ${JSON.stringify(b)}]`)
    .join(", ")}], in: ${JSON.stringify(g.in)}, out: ${JSON.stringify(g.out)} }`
```

and in `floorFieldEmitters`:

```ts
  layout: v => `layout: ${serializeRegionGraph(v)}`,
```

- [ ] **Step 6: Run the tests and the world**

Run: `yarn vitest run src/worldGen/serializer.spec.ts` — expect PASS.
Run: `yarn check-types` — expect clean.
Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` — expect `f67c3ea9303b04a1d7c9a558d0561620` and `git status` listing nothing for it. No shipped floor authors a layout, so the world must not move.

- [ ] **Step 7: Commit**

```bash
yarn eslint src/game/siteTypes.ts src/worldGen/types.ts src/worldGen/serializer.ts src/worldGen/serializer.spec.ts
git commit -- src/game/siteTypes.ts src/worldGen/types.ts src/worldGen/serializer.ts src/worldGen/serializer.spec.ts -m "feat: a floor may carry the layout its regions are named in"
```

---

### Task 2: Authoring a layout through the DSL

**Files:**
- Modify: `src/worldGen/dsl.ts`, `src/worldGen/buildSite.ts`
- Test: `src/worldGen/dsl.spec.ts`

**Interfaces:**
- Consumes: `RegionGraph`, `FloorConfig.layout` from Task 1.
- Produces: `layout?: RegionGraph` on both the floor-level and pyramid-level constraints, carried into the built `FloorConfig`.

- [ ] **Step 1: Write the failing test**

```ts
// src/worldGen/dsl.spec.ts — match the file's existing style for building a rule
it("carries an authored layout onto the floor it was authored for", () => {
  const layout = {
    regions: [
      { name: "mouth", appetite: "nothing" as const },
      { name: "vault", appetite: "reward" as const },
    ],
    connections: [["mouth", "vault"] as const],
    in: "mouth",
    out: "vault",
  }

  const rule = tier("starter").set({ layout })

  expect(rule.constraints.layout).toEqual(layout)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/worldGen/dsl.spec.ts -t "carries an authored layout"`
Expected: FAIL — `layout` is not a constraint field.

- [ ] **Step 3: Add it at both constraint levels**

In `src/worldGen/dsl.ts`, beside `FloorConstraint.handles`:

```ts
  /** The coarse layout this floor's regions are named in — see game/regions.ts's RegionGraph. */
  layout?: RegionGraph
```

and beside the pyramid-level `handles`:

```ts
  /** The layout every floor of this site carries, unless a floor names its own — see
   * FloorConstraint.layout. */
  layout?: RegionGraph
```

In `src/worldGen/buildSite.ts`, carry it exactly as `handles` is carried: add `layout?: FloorConfig["layout"]` to the options type, `...(opts.layout ? { layout: opts.layout } : {})` where `handles` is spread, and `layout: fc.layout ?? constraint.layout` / `layout: constraint.layout` at each of the sites where `handles` is passed. Follow `handles` line for line — it is the field this one is shaped after.

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/worldGen/dsl.spec.ts` — expect PASS.
Run: `yarn check-types` — expect clean.
Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` — expect `f67c3ea9303b04a1d7c9a558d0561620`, unmoved.

- [ ] **Step 5: Commit**

```bash
yarn eslint src/worldGen/dsl.ts src/worldGen/buildSite.ts src/worldGen/dsl.spec.ts
git commit -- src/worldGen/dsl.ts src/worldGen/buildSite.ts src/worldGen/dsl.spec.ts -m "feat: a layout is authored at the floor or the pyramid, like the levers beside it"
```

---

### Task 3: Four ways to author a broken layout, each refused by name

**Files:**
- Modify: `src/game/siteTypes.ts` (AssemblerReason), `src/game/siteAssembler.ts`
- Test: `src/game/regionAuthoring.spec.ts` (create)

**Interfaces:**
- Consumes: `FloorConfig.layout`, `strandedRegions` from `src/game/regions.ts`.
- Produces: four `AssemblerReason` members and the checks that raise them.

**Where the checks go:** in `assembleFloor`, beside the existing config-derived refusals — after the `sectionTooDeep` check and before the one-way check. How a floor is laid out is fixed by the config, not by the seed, so it is refused once here rather than blamed on sixty carves.

- [ ] **Step 1: Add the four reasons**

In `src/game/siteTypes.ts`'s `AssemblerReason` union:

```ts
  /** Two regions of one layout answer to the same name, so nothing could tell which one a connection,
   * a port or a piece of content meant. See FloorConfig.layout. */
  | { type: "regionNameRepeated"; name: string }
  /** A connection names a region the layout never declares. It would carry the route without ever
   * being a place, so a region the walk must pass through could read as neither main path nor
   * stranded. See FloorConfig.layout. */
  | { type: "connectionNamesNoRegion"; name: string }
  /** A layout's port names a region it does not have, so the floor has no way in or no way out. */
  | { type: "portNamesNoRegion"; port: "in" | "out"; name: string }
  /** A region no walk from the way in arrives at. Once regions carry content, that is loot a player
   * can never collect (docs/game-design/regions-and-containers.md). */
  | { type: "regionUnreachable"; name: string }
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/game/regionAuthoring.spec.ts
import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig } from "./siteTypes"
import type { RegionAppetite } from "./regions"

const SEED = 99

const floorWith = (layout: FloorConfig["layout"]): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  layout,
})

const region = (name: string, appetite: RegionAppetite = "free") => ({ name, appetite })

const reasons = (config: FloorConfig) => {
  const result = assembleFloor("test-journey", config, SEED)
  return result.success ? [] : result.reasons
}

describe("a layout the builder refuses by name", () => {
  it("refuses two regions answering to one name", () => {
    const layout = {
      regions: [region("mouth"), region("mouth")],
      connections: [["mouth", "mouth"] as const],
      in: "mouth",
      out: "mouth",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "regionNameRepeated", name: "mouth" }])
  })

  it("refuses a connection naming a region the layout never declares", () => {
    const layout = {
      regions: [region("mouth"), region("vault")],
      connections: [["mouth", "ghost"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "connectionNamesNoRegion", name: "ghost" }])
  })

  it("refuses a port naming a region the layout never declares", () => {
    const layout = {
      regions: [region("mouth")],
      connections: [],
      in: "mouth",
      out: "nowhere",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "portNamesNoRegion", port: "out", name: "nowhere" }])
  })

  it("refuses a region no walk from the way in arrives at", () => {
    const layout = {
      regions: [region("mouth"), region("vault"), region("orphan")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "regionUnreachable", name: "orphan" }])
  })

  it("assembles a layout whose regions are all named once, joined and reachable", () => {
    const layout = {
      regions: [region("mouth", "nothing"), region("vault", "reward")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(assembleFloor("test-journey", floorWith(layout), SEED).success).toBe(true)
  })

  it("assembles a floor that authors no layout at all", () => {
    expect(assembleFloor("test-journey", floorWith(undefined), SEED).success).toBe(true)
  })
})
```

- [ ] **Step 3: Run them and watch them fail**

Run: `yarn vitest run src/game/regionAuthoring.spec.ts`
Expected: the four refusal tests FAIL (the floor assembles instead of refusing); the last two PASS.

- [ ] **Step 4: Write the checks**

In `src/game/siteAssembler.ts`, import `strandedRegions` from `./regions`, and add after the `sectionTooDeep` refusal:

```ts
  // A LAYOUT IS FIXED BY THE CONFIG, NOT BY THE SEED, so a broken one is refused once here rather
  // than blamed on sixty carves that could never have satisfied it either. Ordered so each check can
  // trust what the one before it established: names are unique before connections are resolved
  // against them, and both hold before the walk that finds what nothing reaches.
  const layout = authoredConfig.layout
  if (layout) {
    const declared = new Set<string>()
    for (const { name } of layout.regions) {
      if (declared.has(name)) return { success: false, reasons: [{ type: "regionNameRepeated", name }] }
      declared.add(name)
    }
    for (const [from, to] of layout.connections)
      for (const end of [from, to])
        if (!declared.has(end))
          return { success: false, reasons: [{ type: "connectionNamesNoRegion", name: end }] }
    for (const port of ["in", "out"] as const)
      if (!declared.has(layout[port]))
        return { success: false, reasons: [{ type: "portNamesNoRegion", port, name: layout[port] }] }
    const stranded = strandedRegions(layout)
    if (stranded.length > 0)
      return { success: false, reasons: stranded.map(name => ({ type: "regionUnreachable" as const, name })) }
  }
```

- [ ] **Step 5: Run them and watch them pass**

Run: `yarn vitest run src/game/regionAuthoring.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Prove the order is load-bearing**

Move the `strandedRegions` check ABOVE the connection check and re-run. Expected: the "connection naming a region the layout never declares" test now reports `regionUnreachable` for `ghost` instead — a worse message naming a region that does not exist. Restore the order. Report what you saw.

This is why the checks are ordered rather than independent: each trusts what the one before it established.

- [ ] **Step 7: Commit**

```bash
yarn eslint src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionAuthoring.spec.ts
yarn check-types
git commit -- src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionAuthoring.spec.ts -m "feat: a layout that names a region twice, or none, or one nothing reaches, is refused by name"
```

---

### Task 4: A dev floor authors a layout, and the world does not move

**Files:**
- Modify: `src/worldGen/spec/dev.ts`
- Test: `src/worldGen/devJourney.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: one authored layout in the shipped-but-dev-only world, proving the whole path round-trips.

**Read `src/worldGen/spec/dev.ts`'s header first.** It authors NO loot and NO puzzles, and those rules bind you. A layout is neither, so it is allowed — but do not author anything else while you are in there.

- [ ] **Step 1: Write the failing test**

```ts
// src/worldGen/devJourney.spec.ts — add to the existing describe blocks
it("stands a layout on the topology bench, carried through world generation", () => {
  const floor = withDev[DEV_JOURNEY_ID][0][0]

  expect(floor.layout?.regions.map(r => r.name)).toEqual(["mouth", "hall", "vault"])
  expect(floor.layout?.in).toBe("mouth")
  expect(floor.layout?.out).toBe("vault")
})
```

`devJourney.spec.ts` already builds `withDev` in its `beforeAll`, and `withDev[DEV_JOURNEY_ID]` is 7 sites each holding its floors — so `withDev[DEV_JOURNEY_ID][0][0]` is dev pyramid 1, floor 0. `DEV_JOURNEY_ID` is already imported there.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/worldGen/devJourney.spec.ts -t "stands a layout"`
Expected: FAIL — `layout` is undefined.

- [ ] **Step 3: Author the layout on dev pyramid 1**

In `src/worldGen/spec/dev.ts`, on the first dev pyramid only:

```ts
    // The first authored region layout. It shapes no walls yet — the carve is a later slice — so this
    // stands here to prove a layout survives authoring, serialization and the builder's refusals.
    layout: {
      regions: [
        { name: "mouth", appetite: "nothing" },
        { name: "hall", appetite: "puzzles" },
        { name: "vault", appetite: "reward" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
      ],
      in: "mouth",
      out: "vault",
    },
```

- [ ] **Step 4: Run everything**

Run: `yarn vitest run src/worldGen/devJourney.spec.ts` — expect PASS.
Run: `yarn check-types` — expect clean.
Run: `yarn validate-world` — expect `✓ World spec valid`, `Stair sweep: 111 …`, `Lock sweep: walked 1 of 1`.
Run: `INCLUDE_DEV=1 yarn validate-world` — expect `✓ World spec valid`, `Lock sweep: walked 8 of 8`.
Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` — expect `f67c3ea9303b04a1d7c9a558d0561620` and a clean `git status` for it. **The plain build omits the dev journey, so authoring here must not move the shipped world.** If it moved, the dev journey is leaking into the plain build and that is the finding.
Run: `yarn test` — expect the full suite green.

- [ ] **Step 5: Commit**

```bash
yarn eslint src/worldGen/spec/dev.ts src/worldGen/devJourney.spec.ts
git commit -- src/worldGen/spec/dev.ts src/worldGen/devJourney.spec.ts -m "feat: the bench stands a layout, to prove one survives the journey from authoring to build"
```

---

## What this slice deliberately does NOT do

- **No carve.** A layout shapes no walls and moves no cell. That is slice 3, which owns `edgeAllowed`'s rejoin rule, `doorsToEnter` and fog restore.
- **No gates, no mechanisms, no composition.** Connections carry no furniture and a region holds no nested container. Slice 4.
- **No content matching.** `fitContent` stays unwired: matching a floor's content to its regions' appetites is the carve's business, and belongs with slice 3.
- **No state-aware reachability.** `regionUnreachable` is the structural question only. The form where a gate is shut in every state a mechanism can reach needs the lock, and arrives with slice 4.
