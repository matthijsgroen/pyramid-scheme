import { describe, expect, it } from "vitest"
import { carvedFloorDigest } from "@/data/tierFingerprints"
import { parsePrefab } from "../prefabNotation"
import type { FloorConfig, FloorGrid, GridCell, PrefabRoom, RoomCell, SideSection } from "../siteTypes"
import { assembleFloor } from "./assembleFloor"
import { plainFloor } from "./carveFixtures"
import { ringFault, type ReservedBlock } from "./reserveRooms"

const HALL = parsePrefab(
  `room hall
tier starter
layout
# # # d # # d # #
# . . . . . . . #
# . p . p . p . #
d . . . . . s . d
# . p . p . p . #
# . . . . . . . #
# # # d # # d # #
p floor pillar
s stop`,
  "hall"
)

const VAULT = parsePrefab(
  `room vault
tier starter
layout
# # # d # # #
# . . . . . #
# . p . p . #
d . . c . . d
# . p . p . #
# s . . . . #
# # # d # # #
p floor pillar
c chest
s stop`,
  "vault"
)

const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

const carved = (config: FloorConfig, seed = 7): FloorGrid => {
  const result = assembleFloor("site", config, seed)
  if (!result.success) throw new Error(JSON.stringify(result.reasons))
  return result.grid
}

const roomsOf = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type !== "empty" && cell.prefabRoom ? [{ r, c, cell, room: cell.prefabRoom as PrefabRoom }] : []
    )
  )

const hubFloor = plainFloor({
  pathPuzzles: 1,
  sideSections: [side(), side(), side()],
  prefabs: { hall: HALL },
  prefabPlacements: [{ room: "hall", min: 1, max: 1, central: 1 }],
})

describe("reserveRooms", () => {
  it("a pinned room reserves its block and the main path runs through its doors", () => {
    const grid = carved(plainFloor({ pathPuzzles: 2, prefabs: { hall: HALL }, prefabsByIndex: { 1: "hall" } }))
    const [hall] = roomsOf(grid)
    expect(hall.room.name).toBe("hall")
    expect(hall.cell).toMatchObject({ type: "room", pathIndex: 1, pinnedPrefab: "hall" })
    expect(hall.cell.dirs.size).toBe(2)
    for (const dir of hall.cell.dirs) {
      const [r, c] = hall.room.doors[dir]!
      expect(grid.cells[r][c].type).toBe("corridor")
    }
  })

  it("a side path's end room carries the path's reward and gate", () => {
    const reward = { type: "mapPiece", tombId: "some_tomb" }
    const grid = carved(
      plainFloor({
        sideSections: [
          side({ pathPuzzles: 1, gate: { type: "tomb-key", wardKeyId: "starter_a_1" }, endReward: reward }),
        ],
        prefabs: { vault: VAULT },
        prefabPlacements: [{ room: "vault", min: 1, max: 1, central: 0 }],
      })
    )
    const [vault] = roomsOf(grid)
    expect(vault.room.name).toBe("vault")
    const end = vault.cell as RoomCell
    expect(end).toMatchObject({ roomType: "encounter", reward, sectionAddress: "s0" })
    expect(end.tags).toContain("treasure")
    const [ci, cj] = [3, 3]
    expect(vault.room.nodeArt).toEqual([vault.room.rect.top + ci - 1, vault.room.rect.left + cj - 1])
    const gates = grid.cells.flat().filter((cell: GridCell) => cell.type === "room" && cell.gateVariant === "tomb-key")
    expect(gates).toEqual([expect.objectContaining({ sectionAddress: "s0", requiredKeyId: "starter_a_1" })])
  })

  it("side paths branch off a central hall through the door places the main path leaves free", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const [hall] = roomsOf(carved(hubFloor, seed))
      const fork = hall.cell as RoomCell
      expect(fork.roomType).toBe("fork")
      expect(fork.exits?.filter(exit => exit.kind === "main")).toHaveLength(2)
      expect(fork.exits?.filter(exit => exit.kind === "side").length).toBeGreaterThan(0)
      expect(Object.keys(hall.room.doors).sort()).toEqual(fork.exits?.map(exit => exit.dir).sort())
    }
  })

  it("a floor whose min room never fits refuses naming the room", () => {
    const result = assembleFloor(
      "site",
      plainFloor({ prefabs: { hall: HALL }, prefabPlacements: [{ room: "hall", min: 1, max: 1, central: 1 }] }),
      7
    )
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reasons).toContainEqual(expect.objectContaining({ type: "prefabsNotPlaced", room: "hall" }))
  })

  it("the same seed carves the same reserved floor twice", () => {
    expect(carvedFloorDigest(carved(hubFloor, 11))).toBe(carvedFloorDigest(carved(hubFloor, 11)))
  })

  it("a floor naming no prefab carves as before", () => {
    const grid = carved(
      plainFloor({
        pathPuzzles: 2,
        sideSections: [side({ pathPuzzles: 1 }), side({ gate: { type: "tomb-key", wardKeyId: "starter_a_1" } })],
      })
    )
    expect(carvedFloorDigest(grid)).toBe("b4c5fe50715aa838")
  })
})

describe("ringFault", () => {
  // A 3×3 room at 2..4 with its ring at 1..5, its anchor at 2,2 and a corridor running east out of it.
  const block: ReservedBlock = {
    room: "den",
    prefab: { cell: [2, 2], name: "den", layout: 0, mirrored: false, pick: {} },
    variant: 0,
    mirrored: false,
    rect: { top: 2, left: 2, rows: 3, cols: 3 },
    anchor: [2, 2],
    rays: [],
    nodes: new Set(["2,2", "2,4", "4,2", "4,4"]),
    on: { main: 1 },
  }
  const floor = (extra: Record<string, GridCell>): FloorGrid => ({
    siteId: "site",
    rows: 9,
    cols: 9,
    entrancePos: [2, 8],
    exitPos: [2, 8],
    staircases: {},
    cells: Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c): GridCell => {
        const key = `${r},${c}`
        if (extra[key]) return extra[key]
        if (r === 2 && c >= 2) return { type: "corridor", dirs: new Set(["e", "w"]), state: "fogged" }
        return { type: "empty" }
      })
    ),
  })
  const room = (fields: Partial<RoomCell>): GridCell => ({
    type: "room",
    roomType: "encounter",
    dirs: new Set(["e", "w"]),
    state: "fogged",
    ...fields,
  })

  it("a block's ring holding a room or a gate refuses the attempt", () => {
    expect(ringFault(floor({}), [block])).toBeUndefined()
    expect(ringFault(floor({ "2,4": room({ family: "sumplete" }) }), [block])).toEqual({
      retry: [
        expect.objectContaining({ type: "prefabsNotPlaced", room: "den", why: "a room stands at 2,4 in its ring" }),
      ],
    })
    expect(ringFault(floor({ "2,5": room({ requiredKeyId: "k", tags: ["gate"] }) }), [block])).toEqual({
      retry: [expect.objectContaining({ room: "den", why: "a gate stands at 2,5 in its ring" })],
    })
    expect(ringFault(floor({ "2,6": room({ roomType: "fork", dirs: new Set(["e", "w", "s"]) }) }), [block])).toEqual({
      retry: [expect.objectContaining({ room: "den", why: "the room at 2,6 reaches into its ring" })],
    })
  })

  it("two blocks whose rings meet refuse the attempt", () => {
    const beside = { ...block, room: "vault", anchor: [2, 6] as [number, number], rect: { ...block.rect, left: 6 } }
    expect(ringFault(floor({}), [block, beside])).toEqual({
      retry: [expect.objectContaining({ room: "den", why: "its ring meets room vault" })],
    })
  })
})
