import { describe, expect, it } from "vitest"
import { completeCell, isObstacleCell, walkableFrom } from "@/game/gridNavigation"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { AXES, DROP_AT, KINDS, dropGrid, obstacleIndexes } from "./floorFixtures.testing"

const stateAt = (grid: FloorGrid, [r, c]: readonly [number, number]) => {
  const cell = grid.cells[r][c]
  return cell.type === "empty" ? "empty" : cell.state
}

const key = ([r, c]: readonly [number, number]) => `${r},${c}`

const shapes = AXES.flatMap(axis => KINDS.flatMap(fromNode => KINDS.map(toNode => ({ axis, fromNode, toNode }))))

describe("a one-way drop seen from either node", () => {
  for (const { axis, fromNode, toNode } of shapes) {
    const name = `${axis.travel}-going drop, ${fromNode} from-node, ${toNode} to-node`

    it(`lifts the obstacle out of the fog from the to-node's side and leaves the launch dark: ${name}`, () => {
      const { grid, at } = dropGrid(axis, fromNode, toNode)
      const seen = completeCell(grid, ...at(DROP_AT.toNode))

      expect([...Array(DROP_AT.toNode + 1).keys()].map(i => stateAt(seen, at(i)))).toEqual([
        "fogged", // from-node
        "fogged", // launch
        ...obstacleIndexes.map(() => "visible"),
        "reachable", // landing
        "completed", // to-node
      ])
    })

    it(`lifts the obstacle out of the fog from the from-node's side and leaves the landing dark: ${name}`, () => {
      const { grid, at } = dropGrid(axis, fromNode, toNode)
      const seen = completeCell(grid, ...at(DROP_AT.fromNode))

      expect([...Array(DROP_AT.toNode + 1).keys()].map(i => stateAt(seen, at(i)))).toEqual([
        "completed", // from-node
        "reachable", // launch
        ...obstacleIndexes.map(() => "visible"),
        "fogged", // landing
        "fogged", // to-node
      ])
    })

    it(`cannot be crossed, walked into or offered: ${name}`, () => {
      const { grid, at } = dropGrid(axis, fromNode, toNode, "visible")

      expect(walkableFrom(grid, at(DROP_AT.launch))).toEqual(
        new Set([key(at(DROP_AT.fromNode)), key(at(DROP_AT.launch))])
      )
      expect(walkableFrom(grid, at(DROP_AT.landing))).toEqual(
        new Set([key(at(DROP_AT.landing)), key(at(DROP_AT.toNode))])
      )
      for (const i of obstacleIndexes) expect(walkableFrom(grid, at(i))).toEqual(new Set([key(at(i))]))

      const sides = [
        { from: at(DROP_AT.launch), far: [at(DROP_AT.landing), at(DROP_AT.toNode)] },
        { from: at(DROP_AT.landing), far: [at(DROP_AT.launch), at(DROP_AT.fromNode)] },
      ]
      for (const { from, far } of sides) {
        const offered = [...offeredTargets(grid, buildRoomClaims(grid), from).values()].map(key)
        for (const cell of [...far, ...obstacleIndexes.map(at)]) expect(offered).not.toContain(key(cell))
      }
    })
  }
})

// A fork is the room type that claims every neighbour it can, so it is the node that would absorb the
// obstacle if anything did. Swapping one into a shape keeps the shape's own fixture.
const withFork = (grid: FloorGrid, [r, c]: readonly [number, number]): FloorGrid => {
  const cell = grid.cells[r][c]
  if (cell.type !== "room") return grid
  const cells = grid.cells.map(row => [...row])
  cells[r][c] = { ...cell, roomType: "fork" }
  return { ...grid, cells }
}

describe("a one-way obstacle is never part of a room's blob", () => {
  for (const { axis, fromNode, toNode } of shapes) {
    const name = `${axis.travel}-going drop, ${fromNode} from-node, ${toNode} to-node`

    it(`is claimed by no room, even a fork on either side of it: ${name}`, () => {
      const { grid: base, at } = dropGrid(axis, fromNode, toNode)
      const seen = completeCell(base, ...at(DROP_AT.toNode))
      const variants = [
        seen,
        withFork(seen, at(DROP_AT.toNode)),
        withFork(seen, at(DROP_AT.fromNode)),
        withFork(withFork(seen, at(DROP_AT.fromNode)), at(DROP_AT.toNode)),
      ]
      for (const grid of variants) {
        const claims = buildRoomClaims(grid)
        for (const i of obstacleIndexes) {
          const [r, c] = at(i)
          expect(isObstacleCell(grid.cells[r][c])).toBe(true)
          expect([...claims.claimedBy.keys()]).not.toContain(key(at(i)))
          expect([...claims.openEdges].filter(edge => edge.split("|").includes(key(at(i))))).toEqual([])
        }
      }
    })
  }

  it("still lets a fork claim the void around it, so the exclusion is not a claim switched off", () => {
    const { grid, at } = dropGrid(AXES[0], "room", "room")
    const claims = buildRoomClaims(withFork(completeCell(grid, ...at(DROP_AT.toNode)), at(DROP_AT.toNode)))
    const owned = [...claims.claimedBy.entries()].filter(([, owner]) => owner === key(at(DROP_AT.toNode)))
    expect(owned.length).toBeGreaterThan(0)
    for (const [cellKey] of owned) for (const i of obstacleIndexes) expect(cellKey).not.toBe(key(at(i)))
  })

  it("still claims an ordinary corridor that approaches a gate, beside a fork", () => {
    const gate: GridCell = {
      type: "room",
      roomType: "encounter",
      dirs: new Set(["w"]),
      state: "reachable",
      tags: ["gate"],
    }
    const fork: GridCell = { type: "room", roomType: "fork", dirs: new Set(["e"]), state: "reachable" }
    const void_: GridCell = { type: "empty" }
    const cells: GridCell[][] = [
      [void_, void_, void_, void_, void_],
      [void_, fork, { type: "corridor", dirs: new Set(["w", "e"]), state: "visible" }, gate, void_],
      [void_, void_, void_, void_, void_],
    ]
    const grid: FloorGrid = {
      siteId: "test",
      rows: 3,
      cols: 5,
      entrancePos: [1, 1],
      exitPos: [1, 1],
      staircases: {},
      cells,
    }
    expect(isObstacleCell(grid.cells[1][2])).toBe(false)
    expect(buildRoomClaims(grid).claimedBy.get("1,2")).toBe("1,1")
  })
})
