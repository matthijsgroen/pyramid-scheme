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
    expect(lock.mechanics.sluice).toEqual({
      control: "toggle",
      in: "in",
      starts: "dry",
      opens: { dry: [], wet: ["hall:barred"] },
    })
  })

  it("reads activators and any", () => {
    const { lock } = parseLock("in -[T|K]- out\nT activator @in\nK activator @in")
    expect(lock.gates["in-out"]).toEqual({ from: "in", to: "out", owners: ["T", "K"], mode: "any" })
    expect(lock.mechanics.T).toEqual({
      control: "activator",
      in: "in",
      starts: "off",
      opens: { off: [], on: ["in-out"] },
    })
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
    [
      "in -- hall\nhall -[P]- out\nP sequence in hall reset nowhere",
      "line 3: reset nowhere names no gate between two regions",
    ],
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
    ["in -[Y]- in\nin -- out\nY fork @in", "line 1: a join leads from in to in"],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text)).toThrow(message)
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
    ledge plate @vault
    A stone @door
    B stone @ledge
  `

  it("reads plates and stones beside the Lock, and plates on gates are not drafts", () => {
    const { lock, drafts } = parseLock(TWO_STONES)
    expect(drafts).toEqual([])
    expect(lock.weights).toEqual({
      plates: {
        door: { in: "yard", opens: { weighted: ["yard-vault"], empty: [] } },
        e1: { in: "yard", opens: { weighted: ["yard-out"], empty: [] } },
        e2: { in: "yard", opens: { weighted: ["yard-out"], empty: [] } },
        ledge: { in: "vault", opens: { weighted: [], empty: [] } },
      },
      stones: { A: { on: "door" }, B: { on: "ledge" } },
    })
    expect(lock.gates["yard-out"]).toEqual({ from: "yard", to: "out", owners: ["e1", "e2"] })
  })

  it("reads :empty as a way that opens while the plate holds no stone", () => {
    const { lock } = parseLock("in -[p:empty]- out\np plate @in\nA stone @p")
    expect(lock.weights!.plates.p.opens).toEqual({ weighted: [], empty: ["in-out"] })
  })

  it("keeps a plate that opens nothing, as a place to set a stone", () => {
    const { lock } = parseLock("in -- out\nshelf plate @in\nA stone @shelf")
    expect(lock.weights!.plates.shelf.opens).toEqual({ weighted: [], empty: [] })
  })

  it("reads unladen as a condition on the stones, not as an owner to place", () => {
    const { drafts } = parseLock("in -[unladen]- hall\nhall -- out\nshelf plate @in\nA stone @shelf")
    expect(drafts).toEqual([])
  })

  it.each([
    [
      "in -[p1+p2]- out\np1 plate @in\np2 plate @in\nshelf plate @in\nA stone @shelf",
      "line 1: in-out needs stones on 2 plates, the lock has 1",
    ],
    ["in -- out\nA stone @in", "line 2: A rests on in, which is no plate"],
    ["in -- out\np plate @cellar", "line 2: no corridor reaches cellar"],
    ["in -[p:held]- out\np plate @in\nA stone @p", "line 1: plate p has no state held"],
    ["in -- out\np plate @in\nA stone @p\nB stone @p", "line 4: B rests on p, which A already holds"],
    ["in -[unladen]- out", "line 1: unladen asks about stones, and the lock has none"],
    ["in -- out\np plate @in\nA stone @p\nA stone @p", "line 4: A is placed twice"],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text)).toThrow(message)
  })
})
