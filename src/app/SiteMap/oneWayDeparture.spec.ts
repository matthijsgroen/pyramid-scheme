import { describe, expect, it } from "vitest"
import { completeCell, walkableFrom } from "@/game/gridNavigation"
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
