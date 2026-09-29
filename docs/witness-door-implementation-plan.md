# Witness Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `witnessDoor` — a fork whose two branches are opened by which of two legal solutions the player gives to one puzzle board — as a mod that can be removed from `REGISTERED_MODS` without breaking the world or the app.

**Architecture:** One board with two shrines. Routing the beam to a shrine mints that shrine's key; each branch of the fork is gated on one of the two keys. Keys accumulate, so a returning player can solve the other way and open the other branch — the cost of a choice is a walk, never lost content. Core learns nothing about shrines: it gains an authorable gate key id (an opaque string) and an app-side registry of owned-key contributors. Everything else is the mod's.

**Tech Stack:** TypeScript, React, Vitest (co-located `*.spec.ts`), the existing world-gen DSL and family-plugin registries.

**Spec:** `docs/mods/floor-topology-design.md` (slice 1), with the mechanic's intent in `docs/game-design/floor-as-puzzle-brainstorm.md` §B.

## Global Constraints

- **Core names no mod.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` may not import `@/mods/<name>/`; no mod may import a sibling. Both are eslint errors at a zero backlog. Fix a hit by inverting the dependency, never by widening the allowlist.
- **Toggle-off is the acceptance gate.** With `witnessDoorMod` removed from `REGISTERED_MODS`, `yarn generate-world` and the app must still build and run — just without the mechanic.
- **The descriptor is React-free.** `src/mods/witnessDoor/index.ts` must not import anything under `app/` or `ui/`; `registeredMods.ts` is imported by world-gen scripts.
- **Every new behavior has a co-located spec.** See `docs/instructions/testing.md`.
- **Commit subject only**, `type: what changed`, ≤72 chars (`docs/instructions/commit-messages.md`).
- **One CHANGELOG `[Unreleased]` bullet for the whole feature**, added in the last task, ~20 words, no rationale.
- Run the suite with `yarn test <path>`; the whole suite with `yarn test`.

---

## File Structure

| File                                               | Responsibility                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/worldGen/dsl.ts`                              | `GateSpec`'s `floor-key` variant gains optional `keyId`                         |
| `src/worldGen/types.ts`                            | `SubSection["gate"]`'s `floor-key` variant gains optional `keyId`               |
| `src/game/siteAssembler.ts`                        | an authored `keyId` is used verbatim, and suppresses growing a key-host section |
| `src/app/families/ownedKeySources.ts`              | **new** — registry of app-side owned-key contributors                           |
| `src/app/SiteMap/SiteMapScreen.tsx`                | unions registered contributors into `ownedKeys`                                 |
| `src/mods/witnessDoor/index.ts`                    | **new** — the descriptor (id, families)                                         |
| `src/mods/witnessDoor/game/meta.ts`                | **new** — `FamilyMeta` for the `witnessDoor` family                             |
| `src/mods/witnessDoor/game/generateWitnessDoor.ts` | **new** — the two-shrine board and its per-goal solver check                    |
| `src/mods/witnessDoor/game/witnessKeys.ts`         | **new** — key id shape, shared by the mod's game and app halves                 |
| `src/mods/witnessDoor/app/plugin.tsx`              | **new** — family registration, owned-key source registration                    |
| `src/mods/witnessDoor/app/WitnessDoorPuzzle.tsx`   | **new** — the board, goal choice, mint on solve                                 |
| `src/mods/registeredMods.ts`                       | registers the mod                                                               |
| `src/mods/registerModApps.ts`                      | imports the mod's app entrypoint                                                |
| `src/worldGen/data.ts`                             | authors the mechanic onto one junior pyramid                                    |

---

### Task 1: An authored gate key id, and no key host for it

A `floor-key` gate today takes its key id from the assembler's own rotation, and the assembler grows a section to host that key's chest. A witness door supplies its own key, so the gate must be able to name one — and naming one must suppress the host.

**Files:**

- Modify: `src/worldGen/dsl.ts` (`GateSpec`), `src/worldGen/types.ts` (`SubSection["gate"]`)
- Modify: `src/game/siteAssembler.ts` (key assignment + host growth)
- Test: `src/game/siteAssembler.spec.ts`

**Interfaces:**

- Produces: `gate?: { type: "floor-key"; color?: KeyColor; keyId?: string; ownerMod?: string }` — an authored `keyId` is used verbatim as the gate room's `requiredKeyId`, and the floor grows no key-host section for that gate. `ownerMod` names who mints that key; Task 7 is what reads it. Both are authored provenance, so they arrive together.

- [ ] **Step 1: Write the failing test**

Add to `src/game/siteAssembler.spec.ts`:

```ts
describe("an authored floor-key id", () => {
  it("is used verbatim as the gate's requiredKeyId", () => {
    const grid = assembleFloor(
      {
        pathPuzzles: 2,
        difficulty: "junior",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          {
            pathPuzzles: 1,
            difficulty: "junior",
            end: "treasure",
            endReward: { type: "mosaic", tier: "junior" },
            gate: { type: "floor-key", keyId: "witness:east" },
          },
        ],
      },
      1234
    )
    const gates = grid.cells.flat().filter(c => c.type === "room" && c.requiredKeyId)
    expect(gates.map(g => (g as { requiredKeyId?: string }).requiredKeyId)).toContain("witness:east")
  })

  it("grows no key-host section for that gate", () => {
    const withAuthoredId = assembleFloor(
      {
        pathPuzzles: 2,
        difficulty: "junior",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          {
            pathPuzzles: 1,
            difficulty: "junior",
            end: "treasure",
            endReward: { type: "mosaic", tier: "junior" },
            gate: { type: "floor-key", keyId: "witness:east" },
          },
        ],
      },
      1234
    )
    const hostedKeys = withAuthoredId.cells.flat().filter(c => c.type === "room" && c.reward?.type === "tombKey")
    expect(hostedKeys).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/game/siteAssembler.spec.ts -t "an authored floor-key id"`
Expected: FAIL — the authored id is ignored (a rotation id appears instead), and a `tombKey` host chest is present.

- [ ] **Step 3: Implement**

In `src/worldGen/dsl.ts` and `src/worldGen/types.ts`, add `keyId?: string` to the `floor-key` gate variant. In `src/game/siteAssembler.ts`, where a `floor-key` gate is assigned its id from the colour rotation, prefer the authored id when present; where the assembler selects sections to host floor keys, skip gates whose id was authored.

Document the field in `src/worldGen/types.ts` in the codebase's own comment voice:

```ts
/** The key this gate wants, named by the author. Naming one means the AUTHOR owns where the key
 * comes from — a family that mints it, not a chest — so the floor grows no host section for it.
 * Opaque to core: it is a string, and nothing here knows what minted it. */
keyId?: string
/** Which mod mints that key. A gate naming one drops when that mod is not registered, so the
 * branch it guarded is simply open. Core compares it against the registered ids and names no mod. */
ownerMod?: string
```

Task 7 is what reads `ownerMod`; it is declared here because a key id and its provenance are one authoring decision, and splitting them would leave Task 6 authoring a field the type does not yet have.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/game/siteAssembler.spec.ts -t "an authored floor-key id"`
Expected: PASS

- [ ] **Step 5: Run the world sweeps**

Run: `yarn test src/app/SiteMap/worldFloorAssembly.spec.ts src/game/siteValidator.spec.ts`
Expected: PASS — no authored floor uses the new field yet, so nothing may move.

- [ ] **Step 6: Commit**

```bash
git add src/worldGen/dsl.ts src/worldGen/types.ts src/game/siteAssembler.ts src/game/siteAssembler.spec.ts
git commit -m "feat(worldgen): let a floor-key gate name its own key"
```

---

### Task 2: Owned keys may come from a registered contributor

`SiteMapScreen` computes `ownedKeys` as the grid's own keys plus ward keys. A key minted by a family is neither. Core gains a registry; core still names no mod.

**Files:**

- Create: `src/app/families/ownedKeySources.ts`
- Create: `src/app/families/ownedKeySources.spec.ts`
- Modify: `src/app/SiteMap/SiteMapScreen.tsx:127`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces:
  - `registerOwnedKeySource(id: string, source: OwnedKeySource): void`
  - `type OwnedKeySource = (ctx: { journeyId: string; levelNr: number; floorIndex: number }) => ReadonlySet<string>`
  - `ownedKeysFromSources(ctx): ReadonlySet<string>` — the union over every registered source, empty with none registered.

- [ ] **Step 1: Write the failing test**

Create `src/app/families/ownedKeySources.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest"
import { registerOwnedKeySource, ownedKeysFromSources, __resetOwnedKeySources } from "./ownedKeySources"

const ctx = { journeyId: "junior_2", levelNr: 3, floorIndex: 0 }

describe("owned key sources", () => {
  beforeEach(() => __resetOwnedKeySources())

  it("is empty when nothing is registered", () => {
    expect([...ownedKeysFromSources(ctx)]).toEqual([])
  })

  it("unions every registered source", () => {
    registerOwnedKeySource("a", () => new Set(["witness:east"]))
    registerOwnedKeySource("b", () => new Set(["witness:north"]))
    expect([...ownedKeysFromSources(ctx)].sort()).toEqual(["witness:east", "witness:north"])
  })

  it("passes the floor's context to each source", () => {
    registerOwnedKeySource("c", c => new Set([`${c.journeyId}#${c.levelNr}#${c.floorIndex}`]))
    expect([...ownedKeysFromSources(ctx)]).toEqual(["junior_2#3#0"])
  })

  it("replaces a source registered twice under one id", () => {
    registerOwnedKeySource("a", () => new Set(["old"]))
    registerOwnedKeySource("a", () => new Set(["new"]))
    expect([...ownedKeysFromSources(ctx)]).toEqual(["new"])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/app/families/ownedKeySources.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry**

Create `src/app/families/ownedKeySources.ts`:

```ts
export type OwnedKeySourceCtx = { journeyId: string; levelNr: number; floorIndex: number }
export type OwnedKeySource = (ctx: OwnedKeySourceCtx) => ReadonlySet<string>

// Keys a MOD mints — a family that hands one out on solve, rather than a chest the grid already
// holds or a ward key in the inventory. Core reads the union and names no mod; a source drops when
// its mod leaves REGISTERED_MODS, and with none registered this is empty.
const sources = new Map<string, OwnedKeySource>()

export const registerOwnedKeySource = (id: string, source: OwnedKeySource): void => {
  sources.set(id, source)
}

export const ownedKeysFromSources = (ctx: OwnedKeySourceCtx): ReadonlySet<string> => {
  const keys = new Set<string>()
  for (const source of sources.values()) for (const key of source(ctx)) keys.add(key)
  return keys
}

/** Test seam only — the registry is a module singleton, so a spec must be able to clear it. */
export const __resetOwnedKeySources = (): void => sources.clear()
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/app/families/ownedKeySources.spec.ts`
Expected: PASS

- [ ] **Step 5: Union the registry into the screen's owned keys**

In `src/app/SiteMap/SiteMapScreen.tsx`, extend the existing memo at line 127 so the registry is a third term beside the grid's keys and the ward keys. Keep the existing dependencies and add the floor context the source needs.

- [ ] **Step 6: Run the screen's spec**

Run: `yarn test src/app/SiteMap/SiteMapScreen.spec.tsx`
Expected: PASS — no sources are registered yet, so the union is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/app/families/ownedKeySources.ts src/app/families/ownedKeySources.spec.ts src/app/SiteMap/SiteMapScreen.tsx
git commit -m "feat(map): let a mod contribute keys the grid does not hold"
```

---

### Task 3: The two-shrine board

One board, two shrines. Each shrine is reachable by its own mirror placement, and each of those placements is the only way to reach that shrine — so neither goal is ambiguous, and the player is never told a legitimate answer is wrong.

**Files:**

- Create: `src/mods/witnessDoor/game/witnessKeys.ts`
- Create: `src/mods/witnessDoor/game/generateWitnessDoor.ts`
- Create: `src/mods/witnessDoor/game/generateWitnessDoor.spec.ts`

**Interfaces:**

- Produces:
  - `witnessKeyId(site: string, shrine: "east" | "north"): string` → `` `witness:${site}:${shrine}` ``
  - `type WitnessShrine = "east" | "north"`
  - `type WitnessBoard = { grid: LightbeamGrid; shrines: Record<WitnessShrine, { row: number; col: number }> }`
  - `generateWitnessDoor(seed: number, difficulty: Difficulty): WitnessBoard`
  - `solutionsFor(board: WitnessBoard, shrine: WitnessShrine): MirrorPlacement[][]` — every legal placement that lands the beam on that shrine.

- [ ] **Step 1: Write the failing test**

Create `src/mods/witnessDoor/game/generateWitnessDoor.spec.ts`:

```ts
import { describe, it, expect } from "vitest"
import { generateWitnessDoor, solutionsFor } from "./generateWitnessDoor"
import { witnessKeyId } from "./witnessKeys"

describe("witnessKeyId", () => {
  it("names a key per site and shrine", () => {
    expect(witnessKeyId("junior_2#2", "east")).toBe("witness:junior_2#2:east")
    expect(witnessKeyId("junior_2#2", "north")).toBe("witness:junior_2#2:north")
  })
})

describe("generateWitnessDoor", () => {
  it("is deterministic for a seed", () => {
    expect(generateWitnessDoor(99, "junior")).toEqual(generateWitnessDoor(99, "junior"))
  })

  it("gives each shrine exactly one solution", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const board = generateWitnessDoor(seed, "junior")
      expect(solutionsFor(board, "east")).toHaveLength(1)
      expect(solutionsFor(board, "north")).toHaveLength(1)
    }
  })

  it("makes the two solutions different from each other", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const board = generateWitnessDoor(seed, "junior")
      expect(solutionsFor(board, "east")[0]).not.toEqual(solutionsFor(board, "north")[0])
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/mods/witnessDoor/game/generateWitnessDoor.spec.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

Write `witnessKeys.ts` first (a template string and a union type — no logic). Then `generateWitnessDoor.ts`, built on the existing lightbeam generator in `src/mods/puzzle/game/lightbeam/`: place the emitter and two shrines, then draw and thin mirror placements, rejecting any board where `solutionsFor` returns anything but exactly one solution per shrine. Reject and reseed rather than repair — the same draw-derive-thin loop the other verifier-class families use.

`solutionsFor` enumerates legal placements and keeps those whose traced beam terminates on the named shrine. It is the verifier and the runtime check, so it must not be duplicated later.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/mods/witnessDoor/game/generateWitnessDoor.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/mods/witnessDoor/game/
git commit -m "feat(witness-door): generate a board with one solution per shrine"
```

---

### Task 4: The mod, registered and removable

**Files:**

- Create: `src/mods/witnessDoor/game/meta.ts`, `src/mods/witnessDoor/index.ts`
- Create: `src/mods/witnessDoor/index.spec.ts`
- Modify: `src/mods/registeredMods.ts`

**Interfaces:**

- Consumes: `generateWitnessDoor` from Task 3.
- Produces: `witnessDoorMod: ModDescriptor` with `id: "witnessDoor"`, and `WITNESS_DOOR_META: FamilyMeta` with `id: "witnessDoor"`, `ownerMod: "witnessDoor"`, `tags: ["puzzle"]`, `rewardPriority: 0`, `minTier: "junior"`.

`rewardPriority: 0` because this room's output is a key it mints itself, never a slot the generic loot pool may fill — the same reason a gate carries 0.

- [ ] **Step 1: Write the failing test**

Create `src/mods/witnessDoor/index.spec.ts`:

```ts
import { describe, it, expect } from "vitest"
import { witnessDoorMod } from "./index"
import { REGISTERED_MODS, isModEnabled } from "@/mods/registeredMods"

describe("the witnessDoor mod", () => {
  it("is registered", () => {
    expect(isModEnabled("witnessDoor")).toBe(true)
    expect(REGISTERED_MODS).toContain(witnessDoorMod)
  })

  it("contributes one family, owned by itself", () => {
    expect(witnessDoorMod.families?.map(f => f.id)).toEqual(["witnessDoor"])
    expect(witnessDoorMod.families?.[0].ownerMod).toBe("witnessDoor")
  })

  it("is never a candidate for the generic loot pool", () => {
    expect(witnessDoorMod.families?.[0].rewardPriority).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/mods/witnessDoor/index.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Write `meta.ts` and `index.ts` following `src/mods/mosaic/index.ts`'s shape: descriptor fields only for what this mod uses, and no import from `app/` or `ui/`. Add `witnessDoorMod` to `REGISTERED_MODS`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/mods/witnessDoor/index.spec.ts`
Expected: PASS

- [ ] **Step 5: Verify the boundary holds**

Run: `yarn lint`
Expected: PASS — no core file imports `@/mods/witnessDoor/`, and the mod imports no sibling.

- [ ] **Step 6: Commit**

```bash
git add src/mods/witnessDoor/ src/mods/registeredMods.ts
git commit -m "feat(witness-door): register the mod and its family"
```

---

### Task 5: The room — choose a shrine, mint its key

**Files:**

- Create: `src/mods/witnessDoor/app/WitnessDoorPuzzle.tsx`, `src/mods/witnessDoor/app/plugin.tsx`
- Create: `src/mods/witnessDoor/app/WitnessDoorPuzzle.spec.tsx`, `src/mods/witnessDoor/app/plugin.spec.ts`
- Create: `src/mods/witnessDoor/app/WitnessDoorPuzzle.stories.tsx`
- Modify: `src/mods/registerModApps.ts`

**Interfaces:**

- Consumes: `generateWitnessDoor`, `solutionsFor`, `witnessKeyId` (Task 3); `registerOwnedKeySource` (Task 2); `WITNESS_DOOR_META` (Task 4).
- Produces: a registered family `witnessDoor`, and a registered owned-key source under the same id whose set is the shrines solved at that site.

Every component under `src/ui/` needs a story; this one lives under `src/mods/`, and follows the same rule its neighbours in `src/mods/puzzle/app/` do.

- [ ] **Step 1: Write the failing test**

Create `src/mods/witnessDoor/app/WitnessDoorPuzzle.spec.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WitnessDoorPuzzle } from "./WitnessDoorPuzzle"
import { generateWitnessDoor, solutionsFor } from "../game/generateWitnessDoor"

const board = generateWitnessDoor(1, "junior")

describe("WitnessDoorPuzzle", () => {
  it("offers both shrines as goals", () => {
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={vi.fn()} />)
    expect(screen.getByRole("button", { name: /east/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /north/i })).toBeInTheDocument()
  })

  it("mints only the chosen shrine's key when that shrine's solution is given", async () => {
    const onMint = vi.fn()
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={onMint} />)
    await userEvent.click(screen.getByRole("button", { name: /east/i }))
    applySolution(solutionsFor(board, "east")[0])
    expect(onMint).toHaveBeenCalledWith("witness:junior_2#2:east")
    expect(onMint).not.toHaveBeenCalledWith("witness:junior_2#2:north")
  })

  it("does not mint when the beam lands on the other shrine", async () => {
    const onMint = vi.fn()
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={onMint} />)
    await userEvent.click(screen.getByRole("button", { name: /east/i }))
    applySolution(solutionsFor(board, "north")[0])
    expect(onMint).not.toHaveBeenCalled()
  })
})
```

`applySolution` is a helper in this spec that clicks each cell of a placement in turn; write it against the board's rendered cells, the way `LightbeamBoard.spec.tsx` drives its own board.

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/mods/witnessDoor/app/WitnessDoorPuzzle.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Build on `src/mods/puzzle/app/lightbeam/LightbeamBoard.tsx` for the board and its pointer handling. The goal choice is a control above the board; the chosen shrine is the win condition, and reaching the other one is simply not a solve.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/mods/witnessDoor/app/WitnessDoorPuzzle.spec.tsx`
Expected: PASS

- [ ] **Step 5: Register the family and the key source**

Write `plugin.tsx` following `src/mods/puzzle/app/lightbeam/plugin.tsx`: gate registration on `isModEnabled("witnessDoor")`, register the family, and register an owned-key source under the same id reading the shrines solved at that site from the mod's persisted state (`useModState`'s store, read outside React by the source). Add `import "./witnessDoor/app"` to `src/mods/registerModApps.ts`.

- [ ] **Step 6: Write the plugin's spec**

Create `src/mods/witnessDoor/app/plugin.spec.ts` asserting the family resolves by id and by its `puzzle` tag, and that a minted shrine appears in `ownedKeysFromSources` for that site and not for another.

- [ ] **Step 7: Run both specs and the story build**

Run: `yarn test src/mods/witnessDoor/`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/mods/witnessDoor/app/ src/mods/registerModApps.ts
git commit -m "feat(witness-door): solve toward a shrine to mint its key"
```

---

### Task 6: Author it into the world

**Files:**

- Modify: `src/worldGen/data.ts`
- Modify: `src/data/generatedWorld.ts` (generated — never hand-edited)
- Test: `src/worldGen/configBuilder.integration.spec.ts`

**Interfaces:**

- Consumes: the authored `keyId` gate (Task 1), the `witnessDoor` family (Task 4).

The site is one junior pyramid, because junior is the tier that debuts the fork (`pyramid-interior-design.md` §7) and a fork that decides itself is what this mechanic is for.

- [ ] **Step 1: Write the failing test**

Add to `src/worldGen/configBuilder.integration.spec.ts`:

`buildConfigs` takes its mod contributions as **positional** parameters; this spec already has a `buildRealConfigs()` helper that passes the real aggregates. Use it — do not call `buildConfigs` directly.

```ts
it("authors a witness door whose two branches want its two keys", () => {
  const site = buildRealConfigs().junior_2[1]
  const floor = site[0]
  const gateKeys = floor.sideSections.map(s => (s.gate && "keyId" in s.gate ? s.gate.keyId : undefined)).filter(Boolean)
  expect(gateKeys).toEqual(["witness:junior_2#2:east", "witness:junior_2#2:north"])
  const owners = floor.sideSections.map(s => (s.gate && "ownerMod" in s.gate ? s.gate.ownerMod : undefined))
  expect(owners).toEqual(["witnessDoor", "witnessDoor"])
  expect(JSON.stringify(floor)).toContain("witnessDoor")
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/worldGen/configBuilder.integration.spec.ts -t "witness door"`
Expected: FAIL — nothing authors it.

- [ ] **Step 3: Author it**

In `src/worldGen/data.ts`, give that pyramid a fork with two side sections, each gated on one witness key, and put a `witnessDoor` encounter on the main-path room before the fork.

- [ ] **Step 4: Regenerate and verify the world**

Run: `yarn generate-world && yarn validate-world`
Expected: both succeed; `src/data/generatedWorld.ts` changes only for that pyramid.

- [ ] **Step 5: Run the world sweeps**

Run: `yarn test src/app/SiteMap/worldFloorAssembly.spec.ts src/worldGen/`
Expected: PASS — every floor still carves, and every reward is still reachable.

- [ ] **Step 6: Commit**

```bash
git add src/worldGen/data.ts src/data/generatedWorld.ts src/worldGen/configBuilder.integration.spec.ts
git commit -m "feat(world): give a junior pyramid a witness door"
```

---

### Task 7: The toggle-off proof

The acceptance gate. Not a green suite — a build with the mod gone.

**Files:**

- Create: `src/mods/witnessDoor/toggleOff.spec.ts`
- Modify: `CHANGELOG.md`

`TARGET.md` is explicit that a green suite is **not** the gate — the gate is a build with the entry gone (Step 5). The unit test below covers only the generic rule the manual proof depends on.

- [ ] **Step 1: Write the test**

Create `src/mods/witnessDoor/toggleOff.spec.ts`:

```ts
import { describe, it, expect } from "vitest"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"

const floor = {
  pathPuzzles: 2,
  difficulty: "junior" as const,
  end: "treasure" as const,
  exitOrStaircase: "exit" as const,
  sideSections: [
    {
      pathPuzzles: 1,
      difficulty: "junior" as const,
      end: "treasure" as const,
      gate: { type: "floor-key" as const, keyId: "witness:junior_2#2:east", ownerMod: "witnessDoor" },
    },
    {
      pathPuzzles: 1,
      difficulty: "junior" as const,
      end: "treasure" as const,
      gate: { type: "floor-key" as const, color: "red" as const },
    },
  ],
}

describe("dropUnownedAuthoring", () => {
  it("drops a gate whose owning mod is not registered", () => {
    const dropped = dropUnownedAuthoring(floor, new Set(["mosaic"]))
    expect(dropped.sideSections[0].gate).toBeUndefined()
  })

  it("keeps a gate whose owning mod is registered", () => {
    const kept = dropUnownedAuthoring(floor, new Set(["witnessDoor"]))
    expect(kept.sideSections[0].gate).toEqual(floor.sideSections[0].gate)
  })

  it("never touches untagged authoring, which is core's", () => {
    const dropped = dropUnownedAuthoring(floor, new Set())
    expect(dropped.sideSections[1].gate).toEqual(floor.sideSections[1].gate)
  })
})
```

A gate whose minting mod is gone must **drop**, not stand locked forever — `floor-topology-design.md`'s mod-owned authoring rule. Dropping this restriction leaves both branches open, which is the permissive degradation that rule predicts.

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn test src/mods/witnessDoor/toggleOff.spec.ts`
Expected: FAIL — `@/worldGen/modOwnedAuthoring` does not exist.

- [ ] **Step 3: Implement**

Create `src/worldGen/modOwnedAuthoring.ts` exporting `dropUnownedAuthoring(floor: FloorConfig, registeredModIds: ReadonlySet<string>): FloorConfig`, add the optional `ownerMod?: string` to the gate spec beside `keyId`, and call it in `buildConfigs` over every floor with the registered ids the script already injects. Core checks "is this authoring's owner registered" and never names a mod.

- [ ] **Step 4: Run it to verify it passes**

Run: `yarn test src/mods/witnessDoor/toggleOff.spec.ts`
Expected: PASS

- [ ] **Step 5: Prove it by hand — this is the gate**

Remove `witnessDoorMod` from `REGISTERED_MODS`, then run `yarn generate-world` and start the app. Both must work, with both branches simply open. Restore the entry afterwards.

- [ ] **Step 6: Add the changelog entry**

One bullet under `[Unreleased]`, ~20 words, one fact, no rationale:

```markdown
- A junior pyramid's fork now opens the branch matching which shrine you route the beam to.
```

- [ ] **Step 7: Run the whole suite**

Run: `yarn test && yarn lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/mods/witnessDoor/toggleOff.spec.ts src/worldGen/configBuilder.ts CHANGELOG.md
git commit -m "feat(witness-door): drop the mechanic's gates when the mod is off"
```

---

## What this slice deliberately leaves out

- **The flip (B4).** Keys accumulate, so a returning player solves the other way and holds both. A switch that closes one branch again would be state with nothing asking for it.
- **More than one site.** One authored pyramid proves the mechanic; spreading it is authoring, and it wants the condition-dispatch decision first (`floor-as-puzzle-brainstorm.md`).
- **The other five slices.** Each gets its own plan when this one's toggle-off proof lands, so no primitive is invented ahead of a mod that uses it (`TARGET.md`).
