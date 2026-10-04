import { describe, expect, it } from "vitest"
import { checkLockSpec, reachableStates, walkLock } from "./lockWalk"
import { walkSpecOf, isStretch, needsFace, notBuildable, openAtStart, readable } from "./lockWalkSpec"
import { parseLock } from "./lockNotation"

const compiled = (text: string) => {
  const { lock, drafts } = parseLock(text)
  return walkSpecOf(lock, drafts)
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

describe("walkSpecOf", () => {
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
    A stone @yard
    B stone @vault
  `

  it("walks the two-stone vault sound: one stone holds the door while the other is fetched", () => {
    expect(walkLock(compiled(TWO_STONES))).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("can never bring both stones out when the vault's plate stands inside it", () => {
    const inside = TWO_STONES.replace("door plate @yard", "door plate @vault").replace("A stone @yard", "A stone @door")
    expect(walkLock(compiled(inside))).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("lets nobody through a narrow passage with a stone in hand", () => {
    const found = reachableStates(
      compiled("in -[unladen]- hall\nhall -- out\nin -[p]- out\np plate @hall\nA stone @in")
    )
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    expect(
      found.order.some(state => state.region === "hall" && /A@hand/.test(Object.values(state.config).join()))
    ).toBe(false)
  })

  it("never lets a stone leave by the way out", () => {
    const found = reachableStates(compiled("in -- out\nA stone @in"))
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    expect(found.order.some(state => state.region === "out" && /A@hand/.test(Object.values(state.config).join()))).toBe(
      false
    )
  })

  it("opens a plate's gate at the start when a stone already rests on it", () => {
    expect(openAtStart(parseLock("in -[p]- out\np plate @in\nA stone @p").lock)).toEqual(["in-out"])
  })
})
