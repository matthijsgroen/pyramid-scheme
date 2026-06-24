import { describe, expect, it } from "vitest"
import { validateJourney, validateSite } from "./siteValidator"
import type { CellState, CorridorCell, Direction, FloorGrid, GridCell, RoomCell } from "./siteTypes"

// ─── Grid builders ────────────────────────────────────────────────────────────

const room = (
  roomType: RoomCell["roomType"],
  dirs: Direction[],
  opts?: Partial<Omit<RoomCell, "type" | "roomType" | "dirs" | "state">>
): RoomCell => ({
  type: "room",
  roomType,
  dirs: new Set(dirs),
  state: "reachable",
  ...opts,
})

const corridor = (dirs: Direction[], state: CellState = "reachable"): CorridorCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state,
})

const buildGrid = (
  spec: [number, number, GridCell][],
  entrancePos: [number, number],
  exitPos: [number, number],
  siteId = "test"
): FloorGrid => {
  const rows = Math.max(...spec.map(([r]) => r), entrancePos[0], exitPos[0]) + 1
  const cols = Math.max(...spec.map(([, c]) => c), entrancePos[1], exitPos[1]) + 1

  const cells: GridCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): GridCell => ({ type: "empty" }))
  )

  for (const [r, c, cell] of spec) {
    cells[r][c] = cell
  }

  return { cells, rows, cols, entrancePos, exitPos, siteId }
}

// ─── validateSite ─────────────────────────────────────────────────────────────

describe(validateSite, () => {
  it("passes a valid linear grid", () => {
    // entrance(0,0) -e- corridor(0,1) -e- treasure(0,2) mosaic -e- exit(0,3)
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, corridor(["w", "e"])],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("keyBeforeGate: fails when gate's key doesn't exist in the grid", () => {
    // entrance -e- gate(requiredKeyId="nonexistent") -e- exit
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "nonexistent-key", gateVariant: "floor-key" })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "keyAfterGate")).toBe(true)
    }
  })

  it("keyBeforeGate: fails when key node is behind the gate it unlocks", () => {
    // entrance -e- gate(requiredKeyId="key-chest") -e- key-chest(tombKey keyId="key-chest") -e- exit
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "key-chest", gateVariant: "floor-key" })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "tombKey", keyId: "key-chest" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "keyAfterGate")).toBe(true)
    }
  })

  it("keyBeforeGate: passes when key is reachable on a branch before the gate", () => {
    // entrance(0,0) has dirs ["e","s"]
    // key-branch(1,0): tombKey, dirs ["n"]
    // gate(0,1): requiredKeyId="key-branch", dirs ["w","e"]
    // exit(0,2): dirs ["w"]
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e", "s"])],
        [1, 0, room("treasure", ["n"], { reward: { type: "tombKey", keyId: "key-branch" } })],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "key-branch", gateVariant: "floor-key" })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: fails when a fork leads only to puzzle nodes", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("puzzle", ["n"])],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "allBlandFork")).toBe(true)
    }
  })

  it("noAllBlandFork: passes when a fork has at least one treasure branch", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("treasure", ["n"], { reward: { type: "hieroglyphs" } })],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: passes when a fork has a gate branch", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("gate", ["n"], { requiredKeyId: "tomb-key-external", gateVariant: "tomb-key" })],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: passes when a fork has a stairhead branch", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("stairhead", ["n"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("keyBeforeGate: tomb-key gate is not validated (key lives off-floor)", () => {
    // tomb-key gate with no matching key on this floor — should still pass
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "tomb-key-external", gateVariant: "tomb-key" })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("mosaicReachable: fails when mosaic is unreachable even with all keys", () => {
    // mosaic is in a disconnected cell — not reachable via any path
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("exit", ["w"])],
        [0, 2, room("treasure", [], { reward: { type: "mosaicPiece" } })],
      ],
      [0, 0],
      [0, 1]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicMissing")).toBe(true)
    }
  })
})

// ─── validateJourney ──────────────────────────────────────────────────────────

describe(validateJourney, () => {
  const gridWithMapPiece = (siteId: string): FloorGrid =>
    buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("treasure", ["w", "e"], { reward: { type: "mapPiece" } })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3],
      siteId
    )

  const gridWithoutMapPiece = (siteId: string): FloorGrid =>
    buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("puzzle", ["w", "e"])],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3],
      siteId
    )

  it("passes when exactly one site has a map piece and all have mosaic", () => {
    const grids = [gridWithMapPiece("site-1"), gridWithoutMapPiece("site-2")]
    expect(validateJourney(grids)).toEqual({ valid: true })
  })

  it("mapPieceMissing: fails when no site has a map piece", () => {
    const grids = [gridWithoutMapPiece("site-1"), gridWithoutMapPiece("site-2")]
    const result = validateJourney(grids)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceMissing")).toBe(true)
    }
  })

  it("mapPieceDuplicate: fails when two sites have a map piece", () => {
    const grids = [gridWithMapPiece("site-1"), gridWithMapPiece("site-2")]
    const result = validateJourney(grids)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceDuplicate")).toBe(true)
    }
  })

  it("mapPieceNotSealReachable: fails when map piece is behind a gate", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e", "s"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "tomb-key" })],
        [0, 2, room("treasure", ["w"], { reward: { type: "mapPiece" } })],
        [1, 0, room("treasure", ["n", "e"], { reward: { type: "mosaicPiece" } })],
        [1, 1, room("exit", ["w"])],
      ],
      [0, 0],
      [1, 1],
      "site-1"
    )
    const result = validateJourney([grid])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceNotSealReachable")).toBe(true)
    }
  })

  it("mosaicMissing: fails when a site has no mosaic room", () => {
    const noMosaic = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("treasure", ["w", "e"], { reward: { type: "mapPiece" } })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2],
      "site-1"
    )
    const result = validateJourney([noMosaic])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicMissing")).toBe(true)
    }
  })

  it("mosaicDuplicate: fails when a site has two mosaic rooms", () => {
    const twoMosaics = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("treasure", ["w", "e"], { reward: { type: "mapPiece" } })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 4, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 4],
      "site-1"
    )
    const result = validateJourney([twoMosaics])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicDuplicate")).toBe(true)
    }
  })
})
