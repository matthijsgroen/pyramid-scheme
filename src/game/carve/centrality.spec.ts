import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell } from "../siteTypes"
import { centrality } from "./centrality"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** A floor drawn as text: every `.` is a corridor open toward each drawn neighbour. */
const floorFrom = (rows: string[]): FloorGrid => {
  const cols = Math.max(...rows.map(row => row.length))
  const drawn = (r: number, c: number) => (rows[r]?.[c] ?? " ") !== " "
  const cells = rows.map((_, r) =>
    Array.from({ length: cols }, (_, c): GridCell => {
      if (!drawn(r, c)) return { type: "empty" }
      const dirs = (Object.keys(MOVES) as Direction[]).filter(d => drawn(r + MOVES[d][0], c + MOVES[d][1]))
      return { type: "corridor", dirs: new Set(dirs), state: "fogged" }
    })
  )
  return {
    siteId: "test",
    rows: rows.length,
    cols,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    staircases: {},
    difficulty: "expert",
    cells,
  }
}

// A T: arms of 2 west and east of the fork at 0,2, and 4 south of it.
const T = floorFrom([".....", "  .  ", "  .  ", "  .  ", "  .  "])

describe("centrality", () => {
  it("scores the fork 1 and the far end of the longest arm 0", () => {
    const score = centrality(T, [
      [0, 2],
      [4, 2],
    ])
    expect(score.get("0,2")).toBe(1)
    expect(score.get("4,2")).toBe(0)
  })

  it("scores equal arms equally", () => {
    const score = centrality(T, [
      [0, 1],
      [0, 3],
    ])
    expect(score.get("0,1")).toBe(score.get("0,3"))
  })

  it("scores every room 1 when none is further out than another", () => {
    const score = centrality(floorFrom(["..."]), [[0, 0]])
    expect(score.get("0,0")).toBe(1)
  })
})
