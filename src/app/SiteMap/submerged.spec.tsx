// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { CellState, CorridorCell, Direction, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import type { RegionBarrierRealisationMeta, ResolveRegionBarrierRealisation } from "@/game/regionBarrierRealisation"
import { AXES, dropGrid, obstacleIndexes } from "./floorFixtures.testing"
import { PROP_H } from "./mapScale"
import { SiteMapView } from "./SiteMapView"

afterEach(cleanup)

const state: CellState = "reachable"
const E: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): CorridorCell => ({ type: "corridor", dirs: new Set(dirs), state })
const chestRoom = (dirs: Direction[], region?: string): GridCell => ({
  type: "room",
  roomType: "encounter",
  tags: ["treasure"],
  dirs: new Set(dirs),
  state,
  ...(region ? { region } : {}),
})
const barrier = (dirs: Direction[], realisation: string): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state,
  regionBarrier: { region: "pool", entrance: "made-up", realisation },
})

const deep: RegionBarrierRealisationMeta = { id: "deep", ownerMod: "made-up", fallback: "#000", submerge: 15 }
const shallow: RegionBarrierRealisationMeta = { id: "shallow", ownerMod: "made-up", fallback: "#000" }
const resolve: ResolveRegionBarrierRealisation = id => [deep, shallow].find(meta => meta.id === id)

// A chest room by the entrance (1,1), a barrier (1,3), and past it a chest room in the barred pool (1,5).
const chests = (realisation: string): FloorGrid => ({
  siteId: "made-up",
  rows: 3,
  cols: 7,
  entrancePos: [1, 0],
  exitPos: [1, 0],
  staircases: {},
  difficulty: "junior",
  cells: [
    [E, E, E, E, E, E, E],
    [
      corridor(["e"]),
      chestRoom(["w", "e"]),
      corridor(["w", "e"]),
      barrier(["w", "e"], realisation),
      { ...corridor(["w", "e"]), region: "pool" },
      chestRoom(["w"], "pool"),
      E,
    ],
    [E, E, E, E, E, E, E],
  ],
})

const submerged = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-submerged]")).map(el => el.dataset.submerged)

describe("what stands on a covered floor stands in it", () => {
  it("hides the foot of a chest standing in the barred pool, and leaves the chest on dry ground whole", () => {
    const { container } = render(<SiteMapView grid={chests("deep")} resolveRealisation={resolve} />)
    expect(container.querySelector('[data-node-sprite="chest:1,5"]')).not.toBeNull()
    expect(container.querySelector('[data-node-sprite="chest:1,1"]')).not.toBeNull()
    expect(submerged(container)).toEqual(["chest:1,5"])
    const mask = container.querySelector<HTMLElement>('[data-submerged="chest:1,5"]')!.style.maskImage
    // Clear from the declared depth above the chest's floor line, the bottom of its frame, down.
    expect(mask).toMatch(new RegExp(`black \\d+px, transparent ${PROP_H - deep.submerge!}px\\)$`))
  })

  it("masks nothing under a realisation that declares no depth", () => {
    const { container } = render(<SiteMapView grid={chests("shallow")} resolveRealisation={resolve} />)
    expect(container.querySelector('[data-node-sprite="chest:1,5"]')).not.toBeNull()
    expect(submerged(container)).toEqual([])
  })

  it("leaves a drop whole on a covered run: its hole and cable are one picture", () => {
    const axis = AXES.find(a => a.travel === "e")!
    const { grid, at } = dropGrid(axis, "room", "room", "visible")
    const [lr, lc] = at(obstacleIndexes[obstacleIndexes.length - 1])
    // The drop's first node is the barrier, walked up to from a passage west of it; everything past it is the pool.
    const [fr, fc] = grid.entrancePos
    const cells = grid.cells.map((row, r) =>
      row.map((cell, c): GridCell => {
        if (r === fr && c === fc - 1) return corridor(["e"])
        if (r === fr && c === fc) return { ...barrier(["w", "e"], "deep"), region: "pool" }
        return cell.type === "empty" ? cell : { ...cell, region: "pool" }
      })
    )
    const flooded: FloorGrid = { ...grid, cells, entrancePos: [fr, fc - 1], difficulty: "expert" }
    const { container } = render(<SiteMapView grid={flooded} resolveRealisation={resolve} />)
    expect(container.querySelector(`[data-node-sprite="drop:${lr},${lc}"]`)).not.toBeNull()
    expect(container.querySelector(`[data-cover-cell="${lr},${lc}"]`)).not.toBeNull()
    expect(submerged(container)).toEqual([])
  })
})
