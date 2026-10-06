# Lock Text Notation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The lock text an author types compiles to the shared `Lock` type, is walked, reported and drawn, and `yarn lock` prints that `Lock` as JSON.

**Architecture:** text → `parseLock` (lockNotation.ts) → `Lock` (shared type, lockAuthoring.ts) → `compileLock` (lockCompile.ts) → `LockSpec` → `walkLock` / `solveLock` / `lockQuality` (lockReview.ts) and `drawLock` (lockDraw.ts). The new pipeline is built beside the old one (lockText.ts, lockSketch.ts) so every task stays green; the last task switches the CLI and deletes the old modules.

**Tech Stack:** TypeScript, vitest, tsx, eslint (prettier through eslint).

**Spec:** `docs/superpowers/specs/2026-10-02-lock-text-notation-design.md`

## Global Constraints

- The lock type is imported from `src/game/lockAuthoring.ts` (arrives by merging `feat/switch-fork`); never copy or redefine it.
- Ids: edge gate `from-to`, region gate `region:barred`, one-way `from>to`; a repeat gets `#2`, `#3`.
- `mode` in the `Lock` is `"any"` or absent (absent = every). `LockSpec` takes `"any"` or absent.
- No `encounter`, no realisation, no `chain`/`embed` anywhere in a `Lock`.
- Walk-only stretch regions contain `|` (`a|b#c.i`); they never appear in the JSON, the drawing, or the cheapest route.
- Comments state what the code does and why, never what it used to do. A claim belongs in a test name and assertion, not a comment block.
- Commit messages are one line, followed by the session trailers.
- Verify with: `yarn vitest run <files>`, `yarn eslint --fix <files>`, `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i lock` (no output = clean).

## Review Focus

- A drop running beside a gated corridor between the same two regions (doubleBack, lamplighter) — must parse as two joins, not be refused as a duplicate. Test in Task 2.
- A state name typo on a gate (`-[S1:c]-`) — refused naming the line and the state. Test in Task 2.
- A region name with a hyphen (`left-lower`) — refused as unreadable, not split into two regions. Test in Task 2.
- A toggle declared with three state names — refused, not silently truncated. Test in Task 2.
- An empty file, or one holding only comments — refused with "the lock never reaches in". Test in Task 2.

---

### Task 1: Take the shared type, correct the spec

**Files:**
- Modify: branch history (merge `feat/switch-fork`)
- Modify: `docs/superpowers/specs/2026-10-02-lock-text-notation-design.md`

**Interfaces:**
- Produces: `src/game/lockAuthoring.ts` on this branch — `Lock`, `LockConnection`, `LockGate`, `EdgeGate`, `RegionGate`, `LockOneWay`, `LockMechanic`, `Opens`, `isRegionGate`, `joinOf`, `barriersOf`.

- [ ] **Step 1: Merge**

```bash
git merge --no-edit feat/switch-fork
```
Expected: merges without conflicts (checked with `git merge-tree` while planning).

- [ ] **Step 2: Confirm the existing lock tests still pass**

Run: `yarn vitest run src/game/lockSketch.spec.ts src/game/lockText.spec.ts src/game/lockWalk.spec.ts`
Expected: all pass. If `lockWalk.spec.ts` or `lockWalk.ts` changed on their branch and a lock test fails, stop and report — do not adapt the old modules.

- [ ] **Step 3: Correct the spec**

In `docs/superpowers/specs/2026-10-02-lock-text-notation-design.md`:

Replace the refusal line `- the same join written twice` with:
```
- a bare corridor written twice (`a -- b` and `b -- a`). Two joins between one pair are otherwise
  allowed: doubleBack's drop `leftLower >> in` runs beside its fork gate `in -[Y]- leftLower`
```

Replace `- The connection is unordered for identity (\`a -- b\` and \`b -- a\` are one join, written twice is an error); its barrier order is the order the line wrote them, from its left region.` with:
```
- A connection's barrier order is the order the line wrote them, from its left region.
```

Replace `- An owner named on a gate and placed nowhere is a draft: it compiles as never moving, at its first state, and fails the run.` with:
```
- An owner named on a gate and placed nowhere is a draft: it is left out of `mechanics`, compiles as
  never moving and opening nothing, and fails the run.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-02-lock-text-notation-design.md
git commit -m "docs: parallel joins allowed, a draft opens nothing"
```

---

### Task 2: The notation parser

**Files:**
- Create: `src/game/lockNotation.ts`
- Test: `src/game/lockNotation.spec.ts`

**Interfaces:**
- Consumes: `Lock`, `LockConnection`, `LockGate`, `LockMechanic`, `LockOneWay` from `./lockAuthoring`; `RegionAppetite` from `./regions`.
- Produces:
  - `export type ParsedLock = { lock: Lock; drafts: string[] }`
  - `export const parseLock = (text: string, name?: string): ParsedLock` — throws `Error("line N: …")`, or `Error("the lock never reaches in|out")`.
  - `export const LOCK_SYNTAX: string`

- [ ] **Step 1: Write the failing tests**

`src/game/lockNotation.spec.ts`:
```ts
import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"

const DOUBLE_BACK = `
  in -[Y]- leftLower -[S1]- s2
  in -[Y]- rightLower -[S1:a]- s1
  in -[S2]- out
  s1 >> leftLower >> in
  Y fork @in
  S1 toggle @s1
  S2 toggle @s2
  s2 $
`

describe("parseLock", () => {
  it("writes doubleBack as the shared Lock, a drop beside its fork gate included", () => {
    expect(parseLock(DOUBLE_BACK, "doubleBack")).toEqual({
      drafts: [],
      lock: {
        name: "doubleBack",
        regions: {
          in: { takes: "puzzles" },
          leftLower: { takes: "nothing" },
          s2: { takes: "reward" },
          rightLower: { takes: "nothing" },
          s1: { takes: "nothing" },
          out: { takes: "nothing" },
        },
        connections: [
          { between: ["in", "leftLower"], barriers: ["in-leftLower"] },
          { between: ["leftLower", "s2"], barriers: ["leftLower-s2"] },
          { between: ["in", "rightLower"], barriers: ["in-rightLower"] },
          { between: ["rightLower", "s1"], barriers: ["rightLower-s1"] },
          { between: ["in", "out"], barriers: ["in-out"] },
          { between: ["s1", "leftLower"], barriers: ["s1>leftLower"] },
          { between: ["leftLower", "in"], barriers: ["leftLower>in"] },
        ],
        gates: {
          "in-leftLower": { from: "in", to: "leftLower", owners: ["Y"] },
          "leftLower-s2": { from: "leftLower", to: "s2", owners: ["S1"] },
          "in-rightLower": { from: "in", to: "rightLower", owners: ["Y"] },
          "rightLower-s1": { from: "rightLower", to: "s1", owners: ["S1"] },
          "in-out": { from: "in", to: "out", owners: ["S2"] },
        },
        oneWays: {
          "s1>leftLower": { from: "s1", to: "leftLower" },
          "leftLower>in": { from: "leftLower", to: "in" },
        },
        mechanics: {
          Y: { control: "fork-switch", in: "in" },
          S1: { control: "toggle", in: "s1", starts: "a", opens: { a: ["rightLower-s1"], b: ["leftLower-s2"] } },
          S2: { control: "toggle", in: "s2", starts: "a", opens: { a: [], b: ["in-out"] } },
        },
        in: "in",
        out: "out",
      },
    })
  })

  it("puts barriers written back to back on one join, in the order written", () => {
    const { lock } = parseLock("in -[T]- >> hall\nhall -- out\nT activator @in")
    expect(lock.connections[0]).toEqual({ between: ["in", "hall"], barriers: ["in-hall", "in>hall"] })
    expect(lock.connections[1]).toEqual(["hall", "out"])
  })

  it("reads a region gate, and named toggle states", () => {
    const { lock } = parseLock("in -- hall\nhall -- out\nhall -[sluice:wet]\nsluice toggle @in dry wet")
    expect(lock.gates["hall:barred"]).toEqual({ region: "hall", owners: ["sluice"] })
    expect(lock.mechanics.sluice).toEqual({ control: "toggle", in: "in", starts: "dry", opens: { dry: [], wet: ["hall:barred"] } })
  })

  it("reads activators and any", () => {
    const { lock } = parseLock("in -[T|K]- out\nT activator @in\nK activator @in")
    expect(lock.gates["in-out"]).toEqual({ from: "in", to: "out", owners: ["T", "K"], mode: "any" })
    expect(lock.mechanics.T).toEqual({ control: "activator", in: "in", starts: "off", opens: { off: [], on: ["in-out"] } })
  })

  it("reads a sequence: its steps in order, its reset door, opening when done", () => {
    const { lock } = parseLock("in -- hall\nhall -[P]- out\nP sequence in hall in reset hall-out")
    expect(lock.mechanics.P).toEqual({
      control: "sequence",
      steps: [{ in: "in" }, { in: "hall" }, { in: "in" }],
      resetAt: "hall-out",
      opens: { done: ["hall-out"] },
    })
  })

  it("keeps an owner nothing places as a draft, out of the mechanics", () => {
    expect(parseLock("in -[G]- out")).toMatchObject({ drafts: ["G"], lock: { mechanics: {} } })
  })

  it("reads every appetite", () => {
    const { lock } = parseLock("in -- a\na -- b\nb -- c\nc -- out\na *\nb ?\nc $\nin -")
    expect(lock.regions).toEqual({
      in: { takes: "nothing" },
      a: { takes: "puzzles" },
      b: { takes: "free" },
      c: { takes: "reward" },
      out: { takes: "nothing" },
    })
  })

  it.each([
    ["in -- out\nout -- in", "line 2: out and in are already joined by a corridor on line 1"],
    ["in -[S1:c]- out\nS1 toggle @in", "line 1: S1 has no state c"],
    ["in -[Y:x]- out\nY fork @in", "line 1: a fork's way is the gate itself: write -[Y]-"],
    ["in -- hall\nhall -[Y]- out\nY fork @in", "line 2: fork Y's gate must be the first thing on a join leaving in"],
    ["in >> -[Y]- out\nY fork @in", "line 1: fork Y's gate must be the first thing on a join leaving in"],
    ["in -- out\nin -[S]\nS toggle @out", "line 2: the region holding in cannot be barred"],
    ["in -- hall\nhall -- out\nhall -[S]\nS toggle @hall", "line 3: S stands in hall, which it would bar"],
    ["in -- hall\nhall -[P]- out\nP sequence in hall reset nowhere", "line 3: reset nowhere names no gate between two regions"],
    ["in -[S]- out\nS toggle @in a b c", "line 2: a toggle has two states, not 3"],
    ["in -[S]- out\nS toggle @in a a", "line 2: S names one state twice"],
    ["in -[Y]- out\nY fork @in a b", "line 2: a fork's states are its ways; write Y fork @in"],
    ["in -- left-lower", 'line 1: cannot read a region called "left-lower"'],
    ["// only a comment", "the lock never reaches in"],
    ["in -[H]- hall\nH toggle @in", "the lock never reaches out"],
    ["in -[H]- out\nH toggle @in\nH toggle @out", "line 3: H is placed twice"],
    ["in -[H]- out\nH toggle @in\nG toggle @in", "line 3: G owns no gate"],
    ["in -[H]- out\nH toggle @cellar", "line 2: no corridor reaches cellar"],
    ["in -[A+B|C]- out", "line 1: -[A+B|C]- mixes + and |"],
    ["in -[H+H]- out\nH toggle @in", "line 1: -[H+H]- names H twice"],
    ["in -- -[H]- out", "line 1: -- is a bare corridor and carries no barriers"],
    ["in -[Y]- >>", "line 1: a line starts and ends with a region"],
    ["in => out", 'line 1: cannot read "in => out"'],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text)).toThrow(message)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockNotation.spec.ts`
Expected: FAIL — cannot resolve `./lockNotation`.

- [ ] **Step 3: Write the parser**

`src/game/lockNotation.ts`:
```ts
// A LOCK WRITTEN AS TEXT, one line per join, read into the shared Lock type (lockAuthoring.ts). The
// notation is LOCK_SYNTAX, which `yarn lock` also prints so nobody has to remember it.
import type { Lock, LockConnection, LockGate, LockMechanic, LockOneWay } from "./lockAuthoring"
import type { RegionAppetite } from "./regions"

export const LOCK_SYNTAX = `
  in -- hall                    corridor, nothing on it; in and out are the way in and the way out
  in -[S1]- hall                gate: open while S1 is in its second state
  in -[S1:a]- hall              gate: open while S1 is in state a
  in -[A+B]- hall               every owner   ·   -[A|B]- any owner
  hall >> in                    one-way
  in -[Y]- >> hall              one join, several barriers, in order from the left region
  hall -[sluice:wet]            region gate: hall impassable unless sluice is wet
  S1 toggle @s1                 two states a b, back and forth, starts at a
  sluice toggle @hall dry wet   the same, its states named
  T1 activator @hall            off then on, for good — a torch, or a floor key
  Y fork @in                    a fork puzzle: the gates naming it are its ways
  P sequence hall vault reset hall-vault   steps in order, reset at that gate; -[P]- opens when done
  hall *   s2 $   spare ?   corridor -     takes puzzles, a reward, anything, nothing
  // comment
`.slice(1)

export type ParsedLock = { lock: Lock; drafts: string[] }

const EDGE = /\s*(--|>>|-\[[^\]]*\]-)\s*/
const NAME = /^\w+$/
const DEFAULT_STATES = { toggle: ["a", "b"], activator: ["off", "on"] } as const
const APPETITE: Record<string, RegionAppetite> = { "*": "puzzles", $: "reward", "?": "free", "-": "nothing" }

type Declared =
  | { control: "toggle" | "activator"; in: string; states: readonly [string, string]; n: number }
  | { control: "fork-switch"; in: string; n: number }
  | { control: "sequence"; steps: string[]; resetAt: string; n: number }
type Term = { owner: string; state?: string }

export const parseLock = (text: string, name = "lock"): ParsedLock => {
  const fail = (n: number, message: string): never => {
    throw new Error(`line ${n}: ${message}`)
  }
  const lines = text
    .split("\n")
    .map((raw, i) => ({ n: i + 1, line: raw.replace(/\/\/.*/, "").trim() }))
    .filter(({ line }) => line !== "")

  const regions = new Map<string, RegionAppetite>()
  const joins: { between: [string, string]; barriers: string[]; n: number }[] = []
  const gates: Record<string, LockGate> = {}
  const terms: Record<string, { n: number; list: Term[] }> = {}
  const oneWays: Record<string, LockOneWay> = {}
  const declared = new Map<string, Declared>()
  const takes: { region: string; appetite: RegionAppetite; n: number }[] = []

  const unique = (base: string) => {
    let id = base
    for (let k = 2; id in gates || id in oneWays; k++) id = `${base}#${k}`
    return id
  }
  const region = (n: number, written: string) => {
    if (!NAME.test(written)) fail(n, `cannot read a region called "${written}"`)
    if (!regions.has(written)) regions.set(written, written === "in" ? "puzzles" : "nothing")
    return written
  }
  const condition = (n: number, written: string) => {
    if (written.includes("+") && written.includes("|")) fail(n, `-[${written}]- mixes + and |`)
    const list = written.split(/[+|]/).map(part => {
      const match = part.trim().match(/^(\w+)(?::(\w+))?$/) ?? fail(n, `cannot read owner "${part.trim()}"`)
      return { owner: match[1], state: match[2] }
    })
    const owners = list.map(term => term.owner)
    const twice = owners.find((owner, i) => owners.indexOf(owner) !== i)
    if (twice) fail(n, `-[${written}]- names ${twice} twice`)
    return { list, owners, mode: written.includes("|") ? ("any" as const) : undefined }
  }
  const join = (n: number, from: string, to: string, ops: string[]) => {
    if (ops.includes("--") && ops.length > 1) fail(n, "-- is a bare corridor and carries no barriers")
    if (ops[0] === "--") {
      const twin = joins.find(j => j.barriers.length === 0 && [from, to].every(r => j.between.includes(r)))
      if (twin) fail(n, `${from} and ${to} are already joined by a corridor on line ${twin.n}`)
    }
    const barriers = ops
      .filter(op => op !== "--")
      .map(op => {
        if (op === ">>") {
          const id = unique(`${from}>${to}`)
          oneWays[id] = { from, to }
          return id
        }
        const { list, owners, mode } = condition(n, op.slice(2, -2))
        const id = unique(`${from}-${to}`)
        gates[id] = { from, to, owners, ...(mode ? { mode } : {}) }
        terms[id] = { n, list }
        return id
      })
    joins.push({ between: [from, to], barriers, n })
  }
  const declare = (n: number, id: string, what: Declared) => {
    if (declared.has(id)) fail(n, `${id} is placed twice`)
    declared.set(id, what)
  }

  for (const { n, line } of lines) {
    let m: RegExpMatchArray | null
    if ((m = line.match(/^(\w+)\s+(toggle|activator)\s+@(\w+)((?:\s+\w+)*)$/))) {
      const control = m[2] as "toggle" | "activator"
      const names = m[4].trim().split(/\s+/).filter(Boolean)
      if (names.length !== 0 && names.length !== 2) fail(n, `a ${control} has two states, not ${names.length}`)
      const states = (names.length > 0 ? names : DEFAULT_STATES[control]) as readonly [string, string]
      if (states[0] === states[1]) fail(n, `${m[1]} names one state twice`)
      declare(n, m[1], { control, in: m[3], states, n })
    } else if ((m = line.match(/^(\w+)\s+fork\s+@(\w+)(.*)$/))) {
      if (m[3].trim() !== "") fail(n, `a fork's states are its ways; write ${m[1]} fork @${m[2]}`)
      declare(n, m[1], { control: "fork-switch", in: m[2], n })
    } else if ((m = line.match(/^(\w+)\s+sequence\s+((?:\w+\s+)+)reset\s+(\S+)$/))) {
      declare(n, m[1], { control: "sequence", steps: m[2].trim().split(/\s+/), resetAt: m[3], n })
    } else if ((m = line.match(/^(\w+)\s+([$*?-])$/))) {
      takes.push({ region: m[1], appetite: APPETITE[m[2]], n })
    } else if ((m = line.match(/^(\w+)\s+-\[([^\]]*)\]$/))) {
      const { list, owners, mode } = condition(n, m[2])
      const id = unique(`${m[1]}:barred`)
      gates[id] = { region: m[1], owners, ...(mode ? { mode } : {}) }
      terms[id] = { n, list }
    } else {
      const parts = line.split(EDGE)
      if (parts.length < 3) fail(n, `cannot read "${line}"`)
      if (parts[0] === "" || parts[parts.length - 1] === "") fail(n, "a line starts and ends with a region")
      // Nothing between two barriers means they stand on one join.
      for (let i = 0; i < parts.length - 1; ) {
        const ops = [parts[i + 1]]
        let j = i + 2
        while (parts[j] === "") {
          ops.push(parts[j + 1])
          j += 2
        }
        join(n, region(n, parts[i]), region(n, parts[j]), ops)
        i = j
      }
    }
  }

  for (const port of ["in", "out"]) if (!regions.has(port)) throw new Error(`the lock never reaches ${port}`)
  for (const { region: r, appetite, n } of takes) {
    if (!regions.has(r)) fail(n, `no corridor reaches ${r}`)
    regions.set(r, appetite)
  }

  const opens = new Map<string, Record<string, string[]>>()
  const drafts = new Set<string>()
  for (const [id, gate] of Object.entries(gates)) {
    const { n, list } = terms[id]
    if ("region" in gate) {
      if (!regions.has(gate.region)) fail(n, `no corridor reaches ${gate.region}`)
      if (gate.region === "in" || gate.region === "out") fail(n, `the region holding ${gate.region} cannot be barred`)
    }
    for (const { owner, state } of list) {
      const what = declared.get(owner)
      if (!what) {
        drafts.add(owner)
        continue
      }
      if ("region" in gate && "in" in what && what.in === gate.region)
        fail(n, `${owner} stands in ${gate.region}, which it would bar`)
      if (what.control === "fork-switch") {
        if (state) fail(n, `a fork's way is the gate itself: write -[${owner}]-`)
        const on = joins.find(j => j.barriers.includes(id))
        const first = on && (on.between[0] === what.in ? on.barriers[0] === id : on.between[1] === what.in && on.barriers.at(-1) === id)
        if (!first) fail(n, `fork ${owner}'s gate must be the first thing on a join leaving ${what.in}`)
        continue
      }
      const named = state ?? (what.control === "sequence" ? "done" : what.states[1])
      const states = what.control === "sequence" ? ["done"] : what.states
      if (!states.includes(named)) fail(n, `${owner} has no state ${named}`)
      const table = opens.get(owner) ?? {}
      ;(table[named] ??= []).push(id)
      opens.set(owner, table)
    }
  }

  const mechanics: Record<string, LockMechanic> = {}
  for (const [id, what] of declared) {
    for (const r of what.control === "sequence" ? what.steps : [what.in])
      if (!regions.has(r)) fail(what.n, `no corridor reaches ${r}`)
    if (!Object.values(gates).some(gate => gate.owners.includes(id))) fail(what.n, `${id} owns no gate`)
    const table = opens.get(id) ?? {}
    if (what.control === "fork-switch") mechanics[id] = { control: "fork-switch", in: what.in }
    else if (what.control === "sequence") {
      const reset = gates[what.resetAt]
      if (!reset || "region" in reset) fail(what.n, `reset ${what.resetAt} names no gate between two regions`)
      mechanics[id] = {
        control: "sequence",
        steps: what.steps.map(step => ({ in: step })),
        resetAt: what.resetAt,
        opens: table,
      }
    } else {
      const [first, second] = what.states
      mechanics[id] = {
        control: what.control,
        in: what.in,
        starts: first,
        opens: { [first]: table[first] ?? [], [second]: table[second] ?? [] },
      }
    }
  }

  const connections: LockConnection[] = joins.map(j =>
    j.barriers.length > 0 ? { between: j.between, barriers: j.barriers } : j.between
  )
  return {
    lock: {
      name,
      regions: Object.fromEntries([...regions].map(([r, appetite]) => [r, { takes: appetite }])),
      connections,
      gates,
      ...(Object.keys(oneWays).length > 0 ? { oneWays } : {}),
      mechanics,
      in: "in",
      out: "out",
    },
    drafts: [...drafts],
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/game/lockNotation.spec.ts`
Expected: PASS. If the appetite test fails on `in`, check that `in -` overrides the `puzzles` default (takes run after joins).

- [ ] **Step 5: Lint and typecheck**

Run: `yarn eslint --fix src/game/lockNotation.ts src/game/lockNotation.spec.ts && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i lock`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockNotation.ts src/game/lockNotation.spec.ts
git commit -m "feat(topology): lock notation reads into the shared Lock type"
```

---

### Task 3: Compiling a Lock for the walk, and what it starts as

**Files:**
- Create: `src/game/lockCompile.ts`
- Test: `src/game/lockCompile.spec.ts`

**Interfaces:**
- Consumes: `Lock`, `LockMechanic`, `isRegionGate`, `joinOf`, `barriersOf` from `./lockAuthoring`; `LockSpec`, `Mechanism` from `./lockWalk`; `parseLock` (tests only).
- Produces:
  - `export const compileLock = (lock: Lock, drafts?: readonly string[]): LockSpec`
  - `export const isStretch = (region: string): boolean`
  - `export const readable = (text: string): string` — rewrites stretch names to `between a and b`
  - `export const openAtStart = (lock: Lock): string[]`
  - `export const needsFace = (lock: Lock): { gate: string; owners: readonly string[] }[]`
  - `export const notBuildable = (lock: Lock): string[]` — `"sequence"`, `"region gate"`

- [ ] **Step 1: Write the failing tests**

`src/game/lockCompile.spec.ts`:
```ts
import { describe, expect, it } from "vitest"
import { checkLockSpec, reachableStates, walkLock } from "./lockWalk"
import { compileLock, isStretch, needsFace, notBuildable, openAtStart, readable } from "./lockCompile"
import { parseLock } from "./lockNotation"

const compiled = (text: string) => {
  const { lock, drafts } = parseLock(text)
  return compileLock(lock, drafts)
}

const DOUBLE_BACK = `
  in -[Y]- leftLower -[S1]- s2
  in -[Y]- rightLower -[S1:a]- s1
  in -[S2]- out
  s1 >> leftLower >> in
  Y fork @in
  S1 toggle @s1
  S2 toggle @s2
`
const LANTERNS = `
  in -- north
  in -- east
  in -[L1+L2+L3+L4]- out
  L1 activator @north
  L2 activator @east
  L3 activator @north
  L4 activator @east
`
const SEQUENCE = "in -- hall\nhall -[P]- out\nP sequence in hall in reset hall-out"

describe("compileLock", () => {
  it("compiles doubleBack to a well-formed lock that walks sound", () => {
    expect(checkLockSpec(compiled(DOUBLE_BACK))).toBeUndefined()
    expect(walkLock(compiled(DOUBLE_BACK))).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("walks a gate before a drop sound, and strands whoever drops before a shut gate", () => {
    expect(walkLock(compiled("in -[H]- >> hall\nhall -- out\nH toggle @in")).sound).toBe(true)
    const result = walkLock(compiled("in >> -[H]- hall\nhall -- out\nH toggle @in"))
    if (result.sound || result.failure.type !== "strands") throw new Error("expected a strand")
    expect(isStretch(result.failure.at.region)).toBe(true)
  })

  it("lets nobody into a barred region, by corridor or by drop", () => {
    const found = reachableStates(compiled("in -- hall\nhall -- out\nin >> hall\nhall -[S]\nS toggle @in"))
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    const inHall = found.order.filter(state => state.region === "hall")
    expect(inHall.length).toBeGreaterThan(0)
    expect(inHall.every(state => state.config.S === "b")).toBe(true)
  })

  it("advances a sequence in order, spoils it on a wrong tile, resets only at its door, and keeps done", () => {
    const P = compiled(SEQUENCE).mechanisms.P
    expect(P.transitions).toContainEqual({ from: "0", to: "1", at: "in" })
    expect(P.transitions).toContainEqual({ from: "1", to: "2", at: "hall" })
    expect(P.transitions).toContainEqual({ from: "2", to: "done", at: "in" })
    expect(P.transitions).toContainEqual({ from: "0", to: "spoiled", at: "hall" })
    expect(P.transitions).toContainEqual({ from: "spoiled", to: "0", at: "hall" })
    expect(P.transitions.filter(t => t.from === "done")).toEqual([])
    expect(new Set(P.transitions.filter(t => t.to === "0").map(t => t.at))).toEqual(new Set(["hall", "out"]))
    expect(walkLock(compiled(SEQUENCE)).sound).toBe(true)
  })

  it("gives a fork rest plus one state per gate, any to any", () => {
    const Y = compiled(DOUBLE_BACK).mechanisms.Y
    expect(Y.states).toEqual(["rest", "in-leftLower", "in-rightLower"])
    expect(Y.transitions).toHaveLength(6)
  })

  it("never moves a draft and opens nothing with it", () => {
    const spec = compiled("in -[G]- out")
    expect(spec.mechanisms.G).toEqual({ states: ["draft"], initial: "draft", opens: { draft: [] }, transitions: [] })
    expect(walkLock(spec)).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("names a stretch by the two regions it lies between", () => {
    expect(readable("stuck in in|hall#0.1")).toBe("stuck in between in and hall")
  })
})

describe("what a lock starts as", () => {
  it("reports the gates open at the start", () => {
    expect(openAtStart(parseLock(DOUBLE_BACK).lock)).toEqual(["rightLower-s1"])
    expect(openAtStart(parseLock(LANTERNS).lock)).toEqual([])
  })

  it("asks a face of an every-gate with several owners, and of nothing else", () => {
    expect(needsFace(parseLock(LANTERNS).lock)).toEqual([{ gate: "in-out", owners: ["L1", "L2", "L3", "L4"] }])
    expect(needsFace(parseLock("in -[A|B]- out\nA toggle @in\nB toggle @in").lock)).toEqual([])
  })

  it("names what the engine cannot build yet", () => {
    expect(notBuildable(parseLock(SEQUENCE).lock)).toEqual(["sequence"])
    expect(notBuildable(parseLock("in -- hall\nhall -- out\nhall -[S]\nS toggle @in").lock)).toEqual(["region gate"])
    expect(notBuildable(parseLock(DOUBLE_BACK).lock)).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCompile.spec.ts`
Expected: FAIL — cannot resolve `./lockCompile`.

- [ ] **Step 3: Write the compiler**

`src/game/lockCompile.ts`:
```ts
// A LOCK AS THE WALK SEES IT. compileLock turns the shared Lock into the LockSpec walkLock proves, with
// every move the player has; the facts an author cannot read off the document are derived here too.
import type { Lock, LockMechanic } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import type { LockSpec, Mechanism } from "./lockWalk"

const OPEN = "·"
const REST = "rest"
const DRAFT = "draft"

/** A walk-only stretch between two barriers on one join: never in the JSON, the drawing or a route. */
export const isStretch = (region: string) => region.includes("|")

export const readable = (text: string) => text.replace(/(\w+)\|(\w+)#[\d.]+/g, "between $1 and $2")

type Hop = { kind: "gate" | "oneWay" | "region"; id: string }

export const compileLock = (lock: Lock, drafts: readonly string[] = []): LockSpec => {
  const regions = Object.keys(lock.regions)
  const gates: LockSpec["gates"] = {}
  const oneWays: { from: string; to: string }[] = []
  const expands = new Map<string, string[]>()
  const doorSides = new Map<string, [string, string]>()
  const plain: string[] = []
  const regionGates = Object.entries(lock.gates).filter(([, gate]) => isRegionGate(gate))

  lock.connections.forEach((connection, c) => {
    const [a, b] = joinOf(connection)
    const hops: Hop[] = barriersOf(connection).map(id => ({ kind: id in (lock.oneWays ?? {}) ? "oneWay" : "gate", id }))
    const towards = (hop: Hop, end: string) => hop.kind === "oneWay" && lock.oneWays![hop.id].to === end
    // A barred region is held at the way in: before the first drop heading into it, else beside it.
    for (const [id, gate] of regionGates) {
      if (!isRegionGate(gate)) continue
      if (gate.region === b) {
        const drop = hops.findIndex(hop => towards(hop, b))
        hops.splice(drop < 0 ? hops.length : drop, 0, { kind: "region", id })
      }
      if (gate.region === a) {
        const drop = hops.map(hop => towards(hop, a)).lastIndexOf(true)
        hops.splice(drop < 0 ? 0 : drop + 1, 0, { kind: "region", id })
      }
    }
    if (hops.length === 0) {
      gates[`${a}~${b}#${c}`] = { from: a, to: b, owners: [OPEN] }
      plain.push(`${a}~${b}#${c}`)
      return
    }
    const nodes = [a, ...hops.slice(1).map((_, i) => `${a}|${b}#${c}.${i + 1}`), b]
    regions.push(...nodes.slice(1, -1))
    hops.forEach((hop, i) => {
      const [here, there] = [nodes[i], nodes[i + 1]]
      if (hop.kind === "oneWay") {
        oneWays.push(lock.oneWays![hop.id].from === a ? { from: here, to: there } : { from: there, to: here })
        return
      }
      const gate = lock.gates[hop.id]
      const id = hop.kind === "region" ? `${hop.id}@${c}` : hop.id
      gates[id] = { from: here, to: there, owners: [...gate.owners], ...(gate.mode === "any" ? { mode: "any" } : {}) }
      expands.set(hop.id, [...(expands.get(hop.id) ?? []), id])
      if (hop.kind === "gate") doorSides.set(hop.id, [here, there])
    })
  })

  const opened = (ids: readonly string[] = []) => ids.flatMap(id => expands.get(id) ?? [])
  const mechanismOf = (id: string, m: LockMechanic): Mechanism => {
    if (m.control === "fork-switch") {
      const ways = Object.entries(lock.gates)
        .filter(([, gate]) => !isRegionGate(gate) && gate.owners.includes(id))
        .map(([gate]) => gate)
      const states = [REST, ...ways]
      return {
        states,
        initial: REST,
        opens: Object.fromEntries(states.map(state => [state, state === REST ? [] : [state]])),
        transitions: states.flatMap(from => states.filter(to => to !== from).map(to => ({ from, to, at: m.in }))),
      }
    }
    if (m.control === "sequence") {
      const n = m.steps.length
      const states = [...Array.from({ length: n }, (_, k) => String(k)), "done", "spoiled"]
      const transitions: Mechanism["transitions"] = []
      const add = (t: Mechanism["transitions"][number]) => {
        if (!transitions.some(o => o.from === t.from && o.to === t.to && o.at === t.at)) transitions.push(t)
      }
      m.steps.forEach((step, k) => {
        add({ from: String(k), to: k + 1 === n ? "done" : String(k + 1), at: step.in })
        m.steps.forEach((other, j) => {
          if (j !== k) add({ from: String(k), to: "spoiled", at: other.in })
        })
      })
      for (const side of doorSides.get(m.resetAt) ?? [])
        for (const from of states) if (from !== "done" && from !== "0") add({ from, to: "0", at: side })
      return {
        states,
        initial: "0",
        opens: Object.fromEntries(states.map(state => [state, state === "done" ? opened(m.opens.done) : []])),
        transitions,
      }
    }
    const states = Object.keys(m.opens)
    const other = states.find(state => state !== m.starts)!
    return {
      states,
      initial: m.starts,
      opens: Object.fromEntries(states.map(state => [state, opened(m.opens[state])])),
      transitions:
        m.control === "toggle"
          ? [
              { from: m.starts, to: other, at: m.in },
              { from: other, to: m.starts, at: m.in },
            ]
          : [{ from: m.starts, to: other, at: m.in }],
    }
  }

  const mechanisms: Record<string, Mechanism> = Object.fromEntries(
    Object.entries(lock.mechanics).map(([id, m]) => [id, mechanismOf(id, m)])
  )
  for (const id of drafts) mechanisms[id] = { states: [DRAFT], initial: DRAFT, opens: { [DRAFT]: [] }, transitions: [] }
  if (plain.length > 0) mechanisms[OPEN] = { states: ["open"], initial: "open", opens: { open: plain }, transitions: [] }

  return { regions, gates, mechanisms, oneWays, in: lock.in, out: lock.out }
}

/** The barriers standing open before the player has touched anything — derived, never authored. */
export const openAtStart = (lock: Lock): string[] =>
  Object.entries(lock.gates)
    .filter(([id, gate]) => {
      const says = gate.owners.map(owner => {
        const m = lock.mechanics[owner]
        return m !== undefined && "starts" in m && (m.opens[m.starts] ?? []).includes(id)
      })
      return gate.mode === "any" ? says.some(Boolean) : says.every(Boolean)
    })
    .map(([id]) => id)

/** Under every with several owners, working one owner changes nothing visible, so the gate must show
 * what it waits for (mechanic-contract.md §3). */
export const needsFace = (lock: Lock) =>
  Object.entries(lock.gates)
    .filter(([, gate]) => gate.mode !== "any" && gate.owners.length > 1)
    .map(([gate, { owners }]) => ({ gate, owners }))

/** What the engine cannot build yet (mechanic-contract.md §6, built: no). */
export const notBuildable = (lock: Lock): string[] => [
  ...(Object.values(lock.mechanics).some(m => m.control === "sequence") ? ["sequence"] : []),
  ...(Object.values(lock.gates).some(isRegionGate) ? ["region gate"] : []),
]
```

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/game/lockCompile.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint and typecheck**

Run: `yarn eslint --fix src/game/lockCompile.ts src/game/lockCompile.spec.ts && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i lock`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockCompile.ts src/game/lockCompile.spec.ts
git commit -m "feat(topology): compile a shared Lock for the walk, and report what it starts as"
```

---

### Task 4: Route, quality and reachability on a Lock

**Files:**
- Create: `src/game/lockReview.ts`
- Test: `src/game/lockReview.spec.ts`

**Interfaces:**
- Consumes: `compileLock`, `isStretch` from `./lockCompile`; `Lock`, `joinOf`, `barriersOf`, `isRegionGate` from `./lockAuthoring`; `openGates`, `reachableStates`, `walkLock`, `LockSpec` from `./lockWalk`.
- Produces:
  - `export const solveLock = (spec: LockSpec): { steps: string[]; actions: number } | undefined`
  - `export const lockQuality = (lock: Lock, drafts?: readonly string[]): string[]`
  - `export const unreachedRegions = (spec: LockSpec): string[] | "tooLarge"`

- [ ] **Step 1: Write the failing tests**

`src/game/lockReview.spec.ts`:
```ts
import { describe, expect, it } from "vitest"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { lockQuality, solveLock, unreachedRegions } from "./lockReview"

const spec = (text: string) => compileLock(parseLock(text).lock)
const LAMPLIGHTER = `
  in -[Y]- west
  in -[Y]- east -[A+B]- out
  west >> east >> in
  Y fork @in
  A toggle @west
  B toggle @east
`

describe("solveLock", () => {
  it("reads the cheapest way through without walk-only stretches", () => {
    expect(solveLock(spec("in -[H]- >> hall\nhall -- out\nH toggle @in"))?.steps).toEqual(["in", "H:b", "⤓hall", "out"])
  })
})

describe("lockQuality", () => {
  it("calls a drop that only saves actions a shortcut", () => {
    expect(lockQuality(parseLock(LAMPLIGHTER).lock)).toEqual(["drop west>east is an optional shortcut"])
  })

  it("sends a one-choice board back to being a fork", () => {
    const { lock } = parseLock("in -[Y]- vault\nin -[Y]- out\nY fork @in\nvault $")
    expect(lockQuality(lock)).toContain("under two actions solve it: a single choice is a switch fork, not a lock")
  })

  it("finds the gate a drop makes idle", () => {
    const { lock } = parseLock(`
      in -- top
      in -[S2]- s2 -[S1]- middle
      in -[S2]- out
      top >> s1 >> in
      top >> middle >> in
      S1 toggle @s1
      S2 toggle @s2
    `)
    expect(lockQuality(lock)).toEqual(["gate in-s2 does nothing"])
  })
})

describe("unreachedRegions", () => {
  it("names a region behind a gate only its own lever opens, and never a stretch", () => {
    expect(unreachedRegions(spec("in -[H]- out\nin -[S]- vault\nH toggle @in\nS toggle @vault"))).toEqual(["vault"])
    expect(unreachedRegions(spec("in -[H]- >> hall\nhall -- out\nH toggle @in"))).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockReview.spec.ts`
Expected: FAIL — cannot resolve `./lockReview`.

- [ ] **Step 3: Write the review module**

`src/game/lockReview.ts` — `solveLock` and `lockCosts` follow `lockSketch.ts`'s solving and quality sections; what changes is that stretches leave the route and the pieces come from connections:
```ts
// WHAT A LOCK COSTS AND WHAT IT COULD DO WITHOUT, measured by walking it compiled.
import type { Lock } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import { compileLock, isStretch } from "./lockCompile"
import { openGates, reachableStates, walkLock } from "./lockWalk"
import type { LockSpec } from "./lockWalk"

/**
 * The cheapest way through, where every action (a board solved, a lever thrown, a key taken) costs more
 * than any amount of walking. Steps are regions walked to, `⤓region` for a drop taken, and `Id:state`
 * for an action.
 */
export const solveLock = (spec: LockSpec): { steps: string[]; actions: number } | undefined => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return undefined
  const { order, edges } = found
  const cost = order.map(() => Infinity)
  const prev = order.map(() => -1)
  cost[0] = 0
  const done = new Set<number>()
  let end: number
  // ponytail: linear-scan Dijkstra over a lock's few hundred states.
  for (;;) {
    let at = -1
    order.forEach((_, n) => {
      if (!done.has(n) && cost[n] < Infinity && (at < 0 || cost[n] < cost[at])) at = n
    })
    if (at < 0) return undefined
    if (order[at].region === spec.out) {
      end = at
      break
    }
    done.add(at)
    for (const to of edges[at]) {
      const next = cost[at] + (order[to].region === order[at].region ? 1000 : 1)
      if (next >= cost[to]) continue
      cost[to] = next
      prev[to] = at
    }
  }
  const path: number[] = []
  for (let n = end; n >= 0; n = prev[n]) path.unshift(n)
  const steps = [order[0].region]
  let actions = 0
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [order[path[i - 1]], order[path[i]]]
    if (a.region === b.region) {
      const id = Object.keys(b.config).find(m => b.config[m] !== a.config[m])!
      steps.push(`${id}:${b.config[id]}`)
      actions++
      continue
    }
    if (isStretch(b.region)) continue
    const byGate = [...openGates(spec, a.config)].some(g => {
      const gate = spec.gates[g]
      return (gate.from === a.region && gate.to === b.region) || (gate.to === a.region && gate.from === b.region)
    })
    steps.push(byGate ? b.region : `⤓${b.region}`)
  }
  return { steps, actions }
}

/** The regions no order of moves ever stands the player in, stretches aside. */
export const unreachedRegions = (spec: LockSpec): string[] | "tooLarge" => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return found
  const reached = new Set(found.order.map(state => state.region))
  return spec.regions.filter(region => !isStretch(region) && !reached.has(region))
}

// Every barrier id taken out of the lock: from its join, its table, and every mechanic's opens.
const stripped = (lock: Lock, connections: Lock["connections"], ids: readonly string[]): Lock => {
  const gone = new Set(ids)
  const keep = <T>(record: Readonly<Record<string, T>> = {}) =>
    Object.fromEntries(Object.entries(record).filter(([id]) => !gone.has(id)))
  return {
    ...lock,
    connections,
    gates: keep(lock.gates),
    oneWays: keep(lock.oneWays),
    mechanics: Object.fromEntries(
      Object.entries(lock.mechanics).map(([id, m]) => [
        id,
        "opens" in m
          ? { ...m, opens: Object.fromEntries(Object.entries(m.opens).map(([s, list]) => [s, list.filter(b => !gone.has(b))])) }
          : m,
      ])
    ) as Lock["mechanics"],
  }
}

type Piece = { name: string; without?: Lock; propped?: Lock }

const piecesOf = (lock: Lock): Piece[] => [
  ...lock.connections.flatMap((connection, c): Piece[] => {
    const [a, b] = joinOf(connection)
    const barriers = barriersOf(connection)
    const without = stripped(lock, lock.connections.filter((_, k) => k !== c), barriers)
    if (barriers.length === 0) return [{ name: `corridor ${a} -- ${b}`, without }]
    return barriers.map(id => {
      if (id in (lock.oneWays ?? {})) return { name: `drop ${id}`, without }
      const rest = barriers.filter(other => other !== id)
      const kept = lock.connections.map((other, k) =>
        k !== c ? other : rest.length > 0 ? { between: [a, b] as const, barriers: rest } : ([a, b] as const)
      )
      return { name: `gate ${id}`, without, propped: stripped(lock, kept, [id]) }
    })
  }),
  ...Object.entries(lock.gates)
    .filter(([, gate]) => isRegionGate(gate))
    .map(([id]) => ({ name: `gate ${id}`, propped: stripped(lock, lock.connections, [id]) })),
]

const lockCosts = (lock: Lock, drafts: readonly string[]) => {
  const spec = compileLock(lock, drafts)
  if (!walkLock(spec).sound) return undefined
  const found = reachableStates(spec)
  if (found === "tooLarge") return undefined
  const { order, edges } = found
  const acts = (a: number, b: number) => (order[a].region === order[b].region ? 1 : 0)
  const backwards: number[][] = order.map(() => [])
  edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))
  const left = order.map(state => (state.region === spec.out ? 0 : Infinity))
  const deque = order.flatMap((state, n) => (state.region === spec.out ? [n] : []))
  while (deque.length > 0) {
    const at = deque.shift()!
    for (const from of backwards[at]) {
      const cost = left[at] + acts(from, at)
      if (cost >= left[from]) continue
      left[from] = cost
      if (acts(from, at)) deque.push(from)
      else deque.unshift(from)
    }
  }
  const rewards = Object.keys(lock.regions).filter(r => lock.regions[r].takes === "reward")
  const full = (1 << rewards.length) - 1
  const mark = (mask: number, n: number) => {
    const i = rewards.indexOf(order[n].region)
    return i < 0 ? mask : mask | (1 << i)
  }
  const best = new Map<string, number>([[`0,${mark(0, 0)}`, 0]])
  const queue: [number, number, number][] = [[0, mark(0, 0), 0]]
  let rewarded = Infinity
  while (queue.length > 0) {
    const [at, mask, cost] = queue.shift()!
    if (cost > (best.get(`${at},${mask}`) ?? Infinity)) continue
    if (order[at].region === spec.out && mask === full) rewarded = Math.min(rewarded, cost)
    for (const to of edges[at]) {
      const next: [number, number, number] = [to, mark(mask, to), cost + acts(at, to)]
      const key = `${next[0]},${next[1]}`
      if (next[2] >= (best.get(key) ?? Infinity)) continue
      best.set(key, next[2])
      if (acts(at, to)) queue.push(next)
      else queue.unshift(next)
    }
  }
  return { exit: left[0], rewarded, worst: Math.max(...left) }
}

type Profile = { exit: number; rewarded: number; worst: number; needed: string[] }

const profile = (lock: Lock, drafts: readonly string[]): Profile | undefined => {
  const costs = lockCosts(lock, drafts)
  if (!costs) return undefined
  const needed = piecesOf(lock)
    .filter(piece => piece.without && !walkLock(compileLock(piece.without, drafts)).sound)
    .map(piece => piece.name)
  return { ...costs, needed }
}

const sameProfile = (a: Profile | undefined, b: Profile) =>
  a !== undefined && a.exit === b.exit && a.rewarded === b.rewarded && a.worst === b.worst && a.needed.join() === b.needed.join()

/**
 * What a sound lock could do without. Each join is taken away in turn, and each gate propped open, and
 * the lock measured again: a piece that changes none of the costs and makes no other piece necessary is
 * doing nothing. A drop whose loss only costs actions is a shortcut, not a need.
 */
export const lockQuality = (lock: Lock, drafts: readonly string[] = []): string[] => {
  const base = profile(lock, drafts)
  if (!base) return []
  const notes: string[] = []
  if (base.exit < 2) notes.push("under two actions solve it: a single choice is a switch fork, not a lock")
  for (const piece of piecesOf(lock)) {
    if (base.needed.includes(piece.name)) continue
    if (piece.without) {
      const without = profile(piece.without, drafts)
      if (sameProfile(without, base)) {
        notes.push(`${piece.name} does nothing`)
        continue
      }
      if (!piece.name.startsWith("gate ") && without && (without.exit > base.exit || without.rewarded > base.rewarded))
        notes.push(`${piece.name} is an optional shortcut`)
    }
    if (piece.propped && sameProfile(profile(piece.propped, drafts), base)) notes.push(`${piece.name} never stops anyone`)
  }
  return notes
}
```

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/game/lockReview.spec.ts`
Expected: PASS. Each piece gets at most one note: the `continue` after "does nothing" skips the propped check.

- [ ] **Step 5: Lint and typecheck**

Run: `yarn eslint --fix src/game/lockReview.ts src/game/lockReview.spec.ts && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i lock`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockReview.ts src/game/lockReview.spec.ts
git commit -m "feat(topology): route, quality and reachability measured on a shared Lock"
```

---

### Task 5: Drawing a Lock

**Files:**
- Create: `src/game/lockDraw.ts`
- Test: `src/game/lockDraw.spec.ts`

**Interfaces:**
- Consumes: `Lock`, `joinOf`, `barriersOf`, `isRegionGate` from `./lockAuthoring`; `openAtStart` from `./lockCompile`.
- Produces: `export const drawLock = (lock: Lock, drafts?: readonly string[]): string`

- [ ] **Step 1: Write the failing tests**

`src/game/lockDraw.spec.ts`:
```ts
import { describe, expect, it } from "vitest"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"

const draw = (text: string) => {
  const { lock, drafts } = parseLock(text)
  return drawLock(lock, drafts)
}

describe("drawLock", () => {
  it("draws doubleBack", () => {
    expect(
      draw(`
        in -[Y]- leftLower -[S1]- s2
        in -[Y]- rightLower -[S1:a]- s1
        in -[S2]- out
        s1 >> leftLower >> in
        Y fork @in
        S1 toggle @s1
        S2 toggle @s2
        s2 $
      `)
    ).toMatchSnapshot()
  })

  it("names toggle states and marks the gate open at the start", () => {
    const art = draw("in -[S1:a]- hall\nhall -[S1]- out\nS1 toggle @hall")
    expect(art).toContain("□S1:a")
    expect(art).toContain("■S1:b")
  })

  it("shows a region gate in its region's box", () => {
    expect(draw("in -- hall\nhall -- out\nhall -[sluice:wet]\nsluice toggle @in dry wet")).toContain("[hall ▒sluice:wet]")
  })

  it("numbers a sequence's steps and marks its reset door", () => {
    const art = draw("in -- hall\nhall -[P]- out\nP sequence in hall in reset hall-out")
    expect(art).toContain("[in · P1 · P3]")
    expect(art).toContain("[hall · P2]")
    expect(art).toContain("■P↺")
  })

  it("marks a draft owner", () => {
    expect(draw("in -[G]- out")).toContain("■G?")
  })

  it("lists a drop that carries a gate under the map", () => {
    expect(draw("in -[H]- >> hall\nhall -- out\nH toggle @in")).toContain("in -[■H:b]- >> hall")
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockDraw.spec.ts`
Expected: FAIL — cannot resolve `./lockDraw`.

- [ ] **Step 3: Move the layout code**

Create `src/game/lockDraw.ts` from the drawing section of `src/game/lockSketch.ts` — everything from `const U = 1,` down to the end of `drawLock` — then apply these edits to the copy:

1. Put this header and the input type above the copied constants:
```ts
// A LOCK DRAWN THE WAY IT WOULD BE SKETCHED ON PAPER: the way in bottom left, the main path along the
// bottom to the way out, every other region rising off the one it joins, and each drop routed around
// what is drawn.
import type { Lock } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import { openAtStart } from "./lockCompile"

type Sketch = {
  regions: string[]
  edges: Record<string, { from: string; to: string; token: string }>
  drops: { from: string; to: string }[]
  boxes: Record<string, string>
  notes: string[]
  in: string
  out: string
}
```
2. Rename the copied `export const drawLock = (spec: LockSpec): string => {` to `const drawSketch = (sketch: Sketch): string => {`.
3. Delete the copied `const initial = …`, `const openAtStart = …`, the whole `gateToken` and the whole `boxLabel` definitions, and put in their place:
```ts
  const gateToken = (edge: string) => sketch.edges[edge].token
  const boxLabel = (region: string) => sketch.boxes[region]
```
4. Replace in the copy: `Object.entries(spec.gates)` → `Object.entries(sketch.edges)`; `Object.keys(spec.gates)` → `Object.keys(sketch.edges)`; `spec.oneWays ?? []` → `sketch.drops`; then every remaining `spec.` → `sketch.`.
5. Replace the copied legend and return lines with:
```ts
  const legend = "■ shut at the start   □ open   ▒ region barred   ╌▶ one-way   ↺ reset   Name:state opens it"
  return [...rows.map(row => row.slice(indent)), "", ...sketch.notes, legend, ...unrouted.map(u => `unrouted drop: ${u}`)].join("\n")
```
6. Append the translation from a `Lock`:
```ts
const sketchOf = (lock: Lock, drafts: readonly string[]): Sketch => {
  const open = new Set(openAtStart(lock))
  const condition = (id: string) => {
    const gate = lock.gates[id]
    const owner = (name: string) => {
      const m = lock.mechanics[name]
      if (!m || drafts.includes(name)) return `${name}?`
      if (m.control === "fork-switch" || m.control === "sequence") return name
      return `${name}:${Object.keys(m.opens).filter(state => m.opens[state].includes(id)).join("/")}`
    }
    const reset = Object.values(lock.mechanics).some(m => m.control === "sequence" && m.resetAt === id) ? "↺" : ""
    return gate.owners.map(owner).join(gate.mode === "any" ? "|" : "+") + reset
  }
  const token = (id: string) => (open.has(id) ? "□" : "■") + condition(id)
  const edges: Sketch["edges"] = {}
  const drops: Sketch["drops"] = []
  const notes: string[] = []
  lock.connections.forEach((connection, c) => {
    const [a, b] = joinOf(connection)
    const barriers = barriersOf(connection)
    const drop = barriers.find(id => id in (lock.oneWays ?? {}))
    if (!drop) {
      edges[String(c)] = { from: a, to: b, token: barriers.map(token).join(" ") }
      return
    }
    drops.push(lock.oneWays![drop])
    if (barriers.length > 1)
      notes.push(`${a} ${barriers.map(id => (id in lock.oneWays! ? ">>" : `-[${token(id)}]-`)).join(" ")} ${b}`)
  })
  const boxes = Object.fromEntries(
    Object.keys(lock.regions).map(region => {
      const standing = Object.entries(lock.mechanics).flatMap(([id, m]) => ("in" in m && m.in === region ? [id] : []))
      const steps = Object.entries(lock.mechanics).flatMap(([id, m]) =>
        m.control === "sequence" ? m.steps.flatMap((step, k) => (step.in === region ? [`${id}${k + 1}`] : [])) : []
      )
      const barred = Object.entries(lock.gates)
        .filter(([, gate]) => isRegionGate(gate) && gate.region === region)
        .map(([id]) => ` ${open.has(id) ? "░" : "▒"}${condition(id)}`)
        .join("")
      return [region, `[${[region, ...standing, ...steps].join(" · ")}${barred}]`]
    })
  )
  return { regions: Object.keys(lock.regions), edges, drops, boxes, notes, in: lock.in, out: lock.out }
}

export const drawLock = (lock: Lock, drafts: readonly string[] = []): string => drawSketch(sketchOf(lock, drafts))
```

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/game/lockDraw.spec.ts`
Expected: PASS, one snapshot written. Open `src/game/__snapshots__/lockDraw.spec.ts.snap` and check by eye that the doubleBack drawing has both drops routed, `□S1:a` on the right branch and `■S1:b` on the left, `■Y` on both fork gates and `■S2:b` on the main path. If a `spec` identifier survived the edits, typecheck fails here — fix the rename.

- [ ] **Step 5: Lint and typecheck**

Run: `yarn eslint --fix src/game/lockDraw.ts src/game/lockDraw.spec.ts && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i lock`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockDraw.ts src/game/lockDraw.spec.ts src/game/__snapshots__/lockDraw.spec.ts.snap
git commit -m "feat(topology): draw a shared Lock, region gates and sequences included"
```

---

### Task 6: The catalogue in the notation

**Files:**
- Modify: `src/game/lockCatalogue.ts` (rewrite)
- Create: `src/game/lockCatalogue.spec.ts`

**Interfaces:**
- Consumes: `parseLock`, `ParsedLock` from `./lockNotation`; `compileLock` from `./lockCompile`; `solveLock`, `lockQuality`, `unreachedRegions` from `./lockReview`; `drawLock` from `./lockDraw`; `walkLock` from `./lockWalk`.
- Produces:
  - `export const LOCK_TEXTS: Record<LockName, string>` with `LockName = "twoLamps" | "dropHome" | "lamplighter" | "seesaw" | "doubleBack" | "cellar" | "keyring" | "overlook"`
  - `export const LOCK_CATALOGUE: Record<LockName, ParsedLock>`

Note: until Task 7, `lockSketch.spec.ts` and the CLI still import the old catalogue exports. This task keeps the old ones working by writing the new catalogue into the same file under new names AND leaving the old exports in place — Task 7 deletes the old.

- [ ] **Step 1: Write the failing tests**

`src/game/lockCatalogue.spec.ts`:
```ts
import { describe, expect, it } from "vitest"
import { walkLock } from "./lockWalk"
import { compileLock } from "./lockCompile"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"
import { lockQuality, solveLock, unreachedRegions } from "./lockReview"
import { LOCK_CATALOGUE, LOCK_TEXTS } from "./lockCatalogue"

const walkText = (text: string) => walkLock(compileLock(parseLock(text).lock, parseLock(text).drafts))
/** The lock with one of its lines rewritten — how each trick's load-bearing piece is taken away. */
const edited = (name: keyof typeof LOCK_TEXTS, line: string, replacement: string) => {
  const text = LOCK_TEXTS[name]
  if (!text.includes(line)) throw new Error(`${name} has no line ${line}`)
  return text.replace(line, replacement)
}
const boardSolves = (name: keyof typeof LOCK_TEXTS) =>
  solveLock(compileLock(LOCK_CATALOGUE[name].lock))!.steps.filter(step => step.startsWith("Y:")).length

describe.each(Object.entries(LOCK_CATALOGUE))("%s", (_, { lock, drafts }) => {
  it("walks sound, reaching every region", () => {
    expect(drafts).toEqual([])
    const spec = compileLock(lock)
    expect(walkLock(spec)).toEqual({ sound: true, states: expect.any(Number) })
    expect(unreachedRegions(spec)).toEqual([])
  })

  it("draws, with its cheapest way through", () => {
    expect(`${drawLock(lock)}\n\n${solveLock(compileLock(lock))!.steps.join(" ▸ ")}`).toMatchSnapshot()
  })
})

describe("what each lock's trick rests on", () => {
  it("twoLamps: one lamp does not open the exit, so the board is solved twice", () => {
    expect(boardSolves("twoLamps")).toBe(2)
  })

  it("dropHome: cannot be left without its drop", () => {
    expect(walkText(edited("dropHome", "leverRoom >> in", ""))).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("lamplighter: the drop saves a board solve", () => {
    expect(boardSolves("lamplighter")).toBe(1)
  })

  it("lamplighter: strands the early dropper without the drop out of the east", () => {
    expect(walkText(edited("lamplighter", "west >> east >> in", "west >> east"))).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "east" } },
    })
  })

  it("seesaw: cannot be solved without the drops", () => {
    expect(walkText(edited("seesaw", "west >> east >> in", ""))).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("doubleBack: the drop off the left branch is the only way home from S2", () => {
    expect(walkText(edited("doubleBack", "s1 >> leftLower >> in", "s1 >> leftLower"))).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
  })

  it("cellar: a cell whose key lies outside it strands whoever drops in without it", () => {
    expect(walkText(edited("cellar", "blue activator @cell", "blue activator @ledge"))).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "cell" } },
    })
  })

  it("keyring: a lever that cannot be thrown back keeps the red key in", () => {
    expect(walkText(edited("keyring", "H toggle @leverRoom", "H activator @leverRoom a b")).sound).toBe(false)
  })

  it("overlook: the drop out of the middle saves whoever drops in before throwing S1", () => {
    expect(walkText(edited("overlook", "top >> middle >> in", "top >> middle"))).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "middle" } },
    })
  })
})

describe("the catalogue's quality", () => {
  it("finds nothing idle in doubleBack, and the shortcut in lamplighter", () => {
    expect(lockQuality(LOCK_CATALOGUE.doubleBack.lock)).toEqual([])
    expect(lockQuality(LOCK_CATALOGUE.lamplighter.lock)).toEqual(["drop west>east is an optional shortcut"])
  })

  it("finds overlook's idle gate, and passes the variant that shuts the way behind S2", () => {
    expect(lockQuality(LOCK_CATALOGUE.overlook.lock)).toEqual(["gate in-s2 does nothing"])
    const variant = parseLock(edited("overlook", "in -[S2]- s2 -[S1]- middle", "in -[S2]- s2 -[S1+S2:a]- middle"))
    expect(lockQuality(variant.lock)).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCatalogue.spec.ts`
Expected: FAIL — `LOCK_TEXTS` is not exported.

- [ ] **Step 3: Add the texts to the catalogue**

Add these two imports at the top of `src/game/lockCatalogue.ts`, under the existing ones:
```ts
import { parseLock as parseNotation } from "./lockNotation"
import type { ParsedLock } from "./lockNotation"
```
Then append to the end of the file (keep the existing exports for now; Task 7 removes them):
```ts
/** Small multi-step locks in the notation, each with one trick; what each is for is the test that
 * names its load-bearing piece (lockCatalogue.spec.ts). */
export const LOCK_TEXTS = {
  /** The exit wants both lamps lit, and the board lets you reach one lamp at a time. */
  twoLamps: `
    in -[Y]- west
    in -[Y]- east
    in -[A+B]- out
    Y fork @in
    A toggle @west
    B toggle @east
  `,
  /** The lever that opens the exit shuts the door behind you; the only way home is a drop. */
  dropHome: `
    in -[Y]- hall -[H:a]- leverRoom
    in -[Y]- vault
    in -[H]- out
    leverRoom >> in
    Y fork @in
    H toggle @leverRoom
    hall *
    vault $
  `,
  /** Light west first and the board is solved once; light east first and it is solved twice. */
  lamplighter: `
    in -[Y]- west
    in -[Y]- east -[A+B]- out
    west >> east >> in
    Y fork @in
    A toggle @west
    B toggle @east
  `,
  /** Two levers, and each one's throw shuts the way to the other. Only the drops let both be thrown. */
  seesaw: `
    in -[B:a]- west
    in -[A:a]- east
    in -[A+B]- out
    west >> east >> in
    A toggle @west
    B toggle @east
    west *
    east *
  `,
  /** The owner's sketch: a lever that shuts the way you came and opens a branch you drop onto. */
  doubleBack: `
    in -[Y]- leftLower -[S1]- s2
    in -[Y]- rightLower -[S1:a]- s1
    in -[S2]- out
    s1 >> leftLower >> in
    Y fork @in
    S1 toggle @s1
    S2 toggle @s2
    s2 $
  `,
  /** The lever that opens the exit shuts the bridge back; the drop lands in a cell holding its own key. */
  cellar: `
    in -[H:a]- ledge
    in -[blue]- cell
    in -[H]- out
    ledge >> cell
    H toggle @ledge
    blue activator @cell
    ledge *
  `,
  /** A key chain behind an airlock: the lever opens the way in or the red room, never both. */
  keyring: `
    in -[H:a]- leverRoom -[H]- redRoom
    in -[red]- greenRoom
    in -[green]- out
    H toggle @leverRoom
    red activator @redRoom
    green activator @greenRoom
    leverRoom *
    redRoom *
  `,
  /** The owner's second sketch: one room overlooks two drops; the drop out of the middle saves whoever
   * drops in before throwing S1. */
  overlook: `
    in -- top
    in -[S2]- s2 -[S1]- middle
    in -[S2]- out
    top >> s1 >> in
    top >> middle >> in
    S1 toggle @s1
    S2 toggle @s2
    top *
    middle *
  `,
} as const

export type LockName = keyof typeof LOCK_TEXTS

export const LOCK_CATALOGUE_V2 = Object.fromEntries(
  Object.entries(LOCK_TEXTS).map(([name, text]) => [name, parseNotation(text, name)])
) as Record<LockName, ParsedLock>
```
Then in `src/game/lockCatalogue.spec.ts` replace the import line with:
```ts
import { LOCK_CATALOGUE_V2 as LOCK_CATALOGUE, LOCK_TEXTS } from "./lockCatalogue"
```

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/game/lockCatalogue.spec.ts`
Expected: PASS, eight snapshots written. Check by eye that overlook's route reads `in ▸ top ▸ ⤓s1 ▸ S1:b ▸ …` (top is its own region again) and that no snapshot contains `|`.

- [ ] **Step 5: Lint and typecheck**

Run: `yarn eslint --fix src/game/lockCatalogue.ts src/game/lockCatalogue.spec.ts && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i lock`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockCatalogue.ts src/game/lockCatalogue.spec.ts src/game/__snapshots__/lockCatalogue.spec.ts.snap
git commit -m "feat(topology): the lock catalogue in the notation"
```

---

### Task 7: Switch the CLI, delete the old pipeline

**Files:**
- Modify: `scripts/lock.ts` (rewrite)
- Modify: `src/game/lockCatalogue.ts` (drop the old exports, rename `LOCK_CATALOGUE_V2`)
- Modify: `src/game/lockCatalogue.spec.ts` (import line)
- Delete: `src/game/lockSketch.ts`, `src/game/lockSketch.spec.ts`, `src/game/lockText.ts`, `src/game/lockText.spec.ts`, `src/game/__snapshots__/lockSketch.spec.ts.snap`

**Interfaces:**
- Consumes: every export produced by Tasks 2–6.
- Produces: `yarn lock` as specified.

- [ ] **Step 1: Make the catalogue new-only**

In `src/game/lockCatalogue.ts`: delete everything above the `LOCK_TEXTS` block except the file header comment, change `import { parseLock as parseNotation }` to `import { parseLock }`, `parseNotation(` to `parseLock(`, and `LOCK_CATALOGUE_V2` to `LOCK_CATALOGUE`. Update the header comment to:
```ts
// SMALL MULTI-STEP LOCKS, EACH WITH ONE TRICK — a single choice made by solving is a fork, not a lock.
// Written in lockNotation.ts's notation; `yarn lock <name>` draws one.
```
In `src/game/lockCatalogue.spec.ts` set the import to `import { LOCK_CATALOGUE, LOCK_TEXTS } from "./lockCatalogue"`.

- [ ] **Step 2: Delete the old pipeline**

```bash
git rm -q src/game/lockSketch.ts src/game/lockSketch.spec.ts src/game/lockText.ts src/game/lockText.spec.ts src/game/__snapshots__/lockSketch.spec.ts.snap
git grep -n -e "lockSketch" -e "lockText\"" -e "AuthoredLock" -e "topologyLock" -- src scripts
```
Expected: the grep prints only `scripts/lock.ts` lines (rewritten next).

- [ ] **Step 3: Rewrite the CLI**

`scripts/lock.ts`:
```ts
#!/usr/bin/env tsx
/**
 * Draws a lock written in lockNotation.ts's notation, walks it, says what it could do without, and
 * prints the shared Lock JSON it reads into.
 *
 *   yarn lock                       every lock in the catalogue
 *   yarn lock doubleBack            one of them, with its JSON
 *   yarn lock sketch.lock           a file
 *   yarn lock sketch.lock --watch   redrawn on every save; a new file starts with the notation
 *   yarn lock - < sketch.lock       standard input
 *   yarn lock --help                the notation
 */
import { existsSync, readFileSync, watch, writeFileSync } from "node:fs"
import { basename, dirname } from "node:path"
import { describeLockWalkFailure, walkLock } from "../src/game/lockWalk"
import { compileLock, needsFace, notBuildable, openAtStart, readable } from "../src/game/lockCompile"
import { drawLock } from "../src/game/lockDraw"
import { lockQuality, solveLock, unreachedRegions } from "../src/game/lockReview"
import { LOCK_SYNTAX, parseLock } from "../src/game/lockNotation"
import type { ParsedLock } from "../src/game/lockNotation"
import { LOCK_CATALOGUE } from "../src/game/lockCatalogue"

const args = process.argv.slice(2)
const watching = args.includes("--watch")
const target = args.find(arg => !arg.startsWith("--"))
const library: Record<string, ParsedLock> = LOCK_CATALOGUE

const report = (name: string, { lock, drafts }: ParsedLock, withJson: boolean): boolean => {
  const spec = compileLock(lock, drafts)
  const walked = walkLock(spec)
  const unreached = unreachedRegions(spec)
  const reachable = Array.isArray(unreached) && unreached.length === 0
  const deadEnd = !walked.sound && walked.failure.type === "strands"
  const open = openAtStart(lock)
  const unbuilt = notBuildable(lock)
  const sequences = Object.entries(lock.mechanics).flatMap(([id, m]) => (m.control === "sequence" ? [id] : []))
  const checks = [
    ...(drafts.length > 0 ? [`✗ not placed yet: ${drafts.join(", ")}`] : []),
    reachable
      ? "✓ every region is reachable"
      : `✗ ${unreached === "tooLarge" ? "too many states to walk" : `never reached: ${unreached.join(", ")}`}`,
    walked.sound || deadEnd ? "✓ solvable" : `✗ not solvable: ${readable(describeLockWalkFailure(walked.failure))}`,
    ...(deadEnd ? [`✗ a dead end: ${readable(describeLockWalkFailure(walked.failure))}`] : []),
    `at the start ${open.length > 0 ? `these gates stand open: ${open.join(", ")}` : "no gate stands open"}`,
    ...needsFace(lock).map(({ gate, owners }) => `${gate} shows what it waits for: ${owners.join(", ")}`),
    ...sequences.map(id => `⚠ sequence ${id}: done stays fired, tiles anywhere — contract §8 open`),
    ...(unbuilt.length > 0 ? [`⚠ not buildable yet: ${unbuilt.join(", ")}`] : []),
  ]
  const lines = [`## ${name}`, "", ...checks, "", drawLock(lock, drafts)]
  const solved = solveLock(spec)
  if (solved) lines.push("", `cheapest: ${solved.actions} actions — ${solved.steps.join(" ▸ ")}`)
  const notes = lockQuality(lock, drafts)
  lines.push("", ...(notes.length > 0 ? notes.map(note => `! ${note}`) : walked.sound ? ["every piece bears load"] : []))
  // Short objects and lists stay on one line, so the JSON reads at a glance.
  const json = JSON.stringify(lock, null, 2).replace(/[{[][^{}[\]]*[}\]]/g, part =>
    part.length < 100 ? part.replace(/\s*\n\s*/g, " ") : part
  )
  if (withJson) lines.push("", json)
  console.log(lines.join("\n") + "\n")
  return drafts.length === 0 && reachable && walked.sound
}

const syntax = `${LOCK_SYNTAX}\n  catalogue: ${Object.keys(library).join(", ")}\n`

const fromText = (name: string, text: string): boolean => {
  try {
    // Watching is for designing; the JSON is for when the design is done.
    return report(name, parseLock(text, name.replace(/\.lock$/, "")), !watching)
  } catch (error) {
    // A watched file carries the syntax in its own comments.
    console.log(`## ${name}\n\n✗ ${(error as Error).message}\n${watching ? "" : `\n${syntax}`}`)
    return false
  }
}

// A new file to design in starts with the syntax as comments, so it never has to be remembered.
if (watching && target && target !== "-" && !(target in library) && !existsSync(target)) {
  const help = syntax.split("\n").map(line => `//${line}`.trimEnd())
  writeFileSync(target, ["// A new lock. Save to redraw; lines starting with // are ignored.", "//", ...help, "", "in -- out", ""].join("\n"))
}

if (args.includes("--help")) {
  console.log(syntax)
} else if (!target) {
  const sound = Object.entries(LOCK_CATALOGUE).map(([name, parsed]) => report(name, parsed, false))
  process.exitCode = sound.every(Boolean) ? 0 : 1
} else if (target === "-") {
  process.exitCode = fromText("stdin", readFileSync(0, "utf8")) ? 0 : 1
} else if (existsSync(target)) {
  const run = () => {
    // An editor saving by rename leaves a moment with no file; the save that follows redraws.
    if (!existsSync(target)) return false
    // Screen, scrollback, cursor home: console.clear() leaves the previous draw in the scrollback.
    if (watching) process.stdout.write("\x1b[2J\x1b[3J\x1b[H")
    const sound = fromText(basename(target), readFileSync(target, "utf8"))
    if (watching) console.log(`watching ${target} — save to redraw, ctrl-c to stop`)
    return sound
  }
  process.exitCode = run() ? 0 : 1
  // The folder is watched, not the file: a save by rename replaces the file a file watch was holding.
  // ponytail: editors save in bursts (truncate, write, rename); a short debounce draws once per save.
  let pending: NodeJS.Timeout | undefined
  if (watching)
    watch(dirname(target), (_, file) => {
      if (file !== basename(target)) return
      clearTimeout(pending)
      pending = setTimeout(run, 50)
    })
} else if (target in library) {
  process.exitCode = report(target, library[target], true) ? 0 : 1
} else {
  console.error(`no file or catalogue lock called ${target}; the catalogue has ${Object.keys(library).join(", ")}`)
  process.exitCode = 1
}
```

- [ ] **Step 4: Run every lock test and the CLI**

Run: `yarn vitest run src/game/lockNotation.spec.ts src/game/lockCompile.spec.ts src/game/lockReview.spec.ts src/game/lockDraw.spec.ts src/game/lockCatalogue.spec.ts src/game/lockWalk.spec.ts`
Expected: all pass.

Run: `yarn lock > /dev/null; echo $?` — Expected: `0`.
Run: `yarn lock doubleBack | head -8` — Expected:
```
## doubleBack

✓ every region is reachable
✓ solvable
at the start these gates stand open: rightLower-s1
```
Run: `yarn lock doubleBack | sed -n '/^{/,$p' | head -3` — Expected: the JSON opens with `"name": "doubleBack"` and contains `"control": "toggle"`, `"starts": "a"`, and no `encounter`.

- [ ] **Step 5: Lint and typecheck**

Run: `yarn lint 2>&1 | grep -i -A3 lock; npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i lock`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add -A scripts/lock.ts src/game/lockCatalogue.ts src/game/lockCatalogue.spec.ts
git commit -m "feat(topology): yarn lock reads and prints the shared Lock"
```
