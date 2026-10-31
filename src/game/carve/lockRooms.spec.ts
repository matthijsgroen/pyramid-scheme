import { describe, expect, it } from "vitest"
import { walkFloorLock } from "../floorLockWalk"
import { freeRegions } from "../lockAuthoring"
import { parseLock } from "../lockNotation"
import { parsePrefab } from "../prefabNotation"
import { roomPlaceOf } from "../roomShape"
import type { FloorConfig, FloorGrid, PrefabRoom, RoomCell } from "../siteTypes"
import { BINDING } from "../testSupport/lockFixtures"
import { assembleFloor } from "./assembleFloor"
import { prepOf } from "./carveFixtures"
import { roomAsks } from "./reserveRooms"

// A made-up shrine, 5 by 5 inside, a door place on every side and its lever's place in a corner.
const SHRINE = parsePrefab(
  `room shrine
tier starter
layout
# # # d # # #
# m . . . . #
# . . . . . #
d . . . . . d
# . . . . . #
# . . . . s #
# # # d # # #
m mechanism
s stop`,
  "shrine"
)

// A made-up crossing, 3 by 3 inside, a basin on its centre and a door place in the middle of every wall.
const CROSSING = parsePrefab(
  `room crossing
tier starter
layout
# # d # #
# . . . #
d . b s d
# . . . #
# # d # #
b floor basin
s stop`,
  "crossing"
)

const lockFloor = (text: string, central = 1, room = "shrine", prefab = SHRINE): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: freeRegions(parseLock(text, "made").lock) }],
  realisations: BINDING,
  prefabs: { [room]: prefab },
  prefabPlacements: [{ room, min: 1, max: 1, central }],
})

const LEVER_IN_HALL = "in -- hall\nhall -[A]- out\nA toggle @hall"
const FOUR_WAY_HUB = "in -- hub\nhub -- out\nhub -- a\nhub -[A]- b\nA toggle @a"

const carved = (config: FloorConfig, seed: number): FloorGrid => {
  const result = assembleFloor("site", config, seed)
  if (!result.success) throw new Error(JSON.stringify(result.reasons))
  return result.grid
}

const roomNamed = (grid: FloorGrid, name: string) => {
  const [found] = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type !== "empty" && cell.prefabRoom?.name === name
        ? [{ r, c, cell: cell as RoomCell, room: cell.prefabRoom as PrefabRoom }]
        : []
    )
  )
  return found
}
const shrineOf = (grid: FloorGrid) => roomNamed(grid, "shrine")

const SEEDS = [3, 11, 29]

describe("a lock region laid as a designed room", { timeout: 120_000 }, () => {
  it("a lock region becomes the room and the lock walk passes", () => {
    for (const seed of SEEDS) {
      const grid = carved(lockFloor(LEVER_IN_HALL), seed)
      const shrine = shrineOf(grid)
      expect(shrine.cell.region).toBe("made.hall")
      expect(walkFloorLock(grid)).toEqual({ sound: true, states: expect.any(Number) })
    }
  })

  it("the region's lever stands on the room's mechanism place", () => {
    for (const seed of SEEDS) {
      const { cell, room } = shrineOf(carved(lockFloor(LEVER_IN_HALL), seed))
      expect(cell.mechanism).toBeDefined()
      const [mi, mj] = room.mirrored ? [1, 5] : [1, 1]
      expect(room.nodeArt).toEqual([room.rect.top + mi - 1, room.rect.left + mj - 1])
    }
  })

  it("a hub region with four ways becomes a room with four door places in use", () => {
    for (const seed of SEEDS) {
      const grid = carved(lockFloor(FOUR_WAY_HUB), seed)
      const { cell, room } = shrineOf(grid)
      expect(cell.region).toBe("made.hub")
      expect(room.doors).toHaveLength(4)
      expect(walkFloorLock(grid)).toEqual({ sound: true, states: expect.any(Number) })
    }
  })

  it("a room joins its doors through its own floor: no lattice passage runs inside it", () => {
    for (const seed of SEEDS) {
      const grid = carved(lockFloor(FOUR_WAY_HUB, 1, "crossing", CROSSING), seed)
      const { room } = roomNamed(grid, "crossing")
      const { top, left, rows, cols } = room.rect
      for (let r = top; r < top + rows; r++)
        for (let c = left; c < left + cols; c++) {
          expect(grid.cells[r][c].type, `seed ${seed} ${r},${c}`).not.toBe("empty")
          expect(["inner", "node"], `seed ${seed} ${r},${c}`).toContain(roomPlaceOf(grid, r, c))
        }
      expect(walkFloorLock(grid)).toEqual({ sound: true, states: expect.any(Number) })
      expect(room.doors).toHaveLength(4)
    }
  })

  it("a drop end is never offered to a room", () => {
    const config = lockFloor("in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in")
    const asks = roomAsks(prepOf({ ...config, prefabPlacements: [{ room: "shrine", min: 0, max: 9, central: 0.5 }] }))
    const regions = asks.map(ask => ("region" in ask.at ? ask.at.region : undefined))
    expect(regions).not.toContain("made.pit")
    expect(regions.some(region => region?.includes("ledge"))).toBe(false)
    expect(regions.sort()).toEqual(["made.in", "made.out"])
  })
})
