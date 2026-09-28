# A layout the carve cannot seat (step 5, slice 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the one place in this design where the builder decides quietly — a region route longer than the main path that carves anyway, seating content in a region the author never named.

**Architecture:** One refusal in `siteAssembler`, beside the four region-authoring refusals already there, and one test that reads a carved cell's `region` off a real generated floor. No gates — those need a design decision and are their own slice.

**Tech Stack:** TypeScript, vitest. No new dependencies.

**Spec:** `docs/game-design/regions-and-containers.md`. Slice 3's carried list at the end of `docs/instructions/regions-slice-3-plan.md` is what this implements.

## Global Constraints

- `yarn check-types` is the truth. IDE diagnostics in this repo have been wrong on every occasion; never trust them, run the command.
- Lint with `yarn eslint <paths>`. **`yarn lint --fix <path>` does NOT scope.**
- `yarn generate-world` must stay byte-identical at md5 `f67c3ea9303b04a1d7c9a558d0561620`.
- NEVER run `INCLUDE_DEV=1 yarn generate-world`. `yarn validate-world` writes nothing and is safe with the flag.
- `src/game/` is the domain layer: no React, no `src/app/`, no `src/ui/`.
- Comments state CURRENT state and why, never history.
- Tests assert EVERY element of a collection, not a representative one.
- **Commit as `git commit -m "message" -- <paths>`** — `-m` BEFORE `--`, or `--` swallows it.
- Every refusal must be watched failing before it is trusted.

**THE RULE THIS SERVES:** the builder may refuse, but it may never decide quietly.

---

### Task 1: A route the main path cannot seat is refused

**Files:**
- Modify: `src/game/siteTypes.ts` (AssemblerReason), `src/game/siteAssembler.ts`
- Test: `src/game/regionCarve.spec.ts`

**Interfaces:**
- Consumes: `regionRoute`, `regionOfStep` and the `region` labelling from slice 3.
- Produces: one `AssemblerReason` member and the check that raises it.

**What is wrong today, measured in slice 3's final review:** a layout with 9 regions against a 6-step main path labels only the first six, never labels the `out` port at all, drops the goal chest in a region the author did not name — and carves successfully. The author said the reward goes in the vault; the builder put it elsewhere and said nothing.

**Why it could not be refused earlier:** only a carve knows how many steps the main path has. `regionOfStep` deliberately deals what there is rather than refusing, because it is a pure function with no floor in front of it. The refusal belongs here, where the path exists.

- [ ] **Step 1: Add the reason**

In `AssemblerReason`, beside the other region reasons:

```ts
  /** The route the main path threads has more regions than the path has steps, so the regions at its
   * far end are never reached and content lands in regions the author did not name. `regions` are the
   * ones left unseated, in route order. See FloorConfig.regionLayout. */
  | { type: "routeOutrunsPath"; regions: string[] }
```

- [ ] **Step 2: Write the failing test**

```ts
// append to src/game/regionCarve.spec.ts
describe("a route the main path cannot seat", () => {
  // Only a carve knows how long the main path is, so this cannot be caught when the layout is
  // authored — but a floor that seats content in regions the author never named is the builder
  // deciding quietly, which is the one thing it may not do.
  it("refuses a route with more regions than the path has steps, naming the ones left unseated", () => {
    const tooManyRegions = {
      regions: [
        { name: "a", appetite: "free" as const },
        { name: "b", appetite: "free" as const },
        { name: "c", appetite: "free" as const },
        { name: "d", appetite: "free" as const },
        { name: "e", appetite: "free" as const },
        { name: "f", appetite: "free" as const },
        { name: "g", appetite: "free" as const },
        { name: "h", appetite: "free" as const },
        { name: "i", appetite: "free" as const },
      ],
      connections: [
        ["a", "b"] as const,
        ["b", "c"] as const,
        ["c", "d"] as const,
        ["d", "e"] as const,
        ["e", "f"] as const,
        ["f", "g"] as const,
        ["g", "h"] as const,
        ["h", "i"] as const,
      ],
      in: "a",
      out: "i",
    }
    const result = assembleFloor("test-journey", floor(tooManyRegions), SEED)

    expect(result.success).toBe(false)
    const reason = result.success ? undefined : result.reasons.find(r => r.type === "routeOutrunsPath")
    expect(reason).toBeDefined()
    // Every unseated region, not just the first — an author fixing one at a time is the builder
    // handing back one problem when it can see them all.
    expect(reason && "regions" in reason ? reason.regions.length : 0).toBeGreaterThan(0)
  })

  it("carves a route the path can seat", () => {
    expect(assembleFloor("test-journey", floor(threeRegions), SEED).success).toBe(true)
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `yarn vitest run src/game/regionCarve.spec.ts -t "a route the main path cannot seat"`
Expected: the first FAILS (the floor carves instead of refusing); the second PASSES.

- [ ] **Step 4: Write the check**

Where `stepRegion` is computed in `assembleFloor` (slice 3 put it beside the main path's `cellSectionAddress` fill), the route and the dealt steps are both in hand. A region of the route that no step landed on is unseated:

```ts
// A ROUTE LONGER THAN THE PATH SEATS NOTHING AT ITS FAR END. `regionOfStep` deals what there is
// rather than refusing, because it has no floor in front of it — only a carve knows how many steps
// the main path has. So the refusal lands here, and it names every region left unseated: content that
// would have gone to them lands in regions the author never named, which is the builder deciding
// quietly rather than refusing.
const unseated = route.filter(name => !stepRegion.includes(name))
if (unseated.length > 0) return { success: false, reasons: [{ type: "routeOutrunsPath", regions: unseated }] }
```

Place it immediately after `stepRegion` is computed and before any cell is labelled — the floor is refused whole, and nothing half-labelled is returned.

- [ ] **Step 5: Run it and watch it pass**

Run: `yarn vitest run src/game/regionCarve.spec.ts`
Expected: PASS.

- [ ] **Step 6: Prove the refusal is not vacuous**

Change `unseated.length > 0` to `false`, re-run, and confirm the new test goes red. Restore. Quote the verbatim failure.

- [ ] **Step 7: The world and the bench**

Run: `yarn generate-world && md5 -q src/data/generatedWorld.ts` — expect `f67c3ea9303b04a1d7c9a558d0561620`, clean `git status` for it.
Run: `INCLUDE_DEV=1 yarn validate-world` — expect `✓ World spec valid`, `Stair sweep: 111 …`, `Lock sweep: walked 8 of 8`. **The dev bench authors 3 regions on a floor whose main path is comfortably longer, so it must still carve.** If it refuses, report the step count rather than changing the bench.
Run: `yarn test` — expect the full suite green.

- [ ] **Step 8: Commit**

```bash
yarn eslint src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts
yarn check-types
git commit -m "fix: a route with more regions than the path has steps is refused, not seated quietly" -- src/game/siteTypes.ts src/game/siteAssembler.ts src/game/regionCarve.spec.ts
```

---

### Task 2: A generated floor's cells carry their region

**Files:**
- Test: `src/worldGen/devJourney.spec.ts`

**Interfaces:**
- Consumes: the `region` labelling from slice 3 and the dev bench's authored layout.
- Produces: nothing — a test only.

**The gap, from slice 3's final review:** the carry-through of `regionLayout` is proven as far as the CONFIG. `validate-world` walks the dev floor without refusing, and `devJourney.spec.ts` asserts the whole layout round-trips. But nothing reads a carved cell's `region` on a real generated floor, so "every carved cell knows its region" is pinned only by unit tests against hand-built floors.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/worldGen/devJourney.spec.ts, in the describe that already reaches built dev floors
// The unit tests pin this against hand-built floors; this is the only place it is asserted on a floor
// that came through world generation, which is what the bench exists to prove.
it("carves the bench floor with every cell knowing its region", () => {
  const config = withDev[DEV_JOURNEY_ID][0][0]
  const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), 1, 0)
  const result = assembleFloor(DEV_JOURNEY_ID, config, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: DEV_JOURNEY_ID, levelIndex: 0, floorIndex: 0 },
  })
  if (!result.success) throw new Error(`bench floor did not carve: ${JSON.stringify(result.reasons)}`)

  const carved = result.grid.cells.flat().filter((c): c is Extract<typeof c, { type: "room" | "corridor" }> =>
    c.type === "room" || c.type === "corridor"
  )
  const authored = new Set(config.regionLayout?.regions.map(r => r.name))

  expect(carved.filter(c => c.region === undefined)).toEqual([])
  expect([...new Set(carved.map(c => c.region))].every(r => r !== undefined && authored.has(r))).toBe(true)
})
```

**The imports and the assemble call must match how this file or `scripts/generateWorld.ts` already assembles a floor** — `assembleFloor`, `floorAssemblySeed`, `persistentInteriorSeed`, `resolveKeyRequirements` and the encounter resolver. Read `scripts/generateWorld.ts`'s `assembleOnce` and copy its shape rather than inventing arguments; if this spec file already has a helper that carves a dev floor, use that instead and say so.

- [ ] **Step 2: Run it and watch it fail or pass, and say which**

Run: `yarn vitest run src/worldGen/devJourney.spec.ts -t "every cell knowing its region"`

This one may pass immediately — slice 3 already labels the cells, and this test exists to PIN that, not to drive new behaviour. That is legitimate here, but you must prove it is not vacuous: temporarily make the labelling conditional on something false in `siteAssembler.ts` (or author the bench with no `regionLayout`), confirm this test goes red, and restore. Quote the verbatim failure.

- [ ] **Step 3: Run everything**

Run: `yarn check-types`, `yarn test`, and `INCLUDE_DEV=1 yarn validate-world`.

- [ ] **Step 4: Commit**

```bash
yarn eslint src/worldGen/devJourney.spec.ts
git commit -m "test: the bench floor's cells come back knowing their regions" -- src/worldGen/devJourney.spec.ts
```

---

## What this slice deliberately does NOT do

- **No gates.** A gate on a connection has two ends where `SubSection.gate` has one, and who owns it — a key, or a mechanism — is a design decision, not an implementation detail. It is its own slice and needs that decision first.
- **No composition**, no `edgeAllowed` change, no `doorsToEnter`, no fog restore. All four belong with the gates.
- **No path shaping.** The builder still does not lengthen a path or hang a side path to satisfy an appetite.

## Carried onward

- **`fitContent` and `mainPathRegions` still have no production caller.** They are DEFERRED, not dead: the assembler answers "does this content fit" after the carve because that is when it knows where content landed, while `fitContent` answers it from counts BEFORE one — which is what a shaping pass needs in order to decide how to grow a path. Whichever slice builds the shaping owns reconciling them, and should delete one if it does not use it.
- **The degenerate layouts from slice 2's review** — a self-loop connection, a duplicated connection, an empty-string region name — still unrefused, still waiting on a carve that gives them meaning.
