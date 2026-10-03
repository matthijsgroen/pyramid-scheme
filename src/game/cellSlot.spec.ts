import { describe, expect, it } from "vitest"
import { cellSlot, legacyCellSlot } from "./cellSlot"
import type { FloorGrid, GridCell, RoomCell } from "./siteTypes"

// A switch's door is a room no author named: it holds no family and no chain position, and two ways out of one
// fork can lead into one region, so two doors of one section share a key as well.
const switchDoor = (ordinal: string): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(["e", "w"]),
  state: "fogged",
  sectionAddress: "lock:east",
  ordinal,
  tags: ["gate"],
  requiredKeyId: "switch:floor#0:lock:east",
  gateVariant: "floor-key",
  keyIsAuthored: true,
})

const gridOf = (...cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId: "slots",
  staircases: {},
})

describe("the slot of a switch's door", () => {
  it("tells two doors of one region apart, so they never answer to one name", () => {
    const grid = gridOf(switchDoor("3"), switchDoor("9"))
    const [a, b] = [cellSlot(grid, 0, 0), cellSlot(grid, 0, 1)]
    expect(a).not.toBeNull()
    expect(a).not.toBe(b)
  })

  it("is never the bare fallback that a second door in the section would repeat", () => {
    const grid = gridOf(switchDoor("3"))
    expect(cellSlot(grid, 0, 0)).not.toMatch(/\?$/)
  })

  it("keeps the name a save filed it under as the one it is read back from", () => {
    const grid = gridOf(switchDoor("3"))
    expect(legacyCellSlot(grid, 0, 0)).toBe("x?")
  })
})
