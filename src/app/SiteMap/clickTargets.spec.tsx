// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell, findPath, revealAll, walkableFrom } from "@/game/gridNavigation"
import { buildOfferContext, clickTargetAt, markerAt, offerContextFrom, offeredTargets } from "./clickTargets"
import { buildRoomClaims } from "./roomClaims"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { CELL, cellCenter } from "./mapScale"
import { DIR_MOVES } from "./corridorRuns"
import { AXES, DROP_AT, dropGrid, obstacleIndexes } from "./floorFixtures.testing"

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
  const targets = Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).filter(
    el => el.style?.cursor === "pointer"
  )
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
// reachable cell, let the game reveal what that opens, ask what the map now offers — and holds the same
// invariant at every step, because a target on void is the kind of thing that only appears once a
// particular corner has been turned.
// A pyramid is seeded from the player's own save (`randomSeed + levelNr`), so there is no single maze to
// check — the invariant has to hold for whatever maze the seed produced. Hence a spread of seeds.
//
// IT ASKS THE RULE, NOT THE DOM. This used to render the whole site map at every one of its 320 steps
// and read the answer back out of the markup, which cost forty seconds for a second's worth of graph
// work and made the suite's verdict depend on which CI runner it drew. `offeredTargets` is the same
// rule the renderer uses (`clickTargets.ts`), and "the renderer really uses it" is asserted directly
// below, so nothing is taken on trust. The seed list is longer than it was for the same reason: the
// fuzzing is what catches these, and it is now nearly free.
describe("what the map offers while walking a floor", () => {
  it.each([1, 3, 7, 11, 19, 23, 31, 47, 53, 61, 71, 83, 97, 101, 103, 107])(
    "never offers a target it cannot honour, seed %i",
    seed => {
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

        for (const [from, [r, c]] of offeredTargets(grid, buildRoomClaims(grid), at)) {
          const cell = grid.cells[r]?.[c]
          if (!cell || cell.type === "empty") offences.push(`step ${step}: ${from} offers void (${r},${c})`)
          // …and standable is not enough: it has to be somewhere the player can actually walk to from
          // where they stand, or the marker is a promise the map cannot keep.
          else if (findPath(grid, at, [r, c]).length === 0)
            offences.push(`step ${step}: ${from} offers (${r},${c}) with no route`)
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
    }
  )
})

// THE BRIDGE. The walk above is only worth anything if the rule it asks is the rule the map draws, so
// this is the one place that still renders: every cell the map makes tappable, and the cell each of
// those taps leads to, against what `offeredTargets` says without rendering anything. Renders a
// handful of real floors rather than hundreds of steps of one.
describe("the map taps exactly what the rule offers", () => {
  const sorted = (pairs: readonly (readonly [number, number])[]) => [...pairs].map(([r, c]) => `${r},${c}`).sort()

  for (const siteId of ["starter_1", "starter_2", "junior_1", "master_2"]) {
    it(`agrees with the drawn map on ${siteId}`, () => {
      const { grid, at } = arrivedAtEntrance(siteId)

      const tapped = clickEveryTarget(grid, at)
      const offered = [...offeredTargets(grid, buildRoomClaims(grid), at).values()]

      expect(tapped.length).toBeGreaterThan(0)
      expect(sorted(tapped)).toEqual(sorted(offered))
    })
  }
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

// The corridor detector's own hint is a marker on the cell BESIDE a hidden passage: masking erases the
// hidden cell, takes away this cell's direction into it, and forces it reachable so the player can walk
// back and stand there — which is what reveals the passage (useCorridorDetection). Gating markers on a
// live walk must not take that hint away, so it is asserted here rather than left to be noticed.
describe("the corridor detector's hint", () => {
  it("still marks the cell beside a hidden passage", () => {
    const grid: FloorGrid = {
      siteId: "detector",
      rows: 1,
      cols: 3,
      entrancePos: [0, 0],
      exitPos: [0, 2],
      staircases: {},
      cells: [
        [
          { type: "room", roomType: "portal", dirs: new Set(["e"]), state: "completed" },
          // The junction: its dir east was removed with the hidden cell beyond it, and the detector
          // forced it reachable. The room west still points into it, which is how it stays walkable.
          { type: "corridor", dirs: new Set(["w"]), state: "reachable" },
          { type: "empty" },
        ],
      ],
    }

    const onCellClick = vi.fn()
    const { container } = render(<SiteMapView grid={grid} explorerPos={[0, 0]} onCellClick={onCellClick} />)
    const junction = Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).find(
      el => parseFloat(el.style.left) === cellCenter(0, 1).cx - CELL / 2
    )

    expect(junction?.querySelector("circle[stroke]")).toBeTruthy()
    expect(junction?.style.cursor).toBe("pointer")
  })
})

// SOFT GATING, WHICH IS EVERY GATE BUT ONE. A ward and an authored floor-key door each carry the family
// that renders them, so the player walks up, taps, and is told what it wants. Only a way out a switch
// shut — bars with nothing behind them to enter — is a wall (`isSealedWayOut`), and narrowing the block
// to that is the whole of the claim: pinned here against real gates off a real carve.
describe("a gate the player can enter", () => {
  const gatedFloor: FloorConfig = {
    pathPuzzles: 2,
    difficulty: "junior",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "ward:pin" } },
      { pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "floor-key", color: "red" } },
    ],
  }

  const gatesOf = (grid: FloorGrid) =>
    grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.type === "room" && cell.tags?.includes("gate") && cell.requiredKeyId
          ? [{ at: [r, c] as [number, number], variant: cell.gateVariant, family: cell.family }]
          : []
      )
    )

  const carved = (() => {
    for (let seed = 0; seed < 40; seed++) {
      const result = assembleFloor("gate-pin", gatedFloor, seed)
      if (result.success && gatesOf(result.grid).length === 2) return revealAll(result.grid)
    }
    throw new Error("no seed carved both a ward and a floor-key door")
  })()

  const gates = gatesOf(carved)

  it("is a ward and an authored floor-key door, each with its own family standing in it", () => {
    expect(gates.map(gate => gate.variant).sort()).toEqual(["floor-key", "tomb-key"])
    expect(gates.every(gate => gate.family !== undefined)).toBe(true)
  })

  it.each([0, 1])("is walked up to and tapped from the passage outside it, gate %i", index => {
    const gate = gates[index]
    const cell = carved.cells[gate.at[0]][gate.at[1]]
    if (cell.type === "empty") throw new Error("a gate stood on no cell at all")
    const [dir] = [...cell.dirs]
    const outside: [number, number] = [gate.at[0] + DIR_MOVES[dir][0], gate.at[1] + DIR_MOVES[dir][1]]

    expect(walkableFrom(carved, outside).has(`${gate.at[0]},${gate.at[1]}`)).toBe(true)
    expect(findPath(carved, outside, gate.at).length).toBeGreaterThan(0)
    expect([...offeredTargets(carved, buildRoomClaims(carved), outside).values()]).toContainEqual(gate.at)
  })
})

// A ZIPLINE IS TAKEN, NOT WALKED: the launch and the landing are destinations on their own side, and
// the obstacle between them is never one. Offers are asserted as whole sets of targets, so a target that
// leaks across the obstacle, or one that goes missing, is red either way.
describe("the offers around a one-way drop", () => {
  const key = ([r, c]: readonly [number, number]) => `${r},${c}`
  const targetsFrom = (grid: FloorGrid, from: readonly [number, number]) =>
    new Set([...offeredTargets(grid, buildRoomClaims(grid), from).values()].map(key))

  describe.each(AXES)("going $travel", axis => {
    const { grid, at } = dropGrid(axis, "room", "room", "reachable")

    it("offers its own side's two ends and nothing across the obstacle, from the launch's side", () => {
      const side = new Set([key(at(DROP_AT.fromNode)), key(at(DROP_AT.launch))])
      expect(targetsFrom(grid, at(DROP_AT.fromNode))).toEqual(side)
      expect(targetsFrom(grid, at(DROP_AT.launch))).toEqual(side)
    })

    it("offers its own side's two ends and nothing across the obstacle, from the landing's side", () => {
      const side = new Set([key(at(DROP_AT.landing)), key(at(DROP_AT.toNode))])
      expect(targetsFrom(grid, at(DROP_AT.toNode))).toEqual(side)
      expect(targetsFrom(grid, at(DROP_AT.landing))).toEqual(side)
    })

    // The four places a player stands at a drop, each asserted as the WHOLE of what is drawn: an arrow on a
    // launch or landing pointing the way it is entered from its own node (whether or not it has been
    // walked), and the node art on a room.
    describe.each(["reachable", "completed"] as const)("with every cell %s", state => {
      const { grid: stated, at: statedAt } = dropGrid(axis, "room", "room", state)
      const markersFrom = (from: readonly [number, number]) => {
        const ctx = offerContextFrom(stated, from, {})
        const claims = buildRoomClaims(stated)
        return Object.fromEntries(
          [...offeredTargets(stated, claims, from).keys()].sort().map(cell => {
            const [r, c] = cell.split(",").map(Number)
            return [cell, markerAt(stated, claims, r, c, ctx)]
          })
        )
      }
      const fromSide = {
        [key(statedAt(DROP_AT.fromNode))]: { kind: "node" },
        [key(statedAt(DROP_AT.launch))]: { kind: "arrow", dir: axis.travel },
      }
      const toSide = {
        [key(statedAt(DROP_AT.landing))]: { kind: "arrow", dir: axis.back },
        [key(statedAt(DROP_AT.toNode))]: { kind: "node" },
      }

      it("marks the launch with an arrow from beside it and from on it", () => {
        expect(markersFrom(statedAt(DROP_AT.fromNode))).toEqual(fromSide)
        expect(markersFrom(statedAt(DROP_AT.launch))).toEqual(fromSide)
      })

      it("marks the landing with an arrow from beside it and from on it", () => {
        expect(markersFrom(statedAt(DROP_AT.toNode))).toEqual(toSide)
        expect(markersFrom(statedAt(DROP_AT.landing))).toEqual(toSide)
      })
    })

    // An arrow appears only around the player. Walkability is lifted (walkFrom undefined) so that all four
    // ends are offered at once, and only the standing cell the arrows are reckoned from varies: an end away
    // from it must still draw something, a dot, never nothing and never an arrow left behind.
    describe.each(["reachable", "completed"] as const)("with every cell %s, seen from across the floor", state => {
      const { grid: stated, at: statedAt } = dropGrid(axis, "room", "room", state)
      const markersFrom = (runFrom: readonly [number, number], runsSuppressed = false) => {
        const ctx = buildOfferContext(stated, { walkFrom: undefined, runFrom, runsSuppressed, freeWalk: false })
        const claims = buildRoomClaims(stated)
        // The four ends only: with walkability lifted the obstacle's own cells are offered too, and drawn nothing.
        return Object.fromEntries(
          Object.values(DROP_AT).map(i => {
            const [r, c] = statedAt(i)
            return [key([r, c]), markerAt(stated, claims, r, c, ctx)]
          })
        )
      }

      it("draws a dot on the far launch and an arrow only on the landing beside the player", () => {
        expect(markersFrom(statedAt(DROP_AT.toNode))).toEqual({
          [key(statedAt(DROP_AT.fromNode))]: { kind: "node" },
          [key(statedAt(DROP_AT.launch))]: { kind: "dot" },
          [key(statedAt(DROP_AT.landing))]: { kind: "arrow", dir: axis.back },
          [key(statedAt(DROP_AT.toNode))]: { kind: "node" },
        })
      })

      it("draws a dot on the far landing and an arrow only on the launch beside the player", () => {
        expect(markersFrom(statedAt(DROP_AT.fromNode))).toEqual({
          [key(statedAt(DROP_AT.fromNode))]: { kind: "node" },
          [key(statedAt(DROP_AT.launch))]: { kind: "arrow", dir: axis.travel },
          [key(statedAt(DROP_AT.landing))]: { kind: "dot" },
          [key(statedAt(DROP_AT.toNode))]: { kind: "node" },
        })
      })

      it("draws a dot on both ends while the explorer is gliding", () => {
        expect(markersFrom(statedAt(DROP_AT.fromNode), true)).toEqual({
          [key(statedAt(DROP_AT.fromNode))]: { kind: "node" },
          [key(statedAt(DROP_AT.launch))]: { kind: "dot" },
          [key(statedAt(DROP_AT.landing))]: { kind: "dot" },
          [key(statedAt(DROP_AT.toNode))]: { kind: "node" },
        })
      })
    })

    it("draws no marker on any cell of the obstacle, from any standing place", () => {
      for (const standing of [DROP_AT.fromNode, DROP_AT.launch, DROP_AT.landing, DROP_AT.toNode]) {
        const ctx = offerContextFrom(grid, at(standing), {})
        for (const index of obstacleIndexes) {
          const [r, c] = at(index)
          expect(markerAt(grid, buildRoomClaims(grid), r, c, ctx)).toBeNull()
        }
      }
    })
  })
})

// THE DRIFT GUARD. The game's context and the specs' used to be two assemblies; they are one builder
// (`buildOfferContext`) now, and this holds the view to it in the state where they could differ: the
// explorer is gliding, so the live position (walk rule) and the settled one (run arrows) are different
// cells. Pinned as it is today — walk reckoned from the live cell, no run arrows — not as it should be.
describe("the map in mid-glide taps what the one builder offers", () => {
  const sorted = (pairs: readonly (readonly [number, number])[]) => [...pairs].map(([r, c]) => `${r},${c}`).sort()

  const glide = (grid: FloorGrid, settled: readonly [number, number], live: readonly [number, number]) => {
    const onCellClick = vi.fn()
    const { container, rerender } = render(<SiteMapView grid={grid} explorerPos={settled} onCellClick={onCellClick} />)
    rerender(<SiteMapView grid={grid} explorerPos={live} onCellClick={onCellClick} />)
    for (const el of container.querySelectorAll<HTMLElement>("[data-marker-cell]"))
      if (el.style?.cursor === "pointer") fireEvent.click(el)

    const claims = buildRoomClaims(grid)
    const ctx = buildOfferContext(grid, { walkFrom: live, runFrom: settled, runsSuppressed: true, freeWalk: false })
    const offered: [number, number][] = []
    for (let r = -1; r <= grid.rows; r++)
      for (let c = -1; c <= grid.cols; c++) {
        const target = clickTargetAt(grid, claims, r, c, ctx)
        if (target) offered.push([target[0], target[1]])
      }
    return {
      ctx,
      tapped: sorted(onCellClick.mock.calls as [number, number][]),
      offered: sorted(offered),
      atRest: (at: readonly [number, number]) => sorted([...offeredTargets(grid, claims, at).values()]),
    }
  }

  it("offers no run arrows while the dot is travelling", () => {
    const { grid, at: settled } = arrivedAtEntrance("junior_1")
    const live = grid.cells
      .flatMap((row, r) => row.map((cell, c) => ({ cell, r, c })))
      .filter(
        ({ cell, r, c }) =>
          cell.type !== "empty" && cell.state === "reachable" && (r !== settled[0] || c !== settled[1])
      )
      .map(({ r, c }) => [r, c] as const)[0]
    if (!live) throw new Error("no cell to glide to")

    const { ctx, tapped, offered, atRest } = glide(grid, settled, live)

    expect(ctx.runTargets.size).toBe(0)
    // A glide only ever runs along a route, so both ends lie on one connected floor and the walk rule gives
    // the same answer from either: the live-vs-settled walk position is not observable here, only the arrows.
    expect(walkableFrom(grid, live)).toEqual(walkableFrom(grid, settled))
    expect(tapped).toEqual(offered)
    expect(offered).not.toEqual(atRest(settled))
  })
})
