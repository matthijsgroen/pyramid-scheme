import { describe, expect, it } from "vitest"
import { lessonOrderFaults } from "./lessonOrder"
import type { GrownRoom, MechanismRecord } from "./siteTypes"
import { drawnFloor as floor, lever } from "./testSupport/lessonOrderFixtures"

describe(lessonOrderFaults, () => {
  it("passes a door met on the way with its lever up a side corridor", () => {
    expect(lessonOrderFaults(floor(["E-+-D-x", "  |", "  L"]))).toEqual([])
  })

  it("refuses a lever on the way to its own door", () => {
    // The door can be come to round the loop without the lever, but the short way to it runs over the lever.
    expect(lessonOrderFaults(floor(["E-L-+-D-x", "|   |", "+---+"]))).toEqual([
      "gate G: its control stands on the way to its door",
    ])
  })

  it("refuses a door that can only be reached past its lever", () => {
    expect(lessonOrderFaults(floor(["E-L-D-x"]))).toContain("gate G: its door is not seen before its control")
  })

  it("refuses a lever standing in the ring of a grown room on the way", () => {
    const grownRoom: GrownRoom = {
      rect: { top: 0, left: 1, rows: 2, cols: 3 },
      piece: { kind: "basin", top: 1, left: 2, rows: 1, cols: 1 },
    }
    expect(lessonOrderFaults(floor(["E-R-D-x", "|", "|   L", "+---+"], { grownRoom }))).toEqual([
      "gate G: its control stands in the ring of the grown room at 0,2 on the way to its door",
    ])
  })

  it("ignores a gate a board opens, which stands in its own junction", () => {
    expect(lessonOrderFaults(floor(["E-B-Y-x"]))).toEqual([])
  })

  it("counts no place that only puts a mechanism back, as a sequence's door resets it", () => {
    const sequence: MechanismRecord = {
      states: ["0", "1"],
      initial: "0",
      returnsToInitial: true,
      placedOnly: true,
      positions: [{ state: "1", gateKeyId: "G" }],
      transitions: [
        { from: "0", to: "1", at: [2, 2] },
        { from: "1", to: "0", at: [0, 4] },
      ],
    }
    expect(lessonOrderFaults(floor(["E-+-D-x", "  |", "  L"], { mechanism: sequence }))).toEqual([])
  })

  it("leaves a door open at the start alone", () => {
    expect(lessonOrderFaults(floor(["E-L-D-x"], { mechanism: { ...lever, initial: "b" } }))).toEqual([])
  })
})
