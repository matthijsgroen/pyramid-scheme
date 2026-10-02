import { describe, expect, it } from "vitest"
import type { CellState } from "@/game/siteTypes"
import { allFloorRects, buildRoomClaims, cellFloorAt, tileRegionsFor } from "./roomClaims"
import { cellLeft, cellTop, CELL, SIDE_W, WALL_H } from "./mapScale"
import { AXES, DROP_AT, dropGrid, obstacleIndexes } from "./floorFixtures.testing"
import "@/mods/registerModApps"

const REVEALED: CellState[] = ["visible", "reachable", "completed"]
const RANKS = ["starter", "junior", "expert", "master", "wizard"] as const
const RUN = Array.from({ length: DROP_AT.landing - DROP_AT.launch + 1 }, (_, k) => DROP_AT.launch + k)

type Point = readonly [x: number, y: number]
const within = (rects: readonly (readonly number[])[], [px, py]: Point) =>
  rects.some(([x, y, w, h]) => px >= x && px < x + w && py >= y && py < y + h)

// A drop's sprite is painted onto a floor tile and the tile IS the hole's rim, so the whole run — each
// cell and each seam between two — has to be floor for the art to sit on. The rock either side stands.
// The rule this once protected ("a gap you cannot cross should not look walkable") was traded for the
// art's own rim: the hole is in the sprite, never in the missing floor.
const drawnPoints = (axis: (typeof AXES)[number], state: CellState, difficulty: (typeof RANKS)[number]) => {
  const { grid, at } = dropGrid(axis, "room", "room", state)
  const floor = { ...grid, difficulty }
  const regions = tileRegionsFor(floor, buildRoomClaims(floor))
  const floors = allFloorRects(regions)
  const mass = [...regions.values()].flatMap(g => Object.values(g.wallMass).flat())
  const sideways = axis.step[0] === 0 ? [1, 0] : [0, 1]
  const centre = (r: number, c: number): Point => [cellLeft(c) + CELL / 2, cellTop(r) + CELL / 2]
  const seamBefore = (r: number, c: number): Point =>
    axis.step[0] === 0
      ? [cellLeft(c) - SIDE_W / 2, cellTop(r) + CELL / 2]
      : [cellLeft(c) + CELL / 2, cellTop(r) - WALL_H / 2]
  // For a run going west or north the seam between i and i+1 is the cell i's own leading gap.
  const seamBetween = (i: number): Point => {
    const [r, c] = at(i)
    const [nr, nc] = at(i + 1)
    return axis.step[0] > 0 || axis.step[1] > 0 ? seamBefore(nr, nc) : seamBefore(r, c)
  }
  const cells = RUN.map(i => centre(...at(i)))
  const seams = RUN.slice(0, -1).map(seamBetween)
  const flanks = RUN.flatMap(i => {
    const [r, c] = at(i)
    return [centre(r + sideways[0], c + sideways[1]), centre(r - sideways[0], c - sideways[1])]
  })
  return { floors, mass, cells, seams, flanks, at }
}

describe("a revealed drop draws a floor the sprite can sit on", () => {
  for (const axis of AXES)
    for (const state of REVEALED) {
      it(`floors the whole run from launch to landing, seams included, with rock either side going ${axis.travel} (${state})`, () => {
        const { floors, mass, cells, seams, flanks } = drawnPoints(axis, state, "expert")
        expect({
          cellsWithoutFloor: cells.filter(p => !within(floors, p)),
          seamsWithoutFloor: seams.filter(p => !within(floors, p)),
          flanksPaved: flanks.filter(p => within(floors, p)),
          flanksWithoutRock: flanks.filter(p => !within(mass, p)),
        }).toEqual({ cellsWithoutFloor: [], seamsWithoutFloor: [], flanksPaved: [], flanksWithoutRock: [] })
      })

      it(`answers a floor, not "unlit", on every obstacle cell going ${axis.travel} (${state})`, () => {
        const { grid, at } = dropGrid(axis, "room", "room", state)
        const expert = { ...grid, difficulty: "expert" as const }
        const claims = buildRoomClaims(expert)
        const floors = obstacleIndexes.map(i => cellFloorAt(expert, claims, undefined, ...at(i)))
        expect(floors.map(f => typeof f)).toEqual(obstacleIndexes.map(() => "object"))
      })
    }

  it("floors the run the same way at every rank, sprite or none", () => {
    for (const axis of AXES) {
      const drawn = RANKS.map(rank => {
        const { floors, cells, seams } = drawnPoints(axis, "visible", rank)
        return [...cells, ...seams].filter(p => !within(floors, p))
      })
      expect(drawn).toEqual(RANKS.map(() => []))
    }
  })
})

describe("a fogged drop is not revealed by its floor", () => {
  for (const axis of AXES) {
    it(`a fogged obstacle going ${axis.travel} is unlit, as it always was`, () => {
      const { grid, at } = dropGrid(axis, "room", "room", "fogged")
      const expert = { ...grid, difficulty: "expert" as const }
      const claims = buildRoomClaims(expert)
      expect(obstacleIndexes.map(i => cellFloorAt(expert, claims, undefined, ...at(i)))).toEqual(
        obstacleIndexes.map(() => "unlit")
      )
    })

    it(`draws every rect of a fogged obstacle going ${axis.travel} as if it carried no marker`, () => {
      const { grid } = dropGrid(axis, "room", "room", "fogged")
      const marked = { ...grid, difficulty: "expert" as const }
      const bare = {
        ...marked,
        cells: marked.cells.map(row =>
          row.map(cell => (cell.type === "corridor" ? { ...cell, obstacle: undefined } : cell))
        ),
      }
      const drawn = (g: typeof marked) => JSON.stringify([...tileRegionsFor(g, buildRoomClaims(g))])
      expect(drawn(marked)).toBe(drawn(bare))
    })
  }
})
