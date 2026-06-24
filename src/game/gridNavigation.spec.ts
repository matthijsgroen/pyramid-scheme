import { describe, expect, it } from "vitest"
import { completeCell, getOwnedKeys, revealAll } from "./gridNavigation"
import type { Direction, FloorGrid } from "./siteTypes"

// Simple 1×3 grid: [entrance room -e- corridor -e- exit room]
const makeLinearGrid = (): FloorGrid => ({
  siteId: "test",
  rows: 1,
  cols: 3,
  entrancePos: [0, 0],
  exitPos: [0, 2],
  cells: [
    [
      { type: "room", roomType: "puzzle", dirs: new Set<Direction>(["e"]), state: "reachable" },
      { type: "corridor", dirs: new Set<Direction>(["w", "e"]), state: "fogged" },
      { type: "room", roomType: "exit", dirs: new Set<Direction>(["w"]), state: "fogged" },
    ],
  ],
})

describe(getOwnedKeys, () => {
  it("returns empty set when no completed tombKey rooms", () => {
    const grid = makeLinearGrid()
    expect(getOwnedKeys(grid).size).toBe(0)
  })

  it("returns key from completed tombKey treasure room", () => {
    const grid: FloorGrid = {
      siteId: "test",
      rows: 1,
      cols: 1,
      entrancePos: [0, 0],
      exitPos: [0, 0],
      cells: [
        [
          {
            type: "room",
            roomType: "treasure",
            dirs: new Set<Direction>(),
            state: "completed",
            reward: { type: "tombKey", keyId: "my-key" },
          },
        ],
      ],
    }
    const keys = getOwnedKeys(grid)
    expect(keys.has("my-key")).toBe(true)
  })
})

describe(completeCell, () => {
  it("marks the cell as completed", () => {
    const grid = makeLinearGrid()
    const updated = completeCell(grid, 0, 0)
    const cell = updated.cells[0][0]
    expect(cell.type).toBe("room")
    if (cell.type === "room") expect(cell.state).toBe("completed")
  })

  it("corridor becomes visible after completing adjacent room", () => {
    const grid = makeLinearGrid()
    const updated = completeCell(grid, 0, 0)
    const corridor = updated.cells[0][1]
    expect(corridor.type).toBe("corridor")
    if (corridor.type === "corridor") expect(corridor.state).toBe("visible")
  })

  it("exit room becomes reachable after completing corridor is visible (BFS continues)", () => {
    const grid = makeLinearGrid()
    const updated = completeCell(grid, 0, 0)
    // After completing entrance: corridor visible, exit room reachable
    const exitCell = updated.cells[0][2]
    expect(exitCell.type).toBe("room")
    if (exitCell.type === "room") expect(exitCell.state).toBe("reachable")
  })

  it("gate stays visible (not reachable) when key not owned", () => {
    const gateGrid: FloorGrid = {
      siteId: "test",
      rows: 1,
      cols: 2,
      entrancePos: [0, 0],
      exitPos: [0, 1],
      cells: [
        [
          { type: "room", roomType: "puzzle", dirs: new Set<Direction>(["e"]), state: "reachable" },
          {
            type: "room",
            roomType: "gate",
            dirs: new Set<Direction>(["w"]),
            state: "fogged",
            requiredKeyId: "some-key",
          },
        ],
      ],
    }
    const updated = completeCell(gateGrid, 0, 0)
    const gate = updated.cells[0][1]
    expect(gate.type).toBe("room")
    if (gate.type === "room") expect(gate.state).toBe("visible")
  })
})

describe(revealAll, () => {
  it("sets all non-empty cells to reachable", () => {
    const grid = makeLinearGrid()
    const revealed = revealAll(grid)
    for (const row of revealed.cells) {
      for (const cell of row) {
        if (cell.type !== "empty") {
          expect(cell.state).toBe("reachable")
        }
      }
    }
  })
})
