import { describe, it, expect } from "vitest"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"

const floor = {
  pathPuzzles: 2,
  difficulty: "junior" as const,
  end: "treasure" as const,
  exitOrStaircase: "exit" as const,
  sideSections: [
    {
      pathPuzzles: 1,
      difficulty: "junior" as const,
      end: "treasure" as const,
      gate: { type: "floor-key" as const, keyId: "witness:junior_2#2:east", ownerMod: "witnessDoor" },
    },
    {
      pathPuzzles: 1,
      difficulty: "junior" as const,
      end: "treasure" as const,
      gate: { type: "floor-key" as const, color: "red" as const },
    },
  ],
}

describe("dropUnownedAuthoring", () => {
  it("drops a gate whose owning mod is not registered", () => {
    const dropped = dropUnownedAuthoring(floor, new Set(["mosaic"]))
    expect(dropped.sideSections[0].gate).toBeUndefined()
  })

  it("keeps a gate whose owning mod is registered", () => {
    const kept = dropUnownedAuthoring(floor, new Set(["witnessDoor"]))
    expect(kept.sideSections[0].gate).toEqual(floor.sideSections[0].gate)
  })

  it("never touches untagged authoring, which is core's", () => {
    const dropped = dropUnownedAuthoring(floor, new Set())
    expect(dropped.sideSections[1].gate).toEqual(floor.sideSections[1].gate)
  })
})
