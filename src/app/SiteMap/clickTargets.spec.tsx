import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell, findPath } from "@/game/gridNavigation"
import type { FloorGrid } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})

// Every marker the map offers has to lead somewhere the player can stand. A target on void walks the
// explorer off the drawn map, and the only thing that brings it back is the unstandable-position
// guard in useAssembledFloor putting the player at the entrance — which reads as the dot leaping out
// of the map and walking home.
const arrivedAtEntrance = (siteId: string): { grid: FloorGrid; at: readonly [number, number] } => {
  const floor = generatedWorldConfigs[siteId]?.flat()[0]
  if (!floor) throw new Error(`no ${siteId} floor to read`)
  const result = assembleFloor(`${siteId}:0`, floor, 7)
  if (!result.success) throw new Error("assembly failed")
  const [er, ec] = result.grid.entrancePos
  // What the player sees on arrival: the entrance walked, its neighbours revealed by the game's own
  // reveal rules.
  return { grid: completeCell(result.grid, er, ec), at: result.grid.entrancePos }
}

const clickEveryTarget = (grid: FloorGrid, at: readonly [number, number]) => {
  const onCellClick = vi.fn()
  const { container } = render(<SiteMapView grid={grid} explorerPos={at} onCellClick={onCellClick} />)
  const targets = Array.from(container.querySelectorAll<SVGGElement>("g")).filter(el => el.style?.cursor === "pointer")
  for (const target of targets) fireEvent.click(target)
  return onCellClick.mock.calls as [number, number][]
}

describe("what the map offers to click", () => {
  for (const siteId of ["starter_1", "starter_2", "junior_1", "master_2"]) {
    it(`only leads somewhere standable on ${siteId}`, () => {
      const { grid, at } = arrivedAtEntrance(siteId)
      const clicks = clickEveryTarget(grid, at)

      const unstandable = clicks.filter(([r, c]) => {
        const cell = grid.cells[r]?.[c]
        return !cell || cell.type === "empty"
      })

      expect(clicks.length).toBeGreaterThan(0)
      expect(unstandable).toEqual([])
    })
  }
})

// Arrival is one state out of hundreds. This walks the floor the way a player does — step onto a
// reachable cell, let the game reveal what that opens, look at what the map now offers — and holds the
// same invariant at every step, because a target on void is the kind of thing that only appears once
// a particular corner has been turned.
// A pyramid is seeded from the player's own save (`randomSeed + levelNr`), so there is no single maze
// to check — the invariant has to hold for whatever maze the seed produced. Hence a spread of seeds
// rather than one.
describe("what the map offers while walking a floor", () => {
  it.each([1, 3, 7, 11, 19, 23, 31, 47])("never offers a target it cannot honour, seed %i", seed => {
    const floor = generatedWorldConfigs["starter_1"]?.flat()[0]
    if (!floor) throw new Error("no starter_1 floor to read")
    const assembled = assembleFloor("starter_1:0", floor, seed)
    if (!assembled.success) throw new Error("assembly failed")

    let grid = assembled.grid
    let at = assembled.grid.entrancePos
    const offences: string[] = []
    let steps = 0

    for (let step = 0; step < 40; step++) {
      grid = completeCell(grid, at[0], at[1])
      steps++

      for (const [r, c] of clickEveryTarget(grid, at)) {
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") offences.push(`step ${step}: (${r},${c}) is void`)
        // …and standable is not enough: it has to be somewhere the player can actually walk to from
        // where they stand, or the marker is a promise the map cannot keep.
        else if (findPath(grid, at, [r, c]).length === 0) offences.push(`step ${step}: (${r},${c}) has no route`)
      }

      // Walk on: the nearest reachable cell that is not where we already stand.
      const next: [number, number] | undefined = grid.cells.flatMap((row, r) =>
        row.flatMap((cell, c) =>
          cell.type !== "empty" && cell.state === "reachable" && !(r === at[0] && c === at[1])
            ? ([[r, c]] as [number, number][])
            : []
        )
      )[0]
      if (!next) break
      at = next
    }

    expect(steps).toBeGreaterThan(5)
    expect(offences).toEqual([])
  })
})

// The other half of the same defect: the map only ever offered standable targets (above), but the
// click itself did not ask whether the player could actually WALK there. With no route, findPath used
// to hand back a straight line and the explorer crossed the stone between.
describe("a tap is a walk", () => {
  it("does not move the player somewhere with no walkable route", () => {
    const { grid } = arrivedAtEntrance("starter_1")
    // Somewhere lit and standable, but with nothing walked between here and there: the far corner of
    // the floor, revealed by hand rather than reached.
    const far = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.state === "fogged" ? [[r, c] as [number, number]] : []))
    )
    expect(far.length).toBeGreaterThan(0)

    const [r, c] = far[far.length - 1]
    const lit = {
      ...grid,
      cells: grid.cells.map((row, rr) =>
        row.map((cell, cc) => (rr === r && cc === c ? { ...cell, state: "reachable" as const } : cell))
      ),
    }

    expect(findPath(lit, lit.entrancePos, [r, c])).toEqual([])
  })
})

// The rule this all comes down to: an affordance the map cannot honour is worse than no affordance.
// A corner offered but unreachable is a tap that does nothing, where a plain dead end would have told
// the truth — so the marker and the pointer are gated on the same walk the click has to make.
describe("what the map offers", () => {
  for (const siteId of ["starter_1", "junior_1"]) {
    it(`is never a target it cannot walk to on ${siteId}`, () => {
      const { grid, at } = arrivedAtEntrance(siteId)
      const clicks = clickEveryTarget(grid, at)

      const unwalkable = clicks.filter(([r, c]) => findPath(grid, at, [r, c]).length === 0)

      expect(clicks.length).toBeGreaterThan(0)
      expect(unwalkable).toEqual([])
    })
  }
})
