import { describe, expect, it } from "vitest"
import type { Direction } from "@/game/siteTypes"
import { AXES, DROP_AT, KINDS, dropGrid, obstacleIndexes } from "./floorFixtures.testing"
import { buildRoomClaims, isPassable } from "./roomClaims"

const ALL_INDEXES = Array.from({ length: DROP_AT.toNode + 1 }, (_, i) => i)

describe("the stone around a drop's run", () => {
  for (const axis of AXES) {
    for (const fromNode of KINDS) {
      it(`draws every seam from node to node as open, going ${axis.travel} from a ${fromNode}`, () => {
        const { grid, at } = dropGrid(axis, fromNode, "corridor", "completed")
        const claims = buildRoomClaims(grid)
        // isPassable asks about the south and east edge of a cell, so a west- or north-going line is
        // asked from the cell on the far side.
        const seams = ALL_INDEXES.slice(0, -1).map(i => {
          const from = axis.step[0] + axis.step[1] > 0 ? at(i) : at(i + 1)
          const dir = axis.step[0] === 0 ? "e" : "s"
          return { i, open: isPassable(grid, claims, from[0], from[1], dir) }
        })
        expect(seams.filter(s => !s.open)).toEqual([])
      })

      it(`still names no direction on the run's cells, going ${axis.travel}`, () => {
        const { grid, at } = dropGrid(axis, fromNode, "corridor", "completed")
        const dirsOfRun = obstacleIndexes.map(i => {
          const [r, c] = at(i)
          return [...(grid.cells[r][c] as { dirs: ReadonlySet<Direction> }).dirs]
        })
        expect(dirsOfRun).toEqual(obstacleIndexes.map(() => []))
      })
    }
  }
})
