import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
// Populates the family registry, as every assembled-floor sweep relies on.
import "@/mods/registerModApps"

describe("no dressing pool can place a drop", () => {
  it("appears in no authored pool and on no assembled room", () => {
    let pools = 0
    let placed = 0
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs)) {
      levels.flat().forEach((floor, i) => {
        for (const pool of [floor.decorations ?? []]) {
          pools++
          for (const kind of pool) expect(kind).not.toMatch(/^drop/)
        }
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const row of result.grid.cells)
          for (const cell of row)
            if (cell.type === "room" && cell.decoration) {
              placed++
              expect(cell.decoration).not.toMatch(/^drop/)
            }
      })
    }
    expect(pools).toBeGreaterThan(0)
    expect(placed).toBeGreaterThan(0)
  })
})
