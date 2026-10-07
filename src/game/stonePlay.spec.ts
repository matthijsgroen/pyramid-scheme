import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { SHELF_AND_DOOR, TWO_STONES, plateNamed } from "./testSupport/stoneFixtures"
import { openDoorsFor } from "./mechanismDoors"
import { explorerWeight, isCarrying, plateLookAt, plateLookOf, stoneMoveAt, stonesAt } from "./stonePlay"

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

describe("a plate's look", () => {
  it("is raised while empty and nobody stands on it, pressed while somebody does, and holds its stone either way", () => {
    expect(plateLookOf(false, false)).toBe("raised")
    expect(plateLookOf(false, true)).toBe("pressed")
    expect(plateLookOf(true, false)).toBe("stone")
    expect(plateLookOf(true, true)).toBe("stone")
  })

  it("is read off the arrangement the stones stand in", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const shelf = plateNamed(grid, "shelf")
    const p = plateNamed(grid, "p")
    expect(plateLookAt(grid, 0, shelf[0], shelf[1], new Map(), false)).toBe("stone")
    expect(plateLookAt(grid, 0, p[0], p[1], new Map(), false)).toBe("raised")
    expect(plateLookAt(grid, 0, p[0], p[1], new Map(), true)).toBe("pressed")
    const { address } = stonesAt(grid, 0, shelf[0], shelf[1], new Map())!
    expect(plateLookAt(grid, 0, shelf[0], shelf[1], new Map([[address, "+ hand"]]), false)).toBe("raised")
  })
})

describe("explorerWeight", () => {
  const doorKeyOf = (grid: ReturnType<typeof floorOf>) =>
    grid.cells
      .flat()
      .flatMap(cell => (cell.type === "room" && cell.tags?.includes("gate") ? [cell.requiredKeyId!] : []))[0]

  it("opens a way waiting for a stone while he stands on its empty plate", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const weight = explorerWeight(grid, 0, plateNamed(grid, "p"), new Map())
    expect(weight?.open).toEqual(new Set([doorKeyOf(grid)]))
    expect(weight?.shut).toEqual(new Set())
    expect(openDoorsFor(grid, 0, new Map()).has(doorKeyOf(grid))).toBe(false)
  })

  it("shuts a way waiting for an empty plate while he stands on it", () => {
    const grid = floorOf("in -- hall\nhall -[p:empty]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?")
    const weight = explorerWeight(grid, 0, plateNamed(grid, "p"), new Map())
    expect(weight?.shut).toEqual(new Set([doorKeyOf(grid)]))
  })

  it("moves nothing on a plate that already holds a stone, nor off a plate", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    expect(explorerWeight(grid, 0, plateNamed(grid, "shelf"), new Map())).toBeUndefined()
    expect(explorerWeight(grid, 0, grid.entrancePos, new Map())).toBeUndefined()
  })

  it("leaves a lever its say: a plate-and-lever door stays shut while the lever is", () => {
    const grid = carveLockFloor(
      parseLock("in -[p+L]- out\np plate @in\nshelf plate @in stone\nL toggle @in\nin ?\nout ?", "stones").lock,
      {
        weights: "stonePlate",
        toggle: "handle",
      }
    )
    const weight = explorerWeight(grid, 0, plateNamed(grid, "p"), new Map())
    expect(weight?.open).toEqual(new Set())
  })
})
