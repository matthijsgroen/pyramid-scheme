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
      refused: [],
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
    ["in -[H]- out\nH toggle @cellar", "line 2: no corridor reaches cellar"],
    ["in -[A+B|C]- out", "line 1: -[A+B|C]- mixes + and |"],
    ["in -[H+H]- out\nH toggle @in", "line 1: -[H+H]- names H twice"],
    ["in -- -[H]- out", "line 1: -- is a bare corridor, exactly two dashes, and carries no items"],
    ["in -[Y]- >>", "line 1: a line starts and ends with a region"],
    ["in => out", 'line 1: cannot read "in => out"'],
    ["in -[Y]- in\nin -- out\nY fork @in", "line 1: a join leads from in to in"],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text)).toThrow(message)
  })

  it("reads a lever that opens nothing whole, and says so beside it", () => {
    const { lock, refused } = parseLock("in -[H]- out\nH toggle @in\nG toggle @in")
    expect(refused).toEqual(["line 3: G owns no gate"])
    expect(lock.mechanics.G).toEqual({ control: "toggle", in: "in", starts: "a", opens: { a: [], b: [] } })
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

  it("reads plates, full or empty, beside the Lock, and plates on gates are not drafts", () => {
    const { lock, drafts } = parseLock(TWO_STONES)
    expect(drafts).toEqual([])
    expect(lock.weights).toEqual({
      plates: {
        door: { in: "yard", stone: false, opens: { weighted: ["yard-vault"], empty: [] } },
        e1: { in: "yard", stone: false, opens: { weighted: ["yard-out"], empty: [] } },
        e2: { in: "yard", stone: false, opens: { weighted: ["yard-out"], empty: [] } },
        ledge: { in: "yard", stone: true, opens: { weighted: [], empty: [] } },
        alcove: { in: "vault", stone: true, opens: { weighted: [], empty: [] } },
      },
    })
    expect(lock.gates["yard-out"]).toEqual({ from: "yard", to: "out", owners: ["e1", "e2"] })
  })

  it("reads :empty as a way that opens while the plate holds no stone", () => {
    const { lock } = parseLock("in -[p:empty]- out\np plate @in stone")
    expect(lock.weights!.plates.p.opens).toEqual({ weighted: [], empty: ["in-out"] })
  })

  it("bars a whole region on a plate, like any other owner", () => {
    const { lock } = parseLock("in -- hall\nhall -- out\nhall -[p]\np plate @in stone")
    expect(lock.weights!.plates.p.opens.weighted).toEqual(["hall:barred"])
  })

  it.each([
    ["on a drop", "in -- yard\nyard -- out\nout -[unladen]- >> in", "line 3: a drop already takes empty hands"],
    ["beside a plate", "in -[p+unladen]- out\np plate @in", "line 1: unladen stands alone, as a narrow passage"],
    ["beside a lever", "in -[L|unladen]- out\nL toggle @in", "line 1: unladen stands alone, as a narrow passage"],
  ])("reads a lock with empty hands %s whole, and says why they are refused", (_, text, message) => {
    expect(parseLock(`${text}\nshelf plate @in stone`).refused).toEqual([message])
  })

  it("reads unladen as a condition on the stones, not as an owner to place", () => {
    const { drafts } = parseLock("in -[unladen]- hall\nhall -- out\nshelf plate @in stone")
    expect(drafts).toEqual([])
  })

  it.each([
    [
      "in -[p1+p2]- out\np1 plate @in\np2 plate @in\nshelf plate @in stone",
      "line 1: in-out needs stones on 2 plates, the lock has 1",
    ],
    ["in -- out\nA stone @in", "line 2: a stone is written on the plate it rests on: p plate @hall stone"],
    ["in -- out\np plate @cellar", "line 2: no corridor reaches cellar"],
    ["in -[p:held]- out\np plate @in stone", "line 1: plate p has no state held"],
    ["in -- hall\nhall -- out\nhall -[p]\np plate @hall stone", "line 3: p stands in hall, which it would bar"],
    ["in -[unladen]- out", "line 1: unladen asks about stones, and the lock has none"],
    [
      "in -[p:empty+q:empty+L]- out\np plate @in stone\nq plate @in stone\nL toggle @in",
      "line 1: gate in-out: its stones never open it",
    ],
    ["in -- out\np plate @in\np plate @out", "line 3: p is placed twice"],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text)).toThrow(message)
  })
})

describe("parseLock, with a region named like an object method", () => {
  it("keeps the name, without a spurious suffix", () => {
    const { lock } = parseLock("in -[T]- constructor\nconstructor -- out\nT toggle @in")
    expect(Object.keys(lock.gates)).toEqual(["in-constructor"])
  })
})

describe("a torch line", () => {
  it("reads a torch off until lit, and one lit from the start", () => {
    const { lock } = parseLock("in -[A+B:off]- out\nA torch @in\nB torch @in lit")
    expect(lock.mechanics.A).toEqual({ control: "flame", in: "in", starts: "off", opens: { off: [], on: ["in-out"] } })
    expect(lock.mechanics.B).toEqual({ control: "flame", in: "in", starts: "on", opens: { off: ["in-out"], on: [] } })
  })

  it.each(["B torch @in burning", "B torch @in lit lit", "B torch @in off on"])("refuses %s, naming the form", line => {
    expect(() => parseLock(`in -[B]- out\n${line}`)).toThrow(
      "a torch is off or lit at the start: write B torch @in lit"
    )
  })

  it("reads an activator line as an activator", () => {
    const { lock } = parseLock("in -[T]- out\nT activator @in")
    expect(lock.mechanics.T).toEqual({
      control: "activator",
      in: "in",
      starts: "off",
      opens: { off: [], on: ["in-out"] },
    })
  })
})

describe("a corridor's items", () => {
  it.each([
    ["-[A]-", undefined],
    ["--[A]--", "center"],
    ["---[A]---", "center"],
    ["-[A]--", "left"],
    ["-[A]---", "left"],
    ["---[A]-", "right"],
    ["--[A]---", "left"],
  ])("reads %s as aligned %s", (gate, side) => {
    const { lock } = parseLock(`in ${gate} out\nA toggle @in`)
    expect(lock.connections[0]).toEqual({
      between: ["in", "out"],
      barriers: ["in-out"],
      ...(side ? { align: { "in-out": side } } : {}),
    })
  })

  it("reads << as a drop from the region on its right, named by its direction of travel", () => {
    const { lock } = parseLock("in -- out\nin << pit\npit -- out")
    expect(lock.oneWays).toEqual({ "pit>in": { from: "pit", to: "in" } })
    expect(lock.connections[1]).toEqual({ between: ["in", "pit"], barriers: ["pit>in"] })
  })

  it("reads a gate before a << drop as standing beside the region the drop leads to", () => {
    const { lock } = parseLock("in -[Y]- << hall\nin -- out\nhall -- out\nY toggle @in")
    expect(lock.connections[0]).toEqual({ between: ["in", "hall"], barriers: ["in-hall", "hall>in"] })
  })

  it("reads two lines on one pair as two connections, the first written first", () => {
    const { lock, refused } = parseLock("in -[Y]- hall\nhall >> in\nhall -- out\nY toggle @in")
    expect(refused).toEqual([])
    expect(lock.connections.slice(0, 2)).toEqual([
      { between: ["in", "hall"], barriers: ["in-hall"] },
      { between: ["hall", "in"], barriers: ["hall>in"] },
    ])
  })

  it("reads two bare lines on one pair as two open corridors", () => {
    expect(parseLock("in -- out\nout -- in").lock.connections).toEqual([
      ["in", "out"],
      ["out", "in"],
    ])
  })

  it("reads a chain as two connections joined at the region between", () => {
    const { lock } = parseLock("in -- out\nin -- west\nwest >> east >> in")
    expect(lock.connections.slice(2)).toEqual([
      { between: ["west", "east"], barriers: ["west>east"] },
      { between: ["east", "in"], barriers: ["east>in"] },
    ])
  })

  it("reads a chain that comes back to a region as a second corridor on its pair", () => {
    const { lock } = parseLock("in -[X]- out -[Y]- in\nX toggle @in\nY toggle @in")
    expect(lock.connections).toEqual([
      { between: ["in", "out"], barriers: ["in-out"] },
      { between: ["out", "in"], barriers: ["out-in"] },
    ])
  })

  it("reads a line with no space between a region and an item as one with spaces", () => {
    expect(parseLock("in-[S]- >>hall\nhall -- out\nS toggle @in").lock).toEqual(
      parseLock("in -[S]- >> hall\nhall -- out\nS toggle @in").lock
    )
  })

  it("writes no align on a lock that aligns nothing", () => {
    const { lock } = parseLock("in -[A]- hall -[B]- out\nhall >> in\nA toggle @in\nB toggle @hall")
    expect(lock.connections.some(c => "between" in c && c.align !== undefined)).toBe(false)
  })

  it.each([
    ["in -[A]---[B]- out\nA toggle @in\nB toggle @in", "line 1: items on a corridor stand apart: write -[A]- -[B]-"],
    ["in -[A]->> out\nA toggle @in", "line 1: items on a corridor stand apart: write -[A]- >>"],
    ["in [A] out\nA toggle @in", "line 1: a gate stands between dashes: write -[A]-"],
    ["in -[A] out\nA toggle @in", "line 1: a gate stands between dashes: write -[A]-"],
    ["in -[A]- -- out\nA toggle @in", "line 1: -- is a bare corridor, exactly two dashes, and carries no items"],
    ["in --- out", "line 1: -- is a bare corridor, exactly two dashes, and carries no items"],
    ["in ->> out", 'line 1: cannot read "->>" on a corridor: an item is -[…]-, >>, << or -&>'],
    ["in -<<- out", 'line 1: cannot read "-<<-" on a corridor: an item is -[…]-, >>, << or -&>'],
    ["in >> -[A]- >> out\nA toggle @in", "line 1: a corridor falls once: put a region between two drops"],
    ["in >> << out", "line 1: a corridor falls once: put a region between two drops"],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text)).toThrow(message)
  })
})
