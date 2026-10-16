# stoneGate Phase 1: Stones in the Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Verified against `abad47f3`** (branch `topology/mechanics`, main up to #315 merged). Every task was built in a
scratch copy of that commit: the code below compiles (`tsc -b`), lints, and its tests pass; the dev bake carves.

**Goal:** a lock with stones and plates compiles, carves, is proved sound by the engine's own solver, and
bakes on the dev floor. It is not playable yet; that is phase 2.

**Architecture:** the stones of one lock are one mechanism, compiled like a sequence. A shared enumeration
(`stoneArrangements`) lists every arrangement and every lift and set-down; the tool's walk and the engine
both read it. After the carve, `placeWeights` stands each plate on a corridor node of its region. The
`MechanismRecord` goes on the first plate, its transitions sit at the plate cells, and every plate points back
with `worksMechanism`. The existing `pressAt`, `floorLock` and `walkLock` then work it unchanged, except for
one new rule: the way out is left only with empty hands (`LockSpec.leaveWith`). The stones bind to the
`stonePlate` realisation; with the topology mod off the plates are bare ground, like a sequence's tiles.

**Tech Stack:** TypeScript, Vitest, `yarn lock` (`scripts/lock.ts`), `yarn generate-world` (Node bake).

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` §1 Contract, §2 Solver, §3 Carve and bake.
**Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`.

**Start from:** `topology/mechanics` at or after `abad47f3`. #315 is already merged into it.

**Questions before running:** none.

## Global Constraints

- **Contract shape:** `weights?: { plates: Record<id, { in: RegionId, stone: boolean, opens: { weighted: BarrierId[], empty: BarrierId[] } }> }`.
- **Stones have no ids.** A plate is authored with or without a stone. A gate owner may be a plate id or `"unladen"`.
- **One stone in hand.** It is set down only on an empty plate. With a stone in hand, nothing can be lifted.
- **A stone never leaves its floor.** The way out is left only with empty hands. The player may walk into the
  way-out region carrying; only leaving (and finishing) needs empty hands.
- **The explorer's weight is play-time only** (phase 2). Nothing in phase 1 models it: no player-weight term in
  `stoneArrangements`, the record or the walk.
- **No tests on authored content.** Tests use small made-up locks written inline. `yarn lock` is the check
  on `src/game/locks/*.lock`. Never assert what a catalogue lock contains.
- **Stable world:** without `INCLUDE_DEV=1`, `src/data/generatedWorld.ts` stays byte-identical.
  `src/data/carveLedger.json` does change: its hashes fingerprint the carve's source files, so editing the
  assembler refreshes all 30 of them. Commit that refresh (task 8).
- **Comments state the current rule and why**, never history ("replaces", "used to").
- **Count work, never wall-clock**, in tests.
- **Commits:** one short line, then a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Shell:** commands run in zsh; an unmatched glob is an error, so quote globs you pass to tools.
- **Known failures, not yours:** at `abad47f3`, `src/mods/puzzleSeeds.verify.ts` already fails 3 tests
  ("the switch's three shapes…", "owes the switch a board…", "names the floor and the shape…"). Leave them.

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
   The sorted key is tested in task 2.
6. **Several plates in one section** must have distinct save slots (`cellSlot` → `xplate:<id>`), or the
   assembler refuses the floor with `duplicateCellSlot`. Covered by task 6's carve test and task 8's bake.

---

### Task 1: Stones in the shared Lock contract

**Files:**
- Modify: `src/game/lockAuthoring.ts` (add `Weights`, `Lock.weights`, `CARRY_TERMS`, `isWeightOwner`)
- Modify: `src/game/lockNotation.ts` (import `CARRY_TERMS` from lockAuthoring; drop its own `Weights`/`CARRY_TERMS`; `DraftLock` becomes `Lock`)
- Modify: `src/game/lockWalkSpec.ts` (imports only)
- Modify: `src/game/lockCompile.ts` (`lockFaults`: accept plate and `unladen` owners; check plate regions; `translate` skips weight owners)
- Test: `src/game/lockCompile.spec.ts`

`src/game/lockDraw.ts` imports only the type `DraftLock`, which stays as an alias: no edit.

**Interfaces:**
- Produces: `export type Weights` (below), `Lock.weights?: Weights`, `export const CARRY_TERMS = ["unladen"] as const`,
  `export const isWeightOwner = (lock: Lock, owner: string): boolean`.
- New `LockFault` variants: `{ type: "plateNamesNoRegion"; plate: string; region: string }` and
  `{ type: "carryWithoutStones"; barrier: string }`.

- [ ] **Step 1: Write the failing tests** at the end of `src/game/lockCompile.spec.ts`, as a new `describe`
  (`Lock`, `checkLock` are already imported there):

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
    expect(checkLock(plateLock())).not.toContainEqual(expect.objectContaining({ type: "gateOwnerUnknown" }))
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

The first test asks only that no `gateOwnerUnknown` is raised: until task 3 compiles the stones, nothing
opens `door`, so `checkLock` still reports a `topology` fault `obstacleUnowned`. Task 3 tightens it to `[]`.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCompile.spec.ts -t "a lock with stones"`
Expected: FAIL. TypeScript rejects `weights` on `Lock`, or `checkLock` reports `gateOwnerUnknown` for `p`.

- [ ] **Step 3: Implement**

In `src/game/lockAuthoring.ts`, right after `export type LockMechanic = Toggle | Activator | Sequence | ForkSwitch`:

```ts
/**
 * STONES ON PLATES, the one lock-wide control that is not a mechanic. A stone rests on a plate or is in the
 * player's hand; stones are alike, so a stone is written as the plate it starts on. A plate opens its
 * `weighted` gates while a stone rests on it and its `empty` gates while none does; both may be empty, which
 * makes it a shelf. See docs/superpowers/specs/2026-10-04-stones-acceptance.md.
 */
export type Weights = {
  readonly plates: Readonly<
    Record<
      string,
      {
        readonly in: RegionId
        readonly stone: boolean
        readonly opens: { readonly weighted: readonly BarrierId[]; readonly empty: readonly BarrierId[] }
      }
    >
  >
}

/** Gate owners that are conditions on the stones rather than something placed: empty hands. */
export const CARRY_TERMS = ["unladen"] as const
```

Add the field to `Lock`, between `mechanics` and `in`:

```ts
  readonly weights?: Weights
```

At the end of the file:

```ts
/** Whether a gate owner is a plate of the lock, or a condition on what the player carries. */
export const isWeightOwner = (lock: Lock, owner: string): boolean =>
  owner in (lock.weights?.plates ?? {}) || (CARRY_TERMS as readonly string[]).includes(owner)
```

In `src/game/lockNotation.ts`:
- Add `import { CARRY_TERMS } from "./lockAuthoring"` above the existing `import type { Lock, … } from "./lockAuthoring"`.
- Delete the doc comment and `export type Weights = { … }` block (the one starting "Stones the player carries
  and the plates they press — a PROPOSAL…"), and delete `export const CARRY_TERMS = ["unladen"] as const` with
  its one-line comment.
- Change `export type DraftLock = Lock & { weights?: Weights }` to `export type DraftLock = Lock`. Keep the
  alias so the tool's call sites need no edit. The parser's mutable arrays assign to the readonly type as they are.

In `src/game/lockWalkSpec.ts`, replace the four import lines

```ts
import type { Lock, LockMechanic } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import type { LockSpec, Mechanism } from "./lockWalk"
import { CARRY_TERMS } from "./lockNotation"
import type { DraftLock, Weights } from "./lockNotation"
```

with

```ts
import type { Lock, LockMechanic, Weights } from "./lockAuthoring"
import { barriersOf, CARRY_TERMS, isRegionGate, joinOf } from "./lockAuthoring"
import type { LockSpec, Mechanism } from "./lockWalk"
import type { DraftLock } from "./lockNotation"
```

In `src/game/lockCompile.ts`:
- Import: `import { barriersOf, CARRY_TERMS, isRegionGate, isWeightOwner, joinOf } from "./lockAuthoring"`.
- Add to `LockFault`, right after the `gateOwnerUnknown` member:

```ts
  /** A plate stands in a region the lock does not have. */
  | { type: "plateNamesNoRegion"; plate: string; region: string }
  /** A gate asks for empty hands on a lock with no stones. */
  | { type: "carryWithoutStones"; barrier: string }
```

- In `lockFaults` (line ~154), replace

```ts
    for (const owner of gate.owners)
      if (!(owner in lock.mechanics)) faults.push({ type: "gateOwnerUnknown", barrier: id, owner })
```

  with

```ts
    for (const owner of gate.owners) {
      if (isWeightOwner(lock, owner)) {
        if (!lock.weights && (CARRY_TERMS as readonly string[]).includes(owner))
          faults.push({ type: "carryWithoutStones", barrier: id })
        continue
      }
      if (!(owner in lock.mechanics)) faults.push({ type: "gateOwnerUnknown", barrier: id, owner })
    }
```

  `isWeightOwner` answers true for `unladen` even without weights, which is what lets the refusal name it.
- Right after the gate loop, before `for (const [id, oneWay] of Object.entries(oneWays)) {`:

```ts
  for (const [plate, { in: region }] of Object.entries(lock.weights?.plates ?? {}))
    if (!(region in lock.regions)) faults.push({ type: "plateNamesNoRegion", plate, region })
```

- In `translate` (line ~257), the one other place a gate owner is looked up as a mechanic, replace

```ts
    const forkOwners = gate.owners.filter(owner => kinds(lock.mechanics[owner].control)?.gates === "owns").map(name)
```

  with

```ts
    const forkOwners = gate.owners
      .filter(owner => !isWeightOwner(lock, owner) && kinds(lock.mechanics[owner].control)?.gates === "owns")
      .map(name)
```

- [ ] **Step 4: Run tests and the tool**

Run: `yarn vitest run src/game/lock*.spec.ts && yarn tsc -b && yarn lock >/dev/null; echo $?`
Expected: all PASS, tsc clean, `yarn lock` exits `0`.

- [ ] **Step 5: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/lockNotation.ts src/game/lockWalkSpec.ts src/game/lockCompile.ts src/game/lockCompile.spec.ts
git commit -m "feat(topology): stones in the shared Lock contract"
```

---

### Task 2: One enumeration of stone arrangements, for the tool and the engine

**Files:**
- Create: `src/game/mechanics/weights.ts`
- Create: `src/game/mechanics/weights.spec.ts`
- Modify: `src/game/lockWalkSpec.ts` (`weightsMechanism` and the stone helpers move out; it calls `stoneArrangements`)

**Interfaces:**
- Consumes: `Weights`, `Lock`, `isWeightOwner` from task 1.
- Produces: `StoneMove`, `Arrangements`, `stoneArrangements(lock: Lock): Arrangements` (`lock.weights` must be set).

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
    expect(every.opens["a + hand"]).toEqual([])
    const any = stoneArrangements(lockOf("in -[a|b]- out\na plate @in stone\nb plate @in stone"))
    expect(any.opens["a + hand"]).toEqual(["in-out"])
  })
})
```

`opens` lists only the gates that have a stone condition. A gate owned only by a lever never appears there.
With two stones on two plates the reachable arrangements are `a b`, `b + hand` and `a + hand`; a bare `a` is
not reachable, which is why the last test reads `a + hand`.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts`
Expected: FAIL, "Cannot find module './weights'".

- [ ] **Step 3: Implement** `src/game/mechanics/weights.ts`. This moves the tool's logic out of
`lockWalkSpec.ts` (the `Stones` type, `stonesKey`, `startStones`, `weightSays`, `stonesSay`, and the BFS
in `weightsMechanism`). Plates are visited in sorted order, so `moves` is canonical:

```ts
import type { Lock, Weights } from "../lockAuthoring"
import { isWeightOwner } from "../lockAuthoring"

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

const HAND = "hand"
type Stones = { weighted: ReadonlySet<string>; hand: boolean }

/** "P1 P4" or "P4 + hand": the plates holding a stone, by name, then the hand; "none" when nothing holds one. */
const keyOf = ({ weighted, hand }: Stones) =>
  [...[...weighted].sort(), ...(hand ? [`+ ${HAND}`] : [])].join(" ") || "none"

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
  for (const queue = [start]; queue.length > 0;) {
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

In `src/game/lockWalkSpec.ts`:
- Add `import { stoneArrangements } from "./mechanics/weights"`.
- Delete `const HAND = "hand"`, the `Stones` type, `stonesKey` (exported but used nowhere else), `startStones`,
  `weightSays` and `stonesSay`. Keep `isWeightTerm`.
- In `walkSpecOf`, `const weights = (authored as DraftLock).weights` becomes `const weights = authored.weights`.
  Leave the `${authored.out}:unladen` gate trick in place for now; task 6 replaces it.
- `if (weights) mechanisms[WEIGHTS] = weightsMechanism(lock, weights, opened)` becomes
  `if (weights) mechanisms[WEIGHTS] = weightsMechanism(lock, opened)`, and `weightsMechanism` becomes:

```ts
// Every arrangement of the stones the player can reach, as one mechanism; each move is made in its plate's region.
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

  `lock` here is the copy carrying the `out:unladen` gate, so that gate's say still comes from the stones.
- `openAtStart` reads the start arrangement from the enumeration:

```ts
export const openAtStart = (lock: Lock): string[] => {
  const stones = lock.weights ? stoneArrangements(lock) : undefined
  return Object.entries(lock.gates)
    .filter(([id, gate]) => {
      const terms = gate.owners.filter(owner => isWeightTerm(lock.weights, owner))
      const says = [
        ...(stones && terms.length > 0 ? [stones.opens[stones.initial].includes(id)] : []),
        ...gate.owners
          .filter(owner => !terms.includes(owner))
          .map(owner => {
            const m = lock.mechanics[owner]
            return m !== undefined && "starts" in m && (m.opens[m.starts] ?? []).includes(id)
          }),
      ]
      return gate.mode === "any" ? says.some(Boolean) : says.every(Boolean)
    })
    .map(([id]) => id)
}
```

  The stones' say is already folded by the gate's mode, so folding it once more with the mechanics' says by
  the same mode gives the same answer as folding every term.
- In `notBuildable`, `(lock as DraftLock).weights` becomes `lock.weights`. The `DraftLock` import is now unused:
  delete it.

The review in `lockReview.ts` (`stoneMove`) parses the keys. The key format is unchanged, so it needs no edit.

- [ ] **Step 4: Run the new tests and the tool's tests, unchanged**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/lock*.spec.ts && yarn tsc -b && yarn lock >/dev/null; echo $?`
Expected: all PASS. The existing `lockWalkSpec.spec.ts` stone tests pass without edits. `yarn lock` exits `0`,
and its full output (`yarn lock > after.txt`) is identical to the output before this task.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/lockWalkSpec.ts
git commit -m "refactor(topology): stone arrangements in one place, for the tool and the engine"
```

---

### Task 3: The weights kind compiles a lock's stones into one control

**Files:**
- Modify: `src/game/mechanics/mechanicKind.ts` (`MechanicKind.compileLock?`)
- Modify: `src/game/mechanics/weights.ts` (add `WEIGHTS: MechanicKind`)
- Modify: `src/game/mechanics/index.ts` (add `WEIGHTS` to `CORE_MECHANICS`)
- Modify: `src/game/obstacles.ts` (`WeightsControl`, `Control` union, `isWeights`, `topologyFaults`)
- Modify: `src/game/lockCompile.ts` (`kindsUsed`, `lockFaults`, `unbakeableFaults`, `translate`)
- Modify: `src/game/siteAssembler.ts` (skip weights in `controlRecords` and in the marks loop)
- Modify: `src/worldGen/serializer.ts` (`serializeControl` weights case)
- Test: `src/game/lockCompile.spec.ts`

**Interfaces:**
- Consumes: `stoneArrangements` (task 2).
- Produces: `WeightsControl`, `isWeights` (`obstacles.ts`); `MechanicKind.compileLock?: (lock: Lock, context: CompileContext) => Compiled`;
  `WEIGHTS` (`mechanics/weights.ts`). The control's id is `name("stones")`, so a namespaced lock gets `a.stones`.

The stones belong to the whole lock, not to one mechanic, so the kind compiles from the lock through a new
`compileLock` hook rather than `compile`. `unbakeableFaults` must accept `compileLock` as a compile rule, or a
built kind without `compile` is refused as `kindNotCompilable`.

- [ ] **Step 1: Write the failing tests**

In the `describe("a lock with stones")` block from task 1, change the first test's assertion to
`expect(checkLock(plateLock())).toEqual([])` and rename it `"takes a plate as a gate's owner, and is checked whole"`.
Then add, in the same block (`fragmentOf`, `compile`, `BINDING`, `CORE_MECHANICS`, `mechanicRegistry` are
already in scope in that file):

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

  it("refuses stones in a build whose registry has no weights kind", () => {
    const withoutWeights = mechanicRegistry(CORE_MECHANICS.filter(kind => kind.control !== "weights"))
    expect(checkLock(plateLock(), withoutWeights)).toEqual([
      { type: "unknownControlKind", mechanic: "stones", control: "weights" },
    ])
  })

  it("asks a binding for the stones like any built kind", () => {
    const result = compile(plateLock(), BINDING)
    expect(result).toEqual({ ok: false, faults: [{ type: "unboundRole", kind: "weights", mechanics: ["stones"] }] })
  })
```

And in the existing test `"carries no mod: the kinds are the same with every mod removed from the build"`
(line ~377), append `"weights"` after `"one-way"` in the expected list.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCompile.spec.ts`
Expected: FAIL. No control has `control: "weights"`; `checkLock` reports `obstacleUnowned`.

- [ ] **Step 3: Implement**

`src/game/obstacles.ts`: replace `export type Control = StatefulControl | ForkSwitchControl | SequenceControl` with

```ts
/**
 * A LOCK'S STONES AND PLATES, one control however many plates: its states are the arrangements of the stones
 * (src/game/mechanics/weights.ts), `opens` names the gates each arrangement opens and `moves` every lift and
 * set-down by the plate it is made at. Compiled from a lock, never authored longhand.
 */
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
  /** The arrangements with a stone in hand. */
  carrying: string[]
  /** The realisation the plates are dressed as, bound where the lock is placed. */
  encounter?: string
}

export type Control = StatefulControl | ForkSwitchControl | SequenceControl | WeightsControl
```

and after `isSequence`:

```ts
export const isWeights = (control: Control): control is WeightsControl => control.control === "weights"
```

`controlKindOf` already returns `control.control ?? …`, so `"weights"` comes through unchanged.

`topologyFaults`, the two `Control` sites that read `.in`:
- The no-layout branch (line ~317) becomes

```ts
    for (const c of controls)
      faults.push({
        type: "controlUnsatisfied",
        id: c.id,
        what: isSequence(c) ? (c.steps[0]?.in ?? c.id) : isWeights(c) ? (c.plates[0]?.in ?? c.id) : c.in,
      })
```

- In the controls loop, right after the `if (isSequence(control)) { … continue }` block (line ~374–378):

```ts
    // The stones: every plate stands in a region of the floor, and every gate an arrangement opens is a gate.
    if (isWeights(control)) {
      for (const plate of control.plates)
        if (!regions.has(plate.in)) faults.push({ type: "controlUnsatisfied", id: control.id, what: plate.in })
      for (const id of new Set(Object.values(control.opens).flat())) {
        const obstacle = obstacleById.get(id)
        if (!obstacle || obstacle.kind !== "gate") faults.push({ type: "controlUnsatisfied", id: control.id, what: id })
        owned.add(id)
      }
      continue
    }
```

  The `opensGate` set (line ~424) already reads `Object.values(control.opens).flat()` for every non-fork
  control, so it needs no edit.

`src/game/mechanics/mechanicKind.ts`: `import type { Lock, LockMechanic, Opens } from "../lockAuthoring"`, and
after the `compile?` member of `MechanicKind`:

```ts
  /** How a kind that belongs to the whole lock rather than to one mechanic becomes controls: the stones. */
  compileLock?: (lock: Lock, context: CompileContext) => Compiled
```

`src/game/mechanics/weights.ts`: add `import type { MechanicKind } from "./mechanicKind"` and, at the end:

```ts
/**
 * THE STONES OF ONE LOCK AS ONE CONTROL. Every plate needs a node of its own in its region, as a sequence's
 * tile does; the control is compiled from the whole lock, every plate, gate and region under its namespace.
 */
export const WEIGHTS: MechanicKind = {
  control: "weights",
  built: true,
  gates: "opens",
  seats: control =>
    control.control === "weights" ? control.plates.map(plate => ({ region: plate.in, seat: "tile" as const })) : [],
  compileLock: (lock, { name, binding }) => {
    if (!lock.weights) return { controls: [] }
    const { plates } = lock.weights
    const renamed: Lock = {
      ...lock,
      gates: Object.fromEntries(
        Object.entries(lock.gates).map(([id, gate]) => [
          name(id),
          { ...gate, owners: gate.owners.map(owner => (owner in plates ? name(owner) : owner)) },
        ])
      ),
      weights: {
        plates: Object.fromEntries(
          Object.entries(plates).map(([id, plate]) => [
            name(id),
            {
              in: name(plate.in),
              stone: plate.stone,
              opens: { weighted: plate.opens.weighted.map(name), empty: plate.opens.empty.map(name) },
            },
          ])
        ),
      },
    }
    const { states, initial, moves, opens, carrying } = stoneArrangements(renamed)
    const encounter = binding.weights
    return {
      controls: [
        {
          id: name("stones"),
          control: "weights",
          plates: Object.entries(renamed.weights!.plates).map(([id, plate]) => ({
            id,
            in: plate.in,
            stone: plate.stone,
          })),
          states,
          initial,
          opens,
          moves,
          carrying,
          ...(encounter === undefined ? {} : { encounter }),
        },
      ],
    }
  },
}
```

The `seats` entries are `"tile"` seats, so the lock planner (`lockPlan.ts` `seatsOf`, `laidFloor.ts`
`nodesForSeats`) reserves a node for every plate with no further edit. The `WEIGHTS` name is the kind; it
does not collide with `lockWalkSpec.ts`'s `WEIGHTS` (the walk's mechanism id "⚖"), which nothing imports here.

`src/game/mechanics/index.ts`: `import { WEIGHTS } from "./weights"`, and
`CORE_MECHANICS = [TOGGLE, ACTIVATOR, SEQUENCE, FORK_SWITCH, ONE_WAY, WEIGHTS]`.

`src/game/lockCompile.ts`:
- `kindsUsed` (line ~98): after the one-way line, `if (lock.weights) add("weights", "stones")`. That gives
  `unboundFaults` its `unboundRole` for an unbound `weights`, and `unbakeableFaults` its built check.
- `lockFaults`: right before `if (Object.keys(oneWays).length > 0 && !kinds("one-way"))` (line ~205):

```ts
  if (lock.weights && !kinds("weights"))
    faults.push({ type: "unknownControlKind", mechanic: "stones", control: "weights" })
```

- `unbakeableFaults` (line ~214): `if (meta?.built === true && !meta.compile && !meta.compileLock && !meta.effectOnly)`.
- `translate`, right after the mechanics loop that fills `controls` and `forks` (line ~286):

```ts
  if (lock.weights) controls.push(...(kinds("weights")?.compileLock?.(lock, { name, binding }).controls ?? []))
```

`src/game/siteAssembler.ts` (TypeScript names the first site; the second it cannot see):
- Add `isWeights` to the `./obstacles` import list (after `isSequence`, line ~52).
- `controlRecords` (line ~1036): `isForkSwitch(control) || isSequence(control) || isWeights(control) ? [] : […]`.
- The marks loop `for (const control of authoredConfig.controls ?? []) {` (line ~1049) would fall through to
  `controlRecords.find(…)!.record` and crash at run time for a weights control. Make its first statement:

```ts
    // The stones wear no mark: a door waiting on plates shows its plates itself (mechanic-contract.md, "A gate
    // shows its own condition").
    if (isWeights(control)) continue
```

`src/worldGen/serializer.ts`: import `isWeights` beside `isForkSwitch, isSequence`, and in `serializeControl`
after the fork-switch return:

```ts
  // Compiled from a lock, never authored longhand; written whole should a floor ever carry one.
  if (isWeights(c)) return JSON.stringify(c)
```

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/lockCompile.spec.ts src/game/mechanics src/game/lock*.spec.ts src/game/obstacles.spec.ts && yarn tsc -b && yarn lock >/dev/null; echo $?`
Expected: PASS, tsc clean, `yarn lock` exits `0` with unchanged output.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics src/game/obstacles.ts src/game/lockCompile.ts src/game/lockCompile.spec.ts src/game/siteAssembler.ts src/worldGen/serializer.ts
git commit -m "feat(topology): a lock's stones compile into one weights control"
```

---

### Task 4: The weights record, built from the control and the plate cells

**Files:**
- Modify: `src/game/mechanics/weights.ts` (add `compileWeights`)
- Test: `src/game/mechanics/weights.spec.ts`

**Interfaces:**
- Consumes: `WeightsControl` (task 3), `MechanismRecord` (`src/game/siteTypes.ts:384`; `transitions[].at` is
  `readonly [number, number]`, so a readonly tuple is passed as it is).
- Produces:

```ts
export const compileWeights = (
  control: WeightsControl,
  cellOf: (plate: string) => readonly [number, number],
  gate: (id: string) => { gateKeyId: string; mode?: "any" }
): MechanismRecord
```

- [ ] **Step 1: Write the failing tests.** In `src/game/mechanics/weights.spec.ts`, change the imports to

```ts
import { describe, expect, it } from "vitest"
import { compileLock } from "../lockCompile"
import { parseLock } from "../lockNotation"
import { isWeights } from "../obstacles"
import { compileWeights, stoneArrangements } from "./weights"
```

and append:

```ts
const controlOf = (text: string) => {
  const result = compileLock(parseLock(text).lock, { weights: "stonePlate", toggle: "handle" })
  if (!result.ok) throw new Error(JSON.stringify(result.faults))
  return result.fragment.controls.find(isWeights)!
}
const cells: Record<string, [number, number]> = { a: [0, 0], b: [0, 2] }

describe("compileWeights", () => {
  it("places every lift and set-down at its plate's cell, from the arrangement it leaves", () => {
    const record = compileWeights(
      controlOf("in -[b]- out\nb plate @in\na plate @in stone"),
      p => cells[p],
      id => ({ gateKeyId: `k:${id}` })
    )
    expect(record).toMatchObject({ initial: "a", returnsToInitial: true, placedOnly: true })
    expect(record.transitions).toContainEqual({ from: "+ hand", to: "b", at: [0, 2] })
    expect(record.positions).toEqual([{ state: "b", gateKeyId: "k:in-out" }])
  })

  it("stands an :empty gate open in the arrangement the floor starts in", () => {
    const record = compileWeights(
      controlOf("in -[b:empty]- out\nb plate @in\na plate @in stone"),
      p => cells[p],
      id => ({ gateKeyId: `k:${id}` })
    )
    expect(record.positions).toContainEqual({ state: record.initial, gateKeyId: "k:in-out" })
  })

  it("keeps a gate's mode, so the door folds the stones with a lever by it", () => {
    const control = controlOf("in -[b|L]- out\nb plate @in\na plate @in stone\nL toggle @in")
    const record = compileWeights(
      control,
      p => cells[p],
      id => ({ gateKeyId: `k:${id}`, mode: "any" })
    )
    expect(record.positions).toEqual([{ state: "b", gateKeyId: "k:in-out", mode: "any" }])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts -t compileWeights`
Expected: FAIL, `compileWeights` is not exported.

- [ ] **Step 3: Implement.** In `src/game/mechanics/weights.ts` add
`import type { WeightsControl } from "../obstacles"` and `import type { MechanismRecord } from "../siteTypes"`,
and at the end:

```ts
/**
 * THE STONES AS THE RECORD A FLOOR CELL CARRIES: every arrangement a state, every lift and set-down a move
 * placed at its plate's cell, and each arrangement's gates its positions. Placed-only, so a plate works only
 * the moves made at it; every move can be undone, so it returns to its initial.
 */
export const compileWeights = (
  control: WeightsControl,
  cellOf: (plate: string) => readonly [number, number],
  gate: (id: string) => { gateKeyId: string; mode?: "any" }
): MechanismRecord => ({
  states: control.states,
  initial: control.initial,
  returnsToInitial: true,
  placedOnly: true,
  positions: control.states.flatMap(state => control.opens[state].map(id => ({ state, ...gate(id) }))),
  transitions: control.moves.map(({ from, to, plate }) => ({ from, to, at: cellOf(plate) })),
})
```

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
- Modify: `src/game/siteTypes.ts` (`RoomCell.plate?: { id: string }`; `AssemblerReason` `plateNotPlaced`)
- Modify: `src/game/cellSlot.ts` (a plate's slot is `xplate:<id>`)
- Modify: `src/game/siteAssembler.ts` (call `placeWeights` after `placeSequences`; report the shortfall)

**Interfaces:**
- Consumes: `WeightsControl`, `compileWeights`.
- Produces:

```ts
export type WeightsDemand = { control: WeightsControl; gate: (id: string) => { gateKeyId: string; mode?: "any" } }
/** undefined when every plate stands; otherwise the first plate with no free node in its region. */
export const placeWeights = (
  cells: GridCell[][],
  demands: readonly WeightsDemand[],
  onMainPath: ReadonlySet<string>,
  salt: string,
  reserved: ReadonlySet<string> = new Set()
): { plate: string } | undefined
```

A plate cell becomes `{ type: "room", roomType: "encounter", …, region, plate: { id }, worksMechanism: { mechanismId, transition } }`;
the first plate also carries `mechanism: record, mechanismId: control.id`. Plates not on the main path come
first. `reserved` mirrors `placeSequences`' last parameter (a switch's ways out).

Without the `cellSlot` change, every plate but the first has no family and no `mechanismId`, so two plates in
one section both file under `x?` and the assembler refuses the floor with `duplicateCellSlot`.

- [ ] **Step 1: Write the failing tests** in `src/game/weightsPlates.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { isWeights } from "./obstacles"
import type { Direction, GridCell, RoomCell } from "./siteTypes"
import { placeWeights } from "./weightsPlates"

const controlOf = (text: string) => {
  const result = compileLock(parseLock(text).lock, { weights: "stonePlate" })
  if (!result.ok) throw new Error(JSON.stringify(result.faults))
  return result.fragment.controls.find(isWeights)!
}

// One row of corridor, `nodes` nodes on the even columns with a connector between each two.
const corridorRow = (nodes: number, region: string): GridCell[][] => [
  Array.from({ length: nodes * 2 - 1 }, (_, c): GridCell => {
    const dirs = new Set<Direction>()
    if (c > 0) dirs.add("w")
    if (c < nodes * 2 - 2) dirs.add("e")
    return { type: "corridor", dirs, state: "reachable", region }
  }),
]

const plates = (cells: GridCell[][]) =>
  cells.flat().filter((cell): cell is RoomCell => cell.type === "room" && cell.plate !== undefined)

const TWO_PLATES = "in -[b]- out\nb plate @in\na plate @in stone"

describe("placeWeights", () => {
  it("stands each plate on its own node in its region, the record on the first", () => {
    const cells = corridorRow(4, "in")
    const control = controlOf(TWO_PLATES)
    expect(
      placeWeights(cells, [{ control, gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt")
    ).toBeUndefined()
    expect(
      plates(cells)
        .map(cell => cell.plate!.id)
        .sort()
    ).toEqual(["a", "b"])
    expect(plates(cells).filter(cell => cell.mechanism)).toHaveLength(1)
  })

  it("names the plate whose region has no free node", () => {
    const cells = corridorRow(1, "in")
    const control = controlOf(TWO_PLATES)
    expect(placeWeights(cells, [{ control, gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt")).toEqual({
      plate: "a",
    })
  })

  it("stands a plate off the main path while its region has a node there", () => {
    const cells = corridorRow(4, "in")
    const onRoute = new Set(["0,0", "0,2", "0,4"])
    placeWeights(
      cells,
      [
        {
          control: controlOf("in -[p]- out\np plate @in\nshelf plate @in stone"),
          gate: id => ({ gateKeyId: `k:${id}` }),
        },
      ],
      onRoute,
      "salt"
    )
    expect(plates(cells).some(cell => cell === cells[0][6])).toBe(true)
  })
})
```

`control.plates` is in authoring order, `b` before `a`, so with one node `b` takes it and `a` is the plate named.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/weightsPlates.spec.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `src/game/weightsPlates.ts`, mirroring `placeSequences` (`src/game/sequenceTiles.ts:100-183`)
without its cut-node rule:

```ts
import { hashString } from "@/support/hashString"
import { compileWeights } from "./mechanics/weights"
import type { WeightsControl } from "./obstacles"
import type { GridCell, RoomCell } from "./siteTypes"

type Place = [number, number]

/** One lock's stones to stand on the floor, and how a gate id reads as the key its door asks for. */
export type WeightsDemand = { control: WeightsControl; gate: (id: string) => { gateKeyId: string; mode?: "any" } }

// A plate stands where a sequence tile would, a bare corridor node of its region with no junction, but it
// need not be a node every walk crosses: the player chooses to go to a plate.
const isCandidate = (cell: GridCell, r: number, c: number, region: string): boolean =>
  cell.type === "corridor" &&
  cell.region === region &&
  !cell.hidden &&
  !cell.obstacle &&
  cell.dirs.size <= 2 &&
  r % 2 === 0 &&
  c % 2 === 0

/**
 * STANDS EVERY LOCK'S PLATES ON THE FINISHED CARVE, and changes no wall: a plate is a corridor node becoming a
 * room, `dirs` untouched. Each plate takes its own node in its region, off the main path first; a region with
 * no free node refuses the whole placement, naming the plate. The stones' record goes on the first plate, and
 * every plate works the moves the record places at it.
 *
 * `reserved` are cells a plate may never take, as for `placeSequences`.
 */
export const placeWeights = (
  cells: GridCell[][],
  demands: readonly WeightsDemand[],
  onMainPath: ReadonlySet<string>,
  salt: string,
  reserved: ReadonlySet<string> = new Set()
): { plate: string } | undefined => {
  const taken = new Set<string>()
  const placed: { demand: WeightsDemand; at: Map<string, Place> }[] = []
  for (const demand of demands) {
    const at = new Map<string, Place>()
    for (const plate of demand.control.plates) {
      const candidates: Place[] = []
      for (let r = 0; r < cells.length; r++)
        for (let c = 0; c < cells[r].length; c++)
          if (!taken.has(`${r},${c}`) && !reserved.has(`${r},${c}`) && isCandidate(cells[r][c], r, c, plate.in))
            candidates.push([r, c])
      const rank = ([r, c]: Place) => hashString(`${salt}|plate|${plate.id}|${r},${c}`)
      const onRoute = ([r, c]: Place) => Number(onMainPath.has(`${r},${c}`))
      const [best] = candidates.sort((a, b) => onRoute(a) - onRoute(b) || rank(a) - rank(b))
      if (!best) return { plate: plate.id }
      taken.add(`${best[0]},${best[1]}`)
      at.set(plate.id, best)
    }
    placed.push({ demand, at })
  }

  for (const { demand, at } of placed) {
    const { control, gate } = demand
    const record = compileWeights(control, plate => at.get(plate)!, gate)
    control.plates.forEach((plate, n) => {
      const [r, c] = at.get(plate.id)!
      const cell = cells[r][c]
      if (cell.type !== "corridor") throw new Error(`[siteAssembler] plate ${plate.id} is not on a corridor`)
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
        worksMechanism: {
          mechanismId: control.id,
          transition: record.transitions!.findIndex(t => t.at[0] === r && t.at[1] === c),
        },
        ...(n === 0 ? { mechanism: record, mechanismId: control.id } : {}),
      }
      cells[r][c] = room
    })
  }
  return undefined
}
```

`src/game/siteTypes.ts`:
- `RoomCell`, right after `sequenceTile?: { id: string; step: number; glyph: number }` (line 308):

```ts
  /** A PLATE OF A LOCK'S STONES (src/game/weightsPlates.ts). Whether a stone rests on it is the stones'
   * mechanism state, never the cell's: the record sits on the lock's first plate, and every plate works the
   * moves that record places at it through `worksMechanism`. */
  plate?: { id: string }
```

- `AssemblerReason`, right after `| { type: "sequenceTileNotPlaced"; id: string; step: number }` (line ~789):

```ts
  /** No carve found a free corridor node for a plate in its region. `plate` is the first plate left without one. */
  | { type: "plateNotPlaced"; plate: string }
```

`src/game/cellSlot.ts`:
- In `cellSlot`, right after `if (cell.sequenceTile) return …` (line 72):

```ts
  // A plate is named by its own authored id, so several plates in one section are told apart; the first holds
  // the stones' one state.
  if (cell.plate) return `xplate:${cell.plate.id}`
```

- In `legacyCellSlot` (line 102), add `|| cell.plate` to the first `return null` condition.

`src/game/siteAssembler.ts`:
- Import `import { placeWeights } from "./weightsPlates"` (beside the `./mechanics/realisations` import, line ~74).
- After `const sequences = (authoredConfig.controls ?? []).filter(isSequence)` (line ~1035):

```ts
  // Nor are a lock's stones: their moves are placed at the plates, which stand last too (`placeWeights`).
  const weights = (authoredConfig.controls ?? []).filter(isWeights)
```

- After `let sequenceShortfall: { id: string; step: number } | undefined` (line ~1457):

```ts
  // The first plate no attempt could stand on a node of its region, kept the same way.
  let plateShortfall: { plate: string } | undefined
```

- Right after the whole `if (sequences.length > 0) { … }` block (it ends with the `tileDuplicate` check,
  line ~4306), before the `degradeUnrealised` comment:

```ts
    // A LOCK'S PLATES STAND ON THE FINISHED CARVE the same way, after the tiles, and move no wall either.
    if (weights.length > 0) {
      const unplaced = placeWeights(
        cells2D,
        weights.map(control => ({
          control,
          gate: (id: string) => {
            const mode = obstacleMode(id)
            return { gateKeyId: gateKeyOf(id), ...(mode ? { mode } : {}) }
          },
        })),
        new Set(mainPath.map(([r, c]) => posKey(r, c))),
        siteId,
        new Set(reservedForks.flatMap(pk => freeWaysOut(pk).map(({ neighborKey }) => neighborKey)))
      )
      if (unplaced) {
        if (!plateShortfall) plateShortfall = unplaced
        continue
      }
      const plateDuplicate = duplicateSlot()
      if (plateDuplicate) return { success: false, reasons: [{ type: "duplicateCellSlot", slot: plateDuplicate }] }
    }
```

  `mainPath`, `posKey`, `cells2D`, `siteId`, `reservedForks`, `freeWaysOut`, `obstacleMode`, `gateKeyOf` and
  `duplicateSlot` are all in scope there, as the sequence block above uses them.
- In the failure `reasons` list (line ~4351), right after the `sequenceShortfall` entry:

```ts
      ...(plateShortfall ? [{ type: "plateNotPlaced" as const, ...plateShortfall }] : []),
```

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/weightsPlates.spec.ts src/game/sequenceTiles.spec.ts src/game/siteAssembler.spec.ts && yarn tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/weightsPlates.ts src/game/weightsPlates.spec.ts src/game/siteTypes.ts src/game/cellSlot.ts src/game/siteAssembler.ts
git commit -m "feat(topology): plates stand on the finished carve"
```

---

### Task 6: The way out takes empty hands, and a stone floor carves and walks sound

**Files:**
- Modify: `src/game/lockWalk.ts` (`LockSpec.leaveWith?`; `checkLockSpec`, `movesFrom` and `walkLock` honour it)
- Modify: `src/game/lockWalkSpec.ts` (the tool's implicit `out:unladen` region gate becomes `leaveWith`)
- Modify: `src/game/siteTypes.ts` (`MechanismRecord.carrying?: string[]`)
- Modify: `src/game/mechanics/weights.ts` (`compileWeights` copies `control.carrying` onto the record)
- Modify: `src/game/floorLock.ts` (a record's `carrying` becomes `leaveWith` on the spec)
- Modify: `src/game/testSupport/lockFixtures.ts` (add `carveLockFloor`)
- Test: `src/game/lockWalk.spec.ts`, `src/game/lockWalkSpec.spec.ts`, `src/game/mechanics/weights.spec.ts`,
  `src/game/weightsPlates.spec.ts`

**Interfaces:**
- Produces: `LockSpec.leaveWith?: { mechanism: MechanismId; notIn: StateId[] }[]`. The way out counts as
  reached, and leaving it is a move, only in a config where every listed mechanism is outside its `notIn`
  states. `MechanismRecord.carrying?: string[]`.
- Produces (test support): `carveLockFloor(lock: Lock, binding: RealisationBinding, seeds?: readonly number[]): FloorGrid`.

**A behaviour change in the tool, on purpose.** The `out:unladen` trick barred the whole way-out region to a
carrying player. The engine cannot bar that region (on a floor it is ground like any other), and the spec
stops a carrying walk only at the way out itself. With `leaveWith` both the tool and the engine let the
player walk into the way-out region carrying and refuse only the leaving. A stone carried down a drop into
that region therefore strands the player, and both now report it. One tool test changes to say so.

- [ ] **Step 1: Write the failing tests**

At the end of `src/game/lockWalk.spec.ts` (`checkLockSpec`, `walkLock` and `type LockSpec` are already imported):

```ts
describe("leaveWith", () => {
  const spec = (handEmpties: boolean): LockSpec => ({
    regions: ["in", "out"],
    gates: { g: { from: "in", to: "out", owners: ["open"] } },
    mechanisms: {
      open: { states: ["o"], initial: "o", opens: { o: ["g"] }, transitions: [] },
      hand: {
        states: ["full", "empty"],
        initial: "full",
        opens: { full: [], empty: [] },
        transitions: handEmpties ? [{ from: "full", to: "empty", at: "in" }] : [],
      },
    },
    in: "in",
    out: "out",
    leaveWith: [{ mechanism: "hand", notIn: ["full"] }],
  })

  it("does not count the way out reached with a stone in hand", () => {
    expect(walkLock(spec(false))).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("counts it once the hands are empty", () => {
    expect(walkLock(spec(true))).toEqual({ sound: true, states: 4 })
  })

  it("refuses a way out waiting on a mechanism the lock does not have", () => {
    expect(checkLockSpec({ ...spec(true), leaveWith: [{ mechanism: "ghost", notIn: [] }] })).toBe(
      "the way out waits on no mechanism: ghost"
    )
  })
})
```

In `src/game/lockWalkSpec.spec.ts`, add `WEIGHTS` to the `./lockWalkSpec` import, and replace the test
`it("never lets a stone leave by the way out", …)` (line ~153) with:

```ts
  it("never lets a stone leave by the way out, so a drop into it with a stone in hand strands", () => {
    expect(compiled("in -- out\nshelf plate @in stone").leaveWith).toEqual([{ mechanism: WEIGHTS, notIn: ["+ hand"] }])
    expect(walkLock(compiled("in -- hall\nhall >> out\nshelf plate @hall stone"))).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "out" } },
    })
  })
```

In `src/game/mechanics/weights.spec.ts`, in the first `compileWeights` test, extend the `toMatchObject` to
`{ initial: "a", returnsToInitial: true, placedOnly: true, carrying: ["+ hand"] }`.

In `src/game/testSupport/lockFixtures.ts`, add the helper (keep `BINDING` and the re-exports as they are):

```ts
import type { Lock } from "@/game/lockAuthoring"
import { assembleFloor } from "@/game/siteAssembler"
import type { AssemblerReason, FloorGrid } from "@/game/siteTypes"

/** A lock placed alone on a floor with no content of its own, carved at the first of `seeds` that carves it. */
export const carveLockFloor = (
  lock: Lock,
  binding: RealisationBinding,
  seeds: readonly number[] = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)
): FloorGrid => {
  const refused: AssemblerReason[][] = []
  for (const seed of seeds) {
    const result = assembleFloor(
      "test",
      {
        pathPuzzles: 0,
        difficulty: "expert",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [],
        locks: [{ lock }],
        realisations: binding,
      },
      seed
    )
    if (result.success) return result.grid
    refused.push(result.reasons)
  }
  throw new Error(`${lock.name} carved at none of ${seeds.length} seeds: ${JSON.stringify(refused[0])}`)
}
```

`assembleFloor` (`src/game/siteAssembler.ts`) expands the floor's `locks` itself, so this is the real
lock-first carve path. The test lock gives every region `?` (free): with a lock's default appetites
(`in` puzzles, the rest nothing) and no content, the carve finds no layout.

At the end of `src/game/weightsPlates.spec.ts`, with `import { floorLock } from "./floorLock"`,
`import { walkFloorLock } from "./floorLockWalk"` and `import { carveLockFloor } from "./testSupport/lockFixtures"`
added to its imports:

```ts
describe("a stone lock on a floor", () => {
  // Every region takes `free`, so the carve has nothing to seat but the lock.
  const STONES = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"

  it("carves, and the engine's walk of it is sound", () => {
    const grid = carveLockFloor(parseLock(STONES, "stones").lock, { weights: "stonePlate" })
    expect(walkFloorLock(grid)).toMatchObject({ sound: true })
  })

  it("leaves the floor only with empty hands", () => {
    const grid = carveLockFloor(parseLock(STONES, "stones").lock, { weights: "stonePlate" })
    expect(floorLock(grid)!.leaveWith).toEqual([{ mechanism: expect.any(String), notIn: ["+ hand"] }])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockWalk.spec.ts src/game/lockWalkSpec.spec.ts src/game/mechanics/weights.spec.ts src/game/weightsPlates.spec.ts`
Expected: FAIL. `leaveWith` is not on `LockSpec`, the record has no `carrying`, and `floorLock(grid).leaveWith`
is undefined. (The carve test itself already passes: plates stand and the walk is sound.)

- [ ] **Step 3: Implement**

`src/game/lockWalk.ts`:
- In `LockSpec`, after `out: RegionId`:

```ts
  /** The way out is left only in a config outside every `notIn`: a stone never leaves its floor. */
  leaveWith?: { mechanism: MechanismId; notIn: StateId[] }[]
```

- In `checkLockSpec`, right before its final `return undefined` (line 99):

```ts
  for (const { mechanism } of spec.leaveWith ?? [])
    if (!spec.mechanisms[mechanism]) return `the way out waits on no mechanism: ${mechanism}`
```

- After `checkLockSpec`:

```ts
/** Whether the way out may be left in this config: no mechanism it waits on is in a state it refuses. */
const mayLeave = (spec: LockSpec, config: LockConfig): boolean =>
  (spec.leaveWith ?? []).every(({ mechanism, notIn }) => !notIn.includes(config[mechanism]))
```

- `movesFrom` (line 152): `if (region === spec.out && mayLeave(spec, config)) moves.push({ region: spec.in, config })`.
- `walkLock` (line 239): `if (state.region !== spec.out || !mayLeave(spec, state.config)) return`.

`src/game/lockWalkSpec.ts`:
- `walkSpecOf`'s parameter `authored` becomes `lock`, and the `out:unladen` copy goes. The opening lines become

```ts
export const walkSpecOf = (lock: Lock, drafts: readonly string[] = []): LockSpec => {
  const { weights } = lock
```

  (delete the `// A stone never leaves its floor…` comment and the `const lock: Lock = weights ? {…} : authored` block).
- The final `return { regions, gates, mechanisms, oneWays, in: lock.in, out: lock.out }` becomes

```ts
  // A stone never leaves its floor: the way out is left only with empty hands.
  const leaveWith = weights ? [{ mechanism: WEIGHTS, notIn: stoneArrangements(lock).carrying }] : undefined
  return { regions, gates, mechanisms, oneWays, in: lock.in, out: lock.out, ...(leaveWith ? { leaveWith } : {}) }
```

`src/game/siteTypes.ts`, `MechanismRecord`, after `placedOnly?: true` (line 417):

```ts
  /** The states with a stone in hand: the way out is not left in them. */
  carrying?: string[]
```

`src/game/mechanics/weights.ts`, `compileWeights`: add `carrying: control.carrying,` after `transitions`.

`src/game/floorLock.ts`:
- Right before the comment `// A MECHANISM: the position it stands in until it is worked…` (line 284):

```ts
  // A stone never leaves its floor: the way out waits for every mechanism holding one to put it down.
  const leaveWith: NonNullable<LockSpec["leaveWith"]> = []
```

- Inside the mechanism loop, right after the `mechanisms[id] = { … }` assignment and before
  `for (const { gateIds, keyId, mode } of byPosition)` (line 358):

```ts
    if (record.carrying && record.carrying.length > 0) leaveWith.push({ mechanism: id, notIn: record.carrying })
```

- In the returned spec, after `...(passages.length > 0 ? { passages } : {}),` (line 410):

```ts
    ...(leaveWith.length > 0 ? { leaveWith } : {}),
```

`floorLockWalk.ts`'s `compose` (nested locks) builds its own specs and drops `leaveWith`; no phase 1 floor nests
a stone lock, so it is left alone.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/lockWalk.spec.ts src/game/weightsPlates.spec.ts src/game/lock*.spec.ts src/game/mechanics src/game/floorLock*.spec.ts && yarn tsc -b && yarn lock >/dev/null; echo $?`
Expected: PASS, `yarn lock` exits `0`, and its full output is unchanged (no catalogue lock drops a stone
into its way-out region).

- [ ] **Step 5: Commit**

```bash
git add src/game/lockWalk.ts src/game/lockWalk.spec.ts src/game/lockWalkSpec.ts src/game/lockWalkSpec.spec.ts src/game/siteTypes.ts src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/floorLock.ts src/game/weightsPlates.spec.ts src/game/testSupport/lockFixtures.ts
git commit -m "feat(topology): a stone floor carves, and the way out takes empty hands"
```

---

### Task 7: The stone plate realisation, and plates left bare with the mod off

**Why in phase 1:** `src/mods/topology/carveNeverDependsOnAMod.verify.ts` carves every dev floor with the
topology mod off and asserts that no mechanism is left standing. Once task 8 bakes twoStones on the dev floor,
its plates must come off with the mod. That needs a realisation to bind the stones to (`stonePlate`, owned by
topology) and `degradeUnrealised` to strip plates whose realisation no mod answers, exactly as it strips a
sequence's tiles. The family mirrors the sequence's `pressure-plate`: a game meta plus a minimal app
registration with no component.

**Files:**
- Create: `src/mods/topology/game/stonePlate/meta.ts`
- Create: `src/mods/topology/app/stonePlate/plugin.tsx`
- Modify: `src/mods/topology/app/index.ts`, `src/mods/topology/index.ts`, `src/mods/topology/index.spec.ts`
- Modify: `src/game/mechanics/realisations.ts` (`unrealisedWeights`; `degradeUnrealised` strips plates)
- Modify: `src/game/siteAssembler.ts` (pass `weights` to `degradeUnrealised`)
- Modify: `src/game/testSupport/modOff.ts` (`mechanicsLeft` reports a plate)
- Test: `src/game/mechanics/realisations.spec.ts`

- [ ] **Step 1: Write the failing tests.** In `src/game/mechanics/realisations.spec.ts`, import
`unrealisedWeights` beside `degradeUnrealised, unrealisedSequences`, and append:

```ts
describe("the stone plate that realises a lock's stones", () => {
  const stones = (encounter: string): Control => ({
    id: "a.stones",
    control: "weights",
    plates: [{ id: "a.p", in: "a.in", stone: true }],
    states: ["a.p", "+ hand"],
    initial: "a.p",
    opens: { "a.p": [], "+ hand": [] },
    moves: [],
    carrying: ["+ hand"],
    encounter,
  })
  const plate = (dirs: Direction[], id: string, home: boolean): RoomCell =>
    room(dirs, {
      plate: { id },
      worksMechanism: { mechanismId: "a.stones", transition: 0 },
      ...(home
        ? {
            mechanismId: "a.stones",
            mechanism: {
              states: ["a.p", "+ hand"],
              initial: "a.p",
              returnsToInitial: true,
              placedOnly: true,
              positions: [{ state: "a.p", gateKeyId: KEY }],
              transitions: [{ from: "a.p", to: "+ hand", at: [0, 0] }],
            },
          }
        : {}),
    })

  it("is realised with its mod on and unrealised with it off", () => {
    expect([...unrealisedWeights([stones("stonePlate")], resolveEncounterMeta)]).toEqual([])
    expect([...unrealisedWeights([stones("stonePlate")], TOPOLOGY_OFF.resolveEncounter)]).toEqual(["a.stones"])
  })

  it("leaves every plate as ground, and the doors only the stones held stand open as ground", () => {
    const grid = rowGrid([plate(["e"], "a.p", true), plate(["w", "e"], "a.q", false), door(), ground(["w"])])
    const bare = degradeUnrealised(grid, TOPOLOGY_OFF.resolveEncounter, { ...NOTHING, weights: new Set(["a.stones"]) })
    expect(bare.cells[0].map(cell => cell.type)).toEqual(["corridor", "corridor", "corridor", "corridor"])
  })
})
```

(`room`, `ground`, `door`, `rowGrid`, `KEY` and `NOTHING` are the file's own helpers.)

In `src/mods/topology/index.spec.ts`, test `"contributes its families, each owned by itself"`: append
`"stonePlate"` after `"pressure-plate"` in the expected ids, and change `Array(6)` to `Array(7)`.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/realisations.spec.ts src/mods/topology/index.spec.ts -t "stone plate|contributes its families"`
Expected: FAIL. `unrealisedWeights` is not exported; the family list has six entries.

- [ ] **Step 3: Implement**

`src/mods/topology/game/stonePlate/meta.ts`:

```ts
import type { FamilyMeta } from "@/game/families/familyMeta"

export const STONE_PLATE_FAMILY = "stonePlate"

// A STONE PLATE IS A LOCK'S STONES REALISED AS PLATES ON THE FLOOR: a stone is lifted off one and set on another,
// so it has no board, no reward and no place in any pool, and is never drawn from a role. It is what the stones
// bind to (`realisations: { weights: "stonePlate" }`); the plates are read from the cell's own `plate`, so the
// family holds no drawing and no component of its own.
export const STONE_PLATE_META: FamilyMeta = {
  id: STONE_PLATE_FAMILY,
  ownerMod: "topology",
  tags: ["stonePlate"],
  icon: "🪨",
  color: "amber",
  rewardPriority: 0,
}
```

`src/mods/topology/app/stonePlate/plugin.tsx`:

```tsx
import { registerFamily } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { STONE_PLATE_META } from "@/mods/topology/game/stonePlate/meta"

// Registered so a lock's stones can be bound to it (the build resolves a realisation through the registry). No
// cell carries this family, so there is no board to generate or draw.
if (isModEnabled("topology")) {
  registerFamily({
    meta: STONE_PLATE_META,
    generate: () => ({}),
    Component: () => null,
  })
}
```

`src/mods/topology/app/index.ts`: add `import "./stonePlate/plugin"` after `import "./pressurePlate/plugin"`.

`src/mods/topology/index.ts`: `import { STONE_PLATE_META } from "./game/stonePlate/meta"`, append
`STONE_PLATE_META` to `families` after `PRESSURE_PLATE_META`, and in the header comment's list of
realisations write "the pressure plate a sequence, the stone plate a lock's stones, the zipline a one-way".

`src/game/mechanics/realisations.ts`:
- `import { isSequence, isWeights, type Control } from "../obstacles"`.
- After `unrealisedSequences`:

```ts
/** THE LOCKS' STONES WHOSE REALISATION THE BUILD CANNOT ANSWER, by control id: their plates are left as ground. */
export const unrealisedWeights = (controls: readonly Control[], resolve: ResolveEncounter): ReadonlySet<string> =>
  new Set(
    controls
      .filter(isWeights)
      .filter(control => !answered(resolve, control.encounter, DEFAULT_CONTROL_ROLE))
      .map(control => control.id)
  )
```

- `type Unrealised` gains `weights?: ReadonlySet<string>` (after `sequences`).
- The doc comment of `degradeUnrealised`: its first bullet ends "and a sequence's tiles and a lock's plates are ground;".
- Destructure `{ sequences, weights = new Set(), oneWays, regionBarriers = false }: Unrealised`.
- `isBare` becomes

```ts
  const isBare = (cell: RoomCell): boolean =>
    cell.sequenceTile !== undefined
      ? sequences.has(cell.sequenceTile.id)
      : cell.plate !== undefined
        ? weights.has(cell.worksMechanism?.mechanismId ?? "")
        : cell.mechanism !== undefined && cell.family !== undefined && !answered(resolve, cell.family, cell.family)
```

- The early return adds `weights.size === 0 &&` beside `sequences.size === 0 &&`.

  The first plate carries `mechanismId` and the record, so a bare plate adds its gate keys to `droppedKeys`
  and the doors only the stones held stand open; every plate becomes `groundOf(cell)`.

`src/game/siteAssembler.ts`: import `unrealisedWeights` beside `degradeUnrealised, unrealisedSequences`, and in
the `degradeUnrealised(grid, resolveEncounter, { … })` call (line ~4311) add
`weights: unrealisedWeights(authoredConfig.controls ?? [], resolveEncounter),` after the `sequences` entry.

`src/game/testSupport/modOff.ts`, `mechanicsLeft`: after the `sequenceTile` line add
``if (cell.plate) found.push(`${at} plate`)``.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/game/mechanics src/mods/topology src/game/weightsPlates.spec.ts src/mods/allFamilyMeta.spec.ts src/i18n && yarn tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mods/topology src/game/mechanics/realisations.ts src/game/mechanics/realisations.spec.ts src/game/siteAssembler.ts src/game/testSupport/modOff.ts
git commit -m "feat(topology): the stone plate realisation, bare ground with the mod off"
```

---

### Task 8: A `.lock` file baked onto the dev floor

**Files:**
- Modify: `src/game/lockCatalogue.ts` (read the folder by path, not by `new URL`; doc comment)
- Create: `src/worldGen/spec/locks/catalogue.ts` (`catalogueLock`, `freeRegions`; Node-only)
- Modify: `src/worldGen/spec/dev.ts` (pyramid 11: twoStones)
- Modify: `src/worldGen/data.ts` (`DEV_JOURNEYS` `levelCount: 11`)
- Modify (the dev journey's counts, which these sweeps pin): `src/worldGen/devJourney.verify.ts`,
  `src/worldGen/floorLockWalkUnchanged.verify.ts`, `src/worldGen/singlePlaceMechanisms.verify.ts`,
  `src/worldGen/lockFloorInspector.verify.ts`, `src/mods/topology/carveNeverDependsOnAMod.verify.ts`
- Modify: `src/data/carveLedger.json` (hash refresh from the plain bake)
- Test: none of its own. The proof is the dev bake and `yarn verify-content`, never a content assertion.

**Interfaces:**
- Produces: `catalogueLock(name: string): Lock` (throws with the lock's `refused` and `drafts` when either is
  non-empty) and `freeRegions(lock: Lock): Lock` (every region `takes: "free"`).

Two facts found while verifying this task, both handled below:
- `lockCatalogue.ts` resolves its folder with `new URL("./locks/", import.meta.url)`. The verify sweeps run under
  jsdom, whose `URL` resolves that against `http://localhost:3000`, and every sweep that builds the dev journey
  then dies with "The URL must be of scheme file". It reads the folder by path instead.
- twoStones with its own appetites (`in` puzzles, the rest nothing) carves at no seed on a dev floor
  (`layoutNotFound`). With every region `free`, as doubleBack's bench copy has, it carves at the address seed.

- [ ] **Step 1: Implement**

`src/game/lockCatalogue.ts`, whole file:

```ts
// SMALL MULTI-STEP LOCKS, EACH WITH ONE TRICK, and the single-mechanic LESSONS that teach their parts
// first (docs/game-design/lock-curriculum.md). Each is a `.lock` file in ./locks, written in
// lockNotation.ts's notation; `yarn lock <file>` draws one. Read from disk, so the CLI, the world spec at
// bake time and tests only.
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseLock } from "./lockNotation"
import type { ParsedLock } from "./lockNotation"

// A path, never a `new URL(…, import.meta.url)`: under jsdom (the verify sweeps) `URL` is the browser's, and
// resolves against an http origin.
const here = dirname(fileURLToPath(import.meta.url))

const textsIn = (folder: string): Record<string, string> =>
  Object.fromEntries(
    readdirSync(folder)
      .filter(file => file.endsWith(".lock"))
      .map(file => [file.slice(0, -".lock".length), readFileSync(join(folder, file), "utf8")])
  )
const parsedAll = (texts: Record<string, string>): Record<string, ParsedLock> =>
  Object.fromEntries(Object.entries(texts).map(([name, text]) => [name, parseLock(text, name)]))

const LOCK_TEXTS = textsIn(join(here, "locks"))
export const LESSON_TEXTS = textsIn(join(here, "locks", "lessons"))
export const LOCK_CATALOGUE = parsedAll(LOCK_TEXTS)
export const LESSONS = parsedAll(LESSON_TEXTS)
```

`src/worldGen/spec/locks/catalogue.ts`:

```ts
import type { Lock } from "@/game/lockAuthoring"
import { LOCK_CATALOGUE } from "@/game/lockCatalogue"

/**
 * A LOCK FROM ITS .lock FILE, for the world spec: the file the designer draws with `yarn lock` is the one the
 * bake reads, so no copy can drift. Node only: the spec runs at bake time, never in the app.
 */
export const catalogueLock = (name: string): Lock => {
  const parsed = LOCK_CATALOGUE[name]
  if (!parsed) throw new Error(`no lock ${name} in src/game/locks`)
  if (parsed.refused.length > 0 || parsed.drafts.length > 0)
    throw new Error(`lock ${name} is not finished: ${[...parsed.refused, ...parsed.drafts].join("; ")}`)
  return parsed.lock
}

/** The same lock with every region taking `free`, for a bench floor: what it holds is the topology, and the
 * carve seats none of a lock's `puzzles`/`nothing`/`reward` appetites on a floor with no content. */
export const freeRegions = (lock: Lock): Lock => ({
  ...lock,
  regions: Object.fromEntries(Object.keys(lock.regions).map(region => [region, { takes: "free" as const }])),
})
```

`src/worldGen/spec/dev.ts`: add `import { catalogueLock, freeRegions } from "./locks/catalogue"` above the
doubleBack import, and append to `devRules`, after pyramid 10 (the procession):

```ts
  // 11 — twoStones, read from its .lock file. One stone holds the vault open while the other is fetched, then
  // both press the exit's two plates. Every region takes `free`, as on the other lock benches.
  //
  // Bound at the pyramid: the stones are stone plates.
  journey(DEV_JOURNEY_ID)
    .pyramid(11, {
      difficulty: "expert",
      pathPuzzles: 0,
      realisations: { weights: "stonePlate" },
    })
    .floor(0, {
      locks: [{ lock: freeRegions(catalogueLock("twoStones")) }],
    }),
```

The dev journey has exactly `levelCount` sites, so pyramid 11 needs `src/worldGen/data.ts` line 72:
`DEV_JOURNEYS = [{ id: DEV_JOURNEY_ID, tier: "wizard", levelCount: 11, pathPuzzles: 0 }]`.

- [ ] **Step 2: Bake with the dev journey and read the seed the bake chose**

The bake searches seeds itself (`searchCarvePair` in `scripts/generateWorld.ts`) and stamps `seed` and
`packing` into the baked floor. A dev floor has no committed bake to carry them, so the found seed is copied
into `dev.ts`, as for doubleBack and the sluice.

Run: `INCLUDE_DEV=1 yarn generate-world 2>&1 | tail -20`
Expected: exits 0, no `✗` line, `Lock sweep: walked 13 of 13 floor(s)`.

Run: `grep -n -B3 '"name":"twoStones"' src/data/generatedWorld.ts`
Expected: the dev floor's `packing: 0.1,` and `seed: <n>,` lines just above its `locks:` line. At verification
it was `seed: 111235356889676` and `packing: 0.1`: the floor's own address seed, offset 0, at the default
packing (`DEFAULT_PACKING = 0.1`, `src/game/carveConstants.ts`).

Add the seed to the twoStones floor in `dev.ts`, after `locks`:

```ts
      // Recorded from the bake's own carve search (searchCarvePair): at the default packing the floor's own
      // address seed carves on attempt 0, walks sound and leaves no dead region. A dev floor has no baked output
      // to carry the pin.
      seed: 111235356889676,
```

(Use the value the grep printed. If the packing printed is not `0.1`, also author `packing: <value>` and say so in
the comment, as pyramid 3 does.) If the bake prints `unsatisfiable: dev_topology level 11 …` instead, stop and
report the refusal it names; do not work around it.

Then restore the committed world, which holds no dev journey, and prove it unchanged:

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts; echo $?`
Expected: `0`. `src/data/carveLedger.json` shows 30 changed `hash` lines and no changed `refusal` line
(`git diff src/data/carveLedger.json | grep -c '^[-+].*"refusal"'` prints `0`). That refresh is committed.

- [ ] **Step 3: Update the dev journey's counts in the sweeps**

The sweeps pin how many dev floors exist and which of them hold what. One more floor, holding a lock with no
drop and no switch:

`src/worldGen/devJourney.verify.ts`:
- every `toHaveLength(10)` becomes `toHaveLength(11)` (six of them, including the one in
  `"walks ten of them on the dev journey itself"`, whose title becomes `"walks eleven of them on the dev journey itself"`);
- `"walks twelve once the dev journey stands its ten, and finds no strand"` becomes
  `"walks thirteen once the dev journey stands its eleven, and finds no strand"` with `toHaveLength(13)`;
- the difficulties list gains a final `"expert"`;
- `const noJunction = new Set([1, 3, 6, 7, 9])` becomes `new Set([1, 3, 6, 7, 9, 10])`;
- `toEqual([2, 0, 2, 0, 2, 2, 3, 1, 2, 0])` becomes `toEqual([2, 0, 2, 0, 2, 2, 3, 1, 2, 0, 0])`.

`src/worldGen/floorLockWalkUnchanged.verify.ts` and `src/worldGen/singlePlaceMechanisms.verify.ts`:
`expect(dev).toHaveLength(10)` becomes `toHaveLength(11)`. In `singlePlaceMechanisms.verify.ts`, the stones
move at every plate, so they are skipped like a sequence: the skip condition becomes

```ts
        // A sequence advances at each of its tiles and the stones move at each plate, so neither is a mechanism
        // working in one place.
        if (
          (floor.locks ?? []).some(
            ({ lock: placed }) =>
              placed.weights !== undefined || Object.values(placed.mechanics).some(m => m.control === "sequence")
          )
        ) {
```

  and `expect(several).toEqual([10])` becomes `toEqual([10, 11])`.

`src/worldGen/lockFloorInspector.verify.ts`: `toEqual([2, 4, 10])` becomes `toEqual([2, 4, 10, 11])`.

`src/mods/topology/carveNeverDependsOnAMod.verify.ts`: `Array.from({ length: 10 }, …)` in
`FLOORS_WITH_MECHANICS` becomes `{ length: 11 }`, and its three `toHaveLength(10)` become `toHaveLength(11)`.
`FLOORS_WITH_DROPS` is unchanged.

Run: `yarn verify-content 2>&1 | grep -E "×|Test Files|Tests "`
Expected: only the three known `src/mods/puzzleSeeds.verify.ts` failures (see Global Constraints). Every
dev-journey sweep passes, `carveNeverDependsOnAMod` and `toggleOff` included.

- [ ] **Step 4: Look at it**

Unattended runs skip the browser. Instead, check the plates the carve stands:

Run: `yarn vitest run src/game/weightsPlates.spec.ts` (already green) and record in the report that the designer
should look at the floor in Storybook after an `INCLUDE_DEV=1 yarn generate-world`: `App/SiteMap/JourneyInspector`
→ `Inspector`, the dev journey, pyramid 11, floor 0 (five plate rooms: four in `yard`, one in `vault`). Never
commit that bake. Rendering is phase 2: plates draw as plain rooms until then.

- [ ] **Step 5: Full gate in a clean worktree, then commit**

```bash
git add src/game/lockCatalogue.ts src/worldGen/spec/locks/catalogue.ts src/worldGen/spec/dev.ts src/worldGen/data.ts src/worldGen/devJourney.verify.ts src/worldGen/floorLockWalkUnchanged.verify.ts src/worldGen/singlePlaceMechanisms.verify.ts src/worldGen/lockFloorInspector.verify.ts src/mods/topology/carveNeverDependsOnAMod.verify.ts src/data/carveLedger.json
git diff --cached --exit-code -- src/data/generatedWorld.ts
git commit -m "feat(topology): the world spec reads a .lock file; twoStones on the dev floor"
git worktree add /tmp/stonegate-gate HEAD && cd /tmp/stonegate-gate && yarn install --immutable && yarn check-types && yarn lint && yarn vitest run && yarn betterer && yarn build
```

Expected: all pass. Then `cd -` back and `git worktree remove /tmp/stonegate-gate`.

---

### Task 9: The contract says so

**Files:**
- Modify: `docs/mods/mechanic-contract.md` (a "Stones on plates" section beside the other controls)
- Modify: `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (tick the boxes that hold; reword §5 Save)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 1 status)
- `CHANGELOG.md`: no entry. Nothing is player-visible yet.

- [ ] **Step 1: Write the contract section**, in the voice of the surrounding sections: current rule and
why, no history. Cover the `weights` field, the owners (plate ids, `unladen`), the one-control compile
(`compileLock`, id `<namespace>.stones`), the record built like a sequence's (placed-only, on the first plate,
`worksMechanism` on every plate), the way-out rule (`leaveWith`: the way-out region may be entered carrying,
only leaving needs empty hands), the binding key `weights`, the realisation `stonePlate`, and that with the
topology mod off the plates are bare ground and the doors only the stones held stand open.

- [ ] **Step 2: Update the spec.**
- Tick the §1 and §2 boxes the tests prove, and in §3 "Each plate is a node in its region" and "With the
  realisation mod off, the carve is identical: bare nodes, open corridors".
- Rewrite §5 Save's first bullet: the arrangement is the weights mechanism's state in
  `journey.mechanismStates`, filed under the first plate's slot (`xplate:<id>`), which also saves a stone in
  hand, so there is no new field.
- Reword the spec's header line: "For the engine session." becomes "Built in phases; see the roadmap."

- [ ] **Step 3: Update the roadmap.** Phase 1's row: done, and it also ships the `stonePlate` realisation and
plates left bare with the mod off (pulled forward from phase 3 because the dev bake's toggle-off sweep needs it).

- [ ] **Step 4: Commit**

```bash
git add docs/mods/mechanic-contract.md docs/superpowers/specs/2026-10-04-stones-acceptance.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md
git commit -m "docs: stones on plates in the mechanic contract"
```

---

## Self-review notes

- **Spec coverage:** §1 Contract is tasks 1, 3 and 9. §2 Solver is tasks 2, 4 and 6; the engine's rules
  follow the tool's because both use `stoneArrangements`. §3 Carve is task 5 (plates are nodes), task 7 (mod
  off) and task 8 (bakes on dev). These §3 items belong to later phases: `unladen` realisation is phase 3,
  gate loops are phase 4. §4 Play and §5 Save are phase 2; save needs no field because of the state design.
- **`Control` sites, all of them:** TypeScript names `siteAssembler.ts` `controlRecords` (its type then flows
  into lines ~1678, 1928, 3020, 3222, 3260) and `serializer.ts` `serializeControl`. It cannot name the marks
  loop in `siteAssembler.ts` (~1049) or `topologyFaults`' loop in `obstacles.ts`; both are handled in task 3.
  `lockPlan.ts` `seatsOf`, `seeds/enumerateConfigs.ts` and `realisations.ts` filter by kind and need nothing
  more than task 7's `unrealisedWeights`.
