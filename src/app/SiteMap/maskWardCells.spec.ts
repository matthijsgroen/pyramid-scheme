import { describe, expect, it } from "vitest"
import type { Direction, GridCell } from "@/game/siteTypes"
import { floorFrom } from "./floorFixtures.testing"
import { maskWardCells } from "./useAssembledFloor"

const ward = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "made-up",
  dirs: new Set(dirs),
  state: "fogged",
  gateVariant: "tomb-key",
  requiredKeyId: "made-up-key",
})

describe("the inspector's floor without ward keys", () => {
  it("keeps the ward gate and masks only what lies past it", () => {
    const floor = floorFrom(["E..R", "   .", "   W", "   .", "   R"], { W: ward })
    const masked = maskWardCells(floor)
    expect(masked.cells[2][3].type).toBe("room")
    expect(masked.cells[3][3].type).toBe("empty")
    expect(masked.cells[4][3].type).toBe("empty")
    expect(masked.cells[0][3].type).not.toBe("empty")
  })
})
