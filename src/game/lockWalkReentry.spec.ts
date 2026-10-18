import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"
import type { ParsedLock } from "./lockNotation"
import { walkSpecOf } from "./lockWalkSpec"
import { INPUT_HELD, INPUT_MISSING, MAX_LOCK_STATES, reachableStates, walkLock } from "./lockWalk"
import type { LockSpec, LockState } from "./lockWalk"
import { walkFloorLock } from "./floorLockWalk"
import { mulberry32 } from "./random"
import type { Direction, FloorGrid, GridCell } from "./siteTypes"

const REENTRY = { reentry: true }
const specOf = (...lines: string[]) => {
  const { lock, drafts } = parseLock(lines.join("\n"), "made")
  return walkSpecOf(lock, drafts)
}
const keyOf = (state: LockState) =>
  `${state.region}|${Object.entries(state.config)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, s]) => `${id}=${s}`)
    .join(",")}`
const statesOf = (spec: LockSpec, reentry = false) => {
  const found = reachableStates(spec, MAX_LOCK_STATES, { reentry })
  if (found === "tooLarge") throw new Error("too large")
  return found
}

// The lever in the hall shuts the way back to the entrance while it opens the side room, and must be thrown back
// before the way out opens: walking out always leaves it set right, coming back from the side room does not.
const sideRoomTrap = ["in -[S:a]- hall", "hall -[S:a]- out", "hall -[S]- side", "S toggle @hall", "side $"]

describe("coming back at the entrance", () => {
  it("refuses a lock that strands only once the player comes back at the entrance", () => {
    const spec = specOf(...sideRoomTrap)
    expect(walkLock(spec).sound).toBe(true)
    expect(walkLock(spec, MAX_LOCK_STATES, REENTRY)).toEqual({
      sound: false,
      failure: { type: "strands", at: { region: "in", config: { S: "b" } } },
    })
  })

  it("still reads a chamber a mechanism sealed as a strand: re-entry is no way out of a trap", () => {
    const spec = specOf("in -- hall", "hall -- out", "hall -[K:off]- vault", "K activator @vault", "vault $")
    for (const options of [{}, REENTRY]) {
      const walked = walkLock(spec, MAX_LOCK_STATES, options)
      expect(walked.sound === false && walked.failure).toEqual({
        type: "strands",
        at: { region: "vault", config: { K: "on", "·": "open" } },
      })
    }
  })

  it("reports the same of a lock sound without it and sound with it", () => {
    const spec = specOf("in -- hall", "hall -[H]- out", "hall -- side", "H toggle @side", "side ?")
    expect(walkLock(spec, MAX_LOCK_STATES, REENTRY)).toEqual(walkLock(spec))
    expect(walkLock(spec).sound).toBe(true)
  })

  it("is off unless asked for, on a floor as on a lock", () => {
    const dirs = new Set<Direction>(["e", "w"])
    const room = (extra: Partial<Extract<GridCell, { type: "room" }>>): GridCell => ({
      type: "room",
      roomType: "encounter",
      dirs,
      state: "fogged",
      pathIndex: 1,
      ...extra,
    })
    const corridor: GridCell = { type: "corridor", dirs, state: "fogged" }
    const cells = [
      corridor,
      room({ sectionAddress: "s1", tags: ["gate"], requiredKeyId: "web:sun" }),
      corridor,
      room({ sectionAddress: "s3" }),
    ]
    const grid: FloorGrid = {
      cells: [cells],
      rows: 1,
      cols: cells.length,
      entrancePos: [0, 0],
      exitPos: [0, cells.length - 1],
      siteId: "reentry",
      staircases: {},
    }
    expect(walkFloorLock(grid, REENTRY)).toEqual(walkFloorLock(grid))
    expect(walkFloorLock(grid)?.sound).toBe(true)
  })
})

// RANDOM MADE-UP LOCKS, for the claims the walk's exactness rests on (docs/instructions/sand-pyramid.md, "Why the floor
// walk is exact"). Levers, an activator, drops and up to two outside inputs, no torch and no tile, so the entrance
// state of a config is the config at `in`.
const REGIONS = ["in", "a", "b", "c", "out"]
const randomLock = (seed: number): ParsedLock | undefined => {
  const random = mulberry32(seed)
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]
  const owners = ["T1", "T2", "K", "A", "B"]
  const used = new Set<string>()
  const term = () => {
    const owner = pick(owners)
    used.add(owner)
    return ["T1", "T2"].includes(owner) && random() < 0.3 ? `${owner}:a` : owner
  }
  const lines: string[] = []
  const linked = new Set<string>()
  const join = (from: string, to: string) => {
    linked.add(from).add(to)
    const roll = random()
    if (roll < 0.3) return lines.push(`${from} -- ${to}`)
    if (roll < 0.4) return lines.push(`${from} >> ${to}`)
    const terms = random() < 0.3 ? [term(), term()] : [term()]
    if (new Set(terms.map(t => t.split(":")[0])).size < terms.length) return lines.push(`${from} -[${terms[0]}]- ${to}`)
    return lines.push(`${from} -[${terms.join(random() < 0.5 ? "+" : "|")}]- ${to}`)
  }
  for (let i = 1; i < REGIONS.length; i++) join(pick(REGIONS.slice(0, i)), REGIONS[i])
  for (let extra = Math.floor(random() * 3); extra > 0; extra--) {
    const from = pick(REGIONS)
    const to = pick(REGIONS)
    if (from !== to) join(from, to)
  }
  const barred = pick(["a", "b", "c"])
  if (random() < 0.3) lines.push(`${barred} -[${term().split(":")[0]}]`)
  const places = [...linked]
  for (const owner of used) {
    if (owner === "A" || owner === "B") lines.push(`${owner} outside`)
    else if (owner === "K") lines.push(`K activator @${pick(places.filter(p => p !== barred))}`)
    else lines.push(`${owner} toggle @${pick(places.filter(p => p !== barred))}`)
  }
  try {
    const parsed = parseLock(lines.join("\n"), `random${seed}`)
    return parsed.refused.length === 0 && parsed.drafts.length === 0 ? parsed : undefined
  } catch {
    return undefined
  }
}
const SEEDS = Array.from({ length: 600 }, (_, n) => n + 1)
const randomSpecs = SEEDS.flatMap(seed => {
  const parsed = randomLock(seed)
  return parsed ? [{ seed, spec: walkSpecOf(parsed.lock), inputs: parsed.lock.inputs ?? [] }] : []
})

describe("the walk's exactness, on random made-up locks", () => {
  it("draws enough locks, with inputs among them, to say anything", () => {
    expect(randomSpecs.length).toBeGreaterThan(150)
    expect(randomSpecs.filter(({ inputs }) => inputs.length > 0).length).toBeGreaterThan(50)
  })

  it("offers every input's arrival from every state that misses it, changing nothing else", () => {
    for (const { seed, spec, inputs } of randomSpecs) {
      const { order, edges } = statesOf(spec)
      order.forEach((state, n) => {
        const next = new Set(edges[n].map(to => keyOf(order[to])))
        for (const input of inputs)
          if (state.config[input] === INPUT_MISSING)
            expect(
              next.has(keyOf({ region: state.region, config: { ...state.config, [input]: INPUT_HELD } })),
              `seed ${seed}`
            ).toBe(true)
      })
    }
  })

  it("re-entry only adds states: every state of the walk without it is a state of the walk with it", () => {
    let grown = 0
    for (const { seed, spec } of randomSpecs) {
      const without = new Set(statesOf(spec).order.map(keyOf))
      const withIt = new Set(statesOf(spec, true).order.map(keyOf))
      for (const key of without) expect(withIt.has(key), `seed ${seed}`).toBe(true)
      if (withIt.size > without.size) grown++
    }
    expect(grown, "locks re-entry adds a state to").toBeGreaterThan(10)
  })

  it("walks arrivals and re-entry in either order: the states are closed under both", () => {
    for (const { seed, spec, inputs } of randomSpecs) {
      const { order } = statesOf(spec, true)
      const keys = new Set(order.map(keyOf))
      for (const state of order) {
        expect(keys.has(keyOf({ region: spec.in, config: state.config })), `seed ${seed}`).toBe(true)
        for (const input of inputs)
          expect(
            keys.has(keyOf({ region: state.region, config: { ...state.config, [input]: INPUT_HELD } })),
            `seed ${seed}`
          ).toBe(true)
      }
    }
  })

  it("never calls a lock sound with re-entry that is not sound without it, and refuses some that are", () => {
    let refused = 0
    for (const { seed, spec } of randomSpecs) {
      const [withIt, without] = [walkLock(spec, MAX_LOCK_STATES, REENTRY).sound, walkLock(spec).sound]
      if (withIt) expect(without, `seed ${seed}`).toBe(true)
      if (without && !withIt) refused++
    }
    expect(refused, "locks sound without re-entry and refused with it").toBeGreaterThan(0)
  })

  it("keeps a state stranded with every input held a strand, whatever arrived before", () => {
    let stranded = 0
    for (const { seed, spec, inputs } of randomSpecs) {
      if (inputs.length === 0) continue
      const { order, edges } = statesOf(spec)
      // A state from which no walk, arrivals included, reaches the way out.
      const backwards: number[][] = order.map(() => [])
      edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))
      const finishes = new Set(order.flatMap((state, n) => (state.region === spec.out ? [n] : [])))
      const queue = [...finishes]
      for (let at = 0; at < queue.length; at++)
        for (const from of backwards[queue[at]])
          if (!finishes.has(from)) {
            finishes.add(from)
            queue.push(from)
          }
      const allHeld = order.some((state, n) => !finishes.has(n) && inputs.every(i => state.config[i] === INPUT_HELD))
      if (!allHeld) continue
      stranded++
      const walked = walkLock(spec)
      expect(walked.sound ? undefined : walked.failure.type, `seed ${seed}`).toMatch(/^(strands|unsolvable)$/)
    }
    expect(stranded, "locks with a state stranded once every input is held").toBeGreaterThan(0)
  })
})
