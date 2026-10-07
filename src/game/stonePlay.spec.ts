import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { SHELF_AND_DOOR, TWO_STONES, plateNamed } from "./testSupport/stoneFixtures"
import { isCarrying, stoneMoveAt, stonesAt } from "./stonePlay"

const floorOf = (text: string) => carveLockFloor(parseLock(text, "stones").lock, { weights: "stonePlate" })

describe("the stones as play reads them", () => {
  it("reads a plate's arrangement as the authored start while nothing is saved", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = plateNamed(grid, "shelf")
    expect(stonesAt(grid, 0, r, c, new Map())?.state).toBe("stones.shelf")
  })

  it("offers a lift on a plate holding a stone with empty hands, and a set-down on an empty one when carrying", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const shelf = plateNamed(grid, "shelf")
    const p = plateNamed(grid, "p")
    const lift = stoneMoveAt(grid, 0, shelf[0], shelf[1], new Map())
    expect(lift).toMatchObject({ state: "+ hand", move: "lift" })
    const carrying = new Map([[lift!.address, "+ hand"]])
    expect(stoneMoveAt(grid, 0, p[0], p[1], carrying)).toMatchObject({ state: "stones.p", move: "set" })
  })

  it("offers nothing on an empty plate with empty hands", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = plateNamed(grid, "p")
    expect(stoneMoveAt(grid, 0, r, c, new Map())).toBeUndefined()
  })

  it("offers no lift while a stone is already in hand", () => {
    const grid = floorOf(TWO_STONES)
    const a = plateNamed(grid, "a")
    const b = plateNamed(grid, "b")
    const lifted = stoneMoveAt(grid, 0, a[0], a[1], new Map())!
    expect(stoneMoveAt(grid, 0, b[0], b[1], new Map([[lifted.address, lifted.state]]))).toBeUndefined()
  })

  it("says the hand is full only in an arrangement with a stone in hand", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = plateNamed(grid, "shelf")
    const { address } = stonesAt(grid, 0, r, c, new Map())!
    expect(isCarrying(grid, 0, new Map())).toBe(false)
    expect(isCarrying(grid, 0, new Map([[address, "+ hand"]]))).toBe(true)
  })

  it("reads nothing off a cell that is no plate", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = grid.entrancePos
    expect(stonesAt(grid, 0, r, c, new Map())).toBeUndefined()
    expect(stoneMoveAt(grid, 0, r, c, new Map())).toBeUndefined()
  })

  it("reads a saved arrangement the lock no longer has as the authored start, and plays on from it", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const shelf = plateNamed(grid, "shelf")
    const { address } = stonesAt(grid, 0, shelf[0], shelf[1], new Map())!
    const stale = new Map([[address, "stones.gone"]])
    expect(stonesAt(grid, 0, shelf[0], shelf[1], stale)?.state).toBe("stones.shelf")
    expect(stoneMoveAt(grid, 0, shelf[0], shelf[1], stale)).toMatchObject({ state: "+ hand", move: "lift" })
    expect(isCarrying(grid, 0, new Map([[address, "stones.gone + hand"]]))).toBe(false)
  })
})
