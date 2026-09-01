import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { revealAll } from "@/game/gridNavigation"
import type { FloorGrid } from "@/game/siteTypes"
import { buildRoomClaims, wallItemsFor } from "./SiteMapView"

// The pools authored per rank (spec/*.ts) only mean something if props actually land on rooms. This
// is the one check that the whole chain — tier constraint → floor config → assembler → cell — holds.
describe("authored decoration pools reach real rooms", () => {
  it("places props on the generated world's floors", () => {
    let floorsWithPool = 0
    let placed = 0
    const kinds = new Set<string>()

    // A SiteConfig is one site: an array of levels, each an array of floors.
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 8)) {
      levels.flat().forEach((floor, i) => {
        if (floor.decorations?.length) floorsWithPool++
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const row of result.grid.cells) {
          for (const cell of row) {
            if (cell.type === "room" && cell.decoration) {
              placed++
              kinds.add(cell.decoration)
            }
          }
        }
      })
    }

    expect(floorsWithPool).toBeGreaterThan(0)
    expect(placed).toBeGreaterThan(0)
    // More than one kind, and no single kind taking nearly everything: which prop a room draws is
    // picked by where the room is. A per-pool counter passed the first two assertions and still put
    // a crate in every fork in the world, because each section carries its own pool literal.
    expect(kinds.size).toBeGreaterThan(2)
  })

  it("draws the whole pool, not just its first entry", () => {
    const counts = new Map<string, number>()
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 8)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const row of result.grid.cells) {
          for (const cell of row) {
            if (cell.type === "room" && cell.decoration) {
              counts.set(cell.decoration, (counts.get(cell.decoration) ?? 0) + 1)
            }
          }
        }
      })
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    const commonest = Math.max(...counts.values())
    expect(commonest / total).toBeLessThan(0.6)
  })
})

describe("props stay out of the way", () => {
  // A prop stands in the room, never in the way through it. A claimed CORRIDOR is a real passage —
  // the approach to a gate, absorbed into the junction's footprint — and anchoring on the first claim
  // of any kind put 6 props in 142 down the middle of a walkway, for the player to walk through.
  it("never stands a prop on a cell the player walks", () => {
    const walkedOn: string[] = []
    let props = 0

    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 12)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const [key] of buildRoomClaims(result.grid).decorationAt) {
          props++
          const [r, c] = key.split(",").map(Number)
          // A claim may reach one cell outside the grid; anything off-grid is void by definition.
          const cell = result.grid.cells[r]?.[c] ?? { type: "empty" as const }
          if (cell.type !== "empty") walkedOn.push(`${siteId}:${i} ${key} (${cell.type})`)
        }
      })
    }

    expect(props).toBeGreaterThan(0)
    expect(walkedOn).toEqual([])
  })
})

// Wall items are placed like props and drawn nowhere near them, so they need their own check: the
// chain tier constraint → floor config → assembler → cell, and then the render-time anchor that puts
// one in a face band of the room's own footprint.
describe("authored wall-item pools reach real walls", () => {
  const wallItems = (limit: number) => {
    const items: Array<{ item: ReturnType<typeof wallItemsFor>[number]; grid: FloorGrid; owner: string }> = []
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, limit)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        // Fully explored: a wall item hangs in a face band, and an unexplored cell has no band —
        // fog reads as unlit passage. What is being checked here is the placement, not the fog.
        const grid = revealAll(result.grid)
        const claims = buildRoomClaims(grid)
        for (const item of wallItemsFor(grid, claims)) {
          items.push({ item, grid, owner: claims.claimedBy.get(`${item.row},${item.col}`) ?? "" })
        }
      })
    }
    return items
  }

  it("hangs items on the generated world's floors, across the pool", () => {
    const counts = new Map<string, number>()
    for (const { item } of wallItems(12)) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)

    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(0)
    // Which item a room hangs is picked by WHERE the room is, the same as its prop — so a rank's
    // whole pool shows up rather than every room in the world carrying its first entry.
    expect(counts.size).toBeGreaterThan(1)
    expect(Math.max(...counts.values()) / total).toBeLessThan(0.85)
  })

  it("hangs each item inside its own room's footprint", () => {
    const strays: string[] = []
    for (const { item, grid, owner } of wallItems(8)) {
      const own = grid.cells[item.row]?.[item.col]
      const isOwnCell = own?.type === "room" && own.wallDecoration === item.kind
      if (!isOwnCell && !owner) strays.push(`${grid.siteId} ${item.row},${item.col} ${item.kind}`)
    }
    expect(strays).toEqual([])
  })
})
