import { describe, expect, it } from "vitest"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid, MechanismRecord } from "../game/siteTypes"
import { floorLock } from "../game/floorLock"
import { reachableStates } from "../game/lockWalk"
import { offRouteSluiceFloor, onRouteSluiceFloor } from "../game/testSupport/regionBarrierFixtures"
import { floorWithHandle, nestedFloorWithHandle } from "../game/testSupport/handleFixtures"
import {
  authoredByCompiled,
  authoredPairOf,
  authoredRegionOf,
  failureOf,
  withoutLayout,
} from "./regionPassages.testing"

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)

const carved = (config: () => GameFloorConfig): FloorGrid[] =>
  SEEDS.flatMap(seed => {
    const result = assembleFloor("test", config(), seed)
    return result.success ? [result.grid] : []
  })

describe("regions the author wrote separately", () => {
  const FLOORS = [
    { name: "an off-route sluice", make: offRouteSluiceFloor },
    { name: "an on-route sluice", make: onRouteSluiceFloor },
  ]

  it.each(FLOORS)(
    "stay separate in the compiled lock of $name, one authored region to a compiled region",
    ({ make }) => {
      const grids = carved(make)
      expect(grids.length).toBeGreaterThan(0)
      for (const grid of grids) {
        const held = authoredByCompiled(grid)
        for (const [id, authored] of held) expect([id, [...authored]]).toEqual([id, [[...authored][0]]])

        const onGrid = new Set(
          grid.cells.flat().flatMap(cell => {
            const region = authoredRegionOf(cell)
            return region === undefined ? [] : [region]
          })
        )
        expect(new Set([...held.values()].flatMap(set => [...set]))).toEqual(onGrid)
        expect(onGrid.size).toBeGreaterThan(1)
      }
    }
  )

  it.each(FLOORS)(
    "are joined by a passage in $name wherever the layout joins them with nothing between",
    ({ make }) => {
      const layout = make().regionLayout!
      const gated = new Set(make().obstacles!.flatMap(o => (o.at.on === "region" ? [o.at.region] : [])))
      const bare = layout.connections
        .filter(([a, b]) => !gated.has(a) && !gated.has(b))
        .map(pair => [...pair].sort().join("|"))
      const allowed = new Set(layout.connections.map(pair => [...pair].sort().join("|")))
      for (const grid of carved(make)) {
        const held = authoredByCompiled(grid)
        const lock = floorLock(grid)!
        const joined = new Set((lock.passages ?? []).map(({ a, b }) => authoredPairOf(held, a, b)))
        for (const pair of joined) expect(allowed.has(pair), pair).toBe(true)
        for (const pair of bare) expect(joined.has(pair), pair).toBe(true)
      }
    }
  )
})

// A move of the sluice made at a cell of `region` as well as at the sluice itself.
const placedAt = (grid: FloorGrid, move: { to: string }, region: string): { grid: FloorGrid; home: string } => {
  const homeCell = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" && cell.mechanism ? [{ r, c, cell }] : []))
  )[0]
  const target = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.region === region && !cell.requiredKeyId && !cell.mechanism && !cell.regionBarrier
        ? [{ r, c }]
        : []
    )
  )[0]
  if (!target) throw new Error(`no free room in ${region}`)
  const record = homeCell.cell.mechanism as MechanismRecord
  const transitions = [...(record.transitions ?? []), { to: move.to, at: [target.r, target.c] as const }]
  const cells = grid.cells.map((row, r) =>
    row.map((cell, c) => {
      if (cell.type !== "room") return cell
      if (r === homeCell.r && c === homeCell.c) return { ...cell, mechanism: { ...record, transitions } }
      if (r === target.r && c === target.c)
        return {
          ...cell,
          worksMechanism: { mechanismId: homeCell.cell.mechanismId!, transition: transitions.length - 1 },
        }
      return cell
    })
  )
  return { grid: { ...grid, cells }, home: `${homeCell.r},${homeCell.c}` }
}

describe("a transition placed in one of two regions that nothing separates", () => {
  it("is made only from that region, never by standing in the region beside it", () => {
    const grids = carved(offRouteSluiceFloor)
    expect(grids.length).toBeGreaterThan(0)
    for (const base of grids) {
      const { grid } = placedAt(base, { to: "wet" }, "gallery")
      const held = authoredByCompiled(grid)
      const lock = floorLock(grid)!
      const found = reachableStates(lock)
      if (found === "tooLarge") throw new Error("lock too large")
      const sluice = Object.keys(lock.mechanisms).find(name => lock.mechanisms[name].states.includes("wet"))!

      const madeIn = new Set<string>()
      found.edges.forEach((tos, from) =>
        tos.forEach(to => {
          const [a, b] = [found.order[from], found.order[to]]
          if (a.config[sluice] === "dry" && b.config[sluice] === "wet" && a.region === b.region)
            madeIn.add([...(held.get(a.region) ?? [])].join())
        })
      )

      expect([...madeIn]).toEqual(["gallery"])
      expect(found.order.some(state => state.config[sluice] === "wet")).toBe(true)
    }
  })
})

describe("compiling regions apart", () => {
  it("leaves the verdict of every sluice floor as it was with the regions flooded together", () => {
    for (const make of [offRouteSluiceFloor, onRouteSluiceFloor])
      for (const grid of carved(make)) {
        const lock = floorLock(grid)!
        const before = floorLock(withoutLayout(grid))!
        expect(lock.passages?.length).toBeGreaterThan(0)
        expect(failureOf(lock)).toBe(failureOf(before))
      }
  })

  it("compiles a floor with no layout to exactly the lock it compiled to before, with no passage", () => {
    const grids = [
      floorWithHandle({ in: "lever", left: ["vault"], right: ["pocket"] }).grid,
      nestedFloorWithHandle({ in: "branch", left: ["s0.0"], right: ["s0.1"] }).grid,
    ]
    for (const grid of grids) {
      expect(grid.cells.flat().filter(cell => authoredRegionOf(cell) !== undefined)).toEqual([])
      const lock = floorLock(grid)!
      expect(Object.keys(lock.mechanisms).length).toBeGreaterThan(0)
      expect(lock.passages).toBeUndefined()
      expect(lock).toEqual(floorLock(withoutLayout(grid)))
    }
  })
})
