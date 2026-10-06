import { describe, expect, it } from "vitest"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { isWeights } from "./obstacles"
import type { Direction, GridCell, RoomCell } from "./siteTypes"
import { floorLock } from "./floorLock"
import { walkFloorLock } from "./floorLockWalk"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { placeWeights } from "./weightsPlates"

const controlOf = (text: string) => {
  const result = compileLock(parseLock(text).lock, { weights: "stonePlate" })
  if (!result.ok) throw new Error(JSON.stringify(result.faults))
  return result.fragment.controls.find(isWeights)!
}

// One row of corridor, `nodes` nodes on the even columns with a connector between each two.
const corridorRow = (nodes: number, region: string): GridCell[][] => [
  Array.from({ length: nodes * 2 - 1 }, (_, c): GridCell => {
    const dirs = new Set<Direction>()
    if (c > 0) dirs.add("w")
    if (c < nodes * 2 - 2) dirs.add("e")
    return { type: "corridor", dirs, state: "reachable", region }
  }),
]

const plates = (cells: GridCell[][]) =>
  cells.flat().filter((cell): cell is RoomCell => cell.type === "room" && cell.plate !== undefined)

const TWO_PLATES = "in -[b]- out\nb plate @in\na plate @in stone"

describe("placeWeights", () => {
  it("stands each plate on its own node in its region, the record on the first", () => {
    const cells = corridorRow(4, "in")
    const control = controlOf(TWO_PLATES)
    expect(
      placeWeights(cells, [{ control, gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt")
    ).toBeUndefined()
    expect(
      plates(cells)
        .map(cell => cell.plate!.id)
        .sort()
    ).toEqual(["a", "b"])
    expect(plates(cells).filter(cell => cell.mechanism)).toHaveLength(1)
    expect(plates(cells).every(cell => cell.worksMechanism?.mechanismId === control.id)).toBe(true)
  })

  it("puts the record and the cells the same way whatever order the plates were declared in", () => {
    const placed = (text: string) => {
      const cells = corridorRow(4, "in")
      placeWeights(cells, [{ control: controlOf(text), gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt")
      return plates(cells).map(cell => ({ id: cell.plate!.id, record: cell.mechanism !== undefined }))
    }
    const forward = placed("in -[b]- out\na plate @in stone\nb plate @in")
    expect(placed("in -[b]- out\nb plate @in\na plate @in stone")).toEqual(forward)
  })

  it("names the plate whose region has no free node", () => {
    const cells = corridorRow(1, "in")
    const control = controlOf(TWO_PLATES)
    expect(placeWeights(cells, [{ control, gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt")).toEqual({
      plate: "b",
    })
  })

  it("never stands a plate on a reserved node", () => {
    const cells = corridorRow(2, "in")
    const control = controlOf(TWO_PLATES)
    expect(
      placeWeights(cells, [{ control, gate: id => ({ gateKeyId: `k:${id}` }) }], new Set(), "salt", new Set(["0,0"]))
    ).toEqual({ plate: "b" })
  })

  it("stands a plate off the main path while its region has a node there", () => {
    const cells = corridorRow(4, "in")
    const onRoute = new Set(["0,0", "0,2", "0,4"])
    placeWeights(
      cells,
      [
        {
          control: controlOf("in -[p]- out\np plate @in\nshelf plate @in stone"),
          gate: id => ({ gateKeyId: `k:${id}` }),
        },
      ],
      onRoute,
      "salt"
    )
    expect(plates(cells).some(cell => cell === cells[0][6])).toBe(true)
  })
})

describe("a stone lock on a floor", () => {
  // Every region takes `free`, so the carve has nothing to seat but the lock.
  const STONES = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"

  it("carves, and the engine's walk of it is sound", () => {
    const grid = carveLockFloor(parseLock(STONES, "stones").lock, { weights: "stonePlate" })
    expect(walkFloorLock(grid)).toMatchObject({ sound: true })
  })

  it("leaves the floor only with empty hands", () => {
    const grid = carveLockFloor(parseLock(STONES, "stones").lock, { weights: "stonePlate" })
    expect(floorLock(grid)!.leaveWith).toEqual([{ mechanism: expect.any(String), notIn: ["+ hand"] }])
  })
})
