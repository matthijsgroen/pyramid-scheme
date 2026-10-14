import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { getFamilyPlugin, type FamilyContext } from "@/app/families/familyRegistry"
import { processionOrder, type ProcessionPuzzle } from "@/mods/puzzle/game/procession/procession"

describe("the procession door family", () => {
  it("builds its board one bar per step, at the door's tier, with one order to read", () => {
    const plugin = getFamilyPlugin("procession-door")
    expect(plugin?.meta.ownerMod).toBe("puzzle")
    const ctx = {
      difficulty: "junior",
      boardIndex: 0,
      gateFace: {
        markers: [],
        sequences: [
          {
            id: "P",
            tiles: [1, 2, 3, 4].map(glyph => ({ glyph, status: "unwalked" })),
            hidden: { address: "main#0/P", read: false, walked: [false, false, false, false] },
          },
        ],
      },
    } as unknown as FamilyContext
    const board = plugin!.generate(7, ctx) as ProcessionPuzzle
    expect(board.bars).toHaveLength(4)
    expect(processionOrder(board)).toHaveLength(4)
  })
})
