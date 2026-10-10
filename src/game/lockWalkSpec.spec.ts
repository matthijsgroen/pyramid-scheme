import { describe, expect, it } from "vitest"
import { checkLockSpec, entering, reachableStates, walkLock } from "./lockWalk"
import { walkSpecOf, isStretch, WEIGHTS, needsFace, openAtStart, readable } from "./lockWalkSpec"
import { parseLock } from "./lockNotation"
import { solveLock } from "./lockReview"
import { barriersOf } from "./lockAuthoring"
import { progressState, spoiledState } from "./sequence"

const compiled = (text: string) => {
  const { lock, drafts } = parseLock(text)
  return walkSpecOf(lock, drafts)
}

const MIRROR_FORK = `
  in -[Y]- leftLower -[S1]- s2
  in -[Y]- rightLower -[S1:a]- s1
  in -[S2]- out
  s1 >> leftLower >> in
  s2 >> s1
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

describe("walkSpecOf", () => {
  it("compiles a mirror fork to a well-formed lock that walks sound", () => {
    expect(checkLockSpec(compiled(MIRROR_FORK))).toBeUndefined()
    expect(walkLock(compiled(MIRROR_FORK))).toEqual({ sound: true, states: expect.any(Number) })
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

  it("steps on a tile by entering its region, resets only beside its door, and keeps done", () => {
    const P = compiled(SEQUENCE).mechanisms.P
    expect(P.entries).toContainEqual({ from: progressState(0), to: progressState(1), at: "in" })
    expect(P.entries).toContainEqual({ from: progressState(1), to: progressState(2), at: "hall" })
    expect(P.entries).toContainEqual({ from: progressState(2), to: progressState(3), at: "in" })
    expect(P.entries).toContainEqual({ from: progressState(0), to: spoiledState(0, 1), at: "hall" })
    expect(P.transitions).toContainEqual({ from: spoiledState(0, 1), to: progressState(0), at: "hall" })
    expect([...P.transitions, ...P.entries!].filter(t => t.from === progressState(3))).toEqual([])
    expect(new Set(P.transitions.map(t => t.at))).toEqual(new Set(["hall", "out"]))
    expect(walkLock(compiled(SEQUENCE)).sound).toBe(true)
  })

  const TWO_ROOMS = "in -- a\nin -- b\nin -[P]- out\nP sequence a b reset in-out"

  it("does nothing when a tile already walked in order is entered again", () => {
    const spec = compiled(TWO_ROOMS)
    const again = entering(spec, "in", { region: "a", config: { P: progressState(1) } })
    expect(again.config.P).toBe(progressState(1))
  })

  it("spoils the run when a tile ahead of the one due is entered", () => {
    const spec = compiled(TWO_ROOMS)
    expect(entering(spec, "in", { region: "b", config: { P: progressState(0) } }).config.P).toBe(spoiledState(0, 1))
  })

  it("never steps on the tile of the region the walk starts in until it is entered", () => {
    const found = reachableStates(compiled("in -- a\nin -[P]- out\nP sequence in a reset in-out"))
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    expect(found.order[0].config.P).toBe(progressState(0))
    expect(found.order.some(state => state.region === "a" && state.config.P === spoiledState(0, 1))).toBe(true)
  })

  it("steps on every tile a route passes through, so a far tile behind a later one is never walked in order", () => {
    expect(walkLock(compiled("in -- mid\nmid -- far\nin -[P]- out\nP sequence mid far reset in-out")).sound).toBe(true)
    expect(walkLock(compiled("in -- mid\nmid -- far\nin -[P]- out\nP sequence far mid reset in-out"))).toEqual({
      sound: false,
      failure: { type: "goalUnreachable", label: "sequence P" },
    })
  })

  it("gives a fork rest plus one state per gate, any to any", () => {
    const Y = compiled(MIRROR_FORK).mechanisms.Y
    expect(Y.states).toEqual(["rest", "in-leftLower", "in-rightLower"])
    expect(Y.transitions).toHaveLength(6)
  })

  it("never moves a draft and opens nothing with it", () => {
    const spec = compiled("in -[G]- out")
    expect(spec.mechanisms.G).toEqual({ states: ["draft"], initial: "draft", opens: { draft: [] }, transitions: [] })
    expect(walkLock(spec)).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("never climbs a gate-then-drop corridor from below: the stretch past the gate only falls", () => {
    const spec = compiled("in -- out\nin -[H]- >> pit\npit -- out\nH toggle @in")
    expect(spec.oneWays).toEqual([{ from: "in|pit#1.1", to: "pit" }])
    expect(Object.values(spec.gates).filter(gate => gate.from === "pit" || gate.to === "pit")).toEqual([
      expect.objectContaining({ from: "pit", to: "out" }),
    ])
  })

  it("walks a << corridor one way, from the region on the right onto the stretch beside its gate", () => {
    const spec = compiled("in -- out\nin -[H]- << pit\npit -- out\nH toggle @in")
    expect(spec.oneWays).toEqual([{ from: "pit", to: "in|pit#1.1" }])
    expect(spec.gates["in-pit"]).toMatchObject({ from: "in", to: "in|pit#1.1" })
  })

  it("walks two gated corridors on one pair as two ways", () => {
    const spec = compiled("in -[A]- out\nin -[B]- out\nA toggle @in\nB toggle @in")
    expect(spec.gates["in-out"]).toMatchObject({ from: "in", to: "out", owners: ["A"] })
    expect(spec.gates["in-out#2"]).toMatchObject({ from: "in", to: "out", owners: ["B"] })
    expect(solveLock(spec)!.actions).toBe(1)
  })

  it("walks a drop no connection names as a corridor of its own, so the pit it falls into strands", () => {
    const { lock } = parseLock("in -- out\nin >> pit")
    const unnamed = { ...lock, connections: lock.connections.filter(connection => !("between" in connection)) }
    expect(unnamed.connections).toHaveLength(1)
    expect(walkLock(walkSpecOf(unnamed))).toMatchObject({ sound: false, failure: { type: "strands" } })
  })

  it("holds a drop no connection names before a barred region it lands in", () => {
    const { lock } = parseLock("in -- out\nin >> hall\nhall -[S]\nS toggle @in")
    const unnamed = {
      ...lock,
      connections: lock.connections.filter(connection => !barriersOf(connection).some(id => id in lock.oneWays!)),
    }
    const found = reachableStates(walkSpecOf(unnamed))
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    const inHall = found.order.filter(state => state.region === "hall")
    expect(inHall.length).toBeGreaterThan(0)
    expect(inHall.every(state => state.config.S === "b")).toBe(true)
  })

  it("names a stretch by the two regions it lies between", () => {
    expect(readable("stuck in in|hall#0.1")).toBe("stuck in between in and hall")
  })
})

describe("what a lock starts as", () => {
  it("reports the gates open at the start", () => {
    expect(openAtStart(parseLock(MIRROR_FORK).lock)).toEqual(["rightLower-s1"])
    expect(openAtStart(parseLock(LANTERNS).lock)).toEqual([])
  })

  it("asks a face of an every-gate with several owners, and of nothing else", () => {
    expect(needsFace(parseLock(LANTERNS).lock)).toEqual([{ gate: "in-out", owners: ["L1", "L2", "L3", "L4"] }])
    expect(needsFace(parseLock("in -[A|B]- out\nA toggle @in\nB toggle @in").lock)).toEqual([])
  })
})

describe("a region gate on the way in", () => {
  it("is the last step into the region, so a drop with a gate after it can be taken while it is shut", () => {
    const result = walkLock(compiled("in >> -[sl:wet]- R\nR -- out\nin -- out\nR -[sl:wet]\nsl toggle @in dry wet"))
    expect(result).toMatchObject({ sound: false, failure: { type: "strands" } })
  })

  it("stops a drop that lands straight in the barred region from being taken at all", () => {
    expect(walkLock(compiled("in >> R\nR -- out\nin -- out\nR -[sl:wet]\nsl toggle @in dry wet")).sound).toBe(true)
  })
})

describe("readable", () => {
  it("leaves out the owner every bare corridor shares", () => {
    expect(readable("from hall, Y at rest, · at open, nothing reaches the way out")).toBe(
      "from hall, Y at rest, nothing reaches the way out"
    )
  })
})

describe("weights", () => {
  const TWO_STONES = `
    in -- yard
    yard -[door]- vault
    yard -[e1+e2]- out
    door plate @yard
    e1 plate @yard
    e2 plate @yard
    ledge plate @yard stone
    alcove plate @vault stone
  `
  const carrying = (config: Record<string, string>) => /hand/.test(Object.values(config).join())

  it("walks the two-stone vault sound: one stone holds the door while the other is fetched", () => {
    expect(walkLock(compiled(TWO_STONES))).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("can never bring both stones out when the vault's plate stands inside it", () => {
    const inside = TWO_STONES.replace("door plate @yard", "door plate @vault stone").replace(
      "ledge plate @yard stone",
      "ledge plate @yard"
    )
    expect(walkLock(compiled(inside))).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("lets nobody through a narrow passage with a stone in hand", () => {
    const found = reachableStates(
      compiled("in -[unladen]- hall\nhall -- out\nin -[p]- out\np plate @hall\nshelf plate @in stone")
    )
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    expect(found.order.some(state => state.region === "hall" && carrying(state.config))).toBe(false)
  })

  it("lets nobody take a drop with a stone in hand", () => {
    const found = reachableStates(compiled("in -- yard\nyard >> hall\nhall -- out\nshelf plate @yard stone"))
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    expect(found.order.some(state => state.region === "hall")).toBe(true)
    expect(found.order.some(state => state.region === "hall" && carrying(state.config))).toBe(false)
  })

  it("never lets a stone leave by the way out", () => {
    expect(compiled("in -- out\nshelf plate @in stone").emptyHands).toEqual([{ mechanism: WEIGHTS, notIn: ["+ hand"] }])
  })

  it("opens an :empty way by lifting the stone off its plate, and keeps it shut while every plate is full", () => {
    expect(walkLock(compiled("in -[p:empty]- out\np plate @in stone\nshelf plate @in"))).toEqual({
      sound: true,
      states: expect.any(Number),
    })
    expect(walkLock(compiled("in -[p:empty]- out\np plate @in stone\nshelf plate @in stone"))).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
  })

  it("opens a barred region while its plate holds a stone", () => {
    const vault = "in -- hall\nhall -- vault\nvault -- out\nvault -[p]\np plate @hall\nshelf plate @in stone"
    expect(walkLock(compiled(vault))).toEqual({ sound: true, states: expect.any(Number) })
    expect(walkLock(compiled(vault.replace("vault -[p]", "vault -[p:empty]")))).toEqual({
      sound: true,
      states: expect.any(Number),
    })
  })

  it("opens a plate's gate at the start when a stone already rests on it", () => {
    expect(openAtStart(parseLock("in -[p]- out\np plate @in stone").lock)).toEqual(["in-out"])
  })
})
