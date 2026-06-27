import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { validateSite } from "./siteValidator"

const basicConfig = (): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "easy",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
})

const firstPyramid = (): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "easy",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 0, difficulty: "easy", end: "treasure" },
    { pathPuzzles: 1, difficulty: "medium", end: "staircase", gate: { type: "floor-key" } },
  ],
})

const findRoom = (grid: FloorGrid, predicate: (cell: RoomCell) => boolean) => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && predicate(cell)) return { r, c, cell }
    }
  return null
}

describe(assembleFloor, () => {
  it("succeeds for a basic config with no sections", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    expect(result.success).toBe(true)
  })

  it("produces a grid that passes validateSite", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(validateSite(result.grid)).toEqual({ valid: true })
  })

  it("places goal (mosaicPiece) at grid center", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    const goal = findRoom(result.grid, c => c.reward?.type === "mosaicPiece")
    expect(goal).not.toBeNull()
    const mid = Math.floor(result.grid.rows / 2)
    expect(goal!.r).toBe(mid)
    expect(goal!.c).toBe(mid)
  })

  it("has an entrance node on the grid edge", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    const [entR, entC] = result.grid.entrancePos
    const N = result.grid.rows
    const onEdge = entR === 0 || entR === N - 1 || entC === 0 || entC === N - 1
    expect(onEdge).toBe(true)
  })

  it("is deterministic: same seed produces same grid", () => {
    const a = assembleFloor("site-1", basicConfig(), 12345)
    const b = assembleFloor("site-1", basicConfig(), 12345)
    expect(a).toEqual(b)
  })

  it("succeeds for the first pyramid config (0 main puzzles, 2 sections)", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(findRoom(result.grid, c => c.roomType === "stairhead")).not.toBeNull()
      expect(findRoom(result.grid, c => c.roomType === "gate")).not.toBeNull()
    }
  })

  it("key is reachable before the gate (validates keyBeforeGate)", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(validateSite(result.grid)).toEqual({ valid: true })
  })

  it("auto-injects an ungated section when all sections are gated with floor-key", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "easy",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "easy", end: "treasure", gate: { type: "floor-key" } }],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(findRoom(result.grid, c => c.roomType === "gate")).not.toBeNull()
      expect(findRoom(result.grid, c => c.reward?.type === "tombKey")).not.toBeNull()
      expect(validateSite(result.grid)).toEqual({ valid: true })
    }
  })

  it("places exactly pathPuzzles puzzle rooms on the main path", () => {
    for (const pathPuzzles of [0, 1, 2, 3]) {
      const config: FloorConfig = {
        pathPuzzles,
        difficulty: "easy",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [],
      }
      const result = assembleFloor("site-1", config, 42)
      expect(result.success, `pathPuzzles=${pathPuzzles} failed`).toBe(true)
      if (result.success) {
        const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && c.roomType === "puzzle")
        expect(puzzles.length, `pathPuzzles=${pathPuzzles} wrong count`).toBe(pathPuzzles)
      }
    }
  })

  it("exitOrStaircase: staircase produces a stairhead on the main path", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "easy",
      end: "treasure",
      exitOrStaircase: "staircase",
      sideSections: [],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(findRoom(result.grid, c => c.roomType === "stairhead")).not.toBeNull()
      expect(findRoom(result.grid, c => c.roomType === "exit")).toBeNull()
    }
  })

  it("tomb-key gated section produces gate with gateVariant tomb-key and no floor key", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "easy",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "easy", end: "treasure", gate: { type: "tomb-key", wardKeyId: "test_ward" } },
      ],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      const gate = findRoom(result.grid, c => c.roomType === "gate")
      expect(gate).not.toBeNull()
      expect(gate!.cell.gateVariant).toBe("tomb-key")
      // tomb-key gates don't place a key on the floor
      expect(findRoom(result.grid, c => c.reward?.type === "tombKey")).toBeNull()
    }
  })

  it("chestEvery: places hieroglyphs chests between puzzles on the main path", () => {
    const config: FloorConfig = {
      pathPuzzles: 4,
      chestEvery: 2,
      difficulty: "easy",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      const hieroglyphChests = result.grid.cells
        .flat()
        .filter(c => c.type === "room" && c.roomType === "treasure" && (c as RoomCell).reward?.type === "hieroglyphs")
      // 4 puzzles, chestEvery 2 → 2 chests (after puzzle 2 and after puzzle 4)
      expect(hieroglyphChests.length).toBe(2)
      const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && c.roomType === "puzzle")
      expect(puzzles.length).toBe(4)
      expect(validateSite(result.grid)).toEqual({ valid: true })
    }
  })

  it("property: 100 seeds × basic config all pass validation", () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = assembleFloor(`site-${seed}`, basicConfig(), seed)
      expect(result.success, `seed ${seed} failed assembly`).toBe(true)
      if (result.success) {
        const v = validateSite(result.grid)
        expect(v.valid, `seed ${seed} failed validation: ${JSON.stringify(v)}`).toBe(true)
      }
    }
  })

  it("property: 50 seeds × first pyramid config all pass validation", () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = assembleFloor(`site-${seed}`, firstPyramid(), seed)
      expect(result.success, `seed ${seed} failed assembly`).toBe(true)
      if (result.success) {
        const v = validateSite(result.grid)
        expect(v.valid, `seed ${seed} failed validation: ${JSON.stringify(v)}`).toBe(true)
      }
    }
  })
})
