import { describe, expect, it } from "vitest"
import { freeRegions, nestSpotBusy, nestSpotFaults, nestSpotOf } from "./lockAuthoring"
import { compileLock } from "./lockCompile"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"
import { BINDING } from "./testSupport/lockFixtures"

// MADE-UP LOCKS WITH A NEST SPOT, never catalogue ones: a test pins the rule, `yarn run lock` checks the catalogue.

/** A lever lock whose way from `in` to `hall` is where another lock may be spliced in. */
const NESTING = "in -&> hall\nhall -[L]- out\nL toggle @in\nin ?\nhall ?\nout ?"

describe("a lock's nest spot", () => {
  it("is the one connection written -&>, read from left to right", () => {
    const { lock, refused } = parseLock(NESTING, "nesting")
    expect(refused).toEqual([])
    expect(lock.nestSpot).toEqual({ from: "in", to: "hall" })
    expect(lock.connections).toContainEqual(["in", "hall"])
  })

  it.each(["in -&- hall", "hall <&- in"])(
    "refuses %s by name: the spot is written with its arrow, in -&> hall",
    text => {
      expect(() => parseLock(`${text}\nhall -- out`, "spelled")).toThrow("line 1: a nest spot is written a -&> b")
    }
  )

  it.each(["in -- hall\nin -&> hall", "in -&> hall\nin -- hall"])(
    "is a corridor, so a second corridor beside it is refused: %j",
    text => {
      expect(() => parseLock(`${text}\nhall -- out`, "twin")).toThrow(
        "line 2: in and hall are already joined by a corridor on line 1"
      )
    }
  )

  it("is absent from a lock that writes none", () => {
    expect(parseLock("in -- hall\nhall -- out").lock.nestSpot).toBeUndefined()
  })

  it("may stand off the route, where the designer puts it", () => {
    const { lock, refused } = parseLock("in -- out\nin -&> side", "aside")
    expect(refused).toEqual([])
    expect(nestSpotFaults(lock)).toEqual([])
  })

  it("is one per lock: a second is refused by name on its own line, and the first is kept", () => {
    const { lock, refused } = parseLock("in -&> a\na -&> b\nb -- out", "twice")
    expect(refused).toEqual(["line 2: nestSpotsRepeated: a lock has one nest spot, and in -&> a is one already"])
    expect(lock.nestSpot).toEqual({ from: "in", to: "a" })
  })

  it.each([
    ["a gate", "in -&> -[L]- hall\nhall -- out\nL toggle @in", ["in-hall"]],
    ["a drop", "in -&> >> hall\nhall -- out\nhall -- in2\nin2 -- in", ["in>hall"]],
  ])(
    "ignores a spot on a connection that also carries %s: the lock has none, and nothing is refused",
    (_, text, barriers) => {
      const { lock, refused } = parseLock(text, "busy")
      expect(refused).toEqual([])
      expect(nestSpotFaults(lock)).toEqual([])
      expect(nestSpotOf(lock)).toBeUndefined()
      expect(nestSpotBusy(lock)).toEqual(barriers)
    }
  )

  it("carves a busy spot's connection as written without &", () => {
    const busy = "in -&> -[L]- hall\nhall -- out\nL toggle @in"
    expect(compileLock(parseLock(busy, "n").lock, BINDING, { namespace: "n" })).toEqual(
      compileLock(parseLock(busy.replace("-&> ", ""), "n").lock, BINDING, { namespace: "n" })
    )
  })

  it("refuses a spot naming a connection the lock does not have, as written in JSON", () => {
    const lock = { ...parseLock(NESTING, "n").lock, nestSpot: { from: "in", to: "out" } }
    expect(nestSpotFaults(lock)).toEqual([{ type: "nestSpotOnNoConnection", from: "in", to: "out" }])
    const result = compileLock(lock, BINDING)
    expect(result.ok === false && result.faults).toContainEqual({
      type: "nestSpotOnNoConnection",
      from: "in",
      to: "out",
    })
  })

  it("compiles as a plain corridor where nothing nests, so the lock carves as if it were written --", () => {
    const spot = compileLock(parseLock(NESTING, "n").lock, BINDING, { namespace: "n" })
    const plain = compileLock(parseLock(NESTING.replace("-&>", "--"), "n").lock, BINDING, { namespace: "n" })
    expect(spot).toEqual(plain)
  })

  it("survives a bench floor, which frees every region", () => {
    expect(freeRegions(parseLock(NESTING, "n").lock).nestSpot).toEqual({ from: "in", to: "hall" })
  })

  it("is drawn as & on its corridor", () => {
    expect(drawLock(parseLock(NESTING, "n").lock)).toContain("&")
    expect(drawLock(parseLock(NESTING.replace("-&>", "--"), "n").lock)).not.toContain("&")
  })
})
