import { beforeAll, describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { resolveEncounterMeta } from "@/mods/allFamilyMeta"
import { floorLock, regionsOf } from "@/game/floorLock"
import { deadFloorRegions, walkFloorLock } from "@/game/floorLockWalk"
import { deadRegions, reachableStates, walkLock, type LockSpec } from "@/game/lockWalk"
import { legalTargets } from "@/game/mechanismDoors"
import { oneWayRuns } from "@/game/gridNavigation"
import { BINDING, carveLockFloor, mirrorForkLock } from "@/game/testSupport/lockFixtures"
import { TOPOLOGY_ON } from "@/game/testSupport/modOff"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"
import { authoredByCompiled, failureOf, withoutLayout } from "@/worldGen/regionPassages.testing"

// THE LOCK FLOORS THE SHIPPED WORLD STANDS, carved at the (packing, seed) the player gets: what the compiled lock
// says of a floor must agree with the floor's own cells, and reading a floor differently must not change a verdict.

type Carved = { label: string; grid: FloorGrid; placesLocks: boolean; hasLayout: boolean; plainControls: boolean }

const carved: Carved[] = []

beforeAll(() => {
  for (const floor of allFloors()) {
    const result = assembleFloor(floor.journeyId, floor.config, floor.seed, TOPOLOGY_ON.resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
    })
    if (!result.success) continue
    const placed = floor.config.locks ?? []
    carved.push({
      label: floor.label,
      grid: result.grid,
      placesLocks: placed.length > 0,
      hasLayout: !!floor.config.regionLayout,
      // A sequence advances at each of its tiles and stones move at each plate: neither is a mechanism working in one place.
      plainControls: !placed.some(
        ({ lock }) => lock.weights !== undefined || Object.values(lock.mechanics).some(m => m.control === "sequence")
      ),
    })
  }
}, 600_000)

const withLock = () =>
  carved.flatMap(c => {
    const lock = floorLock(c.grid)
    return lock ? [{ ...c, lock }] : []
  })

describe("the shipped world's lock floors", () => {
  it("are asked of many floors, not of a handful", () => {
    expect(withLock().length).toBeGreaterThan(30)
  })

  it("walk over their whole lock exactly as the lock alone walks, on every floor with no nested lock", () => {
    const flat = withLock().filter(c => c.grid.lockNesting === undefined)
    expect(flat.length).toBeGreaterThan(20)
    for (const { label, grid, lock } of flat) {
      expect(walkFloorLock(grid), label).toEqual(walkLock(lock))
      expect(deadFloorRegions(grid), label).toEqual(deadRegions(lock))
    }
  })

  // Each mechanism's moves as they were before a move could be placed: made in the region of the cell the
  // mechanism stands in, read off the grid's own regions rather than floorLock's.
  const asBefore = (grid: FloorGrid, lock: LockSpec): LockSpec => {
    const { of } = regionsOf(grid)
    const mechanisms = { ...lock.mechanisms }
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type !== "room" || !cell.mechanism) return
        const id = Object.keys(mechanisms).find(key => key.endsWith(` ${r},${c}`))!
        mechanisms[id] = {
          ...mechanisms[id],
          transitions: cell.mechanism.states.flatMap(from =>
            legalTargets(cell.mechanism!, from).map(to => ({ from, to, at: of.get(`${r},${c}`)! }))
          ),
        }
      })
    )
    return { ...lock, mechanisms }
  }

  it("have each mechanism that works in one place reach exactly the states it reached before moves could be placed", () => {
    const floors = withLock().filter(c => c.plainControls)
    expect(floors.length).toBeGreaterThan(10)
    for (const { label, grid, lock } of floors) {
      const before = asBefore(grid, lock)
      expect(lock.mechanisms, label).toEqual(before.mechanisms)
      expect(reachableStates(lock), label).toEqual(reachableStates(before))
    }
  })

  it("keep regions the author wrote separately separate: no compiled region holds ground of two", () => {
    const floors = withLock().filter(c => c.hasLayout || c.placesLocks)
    expect(floors.length).toBeGreaterThan(20)
    for (const { label, grid } of floors)
      for (const authored of authoredByCompiled(grid).values()) expect(authored.size, label).toBe(1)
  })

  it("leave the verdict of every floor as it was with the regions flooded together", () => {
    for (const { label, grid, lock } of withLock())
      expect(failureOf(lock), label).toBe(failureOf(floorLock(withoutLayout(grid))!))
  })

  it("carry every cell knowing its region, and every region the lock declares holding a cell", () => {
    const floors = carved.filter(c => c.placesLocks)
    expect(floors.length).toBeGreaterThan(20)
    for (const { label, grid } of floors) {
      const cells = grid.cells
        .flat()
        .filter(
          (c): c is Extract<typeof c, { type: "room" | "corridor" }> => c.type === "room" || c.type === "corridor"
        )
      expect(cells.filter(c => c.region === undefined).length, label).toBe(0)
    }
  })
})

describe("the compiled lock of a floor that lays no authored layout", () => {
  // A lever on its own side path with a door on each side, authored as a handle: no lock, no region layout.
  const side = (label: string) => ({ pathPuzzles: 0, difficulty: "expert" as const, end: "treasure" as const, label })
  const leverFloor: FloorConfig = {
    pathPuzzles: 0,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [side("lever"), side("vault"), side("cellar")],
    handles: [{ in: "lever", left: ["vault"], right: ["cellar"] }],
  }

  it("carries no passage, and is the lock it compiled to before regions were read", () => {
    const grids = Array.from({ length: 12 }, (_, n) => assembleFloor("test", leverFloor, n + 1, resolveEncounterMeta))
      .flatMap(result => (result.success ? [result.grid] : []))
      .filter(grid => floorLock(grid))
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      const lock = floorLock(grid)!
      expect(lock.passages).toBeUndefined()
      expect(lock).toEqual(floorLock(withoutLayout(grid)))
    }
  })
})

describe("a drop that keeps every region reachable, on a carved floor", () => {
  it("walks unsound once the drop that leaves the arm for the junction's region is taken away", () => {
    const grid = carveLockFloor(mirrorForkLock(), BINDING)
    const regionAt = ([r, c]: readonly [number, number]) => {
      const cell = grid.cells[r][c]
      return cell.type === "empty" ? undefined : cell.region
    }
    const second = oneWayRuns(grid).find(
      run => regionAt(run.launch) === "mirrorFork.leftLower" && regionAt(run.landing) === "mirrorFork.in"
    )
    if (!second) throw new Error("the carve has no drop from leftLower to the entrance region")
    const cells = grid.cells.map(row => [...row])
    for (const [r, c] of second.cells) cells[r][c] = { type: "empty" }
    const [lr, lc] = second.launch
    const launch = cells[lr][lc]
    if (launch.type !== "room" && launch.type !== "corridor") throw new Error("the drop's launch is no ground")
    cells[lr][lc] = { ...launch, dirs: new Set([...launch.dirs].filter(dir => dir !== second.dir)) }
    expect(walkFloorLock(grid)?.sound).toBe(true)
    expect(walkFloorLock({ ...grid, cells })?.sound).toBe(false)
  })
})

describe("the marks on a shipped floor", () => {
  const markedMechanisms = (grid: FloorGrid) =>
    grid.cells
      .flat()
      .flatMap(cell => (cell.type === "room" && cell.mechanismId !== undefined && cell.mark ? [cell] : []))

  it("are never shared by two mechanisms of one floor", () => {
    const floors = carved.map(c => ({ ...c, marked: markedMechanisms(c.grid) })).filter(c => c.marked.length > 1)
    expect(floors.length).toBeGreaterThan(5)
    const collisions = floors.flatMap(({ label, marked }) => {
      const byGlyph = new Map<number, string[]>()
      for (const room of marked)
        byGlyph.set(room.mark!.glyph, [...(byGlyph.get(room.mark!.glyph) ?? []), room.mechanismId!])
      return [...byGlyph].filter(([, ids]) => new Set(ids).size > 1).map(([glyph, ids]) => `${label}: ${glyph} ${ids}`)
    })
    expect(collisions).toEqual([])
  })
})
