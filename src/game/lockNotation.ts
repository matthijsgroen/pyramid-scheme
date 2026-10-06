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
  p1 plate @hall   p2 plate @hall stone   a plate, empty or with a stone on it; any stone presses any plate
  in -[p1]- hall   in -[p1:empty]- hall    open while a stone rests on p1, or while none does
  in -[unladen]- hall           only with empty hands: a zipline, a narrow passage
  hall *   s2 $   spare ?   corridor -     takes puzzles, a reward, anything, nothing
  // comment
`.slice(1)

/**
 * Stones the player carries and the plates they press — a PROPOSAL the shared Lock type does not hold
 * yet, carried beside it. A stone is always on a plate or in the hand, so lifting one is itself a move
 * that can open or shut a way. Stones are alike and any one presses any plate, so a stone is authored as
 * the plate it starts on, not by a name of its own. The explorer's weight presses a plate too, but never
 * while he passes the way it opens (a plate is never that way's cell), so the walk models stones only.
 */
export type Weights = {
  /** Whether each plate starts with a stone, and what it opens while it holds one and while it holds
   * none. Both may be empty: a plate that opens nothing is a shelf. */
  plates: Record<string, { in: string; stone: boolean; opens: { weighted: string[]; empty: string[] } }>
}
export type DraftLock = Lock & { weights?: Weights }
/** `refused`: what is wrong with a lock that still reads whole, such as a lever opening nothing, so it can
 * be drawn beside its errors. */
export type ParsedLock = { lock: DraftLock; drafts: string[]; refused: string[] }

/** A condition on the stones rather than an owner to place: empty hands. */
export const CARRY_TERMS = ["unladen"] as const

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
  const plates = new Map<string, { in: string; stone: boolean; n: number }>()
  const plateOpens = new Map<string, { weighted: string[]; empty: string[] }>()

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
    if (from === to) fail(n, `a join leads from ${from} to ${to}`)
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
  const placed = (id: string) => declared.has(id) || plates.has(id)
  const declare = (n: number, id: string, what: Declared) => {
    if (placed(id)) fail(n, `${id} is placed twice`)
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
    } else if ((m = line.match(/^(\w+)\s+plate\s+@(\w+)(\s+stone)?$/))) {
      if (placed(m[1])) fail(n, `${m[1]} is placed twice`)
      plates.set(m[1], { in: m[2], stone: m[3] !== undefined, n })
    } else if (/^\w+\s+stone\b/.test(line)) {
      fail(n, "a stone is written on the plate it rests on: p plate @hall stone")
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
      for (let i = 0; i < parts.length - 1;) {
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

  const stones = [...plates.values()].filter(plate => plate.stone).length
  const opens = new Map<string, Record<string, string[]>>()
  const drafts = new Set<string>()
  const refused: string[] = []
  for (const [id, gate] of Object.entries(gates)) {
    const { n, list } = terms[id]
    if ("region" in gate) {
      if (!regions.has(gate.region)) fail(n, `no corridor reaches ${gate.region}`)
      if (gate.region === "in" || gate.region === "out") fail(n, `the region holding ${gate.region} cannot be barred`)
    }
    for (const { owner, state } of list) {
      if ((CARRY_TERMS as readonly string[]).includes(owner)) {
        if (stones === 0) fail(n, `${owner} asks about stones, and the lock has none`)
        continue
      }
      if (plates.has(owner)) {
        if ("region" in gate && plates.get(owner)!.in === gate.region)
          fail(n, `${owner} stands in ${gate.region}, which it would bar`)
        const side = state ?? "weighted"
        if (side !== "weighted" && side !== "empty") fail(n, `plate ${owner} has no state ${side}`)
        const table = plateOpens.get(owner) ?? { weighted: [], empty: [] }
        table[side as "weighted" | "empty"].push(id)
        plateOpens.set(owner, table)
        continue
      }
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
        const first =
          on &&
          (on.between[0] === what.in ? on.barriers[0] === id : on.between[1] === what.in && on.barriers.at(-1) === id)
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

  for (const [, plate] of plates) if (!regions.has(plate.in)) fail(plate.n, `no corridor reaches ${plate.in}`)
  for (const [id, gate] of Object.entries(gates)) {
    const pressed = gate.owners.filter(owner => plateOpens.get(owner)?.weighted.includes(id)).length
    const needed = gate.mode === "any" ? Math.min(pressed, 1) : pressed
    if (needed > stones) fail(terms[id].n, `${id} needs stones on ${needed} plates, the lock has ${stones}`)
  }

  const mechanics: Record<string, LockMechanic> = {}
  for (const [id, what] of declared) {
    for (const r of what.control === "sequence" ? what.steps : [what.in])
      if (!regions.has(r)) fail(what.n, `no corridor reaches ${r}`)
    if (!Object.values(gates).some(gate => gate.owners.includes(id))) refused.push(`line ${what.n}: ${id} owns no gate`)
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
      ...(plates.size > 0
        ? {
            weights: {
              plates: Object.fromEntries(
                [...plates].map(([id, plate]) => [
                  id,
                  { in: plate.in, stone: plate.stone, opens: plateOpens.get(id) ?? { weighted: [], empty: [] } },
                ])
              ),
            },
          }
        : {}),
      in: "in",
      out: "out",
    },
    drafts: [...drafts],
    refused,
  }
}
