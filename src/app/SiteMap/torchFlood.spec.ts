import { describe, expect, it } from "vitest"
import { floorLock } from "@/game/floorLock"
import { walkFloorLock } from "@/game/floorLockWalk"
import { legalTargets } from "@/game/mechanismDoors"
import { homeOf, TWO_TORCHES } from "@/game/testSupport/torchFloodFixtures"
import { carved } from "./torchFlood.testing"

describe("a torch on a floor", () => {
  const { grid } = carved(TWO_TORCHES)

  it("carries the region it stands in and one move, off to on, made where it stands", () => {
    const { at, cell } = homeOf(grid, "B")
    expect(cell.mechanism?.torch).toEqual({ region: "flood.hall" })
    expect(cell.mechanism?.placedOnly).toBe(true)
    expect(cell.mechanism?.transitions).toEqual([{ from: "off", to: "on", at }])
  })

  it("a torch that starts lit can still be lit from off, and a lit one offers nothing", () => {
    const record = homeOf(grid, "B").cell.mechanism!
    expect(record.initial).toBe("on")
    expect(legalTargets(record, "off")).toEqual(["on"])
    expect(legalTargets(record, "on")).toEqual([])
  })

  it("an activator's record carries no torch", () => {
    const { grid: keyFloor } = carved(
      "in -- hub -- hall\nhub -[K]- out\nhall -[S:a]\nS toggle @hub\nK activator @hall\nin ?\nhub ?\nhall ?\nout ?"
    )
    expect(homeOf(keyFloor, "K").cell.mechanism?.torch).toBeUndefined()
  })

  it("the floor's solver lists both torches, covered by the hall's barrier doors, and walks the floor sound", () => {
    const spec = floorLock(grid)!
    expect(spec.torches).toHaveLength(2)
    for (const { coveredBy } of spec.torches!) expect(coveredBy.length).toBeGreaterThan(0)
    expect(walkFloorLock(grid)?.sound).toBe(true)
  })
})
