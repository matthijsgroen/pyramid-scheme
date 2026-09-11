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
  }, 30000)

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
  }, 30000)
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
  }, 30000)
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
  }, 30000)

  it("hangs each item inside its own room's footprint", () => {
    const strays: string[] = []
    for (const { item, grid, owner } of wallItems(8)) {
      const own = grid.cells[item.row]?.[item.col]
      const isOwnCell = own?.type === "room" && own.wallDecoration === item.kind
      if (!isOwnCell && !owner) strays.push(`${grid.siteId} ${item.row},${item.col} ${item.kind}`)
    }
    expect(strays).toEqual([])
  }, 30000)
})

// A prop sprite is a cell plus a face band tall, so it leans a band into the cell to its north. That
// headroom is what gives a statue height, and it belongs on WALL: over floor it hangs above ground the
// player walks, and the explorer dot — drawn later — passes in front of the statue's head instead of
// behind it. So the prop cell is chosen for having void above it (buildRoomClaims). Half the props in
// the world stood the other way before that preference existed.
describe("a prop stands against a wall", () => {
  // Measured PER ROOM KIND, because the two kinds of room have different amounts of wall to offer and
  // one bound over both hides that. A dead end is a pocket with stone on three sides; a FORK is a
  // junction with passages leaving in three directions, so it often has no claimed cell with void above
  // it at all. Lumped together they read 6.2%, which says nothing about either.
  const openBehindByOwner = (): Map<string, { props: number; open: number }> => {
    const tally = new Map<string, { props: number; open: number }>()
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 12)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        const grid = revealAll(result.grid)
        const claims = buildRoomClaims(grid)
        for (const [key] of claims.decorationAt) {
          const [or, oc] = (claims.claimedBy.get(key) ?? key).split(",").map(Number)
          const owner = grid.cells[or]?.[oc]
          const kind = owner?.type === "room" ? owner.roomType : "unknown"
          const [r, c] = key.split(",").map(Number)
          const north = grid.cells[r - 1]?.[c]
          const row = tally.get(kind) ?? { props: 0, open: 0 }
          tally.set(kind, { props: row.props + 1, open: row.open + (north && north.type !== "empty" ? 1 : 0) })
        }
      })
    }
    return tally
  }

  it("stands a pocket's prop against stone, all but never otherwise", () => {
    const tally = openBehindByOwner()
    const ends = tally.get("encounter")!
    const portals = tally.get("portal")!
    expect(ends.props).toBeGreaterThan(0)
    // 0.3% and 1.1% measured. A room whose only spare cell has floor above it still gets its prop — a
    // prop is better than a bare chamber, and one leaning statue is cheaper than a second claim rule.
    expect(ends.open / ends.props).toBeLessThan(0.02)
    expect(portals.open / portals.props).toBeLessThan(0.05)
  }, 30000)

  it("still leans most of a junction's props on stone, though it has less to lean on", () => {
    const f = openBehindByOwner().get("fork")!
    expect(f.props).toBeGreaterThan(0)
    // 24.4% measured, up from 14.9% when furniture was allowed to stand OUTSIDE the grid: an
    // out-of-bounds cell reads as void, so it always looked like it had wall behind it, and the
    // preference was being satisfied by props in the map's margin. Keeping them on the floor is worth
    // the difference. Bounded here so a placement change that gave up on the preference altogether
    // still shows as a failure rather than as art.
    expect(f.open / f.props).toBeLessThan(0.3)
  }, 30000)
})

describe("a hole and a way down are not the same room", () => {
  // A `pit` is a shaft cut in the floor; a staircase is a way to the floor below. Drawn in one room they
  // say the same thing and only one of them is real — the player can take the stair and cannot take the
  // pit. Seven rooms in the world stood one beside the other before this.
  it("never stands a pit in a room that holds a staircase", () => {
    const offenders: string[] = []
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const [r, row] of result.grid.cells.entries())
          for (const [c, cell] of row.entries())
            if (cell.type === "room" && cell.stairId && cell.decoration === "pit")
              offenders.push(`${siteId} floor ${i} (${r},${c})`)
      })
    }
    expect(offenders).toEqual([])
  }, 30000)
})
