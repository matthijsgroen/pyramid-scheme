import { beforeEach, describe, expect, it, vi } from "vitest"

describe("detector screens", () => {
  beforeEach(() => vi.resetModules())
  const Screen = () => null

  it("holds a detector only with a part and a registered screen", async () => {
    const { heldDetectors, registerDetectorScreen } = await import("./detectorScreens")
    registerDetectorScreen("compass", { title: () => "Compass", Screen })
    expect(heldDetectors({ compass: 1, corridor: 2 })).toEqual(["compass"])
    expect(heldDetectors({ compass: 0, corridor: 2 })).toEqual([])
  })

  it("stands a held detector at the map table beside the camp's own finds", async () => {
    const { withDetectors } = await import("./detectorScreens")
    expect(withDetectors({ mapTable: ["map"] }, ["compass"])).toEqual({ mapTable: ["map", "compassOnMap", "compass"] })
    const found = { fire: ["stoneRing"] }
    expect(withDetectors(found, [])).toBe(found)
  })
})
