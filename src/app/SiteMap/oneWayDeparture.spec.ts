import { describe, expect, it } from "vitest"
import { completeCell, isOneWayMouth, walkableFrom } from "@/game/gridNavigation"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"

type Kind = "room" | "corridor"
type Axis = { travel: Direction; back: Direction; step: readonly [number, number] }

const AXES: Axis[] = [
  { travel: "e", back: "w", step: [0, 1] },
  { travel: "s", back: "n", step: [1, 0] },
]
const KINDS: Kind[] = ["room", "corridor"]

const cellOf = (kind: Kind, dirs: Direction[], state: CellState): GridCell =>
  kind === "room"
    ? { type: "room", roomType: "encounter", dirs: new Set(dirs), state }
    : { type: "corridor", dirs: new Set(dirs), state }

// Five cells along one axis: beyondDeparture, departure, mouth, landing, beyondLanding. The mouth
// carries one direction, toward the landing; the landing carries none back (the drop's asymmetry).
const dropGrid = (axis: Axis, departure: Kind, landing: Kind) => {
  const at = (i: number): [number, number] => [2 + axis.step[0] * i, 2 + axis.step[1] * i]
  const cells: GridCell[][] = Array.from({ length: 6 }, () =>
    Array.from({ length: 6 }, () => ({ type: "empty" }) as GridCell)
  )
  const put = (i: number, cell: GridCell) => {
    const [r, c] = at(i)
    cells[r][c] = cell
  }
  put(0, cellOf("corridor", [axis.travel], "fogged"))
  put(1, cellOf(departure, [axis.back, axis.travel], "fogged"))
  put(2, cellOf("corridor", [axis.travel], "fogged"))
  put(3, cellOf(landing, [], "reachable"))
  const grid: FloorGrid = {
    siteId: "test",
    rows: 6,
    cols: 6,
    entrancePos: at(3),
    exitPos: at(3),
    staircases: {},
    cells,
  }
  return { grid, at }
}

const stateAt = (grid: FloorGrid, [r, c]: readonly [number, number]) => {
  const cell = grid.cells[r][c]
  return cell.type === "empty" ? "empty" : cell.state
}

const key = ([r, c]: readonly [number, number]) => `${r},${c}`

const shapes = AXES.flatMap(axis => KINDS.flatMap(departure => KINDS.map(landing => ({ axis, departure, landing }))))

describe("a one-way drop's departure, seen from its landing", () => {
  for (const { axis, departure, landing } of shapes) {
    const name = `${axis.travel}-going drop, ${departure} departure, ${landing} landing`

    it(`lifts the mouth only, leaving the departure it fell from dark: ${name}`, () => {
      const { grid, at } = dropGrid(axis, departure, landing)
      const seen = completeCell(grid, ...at(3))

      expect(stateAt(seen, at(2))).toBe("visible")
      expect(stateAt(seen, at(1))).toBe("fogged")
      expect(stateAt(seen, at(0))).toBe("fogged")
    })

    it(`cannot be crossed, walked into or offered: ${name}`, () => {
      const { grid, at } = dropGrid(axis, departure, landing)
      const seen = completeCell(grid, ...at(3))

      const mouth = seen.cells[at(2)[0]][at(2)[1]]
      expect(mouth.type === "corridor" ? [...mouth.dirs] : []).toEqual([axis.travel])
      expect(walkableFrom(seen, at(2))).toEqual(new Set([key(at(2)), key(at(3))]))
      expect(walkableFrom(seen, at(3))).toEqual(new Set([key(at(3)), key(at(2))]))

      for (const from of [at(2), at(3)]) {
        const offered = [...offeredTargets(seen, buildRoomClaims(seen), from).values()].map(key)
        expect(offered).not.toContain(key(at(1)))
        expect(offered).not.toContain(key(at(0)))
      }
    })
  }
})

// A fork is the room type that claims every neighbour it can, so it is the landing or departure that
// would absorb the mouth if anything did. Swapping one into a shape keeps the shape's own fixture.
const withFork = (grid: FloorGrid, [r, c]: readonly [number, number]): FloorGrid => {
  const cell = grid.cells[r][c]
  if (cell.type !== "room") return grid
  const cells = grid.cells.map(row => [...row])
  cells[r][c] = { ...cell, roomType: "fork" }
  return { ...grid, cells }
}

describe("a one-way mouth is a passage, never part of a room's blob", () => {
  for (const { axis, departure, landing } of shapes) {
    const name = `${axis.travel}-going drop, ${departure} departure, ${landing} landing`

    it(`is claimed by no room, even a fork on either side of it: ${name}`, () => {
      const { grid: base, at } = dropGrid(axis, departure, landing)
      const seen = completeCell(base, ...at(3))
      const variants = [seen, withFork(seen, at(3)), withFork(seen, at(1)), withFork(withFork(seen, at(1)), at(3))]
      for (const grid of variants) {
        const claims = buildRoomClaims(grid)
        expect(isOneWayMouth(grid, ...at(2))).toBe(true)
        expect([...claims.claimedBy.keys()]).not.toContain(key(at(2)))
        expect([...claims.openEdges].filter(edge => edge.split("|").includes(key(at(2))))).toEqual([])
      }
    })
  }

  it("still lets a fork claim the void around it, so the exclusion is not a claim switched off", () => {
    const { grid, at } = dropGrid(AXES[0], "room", "room")
    const claims = buildRoomClaims(withFork(completeCell(grid, ...at(3)), at(3)))
    const owned = [...claims.claimedBy.entries()].filter(([, owner]) => owner === key(at(3)))
    expect(owned.length).toBeGreaterThan(0)
    for (const [cellKey] of owned) expect(cellKey).not.toBe(key(at(2)))
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
    expect(isOneWayMouth(grid, 1, 2)).toBe(false)
    expect(buildRoomClaims(grid).claimedBy.get("1,2")).toBe("1,1")
  })
})
