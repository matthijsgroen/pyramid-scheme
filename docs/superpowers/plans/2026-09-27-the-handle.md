# The Handle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lever a player throws, with named positions, that opens a gate on another section of the same floor — and the marks that tell the player which lever drives which door.

**Architecture:** A handle is a puzzle family with no generator (`key-gate` is the precedent) standing in an authored section, owning gates written onto other sections' entrances. Its position is **stored**, and the open doors are **derived** from it; the shipped lightbeam switch is converted onto the same storage first, so one field means "which position is this mechanism in" for every mechanism the game has. `floorLock` learns mechanisms from one record on the cell rather than from two parallel routes.

**Tech Stack:** React 19, TypeScript, Vitest, localForage (IndexedDB), Tailwind v4, i18next.

**Spec:** `docs/mods/floor-topology-design.md` (single source of truth), `docs/authored-locks-roadmap.md` §4, `docs/handover-topology-release.md`.

## Global Constraints

- **An ingredient is held to a higher bar than a floor.** A handle's mistakes repeat in all 56 master/wizard gates that will be rebuilt on it. Do not trade that for a shorter road to `doubleBack`.
- **Ask of every check whether it could EVER have failed.** A test deriving its expectation from the code it tests, a loop that skips on failure, a spec path that does not exist — all three shipped on this branch already.
- **Dispatch narrow.** An implementer makes the edits and runs the targeted specs named in their task. The controlling session runs `yarn test`, `yarn lint --fix`, `betterer`, `generate-world`, `validate-world`.
- **`yarn lint --fix` BEFORE `betterer`.** Betterer records a content hash per file; formatting after it invalidates the results and CI fails where local passed.
- **`INCLUDE_DEV=1 yarn generate-world` writes the develop journey into `src/data/generatedWorld.ts`.** Regenerate without it afterwards or the tree stays dirty with a world nobody ships.
- **`yarn check-types` is the truth.** IDE diagnostics were wrong every single time last session.
- **Saves reset this release**, so a save-format change owes no migration. It does NOT excuse an identity ambiguous inside one playthrough.
- Every user-facing string is localised in **both** `public/locales/en/common.json` and `public/locales/nl/common.json`.
- Seeded randomness only — `src/game/random.ts`, never `Math.random()`.
- Commit messages are **one line**, lower-case, conventional-commit prefixed.

---

## The decisions this plan is built on

Recorded here because tasks argue from them.

**1. The position is stored; the open doors are derived.** The shipped switch stores `openWaysOut` — the consequence. That cannot represent a mechanism position which opens nothing, because absence of an entry already means "never touched". The moment any gate is authored to start open, a player who throws the lever to a rest position, reloads, and finds the door open again has had their move silently undone — inside one playthrough, on the first visit. `getOpenWaysOut` (`src/app/state/useJourneys.ts:514`) also discards the switch address entirely and returns a bare set of key ids, so a stored consequence cannot be read back as a position at all.

**1a. This release is the last save break, so the stored shape is chosen to outlast it.** Two consequences, both owner-ruled. **One name for the rest position** — `MECHANISM_AT_REST = "rest"`, in the save and in the compiled lock alike; there is no second vocabulary. And **the positions are a map, not the packed `address=value` strings** the sibling fields use.

The map's reason, stated accurately because the first version of it was overstated: the sibling fields hold *sets of addresses*, while this holds a *mapping*, and storing a mapping as a mapping is less code at every read and write. It is **not** that a packed entry would be ambiguous today — `USABLE_LABEL` (`siteAssembler.ts:148`, `/^[A-Za-z0-9][A-Za-z0-9_-]*$/`, enforced in `sectionAddresses` before any carve) admits no separator into an authored label, so a packed entry parses fine. The durability argument is narrower and survives: a packed format's correctness rests on a regex in another file continuing to forbid those characters, and a map's does not.

**2. One record on the cell, `mechanism`, serves both the runtime and the walk.** `floorLock` today learns the switch from `exits[].gateKeyId`; a handle is not a fork and has no such exits. Rather than a second parallel route — the defect shape this branch has paid for three times — both mechanisms write one record, and `floorLock` and `useAssembledFloor` each read that one record.

**3. Whether a mechanism can return to rest is data, not an assumption.** A beam board routes its light somewhere every time it is solved and cannot be un-solved; a lever can be thrown back. `floorLock`'s switch route deliberately excludes `unset` as a transition target. Unifying the two routes under a shared assumption would either add a false transition to the switch (a stricter walk, so a false build failure on the shipped junior_2 floor) or drop a real one from the handle (a permissive walk, which hides exactly the traps the walk exists to find). So the cell carries `restReachable`.

**4. `startsOpen` is NOT in scope.** It is one of step 5's five blocked design questions ("What does `startsOpen` mean to a carve that places a gate cell before the content it guards?") and the owner's to answer. Every handle gate starts shut, and the handle starts at rest.

**5. The lever prop does not draw its position.** One prop per rank, a lever at rest. The position changes, and the thing that shows a changing value on this map is the marker, not the tile art — so a per-position render would be three drawings per rank saying what the marker already says. Flagged for the owner in Task 9; overruling it costs one render per position per rank.

---

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `src/app/state/useJourneys.ts` | `mechanismStates` storage, replacing `openWaysOut` | 1 |
| `src/app/SiteMap/useMechanismStates.ts` (new) | memoised map of address → position | 1 |
| `src/game/siteTypes.ts` | `MechanismRecord` on `RoomCell`, `handles` on `FloorConfig`, `Mark` | 2, 3, 7 |
| `src/game/mechanismDoors.ts` (new) | position map → open gate key ids, from the grid | 2 |
| `src/app/SiteMap/useAssembledFloor.ts` | consume the derived open set | 2 |
| `src/game/siteAssembler.ts` | write `mechanism` for switch and handle; place the lever; gate the driven sections | 2, 3, 7 |
| `src/worldGen/{types,dsl,serializer,buildSite,capabilities,validate}.ts` | `handles` through the authoring pipeline | 3 |
| `src/game/floorLock.ts` | one mechanism route, reading `mechanism` | 4 |
| `src/mods/topology/game/handle/meta.ts` (new) | the family, no generator | 5 |
| `src/mods/topology/app/handle/plugin.tsx` (new) | registration, reads/writes the position | 5 |
| `src/app/SiteMap/nodeKinds.ts`, `nodeShapes.tsx` | `ShapeKind` `"handle"`, `HandleShape`, `nodeRadius` | 6 |
| `src/app/SiteMap/mark.tsx` (new) | a glyph on a KeyColor ground | 7 |
| `src/worldGen/spec/dev.ts`, `src/worldGen/data.ts` | the dev floor | 8 |
| `scripts/renderProp.py`, `docs/instructions/repaint-queue.md` | the lever prop | 9 |

---

### Task 1: Store the position, not the consequence

Converts the shipped switch onto position storage. **No handle yet** — this task's whole value is that it changes the storage under content that already works, so the conversion is provable.

**Files:**
- Modify: `src/app/state/useJourneys.ts:24-79` (the type), `:485-519` (setters and reader)
- Create: `src/app/SiteMap/useMechanismStates.ts`
- Delete: `src/app/SiteMap/useOpenWaysOut.ts`
- Modify: `src/app/SiteMap/SiteMapScreen.tsx:74`, `src/mods/topology/app/lightbeamSwitch/plugin.tsx:51,67,73`
- Test: `src/app/state/useJourneys.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `setMechanismState(address: string, stateId: string): void`, `getMechanismStates(journeyId: string): ReadonlyMap<string, string>`, `MECHANISM_AT_REST = "rest"`, and `useMechanismStates(journeys: JourneyAPI, journeyId: string): ReadonlyMap<string, string>`.

- [ ] **Step 1: Write the failing test**

In `src/app/state/useJourneys.spec.ts`, beside the existing `openWaysOut` tests:

```typescript
describe("mechanism positions", () => {
  it("tells a mechanism put back to rest apart from one never touched", () => {
    const { result } = renderHook(() => useJourneys(), { wrapper })
    act(() => result.current.startJourney("dev_topology"))

    const untouched = result.current.getMechanismStates("dev_topology")
    expect(untouched.has("s0#0/p1")).toBe(false)

    act(() => result.current.setMechanismState("s0#0/p1", "s1"))
    expect(result.current.getMechanismStates("dev_topology").get("s0#0/p1")).toBe("s1")

    act(() => result.current.setMechanismState("s0#0/p1", MECHANISM_AT_REST))
    const atRest = result.current.getMechanismStates("dev_topology")
    expect(atRest.get("s0#0/p1")).toBe(MECHANISM_AT_REST)
    expect(atRest.has("s0#0/p1")).toBe(true)
  })

  it("keeps one position per mechanism, replacing rather than accumulating", () => {
    const { result } = renderHook(() => useJourneys(), { wrapper })
    act(() => result.current.startJourney("dev_topology"))
    act(() => result.current.setMechanismState("s0#0/p1", "s1"))
    act(() => result.current.setMechanismState("s0#0/p1", "s2"))
    expect([...result.current.getMechanismStates("dev_topology")]).toEqual([["s0#0/p1", "s2"]])
  })

  it("stores a position value without interpreting it, whatever characters it carries", () => {
    const { result } = renderHook(() => useJourneys(), { wrapper })
    act(() => result.current.startJourney("dev_topology"))
    act(() => result.current.setMechanismState("s0#0/p1", "odd=label"))
    expect(result.current.getMechanismStates("dev_topology").get("s0#0/p1")).toBe("odd=label")
  })
})
```

The third test holds that the storage layer does not interpret the value it is handed. It is a cheap regression guard against a future implementation that splits naively on a separator — **not** evidence for choosing a map over packed strings. Measured after the fact: it does not go red against the packed format either, because that reader split on the *first* `=` and so round-tripped a value containing one. There is in fact no behavioural difference between the two shapes to test: the key cannot carry a separator (`USABLE_LABEL`), and any value survives a first-`=` split. The map is a judgment about code clarity and about not resting on a regex in another file — it is not a correctness fix, and no test can pretend otherwise.

The first test is the one that fails against consequence storage and passes against position storage — it is the whole reason for this task. Note it asserts `.has()` and not only `.get()`.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/app/state/useJourneys.spec.ts -t "mechanism positions"`
Expected: FAIL — `result.current.setMechanismState is not a function`.

- [ ] **Step 3: Replace the stored field**

In `src/app/state/useJourneys.ts`, replace the `openWaysOut` field (line ~62) with:

```typescript
    /** Which POSITION each mechanism on this site stands in, keyed `${levelNr}:${mechanismAddress}`.
     *
     * The position, never the consequence. A mechanism whose current position opens nothing is a real
     * position and has an entry; absence means only that nobody has touched it, and the mechanism sits
     * at whatever its floor says it starts at. Storing which doors stood open instead cannot tell those
     * two apart, so a lever thrown back to rest would spring forward again on the next load.
     *
     * A map rather than the packed `address=value` strings the fields above use, because the value here
     * is authored rather than generated: a handle's positions are named after the sections it drives,
     * and an authored label carrying the separator would make the entry ambiguous to parse. A map has no
     * separator between key and value, so no authored string can ever collide with one.
     *
     * Which doors that position opens is read off the floor (src/game/mechanismDoors.ts), because the
     * mapping belongs to the grid and a save that carried it would go stale against a re-carve.
     *
     * The address is the mechanism's own cell address — authored, so a re-carve moves the cell and takes
     * the entry with it. Exactly one entry per mechanism, which is what a map gives for free. */
    mechanismStates?: Record<string, string>
```

- [ ] **Step 4: Replace the setters and the reader**

Replace `setOpenWayOut` and `shutWaysOut` (lines ~485-512) with one setter, and `getOpenWaysOut` (~514-519) with a map reader:

```typescript
/** The position a mechanism sits in when it opens nothing. One name for it, in the save and in the
 * compiled lock alike — a lever thrown back here and a lever never touched are the same POSITION and a
 * different FACT, which is why one is stored and the other is absent. */
export const MECHANISM_AT_REST = "rest"

  const setMechanismState = (address: string, stateId: string) => {
    if (!activeJourneyId) return
    const at = atLevel(address)
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        if (j.mechanismStates?.[at] === stateId) return j
        return { ...j, mechanismStates: { ...(j.mechanismStates ?? {}), [at]: stateId } }
      })
    )
  }
```

`getMechanismStates(journeyId): ReadonlyMap<string, string>` returns the entries for the current level with the `${levelNr}:` prefix stripped, keyed by the bare address. Follow whatever `forThisLevel` does for the sibling fields; if it only accepts arrays, add the map-shaped equivalent beside it rather than round-tripping through an array to reuse it.

Export both from the hook's returned object and from its `JourneyAPI` type, alongside `MECHANISM_AT_REST`.

- [ ] **Step 5: Replace the memo hook**

Delete `src/app/SiteMap/useOpenWaysOut.ts`. Create `src/app/SiteMap/useMechanismStates.ts`:

```typescript
import { useMemo } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"

/** The positions every mechanism on this journey stands in, stable by content so a re-render does not
 * re-carve the floor. Keyed by the mechanism's cell address. */
export const useMechanismStates = (journeys: JourneyAPI, journeyId: string): ReadonlyMap<string, string> => {
  const entries = [...journeys.getMechanismStates(journeyId)].sort(([a], [b]) => a.localeCompare(b))
  // The memo key is JSON rather than joined strings: a position id is authored, so any separator
  // chosen here could turn up inside a value and two different maps would memo to one key.
  const key = JSON.stringify(entries)
  return useMemo(() => new Map(JSON.parse(key) as [string, string][]), [key])
}
```

- [ ] **Step 6: Convert the switch plugin onto it**

In `src/mods/topology/app/lightbeamSwitch/plugin.tsx`, the board's position IS the way out it routes to, so the conversion is an identity: at line ~51 read `journeys.getMechanismStates(ctx.journeyId).get(address)` in place of the open-set membership check; at ~67 call `journeys.setMechanismState(address, MECHANISM_AT_REST)` where it called `shutWaysOut(address)`; at ~73 call `journeys.setMechanismState(address, id)` where it called `setOpenWayOut(address, id)`.

- [ ] **Step 7: Keep the floor assembling**

In `src/app/SiteMap/SiteMapScreen.tsx:74`, swap `useOpenWaysOut` for `useMechanismStates`. `useAssembledFloor` still wants a set of open key ids; until Task 2 derives it properly, pass the positions through the same identity the switch uses so this task stays green on its own:

```typescript
const mechanismStates = useMechanismStates(journeys, journeyId)
// ponytail: a switch's position IS the key id of the way out it opens, so the set is the positions
// that are not rest. Task 2 replaces this with the grid-driven derivation that also serves a handle.
const openWaysOut = useMemo(
  () => new Set([...mechanismStates.values()].filter(s => s !== MECHANISM_AT_REST)),
  [mechanismStates]
)
```

- [ ] **Step 8: Run the tests**

Run: `yarn vitest run src/app/state/useJourneys.spec.ts src/app/SiteMap src/mods/topology`
Expected: PASS, including both new tests.

- [ ] **Step 9: Prove the shipped floor did not move**

Run: `yarn check-types && yarn generate-world && git diff --stat src/data/generatedWorld.ts`
Expected: `generatedWorld.ts` byte-identical (no diff). This task claims to change storage only, so a diff here means the claim was wrong.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: a mechanism stores which position it is in, not which doors that opened"
```

---

### Task 2: Derive the open doors from the position

Puts the mapping on the cell and reads it back from the grid. Still switch-only, so the derivation is proved on shipped content before a handle exists to hide behind it.

**Files:**
- Modify: `src/game/siteTypes.ts` (add `MechanismRecord`, `RoomCell.mechanism`)
- Create: `src/game/mechanismDoors.ts`, `src/game/mechanismDoors.spec.ts`
- Modify: `src/game/siteAssembler.ts` (write `mechanism` where it writes `exits[].gateKeyId`)
- Modify: `src/app/SiteMap/useAssembledFloor.ts:307-343`, `src/app/SiteMap/SiteMapScreen.tsx`

**Interfaces:**
- Consumes: `useMechanismStates`, `MECHANISM_AT_REST` from Task 1.
- Produces: `type MechanismRecord = { positions: { state: string; gateKeyId: string }[]; restReachable: boolean }`, `RoomCell.mechanism?: MechanismRecord`, and `openDoorsFor(grid: FloorGrid, floor: number, positions: ReadonlyMap<string, string>): Set<string>`.

- [ ] **Step 1: Add the record to the cell type**

In `src/game/siteTypes.ts`, on `RoomCell` (beside `exits`, ~line 230):

```typescript
  /** THIS ROOM IS A MECHANISM: which gate key id each of its positions opens, and whether it can be
   * put back to the position that opens nothing.
   *
   * One record for every mechanism the floor has, so the walk (src/game/floorLock.ts) and the runtime
   * (src/game/mechanismDoors.ts) read the same list rather than each deriving one. A switch also
   * reports its doors on `exits[].gateKeyId`, which is what its own board reads to know what to draw;
   * this is the same doors said once more in the form a mechanism is asked for.
   *
   * `restReachable` is a fact about the thing, not a convention: a board routes its light somewhere
   * every time it is solved and cannot be un-solved, while a lever can be thrown back. Assuming either
   * for both gives the walk a transition the player does not have, or takes one they do. */
  mechanism?: MechanismRecord
```

And the type, near `GateConfig`:

```typescript
export type MechanismRecord = {
  /** One entry per position that opens something. The rest position opens nothing and is not listed. */
  positions: { state: string; gateKeyId: string }[]
  restReachable: boolean
}
```

- [ ] **Step 2: Write the failing test**

Create `src/game/mechanismDoors.spec.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { openDoorsFor } from "./mechanismDoors"
import { MECHANISM_AT_REST } from "@/app/state/useJourneys"
import { gridWithMechanism } from "./testSupport/mechanismFixtures"

describe("openDoorsFor", () => {
  it("opens the one door the stored position names", () => {
    const grid = gridWithMechanism("s0#0/p1", [
      { state: "left", gateKeyId: "handle:dev#0#0#0:s1" },
      { state: "right", gateKeyId: "handle:dev#0#0#0:s2" },
    ])
    expect([...openDoorsFor(grid, 0, new Map([["s0#0/p1", "left"]]))]).toEqual(["handle:dev#0#0#0:s1"])
  })

  it("opens nothing for a mechanism at rest, and nothing for one never touched", () => {
    const grid = gridWithMechanism("s0#0/p1", [{ state: "left", gateKeyId: "handle:dev#0#0#0:s1" }])
    expect(openDoorsFor(grid, 0, new Map([["s0#0/p1", MECHANISM_AT_REST]])).size).toBe(0)
    expect(openDoorsFor(grid, 0, new Map()).size).toBe(0)
  })

  it("ignores a stored position this build no longer has", () => {
    const grid = gridWithMechanism("s0#0/p1", [{ state: "left", gateKeyId: "handle:dev#0#0#0:s1" }])
    expect(openDoorsFor(grid, 0, new Map([["s0#0/p1", "gone"]])).size).toBe(0)
  })
})
```

Write `src/game/testSupport/mechanismFixtures.ts` building a minimal 3x3 `FloorGrid` with one room carrying `mechanism` and a `sectionAddress`/`ordinal` that make `cellAddress` return the given address. Follow the fixture style already in `src/game/floorLock.spec.ts`.

- [ ] **Step 3: Run it and watch it fail**

Run: `yarn vitest run src/game/mechanismDoors.spec.ts`
Expected: FAIL — cannot resolve `./mechanismDoors`.

- [ ] **Step 4: Write the derivation**

Create `src/game/mechanismDoors.ts`:

```typescript
import type { FloorGrid } from "./siteTypes"
import { cellAddress } from "@/app/SiteMap/cellIdentity"

// WHICH DOORS STAND OPEN IS ASKED OF EACH MECHANISM'S OWN MAPPING, NEVER STORED. The save holds the
// position; the floor holds what that position opens. Keeping the mapping here rather than in the save
// is what lets a re-carve move a door without a stored entry coming to fit one it was never set for.
export const openDoorsFor = (
  grid: FloorGrid,
  floor: number,
  positions: ReadonlyMap<string, string>
): Set<string> => {
  const open = new Set<string>()
  if (positions.size === 0) return open
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism) continue
      const at = cellAddress(grid, floor, r, c)
      if (!at) continue
      const state = positions.get(at)
      if (state === undefined) continue
      // A position this build no longer has simply opens nothing — the same answer as rest, and the
      // only safe one: guessing at the nearest position would open a door nobody solved for.
      for (const p of cell.mechanism.positions) if (p.state === state) open.add(p.gateKeyId)
    }
  return open
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `yarn vitest run src/game/mechanismDoors.spec.ts`
Expected: PASS, all three.

- [ ] **Step 6: Write `mechanism` for the switch in the assembler**

In `src/game/siteAssembler.ts`, where a switch's closed ways out are written onto `exits[].gateKeyId` (near line 528), also write the record onto the same fork room:

```typescript
      // The same doors, said once more in the form a mechanism is asked for. A board cannot be
      // un-solved — solving it always routes the light to some shrine — so it never returns to rest
      // of the player's choosing, and the walk must not be handed a move they do not have.
      mechanism: {
        positions: closedExits.map(e => ({ state: e.gateKeyId!, gateKeyId: e.gateKeyId! })),
        restReachable: false,
      },
```

A switch's position id IS the key id of the way out it opens, which is why this mapping is an identity and why Task 1's stopgap was correct while it lasted.

- [ ] **Step 7: Use the derivation for real**

In `src/app/SiteMap/useAssembledFloor.ts`, change the parameter at line ~326 from `openedWaysOut?: ReadonlySet<string>` to `mechanismPositions?: ReadonlyMap<string, string>`, and at line ~340:

```typescript
  const carvedGrid = useMemo(
    () =>
      baseGrid
        ? sealWaysOut(openWaysOut(baseGrid, openDoorsFor(baseGrid, currentFloor, mechanismPositions ?? NO_POSITIONS)))
        : null,
    [baseGrid, currentFloor, mechanismPositions]
  )
```

with `const NO_POSITIONS: ReadonlyMap<string, string> = new Map()` at module scope. In `SiteMapScreen.tsx`, delete the Task 1 stopgap `useMemo` and pass `mechanismStates` straight through.

- [ ] **Step 8: Run the tests and prove the world did not move**

Run: `yarn vitest run src/game src/app/SiteMap src/mods/topology && yarn check-types`
Expected: PASS.

Run: `yarn generate-world && git diff --stat src/data/generatedWorld.ts`
Expected: no diff — `mechanism` is written onto the assembled grid, not into the stored configs.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: which doors a mechanism opens is read off the floor, not the save"
```

---

### Task 3: `handles` authoring, and the gates it writes

**Files:**
- Modify: `src/game/siteTypes.ts` (`FloorConfig.handles`)
- Modify: `src/worldGen/types.ts`, `dsl.ts`, `serializer.ts`, `buildSite.ts`, `capabilities.ts`, `validate.ts`
- Modify: `src/game/siteAssembler.ts`
- Test: `src/game/handleAuthoring.spec.ts` (new), `src/worldGen/handleAuthoring.spec.ts` (new)

**Interfaces:**
- Consumes: `MechanismRecord` from Task 2.
- Produces: `FloorConfig.handles?: { in: string; drives: string[] }[]`, and the key stem `handle:<journeyId>#<levelIndex>#<floorIndex>#<n>:<sectionAddress>`.

- [ ] **Step 1: Add the authoring field**

In `src/game/siteTypes.ts` on `FloorConfig`, beside `oneWays`:

```typescript
  /** A LEVER STANDING IN ONE SECTION THAT OPENS A GATE ON OTHERS. `in` names the section the lever
   * stands in; `drives` names the sections whose entrance gates it owns. Both are section addresses —
   * a `label` where a section has one, the positional `s0`/`s1.2` where it does not, and `main` for
   * the main path — the same vocabulary `oneWays` names its two ends with.
   *
   * Unlike `switches`, which stands an encounter in a junction and closes THAT junction's own ways out,
   * a handle reaches across the floor. That is the whole of what it buys, and it is what a fork cannot
   * express: the catalogue's "a lever elsewhere opens a door here".
   *
   * Each driven section gets a gate keyed `handle:<journeyId>#<levelIndex>#<floorIndex>#<n>:<address>`,
   * derived from where the floor was AUTHORED — neither end of which a re-carve can move, so a position
   * kept from an earlier layout cannot come to fit a door it was never thrown for.
   *
   * The lever starts at rest and every gate it drives starts shut. A gate that stands open when the
   * player arrives is `startsOpen`, which is step 5's and is not built — see
   * docs/authored-locks-roadmap.md. */
  handles?: { in: string; drives: string[] }[]
```

- [ ] **Step 2: Write the failing authoring test**

Create `src/game/handleAuthoring.spec.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import { floorWithHandle } from "./testSupport/handleFixtures"

describe("a floor authoring a handle", () => {
  it("stands the lever in the named section and gates each driven section", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault", "pocket"] })
    const lever = [...cells(grid)].find(c => c.type === "room" && c.tags?.includes("handle"))
    expect(lever).toBeDefined()
    expect(lever!.sectionAddress).toBe("lever")
    expect(lever!.mechanism).toEqual({
      positions: [
        { state: "vault", gateKeyId: "handle:dev_topology#0#0#0:vault" },
        { state: "pocket", gateKeyId: "handle:dev_topology#0#0#0:pocket" },
      ],
      restReachable: true,
    })
  })

  it("puts each gate on the section it names, asking for that handle's own key", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault", "pocket"] })
    const gates = [...cells(grid)].filter(c => c.type === "room" && c.tags?.includes("gate"))
    expect(gates.map(g => g.requiredKeyId).sort()).toEqual([
      "handle:dev_topology#0#0#0:pocket",
      "handle:dev_topology#0#0#0:vault",
    ])
  })

  it("fails the floor by name when a driven section has no address to resolve", () => {
    expect(() => floorWithHandle({ in: "lever", drives: ["nowhere"] })).toThrow(/nowhere/)
  })

  it("fails the floor when the lever's own section has no address", () => {
    expect(() => floorWithHandle({ in: "nowhere", drives: ["vault"] })).toThrow(/nowhere/)
  })
})
```

Note the last two: a refusal that names the unresolvable address, matching `oneWays`' own "refused before any attempt rather than re-carved sixty times" behaviour. Assert the address appears in the message, not merely that it throws.

- [ ] **Step 3: Run it and watch it fail**

Run: `yarn vitest run src/game/handleAuthoring.spec.ts`
Expected: FAIL — `floorWithHandle` does not exist.

- [ ] **Step 4: Resolve the addresses and refuse early**

In `src/game/siteAssembler.ts`, before the carve attempts (beside where `oneWays` resolves its two ends), resolve every `handles` entry's `in` and each of its `drives` to a section. Refuse the floor by name, before any attempt, when one does not resolve — the message naming the address that failed:

```typescript
  for (const [n, handle] of (config.handles ?? []).entries()) {
    if (!sectionByAddress.has(handle.in))
      throw new Error(`siteAssembler: on ${siteId} floor ${floorIndex}, handle ${n} stands in no section: ${handle.in}`)
    for (const driven of handle.drives)
      if (!sectionByAddress.has(driven))
        throw new Error(`siteAssembler: on ${siteId} floor ${floorIndex}, handle ${n} drives no section: ${driven}`)
  }
```

- [ ] **Step 5: Write the gate onto each driven section**

Where a section's `gate` is turned into a gate cell, a driven section takes an authored floor-key gate whose id is the derived stem. Set `requiredKeyId`, `tags: ["gate"]`, `gateVariant: "floor-key"` and the authored-key marker the type already carries (`siteTypes.ts:168`) — and **no** family, exactly as a switch's gate carries none: it is drawn as a gate and holds nothing to enter.

- [ ] **Step 6: Stand the lever and write its record**

In the lever's section, give one room the handle: `family: "handle"`, `tags: ["handle"]`, and the `mechanism` record with `restReachable: true` and one position per driven section, the position id being the driven section's own address.

- [ ] **Step 7: Carry `handles` through world-gen**

Add the field to `src/worldGen/types.ts`'s floor shape, accept it in `dsl.ts`'s `.floor()`/`.pyramid()` (at the same level `oneWays` is accepted — check `reference_worldgen_dsl_authoring`: `.floor()` drops tier-level fields), emit it in `serializer.ts`, pass it in `buildSite.ts`, allow it in `capabilities.ts` for the dev preset, and validate in `validate.ts` that no two handles on one floor drive the same section.

- [ ] **Step 8: Run the tests**

Run: `yarn vitest run src/game/handleAuthoring.spec.ts src/worldGen && yarn check-types`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: a floor authors a lever and the sections it opens"
```

---

### Task 4: The walk learns a handle

**Files:**
- Modify: `src/game/floorLock.ts:172-206`
- Test: `src/game/floorLock.spec.ts`

**Interfaces:**
- Consumes: `RoomCell.mechanism` from Task 2, the gates from Task 3.
- Produces: nothing new; `floorLock` keeps its signature.

- [ ] **Step 1: Write the failing test**

In `src/game/floorLock.spec.ts`:

```typescript
it("compiles a handle into a mechanism with a rest position it can return to", () => {
  const spec = floorLock(floorWithHandle({ in: "lever", drives: ["vault"] }).grid)!
  const handle = Object.entries(spec.mechanisms).find(([id]) => id.startsWith("handle "))![1]
  expect(handle.initial).toBe("rest")
  expect(handle.opens.rest).toEqual([])
  expect(handle.transitions.some(t => t.to === "rest")).toBe(true)
})

it("leaves a switch unable to return to the position that opens nothing", () => {
  const spec = floorLock(shippedSwitchGrid())!
  const sw = Object.entries(spec.mechanisms).find(([id]) => id.startsWith("switch "))![1]
  expect(sw.initial).toBe(MECHANISM_AT_REST)
  expect(sw.transitions.some(t => t.to === MECHANISM_AT_REST)).toBe(false)
})
```

The second test is the guard on decision 3 and **could** have failed: unify the two routes carelessly and it goes red.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/game/floorLock.spec.ts -t "handle"`
Expected: FAIL — no mechanism id starts with `handle `.

- [ ] **Step 3: Read mechanisms off the cell record**

Replace the `doorsBySwitch` scan and the switch mechanism block (lines ~98-120 and ~172-206) with one scan over cells carrying `mechanism`. Keep the two existing throws verbatim — the "leads to no room" one and the "but that room asks for" one — they are what catch a key id that does not match its door. The states are `[MECHANISM_AT_REST, ...positions.map(p => p.state)]` with rest opening nothing; transitions run from every state to every other, **excluding rest as a target when `restReachable` is false**.

**Rename the switch's rest state from `"unset"` to `MECHANISM_AT_REST`.** One name for the position a mechanism sits in when it opens nothing, here and in the save (decision 1a). This is a deliberate label change to a shipped floor's compiled lock, and step 5 is written to let it through while still catching anything else.

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/game/floorLock.spec.ts src/game/lockWalk.spec.ts`
Expected: PASS.

- [ ] **Step 5: Prove nothing about the shipped switch moved except the rename**

Dump junior_2 pyramid 2 floor 0's compiled spec **before** this task's edit, apply the one intended rename to that baseline, then dump it again after and diff:

```bash
# before the edit
yarn tsx scripts/dumpFloorLock.ts junior_2 2 0 > /tmp/lock-before.json
# the one change this task is allowed to make to a shipped floor
sed 's/"unset"/"rest"/g' /tmp/lock-before.json > /tmp/lock-expected.json
# after the edit
yarn tsx scripts/dumpFloorLock.ts junior_2 2 0 > /tmp/lock-after.json
diff /tmp/lock-expected.json /tmp/lock-after.json
```

Expected: no difference. Diffing against the renamed baseline rather than the raw one keeps the check sharp — it still fails on any change to the states, the gates, the owners or the transitions, and only the label it was told about gets through. A plain `diff` against the raw baseline would go noisy here, and a noisy check is one that stops being read.

Write `scripts/dumpFloorLock.ts` as part of this step if it does not exist: it assembles the named journey/level/floor and prints `JSON.stringify(floorLock(grid), null, 2)` with object keys sorted, so the diff is stable.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: the walk reads every mechanism off one record on the cell"
```

---

### Task 5: The handle family

**Files:**
- Create: `src/mods/topology/game/handle/meta.ts`, `src/mods/topology/app/handle/plugin.tsx`, `src/mods/topology/app/handle/HandleComponent.tsx`
- Modify: `src/mods/allFamilyMeta.ts:17`, `public/locales/en/common.json`, `public/locales/nl/common.json`
- Test: `src/mods/topology/app/handle/HandleComponent.spec.tsx`

**Interfaces:**
- Consumes: `setMechanismState`, `getMechanismStates`, `MECHANISM_AT_REST` (Task 1); `RoomCell.mechanism` (Task 2).
- Produces: `HANDLE_META: FamilyMeta` with `id: "handle"`.

- [ ] **Step 1: Write the meta**

`src/mods/topology/game/handle/meta.ts`:

```typescript
import type { FamilyMeta } from "@/game/families/familyMeta"

export const HANDLE_META: FamilyMeta = {
  id: "handle",
  ownerMod: "topology",
  // Its own tag, not "puzzle": what this room hands over is which door on the floor stands open, so a
  // room drawn into the generic pool would offer a lever with nothing on the end of it. Placed only
  // where a floor authors it by id, the same way lightbeamSwitch and crocodile stay out of the pool.
  tags: ["handle"],
  icon: "🎚️",
  color: "amber",
  // The lever is not a loot slot: what it hands over is the floor's own shape.
  rewardPriority: 0,
  invitation: "handle.invitation",
  // A lever that cannot be thrown back is a one-way key wearing a lever's coat, and the branch it shut
  // would hold content nothing could ever reach.
  reEnterable: true,
  // The position it was left in IS the mechanism, so the room reopens on it rather than offering a
  // lever at rest beside a door the player can see standing open.
  stateIsTheMechanism: true,
}
```

No `seedable` and no generator module — `key-gate` is the precedent: a family whose room asks something of the player without a board to bake.

- [ ] **Step 2: Write the failing component test**

`src/mods/topology/app/handle/HandleComponent.spec.tsx`:

```typescript
it("throws the lever to the position the player picks, and back to rest", async () => {
  const setMechanismState = vi.fn()
  render(<HandleComponent {...ctxWith({ positions: ["vault", "pocket"], setMechanismState })} />)
  await userEvent.click(screen.getByRole("button", { name: /vault/i }))
  expect(setMechanismState).toHaveBeenCalledWith("s0#0/p1", "vault")
  await userEvent.click(screen.getByRole("button", { name: /rest/i }))
  expect(setMechanismState).toHaveBeenCalledWith("s0#0/p1", MECHANISM_AT_REST)
})

it("shows which position the lever already stands in", () => {
  render(<HandleComponent {...ctxWith({ positions: ["vault", "pocket"], current: "pocket" })} />)
  expect(screen.getByRole("button", { name: /pocket/i })).toHaveAttribute("aria-pressed", "true")
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `yarn vitest run src/mods/topology/app/handle`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the component and plugin**

`HandleComponent.tsx` renders one button per position on the cell's `mechanism.positions`, plus a rest button when `restReachable`, each wearing the driven gate's mark (Task 7 supplies `MarkBadge`; until then render the position label alone). Reads the current position with `journeys.getMechanismStates(ctx.journeyId).get(address)`, writes with `journeys.setMechanismState`. `plugin.tsx` registers it inside `if (isModEnabled("topology"))`, with a generator as bare as `key-gate`'s:

```typescript
const generate = (): HandlePuzzle => ({ satisfied: true })
```

A lever is never unsolved — it is somewhere, and where it is is the point.

- [ ] **Step 5: Add the strings to both locales**

In `public/locales/en/common.json` beside `lightbeamSwitch`:

```json
  "handle": {
    "name": "The Lever",
    "invitation": "Throw the lever",
    "goal": "The lever stands at one setting, and the door it answers for stands open.",
    "rest": "Rest",
    "position": "Open the way to {{section}}"
  },
```

Add the Dutch in `public/locales/nl/common.json` in the same position.

- [ ] **Step 6: Register in the world-gen family list**

Add `HANDLE_META` to `ALL_FAMILY_META` in `src/mods/allFamilyMeta.ts:17`.

- [ ] **Step 7: Run the tests**

Run: `yarn vitest run src/mods/topology src/mods/allFamilyMeta.spec.ts src/worldGen/faces.spec.ts && yarn check-types`
Expected: PASS. `faces.spec.ts` checks face declarations against tags — `handle` is structural like `gate`, so confirm it belongs in that spec's `STRUCTURAL` set and add it if not.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: a lever is a family with positions and no board"
```

---

### Task 6: The lever on the map

**Files:**
- Modify: `src/app/SiteMap/nodeKinds.ts:9-33,43`, `src/app/SiteMap/nodeShapes.tsx:54-66,330-359`
- Test: `src/app/SiteMap/nodeKinds.spec.ts`, a Storybook story beside the existing node-shape stories

**Interfaces:**
- Consumes: `tags: ["handle"]` from Task 3.
- Produces: `ShapeKind` gains `"handle"`; `nodeRadius.handle`.

- [ ] **Step 1: Write the failing test**

```typescript
it("calls a room standing a lever a handle, not a puzzle", () => {
  expect(shapeKindFor(grid, 1, 1, { roomType: "room", tags: ["handle"], family: "handle" })).toBe("handle")
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/app/SiteMap/nodeKinds.spec.ts`
Expected: FAIL — receives `"puzzle"`.

- [ ] **Step 3: Add the kind**

In `nodeKinds.ts`, add `"handle"` to the `ShapeKind` union, and in `shapeKindFor` add the branch **before** the `gate` check:

```typescript
    if (cell.tags?.includes("handle")) return "handle"
```

- [ ] **Step 4: Draw it**

In `nodeShapes.tsx`, add `HandleShape` — a lever: an upright post with an arm swung off it, in the same outlined, fully-opaque idiom the other markers use so the player learns one shape rather than a per-tier one. Add `case "handle": return <HandleShape {...p} />` to the `NodeShape` switch and `handle: NODE_RADIUS_PUZZLE` to `nodeRadius` (a lever is somewhere to go, so it is sized like a room rather than like a junction's dot).

- [ ] **Step 5: Run the tests and look at it**

Run: `yarn vitest run src/app/SiteMap && yarn check-types`
Expected: PASS.

Then **look**: `yarn storybook`, open the node-shapes story, screenshot the handle beside a gate and a switch at each state (`fogged`/`visible`/`reachable`). Four defects were green in a passing suite last session and every one was caught by looking. Confirm it is distinguishable from the switch at map zoom, and that nothing is hidden behind the player's boots.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: a lever wears its own shape on the map"
```

---

### Task 7: Marks — a glyph on a coloured ground

**Files:**
- Create: `src/app/SiteMap/mark.tsx`, `src/app/SiteMap/mark.spec.tsx`
- Modify: `src/game/siteTypes.ts` (`Mark`, `RoomCell.mark`), `src/game/siteAssembler.ts`, `src/app/SiteMap/nodeShapes.tsx`, `src/app/SiteMap/SiteMapView.tsx:1443-1450`

**Interfaces:**
- Consumes: `keyColorHex` (`src/ui/tokens/keyColors.ts`), `HIEROGLYPHS_IN_FONT` (`src/ui/tokens/hieroglyphFont.generated.ts`).
- Produces: `type Mark = { color: KeyColor; glyph: number }`, `MARK_GLYPHS: readonly number[]`, `<MarkBadge mark={...} r={...} />`, `RoomCell.mark?: Mark`.

- [ ] **Step 1: Write the failing test**

`src/app/SiteMap/mark.spec.tsx`:

```typescript
import { MARK_GLYPHS } from "./mark"
import { HIEROGLYPHS_IN_FONT } from "@/ui/tokens/hieroglyphFont.generated"

it("draws every mark glyph from a codepoint the shipped font actually carries", () => {
  const inFont = new Set(HIEROGLYPHS_IN_FONT)
  const missing = MARK_GLYPHS.filter(g => !inFont.has(g))
  expect(missing.map(g => g.toString(16))).toEqual([])
})

it("gives two mechanisms on one floor marks a player can tell apart", () => {
  const a = markFor(0)
  const b = markFor(1)
  expect(`${a.color}/${a.glyph}`).not.toBe(`${b.color}/${b.glyph}`)
})
```

The first test is the one that matters and it **can** fail: the subset carries 248 of the block's codepoints, so a glyph picked by eye from the Unicode chart renders as a box on every device. Assert against the generated list, never against the range.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/app/SiteMap/mark.spec.tsx`
Expected: FAIL — cannot resolve `./mark`.

- [ ] **Step 3: Write the mark**

`src/app/SiteMap/mark.tsx`:

```typescript
import type { KeyColor } from "@/game/siteTypes"
import { keyColorHex } from "@/ui/tokens/keyColors"
import type { NodeState } from "./nodeShapes"

// A MARK IS A GLYPH ON A COLOURED GROUND: the ground groups, the glyph says which one. A mechanism and
// every gate it owns wear the same pair, so two levers on one floor may both be green and still be
// told apart. Nothing is painted — the grounds are the five floor-key hues the map already tints gates
// with, and the glyphs come from the hieroglyph subset already shipped as a webfont and bound to
// --font-mono (src/index.css), so a text node in that family already renders them.
export type Mark = { color: KeyColor; glyph: number }

// Hand-picked out of HIEROGLYPHS_IN_FONT for being distinguishable from one another at marker size —
// a bird, a reed, a jar, a feather, an eye, a hand. Guarded by mark.spec.tsx against the generated
// list, because a codepoint the subset does not carry draws as a box on every device.
export const MARK_GLYPHS: readonly number[] = [0x13000, 0x13001, 0x1300c, 0x13010, 0x1301e, 0x13024]

export const markFor = (index: number): Mark => ({
  color: (["blue", "red", "green", "yellow", "purple"] as const)[index % 5],
  glyph: MARK_GLYPHS[index % MARK_GLYPHS.length],
})

export const MarkBadge = ({ mark, r, state }: { mark: Mark; r: number; state: NodeState }) => {
  if (state === "fogged") return null
  const hex = keyColorHex[mark.color][state === "visible" ? "visible" : "reachable"]
  return (
    <g transform={`translate(${r * 0.7}, ${-r * 0.7})`}>
      <circle r={r * 0.52} fill={hex} stroke="#1a1208" strokeWidth={1} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Hieroglyphs, ui-monospace, monospace"
        fontSize={r * 0.72}
        fill="#1a1208"
      >
        {String.fromCodePoint(mark.glyph)}
      </text>
    </g>
  )
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `yarn vitest run src/app/SiteMap/mark.spec.tsx`
Expected: PASS. If the first test goes red, change the glyphs, never the assertion.

- [ ] **Step 5: Put the pair on the cells**

Add `mark?: Mark` to `RoomCell` in `siteTypes.ts`. In `siteAssembler.ts`, when a handle is stood (Task 3, step 6), compute `markFor(n)` for handle index `n` and write the **same** mark onto the lever's room and onto every gate cell it drives. One pair, both ends — that is the whole of what a mark is for.

- [ ] **Step 6: Draw it on the nodes**

Add `mark?: Mark` to `ShapeProps` in `nodeShapes.tsx`; render `<MarkBadge mark={mark} r={r} state={state} />` at the end of `HandleShape` and of `GateNodeShape`, each guarded by `mark &&`. In `SiteMapView.tsx:1443-1450`, pass `mark={cell.mark}`.

- [ ] **Step 7: Run the tests and look at it**

Run: `yarn vitest run src/app/SiteMap && yarn check-types`
Expected: PASS.

Then **look**: screenshot a floor standing a handle with two driven gates, at map zoom and at phone width. Confirm the glyph renders as a glyph and not as a box (a box is what a missing codepoint looks like, and it is the failure this whole task risks), that the badge does not collide with the node's own shape, and that the lever's mark and its gates' marks read as the same pair.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: a lever and its doors wear the same glyph on the same ground"
```

---

### Task 8: A dev floor that stands a lever

**Files:**
- Modify: `src/worldGen/spec/dev.ts`, `src/worldGen/data.ts:71`
- Test: `src/worldGen/devJourney.spec.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: dev journey pyramid 7.

- [ ] **Step 1: Write the failing test**

In `src/worldGen/devJourney.spec.ts`:

```typescript
it("stands a lever on pyramid 7, driving a gate on a section it does not stand in", () => {
  const floor = devWorld()["dev_topology"][6][0]
  expect(floor.handles).toEqual([{ in: "lever", drives: ["vault"] }])
  expect(floor.handles![0].drives).not.toContain(floor.handles![0].in)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn vitest run src/worldGen/devJourney.spec.ts`
Expected: FAIL — index 6 is undefined.

- [ ] **Step 3: Author the floor**

In `src/worldGen/spec/dev.ts`, append to `devRules`:

```typescript
  // 7 — the handle. A lever on its own side path opens the gate on another: the first mechanism whose
  // doors are not the doors of the room it stands in. No reward behind the gate — this journey
  // contributes no loot (see the file header).
  journey(DEV_JOURNEY_ID).pyramid(7, {
    difficulty: "expert",
    pathPuzzles: 2,
    sideSections: [sidePath({ puzzles: 1, label: "lever" }), sidePath({ puzzles: 1, label: "vault" })],
    handles: [{ in: "lever", drives: ["vault"] }],
  }),
```

Note it authors **no** `forks`/`switches` — a handle needs no junction, which is the point of the step.

- [ ] **Step 4: Let the journey have a seventh level**

In `src/worldGen/data.ts:71`, `levelCount: 6` → `levelCount: 7`.

- [ ] **Step 5: Build the dev world and walk it**

Run: `INCLUDE_DEV=1 yarn generate-world && yarn validate-world`
Expected: builds, and `findStrandingLocks` walks the new lock without reporting a strand.

**Then regenerate without the flag:** `yarn generate-world && git diff --stat src/data/generatedWorld.ts` — expected: no diff. Leaving the dev world in the tree ships a journey nobody plays.

- [ ] **Step 6: Play it**

Run the app in develop mode, reach dev pyramid 7, and confirm by looking: the lever's room is enterable and re-enterable; throwing it opens the vault gate; the lever and the gate wear the same mark; **leaving the site and coming back leaves the lever where it was set**; and throwing it back to rest shuts the gate and survives a reload. That last pair is the whole reason Task 1 exists — verify it in the running app, not in a test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: the develop journey stands a lever that opens a door elsewhere"
```

---

### Task 9: The lever prop

The owner runs the repaint loop by hand — this task queues it and stops.

**Files:**
- Modify: `scripts/renderProp.py`, `docs/instructions/repaint-queue.md`, `art/rebuild.sh`

- [ ] **Step 1: Add `prim_lever` to the renderer**

Follow `docs/instructions/prop-pipeline.md` and the shape of `prim_pit`'s new zipline branch (commit `7b64e819`) — a docstring saying what the object is, what it must NOT be imported with, and why any direction costs the renders it costs. One prop per rank, a lever at rest: **the prop does not draw its position.** The position changes and the marker is what shows a changing value on this map; a per-position prop would be three drawings per rank saying what the mark already says. If the owner wants the prop to show it, that is one render per position per rank and it is their call.

Rank: **expert only**, matching the drop art. Master and wizard are queued when step 6 authors real floors — that is where the 56 gates live.

- [ ] **Step 2: Render and look at the scaffold**

Render to `~/tile-previews/` so `yarn repaint` finds it, and **look at the PNG** — not the mesh, not the piece count. The retired-pit failure mode is a prop collapsing into an unreadable dark shape at tile size; check against it.

- [ ] **Step 3: Queue the repaint entry**

Append to `docs/instructions/repaint-queue.md` in the exact form the three `drop*` entries use: the attachments, the full painting prompt, then the `scaffold` and `yarn import-tile` lines to run once the return lands in `~/Downloads`.

- [ ] **Step 4: Commit and hand back**

```bash
git add -A
git commit -m "feat: a lever prop, expert only, queued for repaint"
```

Then tell the owner the repaint key and stop. Do not run `yarn repaint`.

---

## Self-review

**Spec coverage.** Roadmap §4 asks for: a family with no generator (Task 5), `reEnterable` + `stateIsTheMechanism` (Task 5), a new `ShapeKind` + `shapeKindFor` case + shape component + `nodeRadius` entry (Task 6), the prop-tile decision taken deliberately (Task 9, decided and flagged), and persisted state generalised off `openWaysOut` (Tasks 1-2). Roadmap §3 (marks) asks for a mechanism and its gates wearing one glyph on one ground, with no painted art — Task 7. Design doc §"Switches, and mechanisms generally" asks that a mechanism be asked for its own state-to-gates mapping rather than a state being assumed to be which gate is open — Task 2's `MechanismRecord` and Task 4's compilation.

**Deliberately out of scope,** and named so nobody builds them by accident: `startsOpen` (step 5's, blocked on the owner); the region tree and `topologyLock` (step 5); `doubleBack` (step 6); moving the `doubleBack` fixture out of `lockWalk.spec.ts` (step 6); a gate answering to two mechanisms with `mode` (the walk already does it — `openGates`, `lockWalk.ts:86` — and nothing authored reaches it, so no task adds authoring for it).

**What the tests freeze.** That a mechanism at rest is distinguishable from one untouched (Task 1); that the open doors are a function of the grid and not of the save (Task 2); that a handle's gate lands on the section it names and a bad address is refused by name (Task 3); that a switch still cannot return to `unset` (Task 4, the guard on the one risky unification); that every mark glyph is in the shipped subset (Task 7).

**Checks that could never fail — deliberately avoided.** Task 3's refusal tests assert the failing address appears in the message rather than that something throws. Task 7's font test compares against the generated codepoint list, not the Unicode range (a range test passes for glyphs that render as boxes). Task 4's switch test asserts the absence of a transition that a careless unification would add. Tasks 6, 7 and 8 each end in looking at the running thing, because four defects were green in a passing suite last session.

**Type consistency.** `MechanismRecord` is `{ positions: { state, gateKeyId }[], restReachable }` in Tasks 2, 3 and 4. `MECHANISM_AT_REST = "rest"` is the stored id throughout; `floorLock` uses `"rest"` for a handle and keeps `"unset"` for a switch so the shipped spec is unchanged. `setMechanismState`/`getMechanismStates` keep their names from Task 1 through Task 5. `markFor`/`MarkBadge`/`MARK_GLYPHS` keep theirs across Task 7.

**The gate before each commit:** `yarn test`, `yarn lint --fix` **then** `betterer`, `yarn generate-world` with the diff checked, `yarn validate-world` — run from the controlling session, not by the task's implementer.
