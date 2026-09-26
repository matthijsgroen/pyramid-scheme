# The Walk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A verifier that walks every state a floor's mechanisms can be put in, and answers two questions about it: can the lock be solved at all, and does every state a player can reach still reach the way out.

**Architecture:** A pure domain function over a plain description of a lock — regions, gates, mechanisms with states, one-ways, an `in` and an `out`. It learns nothing about grids, families or mods: a mechanism is states, a state-to-gates mapping and transitions the player causes, and a board, a lever, a sequence and a floor key are all that shape with different data. The search is a breadth-first sweep over `(region, every mechanism's state)`, then a reverse sweep from the states standing at `out`. The last two tasks give it its first real consumer: an assembled floor's switch rooms compiled into that description, run over the world as a build-stopping check.

**Tech Stack:** TypeScript, Vitest (co-located `*.spec.ts`), `src/game/` domain layer (pure — no React, no i18n), `scripts/generateWorld.ts`.

**Spec:** `docs/mods/floor-topology-design.md` — "The states a mechanism names are walked, not bracketed", "Regions", "Gates", "Switches, and mechanisms generally", "One-ways", "Containers with ports", "The rules that keep a lock buildable", "What holds each rule". The reasoning behind the slice order is in `docs/handover-topology-release.md`.

## Global Constraints

- **`src/data/generatedWorld.ts` must come out byte-identical through every task of this plan.** Nothing here carves, re-carves or authors anything: the walk is a new module and its consumer is a report. A diff in that file means a task did something it did not mean to — stop and report rather than committing it.
- Core (`src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen`) may not import `@/mods/<name>/`; no mod may import a sibling; `@/mods/core/**` is allowed. Both are eslint errors at a zero backlog.
- `src/game/` is the domain layer: pure TypeScript, no React, no DOM, no i18n. Build-time console messages in `scripts/` are not user-facing strings and need no locale entries.
- Comments state current behaviour and why: never history, never narration of the task, and **never a `§` doc-section citation** (a zero-backlog betterer guard fails the build on one). Name the file and state the claim.
- Commit subject line only, `type: what changed`, ≤72 chars. Every commit ends with the two attribution lines this repository's sessions use.
- No CHANGELOG entry: nothing here is player-visible until a floor is authored against it.
- Per task: `yarn test <path>`, `yarn check-types`, `yarn lint`. The controlling session runs the full `yarn test`, `yarn betterer`, `yarn generate-world` and `yarn validate-world` — do not run those from a task unless the task says so (only Task 6 does).
- **Every test in this plan must be able to go red.** Where a task adds a positive assertion it also adds the mutation of it that fails — a sound lock and the same lock one edge poorer. A spec that only ever passes is the defect this release has hit three times.

---

## File Structure

| File                                 | Responsibility                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/game/lockWalk.ts`               | The lock description types, the openness fold, the state search, the two questions                                          |
| `src/game/lockWalk.spec.ts`          | Its specs, including the design doc's worked example and the shut-the-way-back trap                                         |
| `src/game/floorLock.ts`              | Compiles an assembled `FloorGrid` into a `LockSpec` — regions by flood fill, one mechanism per switch, key and sealed doors |
| `src/game/floorLock.spec.ts`         | Its specs                                                                                                                   |
| `src/game/siteValidator.ts`          | Exports `nodeBeyond`, which the compiler needs and which already exists there                                               |
| `src/worldGen/validate.ts`           | `findStrandingLocks` — every authored floor whose lock the walk refuses                                                     |
| `scripts/generateWorld.ts`           | Reports them and stops the build; assembles each floor once for both sweeps                                                 |
| `docs/mods/floor-topology-design.md` | Two rows of "What holds each rule" stop saying **nothing yet**                                                              |

Two files, one consumer, no registry and no new dependency. The walk is called by a build script; nothing in the app imports it.

---

### Task 1: The lock description, and a misspelled id that cannot hide

**Files:**

- Create: `src/game/lockWalk.ts`
- Test: `src/game/lockWalk.spec.ts`

**Interfaces:**

- Produces: the types below, plus `checkLockSpec(spec: LockSpec): string | undefined` — a human-readable problem, or `undefined` when every id in the spec names something.

Why this task exists before any searching: the design doc names a misspelled key id as the failure that still bites, because "it leaves its branch unreachable for ever and no check notices". A lock is four cross-referencing tables of string ids. Every one of those references is checked here, so the search that follows can assume its input reads.

- [ ] **Step 1: Write the failing test**

Create `src/game/lockWalk.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { checkLockSpec, type LockSpec } from "./lockWalk"

// A lock with one door and one key behind nothing: the smallest thing that reads.
const oneDoor = (): LockSpec => ({
  regions: ["entrance", "vault"],
  gates: { door: { from: "entrance", to: "vault", owners: ["key"] } },
  mechanisms: {
    key: {
      states: ["absent", "held"],
      initial: "absent",
      opens: { absent: [], held: ["door"] },
      transitions: [{ from: "absent", to: "held", at: "entrance" }],
    },
  },
  in: "entrance",
  out: "vault",
})

describe("checkLockSpec", () => {
  it("passes a lock whose every id names something", () => {
    expect(checkLockSpec(oneDoor())).toBeUndefined()
  })

  it("names a gate that leads to a region nobody declared", () => {
    const spec = oneDoor()
    spec.gates.door.to = "valut"
    expect(checkLockSpec(spec)).toContain("valut")
  })

  it("names a mechanism opening a gate that does not exist", () => {
    const spec = oneDoor()
    spec.mechanisms.key.opens.held = ["dor"]
    expect(checkLockSpec(spec)).toContain("dor")
  })

  it("names a mechanism opening a gate it does not own", () => {
    const spec = oneDoor()
    spec.gates.door.owners = ["other"]
    spec.mechanisms.other = { states: ["shut"], initial: "shut", opens: { shut: [] }, transitions: [] }
    spec.mechanisms.key.opens.held = ["door"]
    expect(checkLockSpec(spec)).toContain("does not own")
  })

  it("refuses a gate with no owner, which would be open or shut by accident of the fold", () => {
    const spec = oneDoor()
    spec.gates.door.owners = []
    expect(checkLockSpec(spec)).toContain("no owner")
  })

  it("names a mechanism starting in a state it does not have", () => {
    const spec = oneDoor()
    spec.mechanisms.key.initial = "lost"
    expect(checkLockSpec(spec)).toContain("lost")
  })

  it("names a transition thrown from a region nobody declared", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions[0].at = "entrence"
    expect(checkLockSpec(spec)).toContain("entrence")
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/lockWalk.spec.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the types and the check**

Create `src/game/lockWalk.ts`:

```ts
// A LOCK IS A GRAPH OF PLACES AND THE THINGS THAT CHANGE WHICH OF THEM JOIN UP. Nothing here knows
// about grids, families or mods: a beam board, a lever, a sequence and a floor key are one shape with
// different data — states, which of its gates each state opens, and the moves that change state. See
// docs/mods/floor-topology-design.md.
export type RegionId = string
export type GateId = string
export type MechanismId = string
export type StateId = string

/** Which state every mechanism is in — the half of a lock state that is not the player's position. */
export type LockConfig = Record<MechanismId, StateId>

export type LockGate = {
  from: RegionId
  to: RegionId
  /** Every mechanism with a say in this boundary. At least one. */
  owners: MechanismId[]
  /** "all" (the default) opens it only while every owner opens it; "any" while one of them does. */
  mode?: "all" | "any"
}

export type Mechanism = {
  states: StateId[]
  initial: StateId
  /** Which of the gates this mechanism owns stand open in each state. A state listing none shuts them all. */
  opens: Record<StateId, GateId[]>
  /** The moves the player makes: standing in `at`, this mechanism goes from one state to another. */
  transitions: { from: StateId; to: StateId; at: RegionId }[]
}

export type LockSpec = {
  regions: RegionId[]
  gates: Record<GateId, LockGate>
  mechanisms: Record<MechanismId, Mechanism>
  /** Directed, region to region: a drop the player takes one way. */
  oneWays?: { from: RegionId; to: RegionId }[]
  /** Where the player arrives, and where they leave for. */
  in: RegionId
  out: RegionId
}

// EVERY ID IN A LOCK IS A REFERENCE INTO ANOTHER TABLE, and a misspelled one is the failure that does
// not announce itself: the branch behind it is unreachable for ever and the walk below would report
// something true but useless about a lock the author did not write. So the references are checked
// before anything is walked, and the message names the id that does not resolve.
export const checkLockSpec = (spec: LockSpec): string | undefined => {
  const regions = new Set(spec.regions)
  if (!regions.has(spec.in)) return `the way in names no region: ${spec.in}`
  if (!regions.has(spec.out)) return `the way out names no region: ${spec.out}`

  for (const [gateId, gate] of Object.entries(spec.gates)) {
    if (!regions.has(gate.from)) return `gate ${gateId} leads from no region: ${gate.from}`
    if (!regions.has(gate.to)) return `gate ${gateId} leads to no region: ${gate.to}`
    if (gate.owners.length === 0) return `gate ${gateId} has no owner`
    for (const owner of gate.owners) if (!spec.mechanisms[owner]) return `gate ${gateId} names no mechanism: ${owner}`
  }

  for (const oneWay of spec.oneWays ?? []) {
    if (!regions.has(oneWay.from)) return `a one-way leads from no region: ${oneWay.from}`
    if (!regions.has(oneWay.to)) return `a one-way leads to no region: ${oneWay.to}`
  }

  for (const [id, mechanism] of Object.entries(spec.mechanisms)) {
    const states = new Set(mechanism.states)
    if (!states.has(mechanism.initial)) return `${id} starts in a state it does not have: ${mechanism.initial}`
    for (const [state, gates] of Object.entries(mechanism.opens)) {
      if (!states.has(state)) return `${id} opens gates in a state it does not have: ${state}`
      for (const gateId of gates) {
        const gate = spec.gates[gateId]
        if (!gate) return `${id} opens no such gate: ${gateId}`
        // Two lists naming each other: a mechanism that opens a gate the gate does not count as an
        // owner is ignored by the fold, and the door would stay shut for a reason nothing reports.
        if (!gate.owners.includes(id)) return `${id} opens ${gateId}, which it does not own`
      }
    }
    for (const transition of mechanism.transitions) {
      if (!states.has(transition.from)) return `${id} moves from a state it does not have: ${transition.from}`
      if (!states.has(transition.to)) return `${id} moves to a state it does not have: ${transition.to}`
      if (!regions.has(transition.at)) return `${id} is thrown from no region: ${transition.at}`
    }
  }

  return undefined
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/game/lockWalk.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Types and lint**

Run: `yarn check-types` then `yarn lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockWalk.ts src/game/lockWalk.spec.ts
git commit -m "feat: a lock describes its regions, gates and mechanisms"
```

---

### Task 2: A gate's owners, and how they combine

**Files:**

- Modify: `src/game/lockWalk.ts`
- Test: `src/game/lockWalk.spec.ts`

**Interfaces:**

- Consumes: `LockSpec`, `LockConfig` from Task 1.
- Produces: `openGates(spec: LockSpec, config: LockConfig): Set<GateId>` — every gate standing open while the mechanisms are in that configuration.

A gate may answer to more than one mechanism: `mode: "all"` (the default) opens it only while every owner opens it — a corridor both flooded and switch-gated — and `mode: "any"` while one of them does. One owner makes the question moot, which is the common case.

- [ ] **Step 1: Write the failing test**

Append to `src/game/lockWalk.spec.ts`:

```ts
import { openGates } from "./lockWalk"

// A gate with two owners, each a two-state mechanism that opens it in "on".
const twoOwners = (mode: "all" | "any"): LockSpec => ({
  regions: ["entrance", "vault"],
  gates: { sluice: { from: "entrance", to: "vault", owners: ["flood", "lever"], mode } },
  mechanisms: {
    flood: {
      states: ["off", "on"],
      initial: "off",
      opens: { off: [], on: ["sluice"] },
      transitions: [{ from: "off", to: "on", at: "entrance" }],
    },
    lever: {
      states: ["off", "on"],
      initial: "off",
      opens: { off: [], on: ["sluice"] },
      transitions: [{ from: "off", to: "on", at: "entrance" }],
    },
  },
  in: "entrance",
  out: "vault",
})

describe("openGates", () => {
  it("opens a single-owner gate exactly in the states its owner names", () => {
    const spec = oneDoor()
    expect([...openGates(spec, { key: "absent" })]).toEqual([])
    expect([...openGates(spec, { key: "held" })]).toEqual(["door"])
  })

  it("holds an all-gate shut while one owner still says shut", () => {
    const spec = twoOwners("all")
    expect([...openGates(spec, { flood: "on", lever: "off" })]).toEqual([])
    expect([...openGates(spec, { flood: "on", lever: "on" })]).toEqual(["sluice"])
  })

  it("opens an any-gate on one owner alone", () => {
    const spec = twoOwners("any")
    expect([...openGates(spec, { flood: "on", lever: "off" })]).toEqual(["sluice"])
    expect([...openGates(spec, { flood: "off", lever: "off" })]).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/lockWalk.spec.ts -t openGates`
Expected: FAIL — `openGates` is not exported.

- [ ] **Step 3: Implement the fold**

Append to `src/game/lockWalk.ts`:

```ts
// WHETHER A DOOR STANDS OPEN IS ASKED OF ITS OWNERS, NEVER ASSUMED FROM A STATE. A board opens one
// gate per state and a sequence opens its gate only in the last, so a state is not "which gate is
// open" — it is a key into each owner's own mapping, folded by the gate's mode.
export const openGates = (spec: LockSpec, config: LockConfig): Set<GateId> => {
  const open = new Set<GateId>()
  for (const [gateId, gate] of Object.entries(spec.gates)) {
    const says = gate.owners.map(owner => (spec.mechanisms[owner].opens[config[owner]] ?? []).includes(gateId))
    if (gate.mode === "any" ? says.some(Boolean) : says.every(Boolean)) open.add(gateId)
  }
  return open
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/game/lockWalk.spec.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Types, lint, commit**

```bash
yarn check-types && yarn lint
git add src/game/lockWalk.ts src/game/lockWalk.spec.ts
git commit -m "feat: a gate's owners decide together whether it is open"
```

---

### Task 3: Every state a player can reach

**Files:**

- Modify: `src/game/lockWalk.ts`
- Test: `src/game/lockWalk.spec.ts`

**Interfaces:**

- Consumes: `openGates` from Task 2.
- Produces:
  - `type LockState = { region: RegionId; config: LockConfig }`
  - `MAX_LOCK_STATES: number`
  - `reachableStates(spec: LockSpec): { order: LockState[]; edges: number[][] } | "tooLarge"` — every state reachable from the start, in breadth-first order, with `edges[n]` the indices of the states one move from `order[n]`.

The four moves, from the design doc: walk through an open gate either way; take a one-way out of this region; throw a mechanism that can be thrown from this region; or leave the site and walk back in, which puts the player at `in` with the floor exactly as they left it. That last one is not a nicety — it is the move that turns "shut your own way back and take a staircase" from an argument into a state.

- [ ] **Step 1: Write the failing test**

Append to `src/game/lockWalk.spec.ts`:

```ts
import { reachableStates, MAX_LOCK_STATES } from "./lockWalk"

const states = (spec: LockSpec) => {
  const found = reachableStates(spec)
  if (found === "tooLarge") throw new Error("expected a walkable lock")
  return found.order.map(state => `${state.region}|${Object.values(state.config).join(",")}`)
}

describe("reachableStates", () => {
  it("walks from the way in, taking the key and then the door", () => {
    expect(states(oneDoor())).toEqual(["entrance|absent", "entrance|held", "vault|held"])
  })

  it("never walks through a door no state opens", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions = []
    expect(states(spec)).toEqual(["entrance|absent"])
  })

  it("takes a one-way out of a region nothing else leaves", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions = []
    spec.oneWays = [{ from: "entrance", to: "vault" }]
    expect(states(spec)).toEqual(["entrance|absent", "vault|absent"])
  })

  it("lets the player leave and come back, which returns them to the way in", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions = []
    spec.oneWays = [{ from: "entrance", to: "vault" }]
    const found = reachableStates(spec)
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    const fromVault = found.edges[1].map(n => found.order[n].region)
    expect(fromVault).toContain("entrance")
  })

  it("refuses a lock naming more states than it will walk", () => {
    const spec: LockSpec = { regions: ["entrance"], gates: {}, mechanisms: {}, in: "entrance", out: "entrance" }
    for (let n = 0; n < 12; n++)
      spec.mechanisms[`m${n}`] = {
        states: ["a", "b", "c", "d", "e"],
        initial: "a",
        opens: {},
        transitions: [{ from: "a", to: "b", at: "entrance" }],
      }
    expect(5 ** 12).toBeGreaterThan(MAX_LOCK_STATES)
    expect(reachableStates(spec)).toBe("tooLarge")
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/lockWalk.spec.ts -t reachableStates`
Expected: FAIL — `reachableStates` is not exported.

- [ ] **Step 3: Implement the search**

Append to `src/game/lockWalk.ts`:

```ts
/** Where the player stands, and what every mechanism is set to. */
export type LockState = { region: RegionId; config: LockConfig }

// ponytail: a flat ceiling rather than a cleverer search. A container is a handful of regions and a
// handful of mechanisms; a lock reaching this has an authoring mistake in it, and hanging the build
// while a state space explodes is the worse answer. Raise it if a real lock ever comes close.
export const MAX_LOCK_STATES = 50_000

const stateKey = (ids: readonly MechanismId[], state: LockState): string =>
  `${state.region}|${ids.map(id => `${id}=${state.config[id]}`).join(",")}`

// THE FOUR MOVES. Walking through an open gate goes either way — a gate is a door, not a drop — while
// a one-way goes one way, which is the whole of what P2 buys. Leaving the site and walking back in is
// a move like any other: it costs nothing, it is always available, and it is what makes shutting your
// own way back a state that can be reached rather than a risk to be argued about.
const movesFrom = (spec: LockSpec, state: LockState): LockState[] => {
  const { region, config } = state
  const next: LockState[] = []

  for (const gateId of openGates(spec, config)) {
    const gate = spec.gates[gateId]
    if (gate.from === region) next.push({ region: gate.to, config })
    if (gate.to === region) next.push({ region: gate.from, config })
  }
  for (const oneWay of spec.oneWays ?? []) if (oneWay.from === region) next.push({ region: oneWay.to, config })
  for (const [id, mechanism] of Object.entries(spec.mechanisms))
    for (const transition of mechanism.transitions)
      if (transition.at === region && config[id] === transition.from)
        next.push({ region, config: { ...config, [id]: transition.to } })
  if (region !== spec.in) next.push({ region: spec.in, config })

  return next
}

// Breadth-first, with `order` doubling as the queue: a state's index is therefore its discovery
// order, so the first failure found later is also the shortest one to describe. `edges` is kept
// because the second question walks the same graph backwards and re-deriving the moves would be the
// same work twice.
export const reachableStates = (spec: LockSpec): { order: LockState[]; edges: number[][] } | "tooLarge" => {
  const ids = Object.keys(spec.mechanisms).sort()
  const ceiling = spec.regions.length * ids.reduce((n, id) => n * spec.mechanisms[id].states.length, 1)
  if (ceiling > MAX_LOCK_STATES) return "tooLarge"

  const start: LockState = {
    region: spec.in,
    config: Object.fromEntries(ids.map(id => [id, spec.mechanisms[id].initial])),
  }
  const index = new Map<string, number>([[stateKey(ids, start), 0]])
  const order: LockState[] = [start]
  const edges: number[][] = [[]]

  for (let at = 0; at < order.length; at++) {
    for (const move of movesFrom(spec, order[at])) {
      const key = stateKey(ids, move)
      let to = index.get(key)
      if (to === undefined) {
        to = order.length
        index.set(key, to)
        order.push(move)
        edges.push([])
      }
      edges[at].push(to)
    }
  }

  return { order, edges }
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/game/lockWalk.spec.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Types, lint, commit**

```bash
yarn check-types && yarn lint
git add src/game/lockWalk.ts src/game/lockWalk.spec.ts
git commit -m "feat: walk every state a lock's mechanisms can be put in"
```

---

### Task 4: The two questions

**Files:**

- Modify: `src/game/lockWalk.ts`
- Test: `src/game/lockWalk.spec.ts`

**Interfaces:**

- Consumes: `checkLockSpec`, `reachableStates`, `LockState` from Tasks 1–3.
- Produces:
  - `type LockWalkFailure = { type: "malformed"; problem: string } | { type: "tooLarge" } | { type: "unsolvable" } | { type: "strands"; at: LockState }`
  - `type LockWalkResult = { sound: true; states: number } | { sound: false; failure: LockWalkFailure }`
  - `walkLock(spec: LockSpec): LockWalkResult`
  - `describeLockWalkFailure(failure: LockWalkFailure): string`

Two questions, both over the states Task 3 found. **Does any of them stand at `out`?** — the lock can be solved at all. **Does every one of them still reach `out`?** — no order of moves strands anybody. The second is the one that earns its keep, and it is answered by sweeping the move graph backwards from the states standing at `out`: whatever the sweep does not reach is a state the player can get into and not get out of.

The worked example is the design doc's own `doubleBack`, and it is here in full because a lock that comes out sound proves nothing on its own. So it is walked four times: as written; with the drop taken away; with the board made one-shot; and with both. Only the last two go red, and that is the finding rather than a test detail — **the drop is not what keeps that floor sound, re-solving the board is.** With the fork re-solvable the player can always leave, walk back in and choose the other branch, so the drop buys the puzzle the author wanted rather than the soundness. Take re-solving away and the floor strands whoever turns left, which is the design doc's re-enterability invariant with a state attached to it.

- [ ] **Step 1: Write the failing test**

Append to `src/game/lockWalk.spec.ts`:

```ts
import { walkLock, describeLockWalkFailure } from "./lockWalk"

// The design doc's worked example. Y is a beam board in the entrance fork whose two ways out are both
// shut. The right way is open from the start and leads to S1; throwing S1 shuts it again and opens the
// left branch's lower gate. A drop from S1's chamber lands BETWEEN the fork's left gate and that newly
// opened one, so the player reaches S2, which opens the way out.
const doubleBack = (): LockSpec => ({
  regions: ["entrance", "rightLower", "s1Chamber", "leftLower", "s2Chamber", "wayOut"],
  gates: {
    forkLeft: { from: "entrance", to: "leftLower", owners: ["Y"] },
    forkRight: { from: "entrance", to: "rightLower", owners: ["Y"] },
    greenRight: { from: "rightLower", to: "s1Chamber", owners: ["S1"] },
    greenLeft: { from: "leftLower", to: "s2Chamber", owners: ["S1"] },
    endDoor: { from: "s2Chamber", to: "wayOut", owners: ["S2"] },
  },
  mechanisms: {
    Y: {
      states: ["unset", "left", "right"],
      initial: "unset",
      opens: { unset: [], left: ["forkLeft"], right: ["forkRight"] },
      transitions: [
        { from: "unset", to: "left", at: "entrance" },
        { from: "unset", to: "right", at: "entrance" },
        { from: "left", to: "right", at: "entrance" },
        { from: "right", to: "left", at: "entrance" },
      ],
    },
    S1: {
      states: ["start", "thrown"],
      initial: "start",
      opens: { start: ["greenRight"], thrown: ["greenLeft"] },
      transitions: [{ from: "start", to: "thrown", at: "s1Chamber" }],
    },
    S2: {
      states: ["start", "thrown"],
      initial: "start",
      opens: { start: [], thrown: ["endDoor"] },
      transitions: [{ from: "start", to: "thrown", at: "s2Chamber" }],
    },
  },
  oneWays: [{ from: "s1Chamber", to: "leftLower" }],
  in: "entrance",
  out: "wayOut",
})

describe("walkLock", () => {
  it("finds the worked example sound: solvable, and no order of moves strands anyone", () => {
    expect(walkLock(doubleBack())).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("stays sound with the drop gone, because the board can be re-solved", () => {
    const spec = doubleBack()
    spec.oneWays = []
    expect(walkLock(spec).sound).toBe(true)
  })

  it("strands whoever takes the left branch when the board cannot be re-solved", () => {
    // Y one-shot: set left and the right branch is gone for good, so S1 is never thrown and the left
    // branch's lower gate never opens. The drop does not help — it starts on the other side.
    const spec = doubleBack()
    spec.mechanisms.Y.transitions = spec.mechanisms.Y.transitions.filter(t => t.from === "unset")
    const result = walkLock(spec)
    if (result.sound) throw new Error("expected a one-shot fork to strand")
    expect(result.failure).toEqual({
      type: "strands",
      at: { region: "entrance", config: { Y: "left", S1: "start", S2: "start" } },
    })
  })

  it("cannot be solved at all with the drop gone and the board one-shot", () => {
    // Reaching S2 wants the fork set left; throwing S1 wants it set right. One board, one answer.
    const spec = doubleBack()
    spec.oneWays = []
    spec.mechanisms.Y.transitions = spec.mechanisms.Y.transitions.filter(t => t.from === "unset")
    expect(walkLock(spec)).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("calls a lock with no way through unsolvable rather than stranding", () => {
    const spec = oneDoor()
    // The key lies behind its own door.
    spec.mechanisms.key.transitions = [{ from: "absent", to: "held", at: "vault" }]
    const result = walkLock(spec)
    expect(result).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("fails a switch that can shut the way it was entered by, because leaving returns the player to it", () => {
    // One fork, one board, and the corridor the player arrived by among the ways out it can shut.
    const spec: LockSpec = {
      regions: ["entrance", "fork", "wayOut"],
      gates: {
        back: { from: "entrance", to: "fork", owners: ["board"] },
        onward: { from: "fork", to: "wayOut", owners: ["board"] },
      },
      mechanisms: {
        board: {
          states: ["back", "onward"],
          initial: "back",
          opens: { back: ["back"], onward: ["onward"] },
          transitions: [
            { from: "back", to: "onward", at: "fork" },
            { from: "onward", to: "back", at: "fork" },
          ],
        },
      },
      in: "entrance",
      out: "wayOut",
    }
    const result = walkLock(spec)
    if (result.sound) throw new Error("expected the way back to strand")
    expect(result.failure).toEqual({ type: "strands", at: { region: "entrance", config: { board: "onward" } } })
  })

  it("names the state it died in, so an author can read the trap", () => {
    const spec = doubleBack()
    spec.mechanisms.Y.transitions = spec.mechanisms.Y.transitions.filter(t => t.from === "unset")
    const result = walkLock(spec)
    if (result.sound) throw new Error("expected a one-shot fork to strand")
    const described = describeLockWalkFailure(result.failure)
    expect(described).toContain("entrance")
    expect(described).toContain("Y at left")
  })

  it("reports a malformed lock without walking it", () => {
    const spec = oneDoor()
    spec.out = "valut"
    expect(walkLock(spec)).toEqual({ sound: false, failure: { type: "malformed", problem: expect.any(String) } })
  })
})
```

The fifth test is the shipped feature's own question. A switch standing in a fork may shut every way out available to it; if the corridor the player came in by is one of them, they can shut it, walk out of the site, walk back in — which puts them at the entrance, since a saved position belonging to another floor falls back there — and stand on the wrong side of a door only the fork opens. That is the state the walk refuses, and it is why the way back is a per-floor fact rather than a rule.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/lockWalk.spec.ts -t walkLock`
Expected: FAIL — `walkLock` is not exported.

- [ ] **Step 3: Implement the two questions**

Append to `src/game/lockWalk.ts`:

```ts
export type LockWalkFailure =
  | { type: "malformed"; problem: string }
  | { type: "tooLarge" }
  | { type: "unsolvable" }
  | { type: "strands"; at: LockState }

export type LockWalkResult = { sound: true; states: number } | { sound: false; failure: LockWalkFailure }

// TWO QUESTIONS OVER THE SAME STATES. Can the lock be solved at all — does any reachable state stand
// at the way out; and does EVERY reachable state still reach it. The second is strictly stronger than
// the permissive bracket over the same floor: that one answers whether a reward is ever obtainable,
// which is no comfort to a player who cannot reach it by any legal sequence of moves.
export const walkLock = (spec: LockSpec): LockWalkResult => {
  const problem = checkLockSpec(spec)
  if (problem) return { sound: false, failure: { type: "malformed", problem } }

  const found = reachableStates(spec)
  if (found === "tooLarge") return { sound: false, failure: { type: "tooLarge" } }
  const { order, edges } = found

  const backwards: number[][] = order.map(() => [])
  edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))

  // Sweep the moves backwards from every state standing at the way out; whatever it does not reach is
  // a state the player can get into and not get out of.
  const finishes = new Set<number>()
  const queue: number[] = []
  order.forEach((state, n) => {
    if (state.region !== spec.out) return
    finishes.add(n)
    queue.push(n)
  })
  if (queue.length === 0) return { sound: false, failure: { type: "unsolvable" } }
  for (let at = 0; at < queue.length; at++)
    for (const from of backwards[queue[at]])
      if (!finishes.has(from)) {
        finishes.add(from)
        queue.push(from)
      }

  // Discovery order is breadth-first order, so the first state that cannot finish is also the fewest
  // moves from the start — the shortest trap to describe and the easiest to walk by hand.
  const stranded = order.findIndex((_, n) => !finishes.has(n))
  if (stranded >= 0) return { sound: false, failure: { type: "strands", at: order[stranded] } }

  return { sound: true, states: order.length }
}

export const describeLockWalkFailure = (failure: LockWalkFailure): string => {
  switch (failure.type) {
    case "malformed":
      return `the lock does not read: ${failure.problem}`
    case "tooLarge":
      return `the lock names more than ${MAX_LOCK_STATES} states`
    case "unsolvable":
      return "no sequence of moves reaches the way out"
    case "strands": {
      const config = Object.entries(failure.at.config)
        .map(([id, state]) => `${id} at ${state}`)
        .join(", ")
      return `from ${failure.at.region}, ${config}, nothing reaches the way out`
    }
  }
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/game/lockWalk.spec.ts`
Expected: PASS, 23 tests. If the worked example comes out unsound, do not adjust the example to suit the code — walk it by hand against the doc and report which of the two is wrong.

- [ ] **Step 5: Types, lint, commit**

```bash
yarn check-types && yarn lint
git add src/game/lockWalk.ts src/game/lockWalk.spec.ts
git commit -m "feat: ask a lock whether it solves and whether it strands"
```

---

### Task 5: A floor's switches, read as a lock

**Files:**

- Create: `src/game/floorLock.ts`
- Modify: `src/game/siteValidator.ts` (export `nodeBeyond`)
- Test: `src/game/floorLock.spec.ts`

**Interfaces:**

- Consumes: `LockSpec`, `Mechanism` from Task 1; `nodeBeyond(grid: FloorGrid, from: readonly [number, number], dir: string): readonly [number, number] | undefined` from `siteValidator.ts`, which walks a fork's way out through its connector corridors to the next room.
- Produces: `floorLock(grid: FloorGrid): LockSpec | undefined` — the floor's doors and switches as a lock, or `undefined` when no switch stands on it.

This is the task that stops the walk being scenery. Everything before it is exercised only by specs that describe locks nobody has carved; this one hands it a floor the world actually ships.

How a floor becomes a lock:

| On the grid                                                 | In the lock                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| A room with a `requiredKeyId`                               | a region of its own, joined by one gate to each region it touches           |
| Everything else walkable, hidden cells excluded             | regions — the connected components once the doors are taken out             |
| A room whose `exits` carry `gateKeyId`s                     | one mechanism, `unset` plus a state per way out                             |
| A `floor-key` door with a `tombKey` room minting its id     | a two-state key mechanism, thrown in the region holding that room           |
| A `tomb-key` door, or one whose opener is not on this floor | a mechanism with one state that never opens it — sound with it assumed shut |
| `entrancePos` / `exitPos`                                   | `in` / `out`                                                                |

A door becoming its own region is what keeps a three-way door representable without a special case: it is three gates onto one small region rather than a gate that joins three places.

- [ ] **Step 1: Export `nodeBeyond`**

In `src/game/siteValidator.ts`, add `export` to the existing `const nodeBeyond`. It already does exactly what the compiler needs, and a second copy is how this branch produced three bugs that a shared seam would have made unrepresentable.

- [ ] **Step 2: Write the failing test**

Create `src/game/floorLock.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter } from "./siteAssembler"
import type { ResolveEncounter } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { walkLock } from "./lockWalk"
import { floorLock } from "./floorLock"

const plainFloor = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
})

// A floor that must carve one junction with two ways out free to close, and stands a puzzle in it.
const switchFloor = (): FloorConfig => ({
  ...plainFloor(),
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "sumplete", min: 1, max: 1 },
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
  ],
})

// Whether a finished room is walked back into is the family registry's answer, and core assembles
// without the registry — a switch is refused outright unless its family offers the walk back, so the
// stub grants it. (The same stub `src/worldGen/switchAuthoring.spec.ts` uses, for the same reason.)
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const standsASwitch = (grid: FloorGrid): boolean =>
  grid.cells.flat().some(cell => cell.type === "room" && (cell.exits ?? []).some(exit => exit.gateKeyId !== undefined))

// Which junction a carve offers is the seed's choice, so seeds are tried until one carves what the
// test needs — and running out is a throw, never a silent skip.
const assembled = (config: FloorConfig, wants: (grid: FloorGrid) => boolean = () => true): FloorGrid => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("spec:1", config, seed, reEnterableFamilies, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success && wants(result.grid)) return result.grid
  }
  throw new Error("no seed carved the floor this spec needs")
}

describe("floorLock", () => {
  it("has nothing to say about a floor with no switch on it", () => {
    expect(floorLock(assembled(plainFloor()))).toBeUndefined()
  })

  it("names one mechanism per switch: unset until solved, then a state per way out", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes("unset"))!
    expect(board.states.length).toBeGreaterThanOrEqual(3)
    expect(board.opens.unset).toEqual([])
    for (const state of board.states.filter(s => s !== "unset")) expect(board.opens[state].length).toBeGreaterThan(0)
    // Re-solvable from every state into every other, which is what lets a player change their mind.
    expect(board.transitions).toHaveLength(board.states.length * (board.states.length - 1))
  })

  it("declares every region it then refers to", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    expect(lock.regions).toContain(lock.in)
    expect(lock.regions).toContain(lock.out)
    for (const gate of Object.values(lock.gates)) {
      expect(lock.regions).toContain(gate.from)
      expect(lock.regions).toContain(gate.to)
    }
  })

  it("stands the switch in the region its doors lead out of, so the opener comes before the blocker", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes("unset"))!
    const at = new Set(board.transitions.map(transition => transition.at))
    expect(at.size).toBe(1)
    const [fork] = [...at]
    // Each way out it shuts is one door, and a door is a region joined to the fork it leads out of and
    // to whatever lies beyond it. So every state opens the gates of exactly one door, and one of them
    // starts in the fork the player is standing in.
    for (const state of board.states.filter(s => s !== "unset")) {
      expect(new Set(board.opens[state].map(gateId => lock.gates[gateId].to)).size).toBe(1)
      expect(board.opens[state].some(gateId => lock.gates[gateId].from === fork)).toBe(true)
    }
  })

  it("hands the walk a lock that reads", () => {
    const result = walkLock(floorLock(assembled(switchFloor(), standsASwitch))!)
    expect(result.sound || result.failure.type !== "malformed").toBe(true)
  })
})
```

The last test asserts the compiler's output _reads_ — not that the floor is sound, which is Task 6's question and the world's answer to give.

- [ ] **Step 3: Run it and watch it fail**

Run: `yarn test src/game/floorLock.spec.ts`
Expected: FAIL — the module does not exist. If instead a test fails on `floor did not carve`, adjust the seed (try 1–20) until the floor carves; the carve is seeded, not fixed.

- [ ] **Step 4: Implement the compiler**

Create `src/game/floorLock.ts`:

```ts
import type { FloorGrid, GridCell } from "./siteTypes"
import type { LockSpec, Mechanism, GateId, RegionId } from "./lockWalk"
import { nodeBeyond } from "./siteValidator"

type Pos = readonly [number, number]
const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const posKey = (r: number, c: number) => `${r},${c}`

const walkable = (cell: GridCell | undefined): boolean =>
  !!cell && (cell.type === "room" || cell.type === "corridor") && !cell.hidden

/** A door: a room the player may not walk into without satisfying the key it names. */
const doorKeyOf = (cell: GridCell | undefined): string | undefined =>
  cell?.type === "room" ? cell.requiredKeyId : undefined

// A FLOOR READ AS A LOCK. Doors come out as regions of their own, each joined by one gate to every
// region it touches — which is what lets a door standing in a three-way junction be three gates onto
// one small region instead of a gate that joins three places at once. Everything else walkable falls
// into the components the doors leave behind.
//
// ponytail: the flood treats a passage as walkable from both sides, which is true of every floor the
// world carves today. One-ways arrive with the directed-edge primitive, and regions then want the
// strongly connected components rather than these.
//
// Hidden cells are left out: a hidden section is never a statement that the player found it, so a
// floor has to be sound without one.
const regionsOf = (grid: FloorGrid): { ids: RegionId[]; of: Map<string, RegionId> } => {
  const of = new Map<string, RegionId>()
  const ids: RegionId[] = []

  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (!walkable(cell) || of.has(posKey(r, c))) continue
      const isDoor = doorKeyOf(cell) !== undefined
      const id = isDoor ? `door ${r},${c}` : `at ${r},${c}`
      ids.push(id)
      const queue: Pos[] = [[r, c]]
      of.set(posKey(r, c), id)
      // A door is a region of exactly one cell; everything else floods.
      while (!isDoor && queue.length > 0) {
        const [qr, qc] = queue.shift()!
        const from = grid.cells[qr][qc]
        const dirs = from.type === "room" || from.type === "corridor" ? from.dirs : new Set<string>()
        for (const dir of dirs) {
          const [dr, dc] = MOVES[dir as string]
          const [nr, nc] = [qr + dr, qc + dc]
          const next = grid.cells[nr]?.[nc]
          if (!walkable(next) || doorKeyOf(next) !== undefined || of.has(posKey(nr, nc))) continue
          of.set(posKey(nr, nc), id)
          queue.push([nr, nc])
        }
      }
    }

  return { ids, of }
}

export const floorLock = (grid: FloorGrid): LockSpec | undefined => {
  // Every way out a switch closed, by the door it stands in front of. A switch names its gates on its
  // own exits, which is the one place the floor writes down which door belongs to which board.
  const doorsBySwitch = new Map<string, Pos[]>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue
      for (const exit of cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        const door = nodeBeyond(grid, [r, c], exit.dir)
        if (!door) continue
        doorsBySwitch.set(posKey(r, c), [...(doorsBySwitch.get(posKey(r, c)) ?? []), door])
      }
    }
  if (doorsBySwitch.size === 0) return undefined

  const { ids, of } = regionsOf(grid)
  const gates: LockSpec["gates"] = {}
  const mechanisms: Record<string, Mechanism> = {}
  /** Which gates a door's key id ended up owning — a door may be three gates. */
  const gatesByKeyId = new Map<string, GateId[]>()

  // Each door is joined to every region it touches. The owner is filled in below; a gate with no owner
  // is rejected by the walk, so every door has to be accounted for.
  const ownerOf = new Map<string, string>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      const keyId = doorKeyOf(cell)
      if (keyId === undefined || !walkable(cell)) continue
      const doorRegion = of.get(posKey(r, c))!
      const dirs = cell.type === "room" ? cell.dirs : new Set<string>()
      for (const dir of dirs) {
        const [dr, dc] = MOVES[dir as string]
        const beside = of.get(posKey(r + dr, c + dc))
        if (!beside || beside === doorRegion) continue
        const gateId = `${keyId}|${beside}`
        gates[gateId] = { from: beside, to: doorRegion, owners: [] }
        gatesByKeyId.set(keyId, [...(gatesByKeyId.get(keyId) ?? []), gateId])
      }
    }

  // A switch: unset until it is solved, then one state per way out, and re-solvable from any state
  // into any other — which is what lets a player change their mind, and the only reason the doors it
  // shut are not a trap.
  for (const [switchPos, doors] of doorsBySwitch) {
    const id = `switch ${switchPos}`
    const byDoor = doors.map(([dr, dc]) => gatesByKeyId.get(doorKeyOf(grid.cells[dr][dc])!) ?? [])
    const states = ["unset", ...doors.map(([dr, dc]) => `open ${dr},${dc}`)]
    const opens: Record<string, GateId[]> = { unset: [] }
    states.slice(1).forEach((state, n) => (opens[state] = byDoor[n]))
    mechanisms[id] = {
      states,
      initial: "unset",
      opens,
      transitions: states.flatMap(from =>
        states.filter(to => to !== from).map(to => ({ from, to, at: of.get(switchPos)! }))
      ),
    }
    for (const gateIds of byDoor) for (const gateId of gateIds) ownerOf.set(gateId, id)
  }

  // A floor key: found once, held for good. The chest that mints it is a room on this floor, so the
  // move is throwing it in whichever region holds that room.
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || cell.reward?.type !== "tombKey") continue
      const keyId = (cell.reward as { keyId: string }).keyId
      const gateIds = gatesByKeyId.get(keyId)
      if (!gateIds || !of.has(posKey(r, c))) continue
      const id = `key ${keyId}`
      mechanisms[id] = {
        states: ["absent", "held"],
        initial: "absent",
        opens: { absent: [], held: gateIds },
        transitions: [{ from: "absent", to: "held", at: of.get(posKey(r, c))! }],
      }
      for (const gateId of gateIds) ownerOf.set(gateId, id)
    }

  // WHAT IS LEFT IS SEALED. A ward gate opens on progress made elsewhere in the world, and a lock that
  // leaned on one could only ever be checked in context — so it is assumed shut, which is the reading
  // that keeps the answer local. A door whose opener this floor does not hold reads the same way.
  for (const gateId of Object.keys(gates)) {
    if (ownerOf.has(gateId)) continue
    const id = `sealed ${gateId.split("|")[0]}`
    mechanisms[id] ??= { states: ["shut"], initial: "shut", opens: { shut: [] }, transitions: [] }
    ownerOf.set(gateId, id)
  }
  for (const [gateId, gate] of Object.entries(gates)) gate.owners = [ownerOf.get(gateId)!]

  return {
    regions: ids,
    gates,
    mechanisms,
    in: of.get(posKey(grid.entrancePos[0], grid.entrancePos[1]))!,
    out: of.get(posKey(grid.exitPos[0], grid.exitPos[1]))!,
  }
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `yarn test src/game/floorLock.spec.ts src/game/siteValidator.spec.ts`
Expected: PASS. `siteValidator.spec.ts` is in the run because Step 1 touched that file.

- [ ] **Step 6: Types, lint, commit**

```bash
yarn check-types && yarn lint
git add src/game/floorLock.ts src/game/floorLock.spec.ts src/game/siteValidator.ts
git commit -m "feat: read a floor's switches and doors as a lock"
```

---

### Task 6: The world answers

**Files:**

- Modify: `src/worldGen/validate.ts`
- Modify: `scripts/generateWorld.ts`
- Modify: `docs/mods/floor-topology-design.md`
- Test: `src/worldGen/validate.spec.ts`

**Interfaces:**

- Consumes: `floorLock` (Task 5), `walkLock` and `describeLockWalkFailure` (Task 4).
- Produces: `findStrandingLocks(configs, assembleFloorAt): StrandingLock[]`, taking the same two arguments `findEmptyChests` already takes, with `type StrandingLock = { journeyId: string; levelNr: number; floorIndex: number; problem: string }`.

The callback is the same shape `findEmptyChests` already takes, so the script can hand both sweeps one memoised assembler and each floor is still carved once.

This check runs **after** the world is built, never inside the assembler's retry loop. A reason added to `validateSite` would make a stranding floor re-carve silently, which is a different world and no report; here a stranding floor stops the build with its state named.

- [ ] **Step 1: Write the failing test**

Append to `src/worldGen/validate.spec.ts`, which already has the `floor()` helper these configs are built from:

```ts
import { findStrandingLocks } from "./validate"
import { assembleFloor, defaultResolveEncounter } from "@/game/siteAssembler"
import type { ResolveEncounter } from "@/game/siteAssembler"
import type { FloorConfig as GameFloorConfig } from "@/game/siteTypes"

// See src/game/floorLock.spec.ts for why the walk back is stubbed: core assembles without the family
// registry, and a switch is refused outright unless its family offers it.
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const switchFloor = () =>
  floor({
    pathPuzzles: 2,
    difficulty: "junior",
    forks: [{ exits: 2, count: 1 }],
    switches: { encounter: "sumplete", min: 1, max: 1 },
    sideSections: [
      { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
      { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
    ],
  })

// worldGen's FloorConfig is a slightly looser mirror of game/siteTypes.ts's, and authored data only
// ever assigns values the stricter type accepts too — the same cast reachability.ts makes.
const carve = (config: FloorConfig): FloorGrid | null => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("spec:1", config as GameFloorConfig, seed, reEnterableFamilies, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success) return result.grid
  }
  return null
}

// A door nothing on the floor mints the key for, standing on the way out: the walk finds it sealed,
// so no state it can reach stands at the exit.
const sealTheWayOut = (grid: FloorGrid | null): FloorGrid | null => {
  if (!grid) return null
  const [r, c] = grid.exitPos
  const cell = grid.cells[r][c]
  if (cell.type !== "room") throw new Error("the way out is not a room")
  const cells = grid.cells.map(row => [...row])
  cells[r][c] = { ...cell, requiredKeyId: "nothing-mints-this", gateVariant: "floor-key", keyIsAuthored: true }
  return { ...grid, cells }
}

describe("findStrandingLocks", () => {
  const configs = { spec: [[switchFloor()]] } as Record<string, SiteConfig[]>

  it("says nothing about a floor carrying no lock", () => {
    const plain = { spec: [[floor()]] } as Record<string, SiteConfig[]>
    expect(findStrandingLocks(plain, (_journeyId, config) => carve(config))).toEqual([])
  })

  it("reports the floor and the state when a lock leaves the way out unreachable", () => {
    const stranding = findStrandingLocks(configs, (_journeyId, config) => sealTheWayOut(carve(config)))
    expect(stranding).toHaveLength(1)
    expect(stranding[0]).toMatchObject({ journeyId: "spec", levelNr: 1, floorIndex: 0 })
    expect(stranding[0].problem).toContain("way out")
  })

  it("skips a floor that will not carve, which the unassembled sweep already reports", () => {
    expect(findStrandingLocks(configs, () => null)).toEqual([])
  })
})
```

The second test is the one that keeps this honest: it proves the sweep reports rather than merely runs. A world with one switch in it could otherwise pass this check for ever without the reporting path being executed once.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/worldGen/validate.spec.ts -t findStrandingLocks`
Expected: FAIL — `findStrandingLocks` is not exported.

- [ ] **Step 3: Implement the sweep**

Append to `src/worldGen/validate.ts`:

```ts
/**
 * A floor whose lock the walk refuses: unsolvable, stranding, or not reading at all.
 *
 * Asked of the assembled floor rather than of the spec, because a lock is made of the gates a carve
 * placed. It is asked AFTER the build rather than inside the assembler's retry loop on purpose: a
 * reason there would quietly re-carve the floor and the author would never hear which arrangement was
 * refused.
 */
export type StrandingLock = { journeyId: string; levelNr: number; floorIndex: number; problem: string }

export const findStrandingLocks = (
  configs: Record<string, SiteConfig[]>,
  assembleFloorAt: (
    journeyId: string,
    floor: SiteConfig[number],
    levelNr: number,
    floorIndex: number
  ) => AssembledFloor | null
): StrandingLock[] => {
  const stranding: StrandingLock[] = []
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        const grid = assembleFloorAt(journeyId, floor, siteIdx + 1, floorIndex)
        if (!grid) return
        const lock = floorLock(grid)
        if (!lock) return
        const result = walkLock(lock)
        if (result.sound) return
        stranding.push({
          journeyId,
          levelNr: siteIdx + 1,
          floorIndex,
          problem: describeLockWalkFailure(result.failure),
        })
      })
    )
  return stranding
}
```

Import `floorLock` from `@/game/floorLock` and `walkLock`, `describeLockWalkFailure` from `@/game/lockWalk` — the alias every other `@/game` import in that file uses. `AssembledFloor` is already its local name for `FloorGrid`.

Unlike `findEmptyChests`, this sweep skips no journey: a capability says what a site grows, not whether its floors have to be walkable.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `yarn test src/worldGen/validate.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into the build, assembling each floor once**

In `scripts/generateWorld.ts`, replace the inline assembling lambda passed to `findEmptyChests` with a memoised one and give the same function to the new sweep:

```ts
// One carve per floor, shared by every sweep that needs the grid rather than the spec.
const grids = new Map<string, FloorGrid | null>()
const assembleOnce = (journeyId: string, floor: FloorConfig, levelNr: number, floorIndex: number) => {
  const cacheKey = `${journeyId}#${levelNr}#${floorIndex}`
  if (!grids.has(cacheKey)) {
    const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
    const result = assembleFloor(journeyId, floor, seed, resolveEncounterMeta, {
      resolveKeyRequirements,
      floorRef: { journeyId, floorIndex },
    })
    if (!result.success) unassembled.push(`${journeyId} level ${levelNr} floor ${floorIndex}`)
    grids.set(cacheKey, result.success ? result.grid : null)
  }
  return grids.get(cacheKey)!
}

const emptyChests = findEmptyChests(configs, assembleOnce)
```

Then, beside the other build-stopping reports and after the unbaked-switch one:

```ts
// A FLOOR WHOSE LOCK CAN BE PUT IN A STATE IT CANNOT BE GOT OUT OF is a floor a player can lose a run
// on, and nothing in the assembler would notice: a switch shutting the way back is a legal carve. The
// state it died in is printed because that is what a person walks by hand to confirm it.
const stranding = findStrandingLocks(configs, assembleOnce)
if (stranding.length > 0) {
  console.error(`✗ ${stranding.length} floor(s) hold a lock a player can be stranded in:`)
  for (const floor of stranding.slice(0, 20))
    console.error(`    ${floor.journeyId} level ${floor.levelNr} floor ${floor.floorIndex}: ${floor.problem}`)
  if (stranding.length > 20) console.error(`    … and ${stranding.length - 20} more`)
  process.exit(1)
}
```

- [ ] **Step 6: Ask the world**

Run: `yarn validate-world`

Expected: it reaches `✓ World spec valid`. The world stands one switch — junior_2 pyramid 2 floor 0 — so exactly one floor gets a lock walked, and that floor's answer is this release's answer to whether a switch may shut the way it was entered by.

**If it stops on the new report, do not change the floor and do not soften the check.** Record the printed state and hand it back: whether that fork keeps its way back is the owner's call, not a task's.

- [ ] **Step 7: Prove the check could have failed**

Run the same sweep with the switch floor's lock deliberately broken, in a scratch file rather than in the repository: copy the `assembleOnce` result for junior_2 pyramid 2 floor 0, seal its `exitPos` cell the way the spec helper does, and confirm `findStrandingLocks` reports it. A green `validate-world` on a world with one switch in it is worth nothing unless the same code says no to a floor that deserves it.

Note in the hand-back how many floors got a lock walked (expected: 1). A sweep that visited zero is the defect this release keeps producing.

- [ ] **Step 8: Prove the world did not move**

Run: `yarn generate-world` then `git diff --stat src/data/generatedWorld.ts`
Expected: no diff at all. Nothing in this plan carves; a diff here means the memoised assembler in Step 5 changed a seed, which is the one way this task could move the world.

- [ ] **Step 9: Say what now holds the rule**

In `docs/mods/floor-topology-design.md`, in the table under "What holds each rule", replace the **nothing yet** on the row _"A lock is solvable, and no order of moves strands the player"_ with what now holds it: `walkLock`, over the lock `floorLock` reads off each assembled floor, swept by `findStrandingLocks` — and say in the same cell that it runs on every floor standing a switch, which is one floor today. Leave the row for _"A lock's gates form a tree"_ saying **nothing yet**: that is the builder's rule and it arrives with the region tree.

- [ ] **Step 10: The rest of the gate, then commit**

```bash
yarn test && yarn check-types && yarn lint && yarn betterer
git add src/worldGen/validate.ts src/worldGen/validate.spec.ts scripts/generateWorld.ts docs/mods/floor-topology-design.md
git commit -m "feat: stop the build on a floor a player can be stranded on"
```

---

## What this plan deliberately leaves out

- **The gate tree rule.** A lock's gates must form a tree, and nothing checks it. It is a constraint on what the builder can carve, not on what the walk can answer, so it belongs with the region tree in the vocabulary slice.
- **Regions from authoring.** `floorLock` derives regions from a carved grid. An authored lock names its own, and the compiler that lays a region tree into a carve is the vocabulary slice's whole point.
- **Containers.** The walk answers a whole floor here. Asking it of a container between its own ports is the same function over a smaller spec, and it needs containers to exist first.
- **Markers.** A sequence's trigger points are P3, and the walk needs no new move for them: triggering a marker is a transition whose `at` is the region the marker sits in, which the mechanism vocabulary already carries.
- **One-ways from the carve.** `LockSpec.oneWays` is walked and tested; nothing places one yet. That is P2, and it is the next item in the handover's order.
