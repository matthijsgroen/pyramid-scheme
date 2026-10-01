import { describe, expect, it } from "vitest"
import type { CellState } from "@/game/siteTypes"
import { allFloorRects, buildRoomClaims, cellFloorAt, tileRegionsFor } from "./roomClaims"
import { cellLeft, cellTop, CELL } from "./mapScale"
import { AXES, DROP_AT, dropGrid, obstacleIndexes } from "./floorFixtures.testing"
import "@/mods/registerModApps"

const REVEALED: CellState[] = ["visible", "reachable", "completed"]
const LAUNCH_AND_LANDING = [DROP_AT.launch, DROP_AT.landing]

const floorAtIndexes = (axis: (typeof AXES)[number], state: CellState, indexes: number[]) => {
  const { grid, at } = dropGrid(axis, "room", "room", state)
  const withTier = { ...grid, difficulty: "expert" as const }
  const claims = buildRoomClaims(withTier)
  return indexes.map(i => cellFloorAt(withTier, claims, undefined, ...at(i)))
}

describe("a drop's obstacle cells are a hole, not paving", () => {
  for (const axis of AXES)
    for (const state of REVEALED) {
      it(`draws no floor on any obstacle cell going ${axis.travel} (${state})`, () => {
        const floors = floorAtIndexes(axis, state, obstacleIndexes)
        expect(floors).toEqual(obstacleIndexes.map(() => "unlit"))
      })

      it(`still draws floor on the launch and the landing going ${axis.travel} (${state})`, () => {
        const floors = floorAtIndexes(axis, state, LAUNCH_AND_LANDING)
        expect(floors.map(f => typeof f)).toEqual(["object", "object"])
      })

      it(`paints no floor rect over an obstacle cell going ${axis.travel} (${state})`, () => {
        const { grid, at } = dropGrid(axis, "room", "room", state)
        const expert = { ...grid, difficulty: "expert" as const }
        const regions = tileRegionsFor(expert, buildRoomClaims(expert))
        const floorRects = allFloorRects(regions)
        for (const i of obstacleIndexes) {
          const [r, c] = at(i)
          const covers = floorRects.filter(
            ([x, y, w, h]) =>
              x <= cellLeft(c) && y <= cellTop(r) && x + w >= cellLeft(c) + CELL && y + h >= cellTop(r) + CELL
          )
          expect(covers, `cell ${r},${c}`).toEqual([])
        }
      })
    }

  for (const axis of AXES)
    it(`a fogged obstacle going ${axis.travel} draws what it always did: unlit`, () => {
      expect(floorAtIndexes(axis, "fogged", obstacleIndexes)).toEqual(obstacleIndexes.map(() => "unlit"))
    })
})

describe("a drop is a hole at every rank, painted or not", () => {
  it("draws no floor on any obstacle cell at a rank with no drop sprite", () => {
    for (const axis of AXES) {
      const { grid, at } = dropGrid(axis, "room", "room", "visible")
      const starter = { ...grid, difficulty: "starter" as const }
      const claims = buildRoomClaims(starter)
      const floors = obstacleIndexes.map(i => cellFloorAt(starter, claims, undefined, ...at(i)))
      expect(floors).toEqual(obstacleIndexes.map(() => "unlit"))
    }
  })

  it("draws the same hole at every rank, sprite or none", () => {
    for (const axis of AXES) {
      const { grid, at } = dropGrid(axis, "room", "room", "visible")
      const holes = (["starter", "junior", "expert", "master", "wizard"] as const).map(difficulty => {
        const floor = { ...grid, difficulty }
        const claims = buildRoomClaims(floor)
        return obstacleIndexes.map(i => cellFloorAt(floor, claims, undefined, ...at(i)))
      })
      expect(holes).toEqual(holes.map(() => obstacleIndexes.map(() => "unlit")))
    }
  })
})

describe("the rock around a drop's hole stands", () => {
  const covers = (rects: readonly (readonly number[])[], r: number, c: number) =>
    rects.some(
      ([x, y, w, h]) => x <= cellLeft(c) && y <= cellTop(r) && x + w >= cellLeft(c) + CELL && y + h >= cellTop(r) + CELL
    )

  for (const axis of AXES)
    for (const state of REVEALED) {
      it(`leaves the obstacle cells undrawn and the rock beside each one drawn going ${axis.travel} (${state})`, () => {
        const { grid, at } = dropGrid(axis, "room", "room", state)
        const expert = { ...grid, difficulty: "expert" as const }
        const regions = tileRegionsFor(expert, buildRoomClaims(expert))
        const mass = [...regions.values()].flatMap(g => Object.values(g.wallMass).flat())
        const everything = [...mass, ...allFloorRects(regions)]
        const sideways = axis.step[0] === 0 ? [1, 0] : [0, 1]
        const pits = obstacleIndexes.map(at)
        const flanks = pits.flatMap(([r, c]) => [
          [r + sideways[0], c + sideways[1]],
          [r - sideways[0], c - sideways[1]],
        ])
        expect(pits.filter(([r, c]) => covers(everything, r, c))).toEqual([])
        expect(flanks.filter(([r, c]) => !covers(mass, r, c))).toEqual([])
      })
    }
})

describe("a fogged drop is not revealed by its hole", () => {
  for (const axis of AXES)
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
})
