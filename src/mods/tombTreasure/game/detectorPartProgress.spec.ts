import { describe, expect, it } from "vitest"
import { detectorPartProgress, TREASURE_PERKS } from "./treasurePerks"

const compassParts = Object.keys(TREASURE_PERKS).filter(id => TREASURE_PERKS[id].type === "compass")

describe("detectorPartProgress", () => {
  it("counts the part being claimed even before it is held", () => {
    expect(detectorPartProgress(compassParts[0], () => false)).toEqual({ count: 1, total: compassParts.length })
  })

  it("counts the parts already held, in any order", () => {
    const last = compassParts[compassParts.length - 1]
    expect(detectorPartProgress(last, id => id === compassParts[0])?.count).toBe(2)
  })

  it("names no progress for a treasure that is not a detector part", () => {
    const other = Object.keys(TREASURE_PERKS).find(id => TREASURE_PERKS[id].type === "max-health")!
    expect(detectorPartProgress(other, () => true)).toBeUndefined()
  })
})
