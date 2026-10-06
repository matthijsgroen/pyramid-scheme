# stoneGate Phase 1: Stones in the Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a lock with stones and plates compiles, carves, is proved sound by the engine's own solver, and
bakes on the dev floor. It is not playable yet; that is phase 2.

**Architecture:** the stones of one lock are one mechanism, compiled like a sequence. A shared enumeration
(`stoneArrangements`) lists every arrangement and every lift and set-down; the tool's walk and the engine
both read it. After the carve, `placeWeights` stands each plate on a corridor node of its region. The
`MechanismRecord` goes on the first plate, its transitions sit at the plate cells, and the other plates
point back with `worksMechanism`. The existing `pressAt`, `floorLock` and `walkLock` then work it unchanged,
except for one new rule: the way out is reached only with empty hands.

**Tech Stack:** TypeScript, Vitest, `yarn lock` (`scripts/lock.ts`), `yarn generate-world` (Node bake).

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` §1 Contract, §2 Solver, §3 Carve and bake.
**Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`.

**Start from:** `main` after PR #315 (`world/authoring-locks`) is merged. Rebase or merge `topology/mechanics`
onto it first. #315 changes the realisation code (`degradeUnrealised`, binding cascade) that task 6 uses.

## Global Constraints

- **Contract shape:** `weights?: { plates: Record<id, { in: RegionId, stone: boolean, opens: { weighted: BarrierId[], empty: BarrierId[] } }> }`.
- **Stones have no ids.** A plate is authored with or without a stone. A gate owner may be a plate id or `"unladen"`.
- **One stone in hand.** It is set down only on an empty plate. With a stone in hand, nothing can be lifted.
- **A stone never leaves its floor.** The way out is reached only with empty hands.
- **No tests on authored content.** Tests use small made-up locks written inline. `yarn lock` is the check
  on `src/game/locks/*.lock`. Never assert what a catalogue lock contains.
- **Stable world:** without `INCLUDE_DEV=1`, `src/data/generatedWorld.ts` stays byte-identical.
- **Comments state the current rule and why**, never history ("replaces", "used to").
- **Count work, never wall-clock**, in tests.
- **Commits:** one short line, then a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A plate gate combined with a lever:** `-[p+L]-` and `-[p|L]-`. The door folds the weights mechanism's
   say with the lever's by the gate's mode. The weights record must list the gate under every arrangement
   where its plate terms hold, not only where all owners agree. Tested in task 4.
2. **A `:empty` gate whose plate starts empty stands open on arrival.** The record's `initial` arrangement
   lists it, and `openDoorsFor` reads `initial` when nothing is saved. Tested in task 4.
3. **Too few free nodes in a plate's region:** placement refuses with the plate's id, as a sequence names
   its step. Never a silent skip. Tested in task 5.
4. **Namespaced locks:** with `namespace: "a"`, plate ids, gate ids and regions all carry the prefix, and
   an owner `p` still finds plate `a.p`. Tested in task 3.
5. **A saved arrangement the record no longer has** (a stale save): `throwMechanism` falls back to the
   first legal target, so state keys must be canonical (sorted plate ids) and stable for the same lock.
   Tested in task 2.

---

### Task 1: Stones in the shared Lock contract

**Files:**
- Modify: `src/game/lockAuthoring.ts` (add `Weights`, `Lock.weights`, `CARRY_TERMS`)
- Modify: `src/game/lockNotation.ts` (import `Weights` and `CARRY_TERMS` from lockAuthoring; `DraftLock` becomes `Lock`)
- Modify: `src/game/lockWalkSpec.ts`, `src/game/lockDraw.ts` (imports only)
- Modify: `src/game/lockCompile.ts` (`lockFaults`: accept plate and `unladen` owners; check plate regions)
- Test: `src/game/lockCompile.spec.ts`

**Interfaces:**
- Produces: `export type Weights = { plates: Record<string, { in: RegionId; stone: boolean; opens: { weighted: readonly BarrierId[]; empty: readonly BarrierId[] } }> }`,
  `Lock.weights?: Weights`, `export const CARRY_TERMS = ["unladen"] as const`,
  `export const isWeightOwner = (lock: Lock, owner: string): boolean`.
- New `LockFault` variants: `{ type: "plateNamesNoRegion"; plate: string; region: string }` and
  `{ type: "carryWithoutStones"; barrier: string }`.

- [ ] **Step 1: Write the failing tests** in `src/game/lockCompile.spec.ts`, as a new `describe`:

```ts
describe("a lock with stones", () => {
  const plateLock = (overrides: Partial<Lock> = {}): Lock => ({
    name: "plate",
    regions: { in: { takes: "free" }, out: { takes: "free" } },
    connections: [{ between: ["in", "out"], barriers: ["door"] }],
    gates: { door: { from: "in", to: "out", owners: ["p"] } },
    mechanics: {},
    weights: {
      plates: {
        p: { in: "in", stone: false, opens: { weighted: ["door"], empty: [] } },
        shelf: { in: "in", stone: true, opens: { weighted: [], empty: [] } },
      },
    },
    in: "in",
    out: "out",
    ...overrides,
  })

  it("takes a plate as a gate's owner", () => {
    expect(checkLock(plateLock())).toEqual([])
  })

  it("refuses a plate standing in a region the lock does not have", () => {
    const lock = plateLock()
    const weights = { plates: { ...lock.weights!.plates, p: { ...lock.weights!.plates.p, in: "cellar" } } }
    expect(checkLock({ ...lock, weights })).toContainEqual({ type: "plateNamesNoRegion", plate: "p", region: "cellar" })
  })

  it("refuses unladen on a lock without stones", () => {
    const lock = plateLock({ gates: { door: { from: "in", to: "out", owners: ["unladen"] } }, weights: undefined })
    expect(checkLock(lock)).toContainEqual({ type: "carryWithoutStones", barrier: "door" })
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCompile.spec.ts -t "a lock with stones"`
Expected: FAIL. TypeScript rejects `weights` on `Lock`, or `checkLock` reports `gateOwnerUnknown` for `p`.

- [ ] **Step 3: Implement**

In `src/game/lockAuthoring.ts`, add after `LockMechanic`:

```ts
/**
 * STONES ON PLATES, the one lock-wide control that is not a mechanic. A stone rests on a plate or is in the
 * player's hand; stones are alike, so a stone is written as the plate it starts on. A plate opens its
 * `weighted` gates while a stone rests on it and its `empty` gates while none does; both may be empty, which
 * makes it a shelf. See docs/superpowers/specs/2026-10-04-stones-acceptance.md.
 */
export type Weights = {
  readonly plates: Readonly<
    Record<string, { readonly in: RegionId; readonly stone: boolean; readonly opens: { readonly weighted: readonly BarrierId[]; readonly empty: readonly BarrierId[] } }>
  >
}

/** Gate owners that are conditions on the stones rather than something placed: empty hands. */
export const CARRY_TERMS = ["unladen"] as const

/** Whether a gate owner is a plate of the lock, or a condition on what the player carries. */
export const isWeightOwner = (lock: Lock, owner: string): boolean =>
  owner in (lock.weights?.plates ?? {}) || (CARRY_TERMS as readonly string[]).includes(owner)
```

Add the field to `Lock`, after `mechanics`:

```ts
  readonly weights?: Weights
```

In `src/game/lockNotation.ts`:
- Delete its own `Weights` type and its `CARRY_TERMS`, and import both from `./lockAuthoring`.
- Change `export type DraftLock = Lock & { weights?: Weights }` to `export type DraftLock = Lock`. Keep the
  alias so the tool's call sites need no edit.
- The parser builds `plates` with mutable arrays. Assign them to the readonly type as they are.

Fix the imports in `src/game/lockWalkSpec.ts` and `src/game/lockDraw.ts`, which import `Weights` or
`CARRY_TERMS` from `./lockNotation`: import them from `./lockAuthoring`.

In `src/game/lockCompile.ts`:
- Add the two fault variants to `LockFault`.
- In `lockFaults`, at the owner check (currently `if (!(owner in lock.mechanics)) faults.push({ type: "gateOwnerUnknown", … })`
  near line 152), skip weight owners and refuse `unladen` without stones:

```ts
      if (isWeightOwner(lock, owner)) {
        if (!lock.weights && (CARRY_TERMS as readonly string[]).includes(owner))
          faults.push({ type: "carryWithoutStones", barrier: id })
        continue
      }
```

  `isWeightOwner` answers true for `unladen` even without weights, which is what lets the refusal above
  name it. Then, after the gate loop:

```ts
  for (const [plate, { in: region }] of Object.entries(lock.weights?.plates ?? {}))
    if (!(region in lock.regions)) faults.push({ type: "plateNamesNoRegion", plate, region })
```

- Find every other place in `lockCompile.ts` that reads `lock.mechanics[owner]` for a gate owner. For
  example, `translate` does `gate.owners.filter(owner => kinds(lock.mechanics[owner].control)?.gates === "owns")`.
  Guard each with `!isWeightOwner(lock, owner) &&`, so a plate owner is never looked up as a mechanic.

- [ ] **Step 4: Run tests and the tool**

Run: `yarn vitest run src/game/lockCompile.spec.ts src/game/lock*.spec.ts && yarn tsc -b && yarn lock >/dev/null; echo $?`
Expected: all PASS, tsc clean, `yarn lock` exits `0`.

- [ ] **Step 5: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/lockNotation.ts src/game/lockWalkSpec.ts src/game/lockDraw.ts src/game/lockCompile.ts src/game/lockCompile.spec.ts
git commit -m "feat(topology): stones in the shared Lock contract"
```

---

### Task 2: One enumeration of stone arrangements, for the tool and the engine

**Files:**
- Create: `src/game/mechanics/weights.ts`
- Create: `src/game/mechanics/weights.spec.ts`
- Modify: `src/game/lockWalkSpec.ts` (`weightsMechanism` and the stone helpers move out; it calls `stoneArrangements`)

**Interfaces:**
- Consumes: `Weights`, `Lock`, `CARRY_TERMS` from task 1.
- Produces:

```ts
export type StoneMove = { from: string; to: string; plate: string }
export type Arrangements = {
  /** Every arrangement reachable from the start, first the start; keys like "P1 P4" or "P4 + hand", "none" for no stones. */
  states: string[]
  initial: string
  /** Every lift and set-down: from one arrangement to another, made at a plate. */
  moves: StoneMove[]
  /** Each arrangement's gates whose stone conditions hold (all of them, or any under mode "any"). */
  opens: Record<string, string[]>
  /** The arrangements with a stone in hand. */
  carrying: string[]
}
export const stoneArrangements = (lock: Lock): Arrangements   // lock.weights must be set
```

- [ ] **Step 1: Write the failing tests** in `src/game/mechanics/weights.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { parseLock } from "../lockNotation"
import { stoneArrangements } from "./weights"

const lockOf = (text: string) => parseLock(text).lock

describe("stoneArrangements", () => {
  it("names an arrangement by its weighted plates, sorted, and the hand last", () => {
    const { states, initial } = stoneArrangements(lockOf("in -[b]- out\nb plate @in\na plate @in stone"))
    expect(initial).toBe("a")
    expect(states).toEqual(["a", "+ hand", "b"])
  })

  it("lifts only with empty hands and sets down only on an empty plate", () => {
    const { moves } = stoneArrangements(lockOf("in -[b]- out\nb plate @in\na plate @in stone"))
    expect(moves).toEqual([
      { from: "a", to: "+ hand", plate: "a" },
      { from: "+ hand", to: "a", plate: "a" },
      { from: "+ hand", to: "b", plate: "b" },
      { from: "b", to: "+ hand", plate: "b" },
    ])
  })

  it("opens a weighted gate while its plate holds a stone, and an :empty gate while it holds none", () => {
    const { opens } = stoneArrangements(lockOf("in -[b]- hall\nhall -[a:empty]- out\nb plate @in\na plate @in stone"))
    expect(opens).toEqual({ a: [], "+ hand": ["hall-out"], b: ["in-hall", "hall-out"] })
  })

  it("opens an unladen gate in every arrangement without a stone in hand", () => {
    const { opens, carrying } = stoneArrangements(lockOf("in -[unladen]- out\na plate @in stone"))
    expect(carrying).toEqual(["+ hand"])
    expect(opens).toEqual({ a: ["in-out"], "+ hand": [] })
  })

  it("reads several stone conditions on one gate under its mode", () => {
    const every = stoneArrangements(lockOf("in -[a+b]- out\na plate @in stone\nb plate @in stone"))
    expect(every.opens["a b"]).toEqual(["in-out"])
    expect(every.opens.a).toEqual([])
    const any = stoneArrangements(lockOf("in -[a|b]- out\na plate @in stone\nb plate @in stone"))
    expect(any.opens.a).toEqual(["in-out"])
  })
})
```

`opens` lists only the gates that have a stone condition. A gate owned only by a lever never appears there.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts`
Expected: FAIL, "Cannot find module './weights'".

- [ ] **Step 3: Implement** `src/game/mechanics/weights.ts`. This moves the tool's logic out of
`lockWalkSpec.ts` (the `Stones` type, `stonesKey`, `startStones`, `weightSays`, `stonesSay`, and the BFS
in `weightsMechanism`):

```ts
import type { Lock, Weights } from "../lockAuthoring"
import { isWeightOwner } from "../lockAuthoring"

const HAND = "hand"
type Stones = { weighted: ReadonlySet<string>; hand: boolean }

/** "P1 P4" or "P4 + hand": the plates holding a stone, by name, then the hand; "none" when nothing holds one. */
const keyOf = ({ weighted, hand }: Stones) => [...[...weighted].sort(), ...(hand ? [`+ ${HAND}`] : [])].join(" ") || "none"

const says = (weights: Weights, gate: string, term: string, stones: Stones) => {
  if (term === "unladen") return !stones.hand
  return weights.plates[term].opens.empty.includes(gate) ? !stones.weighted.has(term) : stones.weighted.has(term)
}

/**
 * EVERY ARRANGEMENT OF THE STONES THE PLAYER CAN REACH, and every move between them: one stone in hand at
 * most, lifted from its plate and set down only on an empty one. The one place the stone rules live; the
 * tool's walk and the engine's record are both built from it.
 */
export const stoneArrangements = (lock: Lock): Arrangements => {
  const weights = lock.weights!
  const start: Stones = {
    weighted: new Set(Object.keys(weights.plates).filter(plate => weights.plates[plate].stone)),
    hand: false,
  }
  const found = new Map<string, Stones>([[keyOf(start), start]])
  const moves: StoneMove[] = []
  for (const queue = [start]; queue.length > 0; ) {
    const here = queue.shift()!
    for (const plate of Object.keys(weights.plates).sort()) {
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
  const gates = Object.entries(lock.gates).flatMap(([id, gate]) => {
    const terms = gate.owners.filter(owner => isWeightOwner(lock, owner))
    return terms.length > 0 ? [{ id, terms, any: gate.mode === "any" }] : []
  })
  return {
    states: [...found.keys()],
    initial: keyOf(start),
    moves,
    opens: Object.fromEntries(
      [...found].map(([key, stones]) => [
        key,
        gates
          .filter(({ id, terms, any }) =>
            any ? terms.some(t => says(weights, id, t, stones)) : terms.every(t => says(weights, id, t, stones))
          )
          .map(({ id }) => id),
      ])
    ),
    carrying: [...found].filter(([, stones]) => stones.hand).map(([key]) => key),
  }
}
```

Then put the exported types `StoneMove` and `Arrangements` (from Interfaces) at the top of the file.

In `src/game/lockWalkSpec.ts`, replace the body of `weightsMechanism(lock, weights, opened)` with:

```ts
const weightsMechanism = (lock: Lock, opened: (ids: readonly string[]) => string[]): Mechanism => {
  const { states, initial, moves, opens } = stoneArrangements(lock)
  return {
    states,
    initial,
    opens: Object.fromEntries(states.map(state => [state, opened(opens[state])])),
    transitions: moves.map(({ from, to, plate }) => ({ from, to, at: lock.weights!.plates[plate].in })),
  }
}
```

Two more edits in `lockWalkSpec.ts`:
- Delete the now-unused helpers (`Stones`, `stonesKey`, `startStones`, `weightSays`, `stonesSay`).
- `openAtStart` reads stone conditions at the start: use `stoneArrangements(lock).opens[initial].includes(id)` there.

The review in `lockReview.ts` (`stoneMove`) parses the keys. The key format is unchanged, so it needs no edit.

- [ ] **Step 4: Run the new tests and the tool's tests, unchanged**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/lock*.spec.ts && yarn lock >/dev/null; echo $?`
Expected: all PASS. The existing `lockWalkSpec.spec.ts` stone tests pass without edits, which proves the
move kept the tool's behaviour. `yarn lock` exits `0`.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/lockWalkSpec.ts
git commit -m "refactor(topology): stone arrangements in one place, for the tool and the engine"
```

---

### Task 3: The weights kind compiles a lock's stones into one control

**Files:**
- Modify: `src/game/mechanics/weights.ts` (add `WEIGHTS: MechanicKind`)
- Modify: `src/game/mechanics/index.ts` (add `WEIGHTS` to `CORE_MECHANICS`)
- Modify: `src/game/mechanics/mechanicKind.ts` (`compile` may be called with the lock; see below)
- Modify: `src/game/obstacles.ts` (`WeightsControl`, `Control` union, `isWeights`, `controlKindOf`)
- Modify: `src/game/lockCompile.ts` (`translate` compiles `lock.weights`; `kindsUsed` reports `"weights"`)
- Test: `src/game/lockCompile.spec.ts`

**Interfaces:**
- Consumes: `stoneArrangements` (task 2).
- Produces:

```ts
// obstacles.ts
export type WeightsControl = {
  id: string
  control: "weights"
  plates: { id: string; in: string; stone: boolean }[]
  states: string[]
  initial: string
  /** Gate ids (namespaced) each arrangement opens. */
  opens: Record<string, string[]>
  /** Moves by plate id (namespaced). */
  moves: { from: string; to: string; plate: string }[]
  carrying: string[]
  encounter?: string
}
export const isWeights = (control: Control): control is WeightsControl => control.control === "weights"
```

The control's id is `name("stones")`, so a namespaced lock gets `a.stones`.

- [ ] **Step 1: Write the failing tests** in the `describe("a lock with stones")` block from task 1:

```ts
  it("compiles its stones into one weights control, every name in the lock's namespace", () => {
    const fragment = fragmentOf(plateLock(), { ...BINDING, weights: "stonePlate" }, "a")
    const control = fragment.controls.find(c => c.control === "weights")
    expect(control).toMatchObject({
      id: "a.stones",
      control: "weights",
      plates: [
        { id: "a.p", in: "a.in", stone: false },
        { id: "a.shelf", in: "a.in", stone: true },
      ],
      initial: "a.shelf",
      encounter: "stonePlate",
    })
    expect(control!.opens["a.p"]).toEqual(["a.door"])
  })

  it("asks a binding for the stones like any built kind", () => {
    const result = compile(plateLock(), BINDING)
    expect(result).toEqual({ ok: false, faults: [{ type: "unboundRole", kind: "weights", mechanics: ["stones"] }] })
  })
```

The arrangement keys are made of plate ids, so under a namespace they read `a.p` and `a.shelf`. Build the
control from `stoneArrangements` on a lock renamed through `name`, or rename the keys after enumerating.
Either way, keys and plate ids must match.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCompile.spec.ts -t "a lock with stones"`
Expected: FAIL. No control has `control: "weights"`.

- [ ] **Step 3: Implement**

`obstacles.ts`:
- Add `WeightsControl` and `isWeights` (Interfaces above), and add `WeightsControl` to the `Control` union.
- `controlKindOf` already returns `control.control ?? …`, so `"weights"` comes through.

`mechanics/weights.ts`: add the kind. Its seats give every plate a node in its region, as a sequence tile does:

```ts
export const WEIGHTS: MechanicKind = {
  control: "weights",
  built: true,
  gates: "opens",
  seats: control => (control.control === "weights" ? control.plates.map(plate => ({ region: plate.in, seat: "tile" as const })) : []),
}
```

`mechanics/index.ts`: append `WEIGHTS` to `CORE_MECHANICS`.

`lockCompile.ts`:
- `kindsUsed(lock)` lists each mechanic's control kind. When `lock.weights` is set, also list
  `["weights", ["stones"]]`. That gives `unboundFaults` its `unboundRole` for an unbound `weights`, and
  `unbakeableFaults` its built check.
- In `translate`, after the mechanics loop, compile the stones:

```ts
  if (lock.weights) {
    const renamed: Lock = {
      ...lock,
      gates: Object.fromEntries(Object.entries(lock.gates).map(([id, gate]) => [name(id), { ...gate, owners: gate.owners.map(o => (o in lock.weights!.plates ? name(o) : o)) }])),
      weights: {
        plates: Object.fromEntries(
          Object.entries(lock.weights.plates).map(([id, plate]) => [
            name(id),
            { in: name(plate.in), stone: plate.stone, opens: { weighted: plate.opens.weighted.map(name), empty: plate.opens.empty.map(name) } },
          ])
        ),
      },
    }
    const { states, initial, moves, opens, carrying } = stoneArrangements(renamed)
    const encounter = binding.weights
    controls.push({
      id: name("stones"),
      control: "weights",
      plates: Object.entries(renamed.weights!.plates).map(([id, plate]) => ({ id, in: plate.in, stone: plate.stone })),
      states,
      initial,
      opens,
      moves,
      carrying,
      ...(encounter === undefined ? {} : { encounter }),
    })
  }
```

- `topologyFaults` (`obstacles.ts`) checks that every gate is opened by some control's `opens`. Make it
  count a `WeightsControl`'s `opens` values like a stateful control's. Find the loop that collects opened
  gate ids from `controls` and add the weights case. Run task 3's tests: if a topology fault names
  `a.door`, that loop is where the gap is.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/lockCompile.spec.ts src/game/mechanics src/game/lock*.spec.ts && yarn tsc -b`
Expected: PASS, tsc clean. TypeScript will name every `switch`/`if` over `Control` that needs the new case,
such as the `controlRecords` filter in `siteAssembler.ts`. Leave the assembler for task 4 and silence
nothing: for now, make `siteAssembler.ts` skip weights controls exactly where it skips sequences
(`isForkSwitch(control) || isSequence(control) || isWeights(control)`).

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics src/game/obstacles.ts src/game/lockCompile.ts src/game/lockCompile.spec.ts src/game/siteAssembler.ts
git commit -m "feat(topology): a lock's stones compile into one weights control"
```

---

### Task 4: The weights record, built from the control and the plate cells

**Files:**
- Modify: `src/game/mechanics/weights.ts` (add `compileWeights`)
- Test: `src/game/mechanics/weights.spec.ts`

**Interfaces:**
- Consumes: `WeightsControl` (task 3), `MechanismRecord` (`src/game/siteTypes.ts:383`).
- Produces:

```ts
export const compileWeights = (
  control: WeightsControl,
  cellOf: (plate: string) => readonly [number, number],
  gate: (id: string) => { gateKeyId: string; mode?: "any" }
): MechanismRecord
```

- [ ] **Step 1: Write the failing tests**

```ts
import { compileWeights } from "./weights"
import { compileLock } from "../lockCompile"
import { isWeights } from "../obstacles"

const controlOf = (text: string) => {
  const result = compileLock(parseLock(text).lock, { weights: "stonePlate", toggle: "handle" })
  if (!result.ok) throw new Error(JSON.stringify(result.faults))
  return result.fragment.controls.find(isWeights)!
}
const cells: Record<string, [number, number]> = { a: [0, 0], b: [0, 2], L: [2, 2] }

describe("compileWeights", () => {
  it("places every lift and set-down at its plate's cell, from the arrangement it leaves", () => {
    const record = compileWeights(controlOf("in -[b]- out\nb plate @in\na plate @in stone"), p => cells[p], id => ({ gateKeyId: `k:${id}` }))
    expect(record).toMatchObject({ initial: "a", returnsToInitial: true, placedOnly: true })
    expect(record.transitions).toContainEqual({ from: "+ hand", to: "b", at: [0, 2] })
    expect(record.positions).toEqual([{ state: "b", gateKeyId: "k:in-out" }])
  })

  it("stands an :empty gate open in the arrangement the floor starts in", () => {
    const record = compileWeights(controlOf("in -[b:empty]- out\nb plate @in\na plate @in stone"), p => cells[p], id => ({ gateKeyId: `k:${id}` }))
    expect(record.positions).toContainEqual({ state: record.initial, gateKeyId: "k:in-out" })
  })

  it("keeps a gate's mode, so the door folds the stones with a lever by it", () => {
    const control = controlOf("in -[b|L]- out\nb plate @in\na plate @in stone\nL toggle @in")
    const record = compileWeights(control, p => cells[p], id => ({ gateKeyId: `k:${id}`, mode: "any" }))
    expect(record.positions).toEqual([{ state: "b", gateKeyId: "k:in-out", mode: "any" }])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts -t compileWeights`
Expected: FAIL, "compileWeights is not a function".

- [ ] **Step 3: Implement**

```ts
/**
 * THE STONES AS THE RECORD A FLOOR CELL CARRIES: every arrangement a state, every lift and set-down a move
 * placed at its plate's cell, and each arrangement's gates its positions. Placed-only, so a plate works only
 * the moves made at it, and back to the start is always reachable, so it returns to its initial.
 */
export const compileWeights = (control: WeightsControl, cellOf: (plate: string) => readonly [number, number], gate: (id: string) => { gateKeyId: string; mode?: "any" }): MechanismRecord => ({
  states: control.states,
  initial: control.initial,
  returnsToInitial: true,
  placedOnly: true,
  positions: control.states.flatMap(state => control.opens[state].map(id => ({ state, ...gate(id) }))),
  transitions: control.moves.map(({ from, to, plate }) => ({ from, to, at: cellOf(plate) })),
})
```

Check that `MechanismRecord.transitions[].at` takes `readonly [number, number]`. If it wants a mutable
tuple, copy it with `[r, c]`.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts && yarn tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts
git commit -m "feat(topology): the weights record, its moves placed at the plates"
```

---

### Task 5: Plates stand on the finished carve

**Files:**
- Create: `src/game/weightsPlates.ts` (`placeWeights`, the plates' twin of `placeSequences`)
- Create: `src/game/weightsPlates.spec.ts`
- Modify: `src/game/siteTypes.ts` (`RoomCell.plate?: { id: string }`)
- Modify: `src/game/siteAssembler.ts` (call `placeWeights` after `placeSequences`, ~line 4260)
- Modify: the assembler's failure reasons (`AssemblerFailure` reasons: add `{ type: "plateUnplaced"; plate: string }`)

**Interfaces:**
- Consumes: `WeightsControl`, `compileWeights`.
- Produces:

```ts
export type WeightsDemand = { control: WeightsControl; gate: (id: string) => { gateKeyId: string; mode?: "any" } }
/** undefined when every plate stands; otherwise the plate with no free node in its region. */
export const placeWeights = (cells: GridCell[][], demands: readonly WeightsDemand[], onMainPath: ReadonlySet<string>, salt: string): { plate: string } | undefined
```

A plate cell becomes `{ type: "room", roomType: "encounter", …, region, plate: { id }, worksMechanism: { mechanismId, transition } }`.
The first plate also carries `mechanism: record, mechanismId: control.id`. Plates not on the main path come
first.

- [ ] **Step 1: Write the failing tests** in `src/game/weightsPlates.spec.ts`. Copy the grid helpers from
the sequence placement tests if they exist (`grep -rn placeSequences src --include=*.spec.ts`). Otherwise
build a 1×7 corridor row: every even column a node, each cell
`{ type: "corridor", dirs: new Set(["e","w"]), state: "visible", region: "in" }`.

```ts
describe("placeWeights", () => {
  it("stands each plate on its own node in its region, the record on the first", () => {
    const cells = corridorRow(7, "in")
    const control = controlOf("in -[b]- out\nb plate @in\na plate @in stone")
    expect(placeWeights(cells, [{ control, gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt")).toBeUndefined()
    const plates = cells.flat().filter(c => c.type === "room" && c.plate)
    expect(plates.map(c => (c as RoomCell).plate!.id).sort()).toEqual(["a", "b"])
    expect(plates.filter(c => (c as RoomCell).mechanism)).toHaveLength(1)
  })

  it("names the plate whose region has no free node", () => {
    const cells = corridorRow(1, "in")
    const control = controlOf("in -[b]- out\nb plate @in\na plate @in stone")
    expect(placeWeights(cells, [{ control, gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt")).toEqual({ plate: "b" })
  })
})
```

`controlOf` is the helper from task 4's tests. Move it into a small shared test helper, or repeat it.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/weightsPlates.spec.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `placeWeights`, mirroring `placeSequences` (`src/game/sequenceTiles.ts:38-99`):

```ts
import { hashString } from "@/support/hashString"
import { compileWeights } from "./mechanics/weights"
import type { WeightsControl } from "./obstacles"
import type { GridCell, RoomCell } from "./siteTypes"

type Place = [number, number]
export type WeightsDemand = { control: WeightsControl; gate: (id: string) => { gateKeyId: string; mode?: "any" } }

// A plate stands where a sequence tile would: a bare corridor node of its region, no junction, off the
// main path first, so a plate is somewhere the player chooses to go.
const isCandidate = (cell: GridCell, r: number, c: number, region: string): boolean =>
  cell.type === "corridor" && cell.region === region && !cell.hidden && !cell.obstacle && cell.dirs.size <= 2 && r % 2 === 0 && c % 2 === 0

/**
 * STANDS EVERY LOCK'S PLATES ON THE FINISHED CARVE, and changes no wall: a plate is a corridor node becoming a
 * room, `dirs` untouched. The stones' record goes on the first plate; every plate works the moves placed at it.
 */
export const placeWeights = (cells: GridCell[][], demands: readonly WeightsDemand[], onMainPath: ReadonlySet<string>, salt: string): { plate: string } | undefined => {
  const taken = new Set<string>()
  for (const { control, gate } of demands) {
    const at = new Map<string, Place>()
    for (const plate of control.plates) {
      const candidates: Place[] = []
      for (let r = 0; r < cells.length; r++)
        for (let c = 0; c < cells[r].length; c++)
          if (!taken.has(`${r},${c}`) && isCandidate(cells[r][c], r, c, plate.in)) candidates.push([r, c])
      const rank = ([r, c]: Place) => hashString(`${salt}|plate|${plate.id}|${r},${c}`)
      const [best] = candidates.sort(
        (a, b) => Number(onMainPath.has(`${a[0]},${a[1]}`)) - Number(onMainPath.has(`${b[0]},${b[1]}`)) || rank(a) - rank(b)
      )
      if (!best) return { plate: plate.id }
      taken.add(`${best[0]},${best[1]}`)
      at.set(plate.id, best)
    }
    const record = compileWeights(control, plate => at.get(plate)!, gate)
    control.plates.forEach((plate, n) => {
      const [r, c] = at.get(plate.id)!
      const cell = cells[r][c]
      if (cell.type !== "corridor") throw new Error(`[siteAssembler] plate ${plate.id} is not on a corridor`)
      const transition = record.transitions!.findIndex(t => t.at[0] === r && t.at[1] === c)
      const room: RoomCell = {
        type: "room",
        roomType: "encounter",
        dirs: cell.dirs,
        state: cell.state,
        sectionAddress: cell.sectionAddress,
        sectionHash: cell.sectionHash,
        legacySectionHash: cell.legacySectionHash,
        ordinal: cell.ordinal,
        difficulty: cell.difficulty,
        region: cell.region,
        plate: { id: plate.id },
        worksMechanism: { mechanismId: control.id, transition },
        ...(n === 0 ? { mechanism: record, mechanismId: control.id } : {}),
      }
      cells[r][c] = room
    })
  }
  return undefined
}
```

`siteTypes.ts` `RoomCell`: add, next to `sequenceTile`:

```ts
  /** A pressure plate of a lock's stones (src/game/weightsPlates.ts). Its stone, if any, is the mechanism's
   * state, never the cell's. */
  plate?: { id: string }
```

`siteAssembler.ts`: at the sequence placement (~4256), add right after the `if (sequences.length > 0) { … }`
block:

```ts
    const weights = (authoredConfig.controls ?? []).filter(isWeights)
    if (weights.length > 0) {
      const unplaced = placeWeights(
        cells2D,
        weights.map(control => ({
          control,
          gate: id => {
            const mode = obstacleMode(id)
            return { gateKeyId: gateKeyOf(id), ...(mode ? { mode } : {}) }
          },
        })),
        new Set(mainPath.map(([r, c]) => posKey(r, c))),
        siteId
      )
      if (unplaced) {
        if (!plateShortfall) plateShortfall = unplaced
        continue
      }
      const plateDuplicate = duplicateSlot()
      if (plateDuplicate) return { success: false, reasons: [{ type: "duplicateCellSlot", slot: plateDuplicate }] }
    }
```

Declare `let plateShortfall: { plate: string } | undefined` beside `sequenceShortfall`, and report it the
way `sequenceShortfall` is reported when the attempts run out (search `sequenceShortfall`). Add
`{ type: "plateUnplaced"; plate: string }` to the failure reason union.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/weightsPlates.spec.ts && yarn tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/weightsPlates.ts src/game/weightsPlates.spec.ts src/game/siteTypes.ts src/game/siteAssembler.ts
git commit -m "feat(topology): plates stand on the finished carve"
```

---

### Task 6: The way out takes empty hands, and a stone floor carves and walks sound

**Files:**
- Modify: `src/game/lockWalk.ts` (`LockSpec.leaveWith?`; `movesFrom` and `walkLock` honour it)
- Modify: `src/game/lockWalkSpec.ts` (the tool's implicit `out:unladen` region gate becomes `leaveWith`)
- Modify: `src/game/siteTypes.ts` (`MechanismRecord.carrying?: string[]`)
- Modify: `src/game/mechanics/weights.ts` (`compileWeights` copies `control.carrying` onto the record)
- Modify: `src/game/floorLock.ts` (a record's `carrying` becomes `leaveWith` on the spec)
- Test: `src/game/lockWalk.spec.ts`, and an assembler-level test in `src/game/weightsPlates.spec.ts`

**Interfaces:**
- Produces: `LockSpec.leaveWith?: { mechanism: MechanismId; notIn: StateId[] }[]`. The way out counts as
  reached, and leaving it is a move, only in a config where every listed mechanism is outside its `notIn`
  states. `MechanismRecord.carrying?: string[]`.

- [ ] **Step 1: Write the failing tests**

In `src/game/lockWalk.spec.ts`:

```ts
describe("leaveWith", () => {
  const spec = (): LockSpec => ({
    regions: ["in", "out"],
    gates: { g: { from: "in", to: "out", owners: ["open"] } },
    mechanisms: {
      open: { states: ["o"], initial: "o", opens: { o: ["g"] }, transitions: [] },
      hand: { states: ["full", "empty"], initial: "full", opens: { full: [], empty: [] }, transitions: [{ from: "full", to: "empty", at: "in" }] },
    },
    in: "in",
    out: "out",
  })

  it("does not count the way out reached with a stone in hand", () => {
    const stuck = { ...spec(), mechanisms: { ...spec().mechanisms, hand: { ...spec().mechanisms.hand, transitions: [] } } }
    expect(walkLock({ ...stuck, leaveWith: [{ mechanism: "hand", notIn: ["full"] }] })).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("counts it once the hands are empty", () => {
    expect(walkLock({ ...spec(), leaveWith: [{ mechanism: "hand", notIn: ["full"] }] })).toEqual({ sound: true, states: expect.any(Number) })
  })
})
```

In `src/game/weightsPlates.spec.ts`, the carve end to end, with a made-up lock (never a catalogue lock).
Find how an existing test carves a floor from a compiled lock: `grep -rn "compileLock" src --include=*.spec.ts`
and `src/game/testSupport/lockFixtures.ts`. Then:

```ts
it("carves a stone lock whose engine walk is sound", () => {
  const lock = parseLock("in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone").lock
  const floor = carveLockFloor(lock, { weights: "stonePlate" })   // the fixture helper you found or wrote
  expect(walkFloorLock(floor.grid)).toMatchObject({ sound: true })
})
```

`walkFloorLock` is in `src/game/floorLockWalk.ts:291`. If no fixture carves a lock into a grid, add
`carveLockFloor(lock, binding)` to `src/game/testSupport/lockFixtures.ts`. It wraps
`compileLock` → `FloorConfig { locks: [{ lock }], realisations }` → the assembler entry point that
`lockPlanWorld.spec.ts` or `laidCarveWorld.spec.ts` use.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockWalk.spec.ts -t leaveWith src/game/weightsPlates.spec.ts`
Expected: FAIL. `leaveWith` is ignored, and the carve either refuses `stonePlate` or walks unsound.

- [ ] **Step 3: Implement**

`lockWalk.ts`:
- Add `leaveWith?: { mechanism: MechanismId; notIn: StateId[] }[]` to `LockSpec`, with a doc comment:
  "The way out is left only in a config outside every `notIn`: a stone never leaves its floor."
- Add `const mayLeave = (spec: LockSpec, config: LockConfig) => (spec.leaveWith ?? []).every(({ mechanism, notIn }) => !notIn.includes(config[mechanism]))`.
- In `movesFrom`, gate the leave-and-return move: `if (region === spec.out && mayLeave(spec, config)) next.push(…)`.
- In `walkLock`, a finishing state needs `state.region === spec.out && mayLeave(spec, state.config)`.
- In `checkLockSpec`, report a `leaveWith` mechanism the spec does not have.

`lockWalkSpec.ts`: drop the implicit `${out}:unladen` region gate and set
`leaveWith: weights ? [{ mechanism: WEIGHTS, notIn: stoneArrangements(lock).carrying }] : undefined` on the
returned spec. Then run the tool's tests; the stone tests must pass unchanged.

`siteTypes.ts`: add `carrying?: string[]` to `MechanismRecord`, documented as "the states with a stone in
hand: the way out is not left in them".

`compileWeights`: add `carrying: control.carrying`, and extend task 4's first test with
`expect(record.carrying).toEqual(["+ hand"])`.

`floorLock.ts`: when building `mechanisms[id]` from a record with `carrying`, collect
`{ mechanism: id, notIn: record.carrying }` and put the list on the returned spec as `leaveWith`.

Binding `weights: "stonePlate"`: `compileLock` refuses an unbound built kind, and #315's realisation check
(`degradeUnrealised` / `realisations.ts`) wants a family. Add a minimal family meta to the topology mod
(game side only, no app plugin yet; phase 2 adds the plugin):
- Create `src/mods/topology/game/stonePlate/meta.ts`, copying the shape of `src/mods/topology/game/torch/meta.ts`.
  Use `id: "stonePlate"`, tags `["stonePlate"]`, `drawing: { marker: "mechanism" }`, and no `actsOnArrival`.
- Add it to `families` in `src/mods/topology/index.ts`.

If the realisation check needs more (an app plugin), stop and report: that belongs in phase 2.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/lockWalk.spec.ts src/game/weightsPlates.spec.ts src/game/lock*.spec.ts src/game/mechanics && yarn tsc -b && yarn lock >/dev/null; echo $?`
Expected: PASS, `yarn lock` exits `0`.

- [ ] **Step 5: Commit**

```bash
git add src/game/lockWalk.ts src/game/lockWalk.spec.ts src/game/lockWalkSpec.ts src/game/siteTypes.ts src/game/mechanics/weights.ts src/game/floorLock.ts src/game/weightsPlates.spec.ts src/game/testSupport/lockFixtures.ts src/mods/topology
git commit -m "feat(topology): a stone floor carves, and the way out takes empty hands"
```

---

### Task 7: A `.lock` file baked onto the dev floor

**Files:**
- Create: `src/worldGen/spec/locks/catalogue.ts` (`catalogueLock(name): Lock`, Node-only)
- Modify: `src/worldGen/spec/dev.ts` (a new dev pyramid with twoStones)
- Modify: `src/game/lockCatalogue.ts` (doc comment: also read by the world spec at bake time)
- Test: none of its own. The proof is the dev bake and `yarn verify-content`, never a content assertion.

**Interfaces:**
- Produces: `export const catalogueLock = (name: string): Lock`. It throws with the lock's `refused` and
  `drafts` when either is non-empty.

- [ ] **Step 1: Implement**

```ts
// src/worldGen/spec/locks/catalogue.ts
import type { Lock } from "@/game/lockAuthoring"
import { LOCK_CATALOGUE } from "@/game/lockCatalogue"

/**
 * A LOCK FROM ITS .lock FILE, for the world spec: the file the designer draws with `yarn lock` is the one
 * the bake reads, so no copy can drift. Node only — the spec runs at bake time, never in the app.
 */
export const catalogueLock = (name: string): Lock => {
  const parsed = LOCK_CATALOGUE[name]
  if (!parsed) throw new Error(`no lock ${name} in src/game/locks`)
  if (parsed.refused.length > 0 || parsed.drafts.length > 0)
    throw new Error(`lock ${name} is not finished: ${[...parsed.refused, ...parsed.drafts].join("; ")}`)
  return parsed.lock
}
```

In `src/worldGen/spec/dev.ts`, add a pyramid to the dev journey after the doubleBack one, in the same style
(`dev.ts:93-106`). twoStones is a tree with no gate loop, so it carves before phase 4:

```ts
  .pyramid(3, {
    difficulty: "expert",
    pathPuzzles: 0,
    realisations: { weights: "stonePlate" },
  })
  .floor(0, { locks: [{ lock: catalogueLock("twoStones") }], seed: 1 }),
```

Use whatever pyramid index follows the existing ones. The seed is a placeholder; step 2 finds one that carves.

- [ ] **Step 2: Bake with the dev journey and find a seed**

Run: `INCLUDE_DEV=1 yarn generate-world 2>&1 | tail -20`
Expected: the bake finishes with no validation error for the dev pyramid. If the floor refuses at seed `1`
(`plateUnplaced` or a carve refusal), check how doubleBack's seed `111235356889667` was found
(`git log -S111235356889667 --oneline`), use the same search, and put the seed that carves into `dev.ts`.

Then restore the committed world, which holds no dev journey, and prove it unchanged:

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts`
Expected: exit 0. The world is byte-identical.

- [ ] **Step 3: Look at it**

Run Storybook (`yarn storybook`), open `App/SiteMap/JourneyInspector` → `Inspector`, pick the dev journey's
new pyramid and floor 0, and check that five plate rooms stand in the expected regions. This needs the
`INCLUDE_DEV=1` bake from step 2 to be present locally. Do not commit that bake. Report what you see; do not
fix rendering here (phase 2).

- [ ] **Step 4: Full gate in a clean worktree, then commit**

```bash
git add src/worldGen/spec/locks/catalogue.ts src/worldGen/spec/dev.ts src/game/lockCatalogue.ts
git commit -m "feat(topology): the world spec reads a .lock file; twoStones on the dev floor"
git worktree add /tmp/stonegate-gate HEAD && cd /tmp/stonegate-gate && yarn install --immutable && yarn check-types && yarn lint && yarn betterer && yarn test && yarn build
```

Expected: all pass. Then `git worktree remove /tmp/stonegate-gate`.

---

### Task 8: The contract says so

**Files:**
- Modify: `docs/mods/mechanic-contract.md` (a "Stones on plates" section beside the other controls)
- Modify: `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (tick §1 and §2 boxes that hold; reword §5 Save)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 1 status)
- Modify: `CHANGELOG.md`: no entry. Nothing is player-visible yet.

- [ ] **Step 1: Write the contract section**, in the voice of the surrounding sections: current rule and
why, no history. Cover the `weights` field, the owners, the one-control compile, the record built like a
sequence's, the way-out rule (`leaveWith`), the binding key `weights`, and the realisation `stonePlate`.

- [ ] **Step 2: Update the spec.**
- Tick the §1 and §2 boxes the tests prove.
- Rewrite §5 Save's first bullet: the arrangement is the weights mechanism's state in
  `journey.mechanismStates`, which also saves a stone in hand, so there is no new field.
- Reword the spec's header line: "For the engine session" becomes "Built in phases; see the roadmap".

- [ ] **Step 3: Commit**

```bash
git add docs/mods/mechanic-contract.md docs/superpowers/specs/2026-10-04-stones-acceptance.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md
git commit -m "docs: stones on plates in the mechanic contract"
```

---

## Self-review notes

- **Spec coverage:** §1 Contract is tasks 1, 3 and 8. §2 Solver is tasks 2, 4 and 6; the engine's rules
  follow the tool's because both use `stoneArrangements`. §3 Carve is task 5 (plates are nodes) and task 7
  (bakes on dev). These §3 items belong to later phases: `unladen` realisation is phase 3, mod-off carve is
  phase 3, gate loops are phase 4. §4 Play and §5 Save are phase 2; save needs no field because of the
  state design.
- **Known risk:** `topologyFaults` and the assembler's `Control` switches may need more weights cases than
  named here. TypeScript names them. Each must treat weights like a sequence: compiled after the carve,
  never as a lever.
