import { describe, expect, it } from "vitest"
import { regionsOf } from "@/game/floorLock"
import { assembleFloor } from "@/game/siteAssembler"
import type { Direction, FloorGrid, RoomCell } from "@/game/siteTypes"
import { anyOuterDoorFloor } from "@/game/testSupport/barrierOrderFixtures"
import { refusal } from "./carveSeedSearch"

const KEY = (id: string) => `obstacle:test#0#0:${id}`
const SEEDS = Array.from({ length: 40 }, (_, n) => n + 1)
const at = (r: number, c: number) => `${r},${c}`
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const rooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "room" ? [{ r, c, cell }] : [])))

// The room cells standing in the ground between the outer door and the inner one.
const stretchRooms = (grid: FloorGrid): { r: number; c: number; cell: RoomCell; ground: string }[] => {
  const { of } = regionsOf(grid)
  const doors = ["ironDoor", "sandDoor"].map(id => rooms(grid).find(({ cell }) => cell.requiredKeyId === KEY(id))!)
  const beside = (door: { r: number; c: number; cell: RoomCell }) =>
    new Set([...door.cell.dirs].flatMap(dir => of.get(at(door.r + MOVES[dir][0], door.c + MOVES[dir][1])) ?? []))
  const [ground] = [...beside(doors[0])].filter(id => beside(doors[1]).has(id))
  return rooms(grid).flatMap(({ r, c, cell }) =>
    of.get(at(r, c)) === ground && cell.requiredKeyId === undefined && cell.roomType !== "portal"
      ? [{ r, c, cell, ground }]
      : []
  )
}

// A mechanism standing in one room of the stretch that holds the outer door open while it is armed.
const withHolder = (grid: FloorGrid, at: { r: number; c: number }, returnsToInitial: boolean): FloorGrid => ({
  ...grid,
  cells: grid.cells.map((row, r) =>
    row.map((cell, c) =>
      r === at.r && c === at.c && cell.type === "room"
        ? {
            ...cell,
            mechanism: {
              states: ["armed", "spent"],
              initial: "armed",
              returnsToInitial,
              positions: [{ state: "armed", gateKeyId: KEY("ironDoor"), mode: "any" as const }],
            },
          }
        : cell
    )
  ),
})

const accepted = (grid: FloorGrid) => refusal({ success: true, grid, attempt: 0 })

describe("a floor the player can be shut in on between two barriers is refused before it is baked", () => {
  const carved = SEEDS.flatMap(seed => {
    const result = assembleFloor("test", anyOuterDoorFloor(), seed)
    return result.success ? [{ seed, grid: result.grid }] : []
  })
  const withRoomBetween = carved.flatMap(({ seed, grid }) => {
    const [first] = stretchRooms(grid)
    return first ? [{ seed, grid, first }] : []
  })

  it("carves the floor and stands a room between the doors on at least one seed", () => {
    expect(carved.length).toBeGreaterThan(0)
    expect(withRoomBetween.length).toBeGreaterThan(0)
  })

  it("accepts every carve of the floor as authored", () => {
    for (const { seed, grid } of carved) expect(accepted(grid), `seed ${seed}`).toBeNull()
  })

  it("refuses the carve once a room between the doors can shut the outer one for good", () => {
    for (const { seed, grid, first } of withRoomBetween)
      expect(accepted(withHolder(grid, first, false)), `seed ${seed}`).toMatchObject({
        criterion: "lock walks sound",
        detail: expect.stringContaining(`from ${first.ground},`),
      })
  })

  it("accepts the same carve when that room can be set back, so being between the doors is only a wait", () => {
    for (const { seed, grid, first } of withRoomBetween)
      expect(accepted(withHolder(grid, first, true)), `seed ${seed}`).toBeNull()
  })
})
