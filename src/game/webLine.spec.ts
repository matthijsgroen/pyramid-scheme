import { describe, expect, it } from "vitest"
import { isRegionGate } from "./lockAuthoring"
import { describeWhere, potKey } from "./webLine"
import type { ResolvedWeb } from "./webLine"
import { parseWeb } from "./webNotation"
import { floor, lockOf, plain, pyramid, refusalTypes, resolve, section, world } from "./webFixtures.testing"

const doorsOf = (resolved: ResolvedWeb) => resolved.doors.map(d => [d.key, describeWhere(d.at, d.where)])

// One lever per name, standing in a journey of its own, so the lines under test carry the only sand.
const levers = (...names: string[]) => ["[w9p1]", ...names.map((name, i) => `lever ${name} @${i * 10}%`)].join("\n")
const ELSEWHERE = { 9: [plain(20)] }

describe("reading a web", () => {
  it("reads blocks, activators, pots and doors, each with its line", () => {
    const web = parseWeb(
      [
        "// designed by: Tester",
        "[w1]",
        "sand by a b",
        "[w1p2]",
        "lever a @60% side",
        "key b @end",
        "b opens side @80%",
      ].join("\n")
    )
    expect(web.designedBy).toBe("Tester")
    expect(web.blocks.map(b => [b.n, b.journey, b.pyramid, b.lines.map(l => [l.n, l.type])])).toEqual([
      [2, 1, undefined, [[3, "sand"]]],
      [
        4,
        1,
        2,
        [
          [5, "activator"],
          [6, "activator"],
          [7, "opens"],
        ],
      ],
    ])
  })

  it("refuses a line it cannot read, naming the line", () => {
    expect(() => parseWeb("[w1]\nlever a\n")).toThrow(/^line 2: /)
    expect(() => parseWeb("lever a @end")).toThrow(/^line 1: a line stands in a block/)
  })
})

describe("places and the world", () => {
  it("refuses a block naming a pyramid or a journey the world lacks, naming the line", () => {
    const resolved = resolve("[w1p3]\nlever a @end\n[w2]\nlever b @end", world({ 1: [plain(4)] }))
    expect(resolved.refusals.filter(r => r.type === "placeNotInWorld").map(r => r.n)).toEqual([1, 3])
  })

  it("names the first side section hanging after a percentage by its address", () => {
    // Eleven rooms: 60% is room 6. Sections hang before rooms 3, 7 and 8.
    const on = world({
      1: [pyramid(floor(11, { sections: [section("s0", 3), section("s1", 7), section("s2", 8)] }))],
      ...ELSEWHERE,
    })
    const resolved = resolve("[w1p1]\nlever a @60% side\nsand by a", on)
    expect(resolved.activators.map(a => a.place)).toEqual(["f0.s1's end"])
  })

  it("refuses a lock region that takes no reward", () => {
    const lock = lockOf("in -- vault", "vault -- out", "vault -")
    const on = world({ 1: [pyramid(floor(3, { locks: { L: lock }, regions: ["L.in", "L.vault", "L.out"] }))] })
    expect(resolve("[w1p1]\nlever a @L.vault\nsand by a", on).refusals[0]).toMatchObject({
      type: "placeNotInWorld",
      n: 2,
    })
  })
})

describe("the line and its stops", () => {
  it("stops `sand by a b c` at a third, two thirds and the end, the sand lying from the arrival", () => {
    const resolved = resolve(`[w1p1]\nsand by a b c\n${levers("a", "b", "c")}`, world({ 1: [plain(7)], ...ELSEWHERE }))
    expect(resolved.refusals).toEqual([])
    expect(resolved.pots[0].stops.map(stop => Math.round(stop))).toEqual([33, 67, 100])
    // Seven rooms: a third is room 2, between seams 1|2 and 2|3; the tie goes toward the arrival.
    expect(doorsOf(resolved)).toEqual([
      [potKey("w1p1", 1), "w1p1 f0 seam 0|1"],
      [potKey("w1p1", 2), "w1p1 f0 seam 1|2"],
      [potKey("w1p1", 3), "w1p1 f0 seam 3|4"],
    ])
  })

  it("lands a stop on the nearest seam, a tie toward the arrival, a stair between floors no seam", () => {
    const at = (pct: number, on = world({ 1: [plain(11)], ...ELSEWHERE })) =>
      doorsOf(resolve(`[w1p1]\nsand ${pct}% 100% by a b\n${levers("a", "b")}`, on))[1][1]
    expect(at(47)).toBe("w1p1 f0 seam 4|5")
    expect(at(50)).toBe("w1p1 f0 seam 4|5")
    expect(at(56)).toBe("w1p1 f0 seam 5|6")
    // Two floors of three: 50% is the stair, between seams f0 1|2 and f1 0|1.
    expect(at(50, world({ 1: [pyramid(floor(3), floor(3))], ...ELSEWHERE }))).toBe("w1p1 f0 seam 1|2")
  })

  it("buries only the line from a pot's start, the Nth pull clearing to the Nth stop", () => {
    const resolved = resolve(
      `[w1p1]\nsand from 50%: 75% 100% by a b\n${levers("a", "b")}`,
      world({ 1: [plain(9)], ...ELSEWHERE })
    )
    expect(resolved.refusals).toEqual([])
    expect(doorsOf(resolved)).toEqual([
      [potKey("w1p1", 1), "w1p1 f0 seam 3|4"],
      [potKey("w1p1", 2), "w1p1 f0 seam 5|6"],
    ])
    // Spaced equally from the start when no stops are written.
    expect(
      resolve(`[w1p1]\nsand from 50% by a b\n${levers("a", "b")}`, world({ 1: [plain(9)], ...ELSEWHERE })).pots[0].stops
    ).toEqual([75, 100])
  })

  it("lays a pot without a start at the first seam after the arrival", () => {
    const resolved = resolve(
      `[w1p1]\nsand 75% 100% by a b\n${levers("a", "b")}`,
      world({ 1: [plain(9)], ...ELSEWHERE })
    )
    expect(doorsOf(resolved)[0]).toEqual([potKey("w1p1", 1), "w1p1 f0 seam 0|1"])
  })

  it("refuses a stop at or before the pot's start", () => {
    for (const first of ["50%", "40%"]) {
      const resolved = resolve(
        `[w1p1]\nsand from 50%: ${first} 100% by a b\n${levers("a", "b")}`,
        world({ 1: [plain(9)], ...ELSEWHERE })
      )
      expect(resolved.refusals).toEqual([expect.objectContaining({ type: "stopNotAfterFrom", n: 2 })])
    }
  })

  it("refuses a lever counted twice in one pot", () => {
    expect(
      refusalTypes(resolve(`[w1p1]\nsand by a a\n${levers("a")}`, world({ 1: [plain(9)], ...ELSEWHERE })))
    ).toEqual(["stopsMalformed"])
  })

  it("refuses two stops on one seam", () => {
    const resolved = resolve(
      `[w1p1]\nsand 10% 12% 100% by a b c\n${levers("a", "b", "c")}`,
      world({ 1: [plain(5)], ...ELSEWHERE })
    )
    expect(refusalTypes(resolved)).toContain("stopsShareSeam")
  })

  it("refuses a pyramid pot under its journey's pot", () => {
    const resolved = resolve(
      `[w1]\nsand by a\n[w1p2]\nsand by b\n${levers("a", "b")}`,
      world({ 1: [plain(4), plain(4)], ...ELSEWHERE })
    )
    expect(resolved.refusals).toEqual([expect.objectContaining({ type: "potsOverlap", n: 4 })])
  })
})

describe("a stop inside a floor lock", () => {
  const lockFloor = (lock: string[], regions: string[]) =>
    world({ 1: [pyramid(floor(regions.length, { locks: { L: lockOf(...lock) }, regions }))], ...ELSEWHERE })

  it("adds an owner under + on the lock corridor it lands on", () => {
    const on = lockFloor(
      ["in -[K+T]- hall", "hall -- out", "K toggle @in", "T toggle @in"],
      ["L.in", "L.in", "L.hall", "L.hall", "L.out"]
    )
    const resolved = resolve(`[w1p1]\nsand from 30%: 100% by a\n${levers("a")}`, on)
    expect(resolved.refusals).toEqual([])
    expect(doorsOf(resolved)).toEqual([[potKey("w1p1", 1), "w1p1 f0 L in–hall   lock corridor, owner added"]])
    const laid = resolved.laidLocks.get("w1p1 f0 L")!
    expect(laid.inputs).toEqual(["W1"])
    expect(Object.values(laid.gates).map(g => g.owners)).toEqual([["K", "T", "W1"]])
  })

  it("buries a region whole when it lands inside one", () => {
    const on = lockFloor(["in -- hall", "hall -- out"], ["L.in", "L.hall", "L.hall", "L.hall", "L.out"])
    const resolved = resolve(`[w1p1]\nsand from 50%: 100% by a\n${levers("a")}`, on)
    expect(doorsOf(resolved)).toEqual([[potKey("w1p1", 1), "w1p1 f0 L hall   region buried whole"]])
    const barrier = Object.values(resolved.laidLocks.get("w1p1 f0 L")!.gates).find(isRegionGate)
    expect(barrier).toEqual({ region: "hall", owners: ["W1"] })
  })

  it("refuses a stop on a corridor gated with |", () => {
    const on = lockFloor(
      ["in -[K|T]- hall", "hall -- out", "K toggle @in", "T toggle @in"],
      ["L.in", "L.in", "L.hall", "L.hall", "L.out"]
    )
    expect(resolve(`[w1p1]\nsand from 30%: 100% by a\n${levers("a")}`, on).refusals).toEqual([
      expect.objectContaining({ type: "frontOnAnyGate", n: 2 }),
    ])
  })

  it("binds a declared input, refuses one left unbound and a binding naming no input", () => {
    const on = lockFloor(["A outside", "in -[A]- hall", "hall -- out"], ["L.in", "L.hall", "L.out"])
    expect(resolve(`[w1p1]\nsand L.A by a\n${levers("a")}`, on).bindings).toEqual([
      expect.objectContaining({ lock: "L", input: "A", key: "web:a" }),
    ])
    expect(refusalTypes(resolve(`[w1p1]\n${levers("a")}\n[w1p1]\na opens 50%`, on))).toEqual(["inputUnbound"])
    expect(refusalTypes(resolve(`[w1p1]\nsand L.A by a\nsand L.B by b\n${levers("a", "b")}`, on))).toEqual([
      "bindingNamesNoInput",
    ])
  })

  it("refuses a fourth input, declared and added together, naming the stops", () => {
    const on = lockFloor(
      ["A outside", "B outside", "C outside", "in -[A]- hall", "hall -[B]- out", "hall -[C]- side", "side ?"],
      ["L.in", "L.in", "L.hall", "L.hall", "L.out"]
    )
    const text = `[w1p1]\nsand L.A by a\nsand L.B by a\nsand L.C by a\nsand from 30%: 100% by b\n${levers("a", "b")}`
    expect(resolve(text, on).refusals).toEqual([expect.objectContaining({ type: "outsideTooMany", n: 5 })])
  })
})

describe("stability", () => {
  it("resolves every place the same after a re-carve that keeps the pinned names", () => {
    const lock = lockOf("in -- hall", "hall -- crypt", "crypt -- out", "hall $")
    const carve = (via: string[], mouths: [number, number]) =>
      world({
        1: [
          pyramid(
            floor(6, {
              locks: { L: lock },
              regions: ["L.in", "L.in", "L.hall", "L.crypt", "L.out", "L.out"],
              via: { 2: via },
              sections: [section("s0", mouths[0]), section("vault", mouths[1])],
            })
          ),
        ],
        ...ELSEWHERE,
      })
    const text = `[w1p1]\nlever a @50% side\nlever b @L.hall\nsand from 30%: 50% 100% by a b\nb opens side @70%\n${levers("c")}\n[w1p1]\nc opens 90%`
    const placesOf = (resolved: ResolvedWeb) => [
      ...resolved.activators.map(a => `${a.name} ${a.place}`),
      ...doorsOf(resolved).map(([key, where]) => `${key} ${where}`),
    ]
    const before = resolve(text, carve([], [2, 4]))
    expect(before.refusals).toEqual([])
    expect(placesOf(resolve(text, carve(["L.hall"], [2, 5])))).toEqual(placesOf(before))
  })
})
