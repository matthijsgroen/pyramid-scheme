// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FloorGrid } from "@/game/siteTypes"
import { dropLaunchedAt, revealAll } from "@/game/gridNavigation"
import { offerContextFrom, offeredTargets } from "./clickTargets"
import { buildRoomClaims } from "./roomClaims"
import { ringArrowList, ringArrows } from "./ringArrows"
import { SiteMapView } from "./SiteMapView"
import {
  AXES,
  KINDS,
  crossingFloor,
  doorStopForkFloor,
  dropGrid,
  edgePrefabFloor,
  fitForkFloor,
  floorFrom,
  forkFloor,
  prefabChestFloor,
  prefabForkFloor,
  prefabPorchFloor,
} from "./floorFixtures.testing"

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})

type Place = { at: readonly [number, number]; waypoint?: readonly [number, number] }

const FLOORS: Record<string, FloorGrid> = {
  "a plain corridor with corners": floorFrom(["E...R", "    .", "R...F", "    .", "    R"]),
  "a fork": forkFloor(),
  "a designed room over a fork": prefabForkFloor(),
  "a designed room over a fork, opening north": prefabForkFloor({}, true),
  "a designed room fitted to a fork": fitForkFloor(),
  "a designed room whose door is its stop": doorStopForkFloor(),
  "a crossing": crossingFloor(),
  "a designed room on an L edge": edgePrefabFloor("L"),
  "a designed room on a T edge": edgePrefabFloor("T"),
  "a designed room with a chest": prefabChestFloor(),
  "a designed room with a porch": prefabPorchFloor(),
  ...Object.fromEntries(
    AXES.flatMap(axis =>
      KINDS.map(kind => [`a drop going ${axis.travel} from a ${kind}`, dropGrid(axis, kind, kind, "reachable").grid])
    )
  ),
  ...Object.fromEntries(
    AXES.flatMap(axis =>
      KINDS.map(kind => [
        `a drop going ${axis.travel} to a ${kind}, entered below it`,
        dropGrid(axis, kind, kind, "reachable", "toNode").grid,
      ])
    )
  ),
}

/** Every place the player can stand by taking offers from the entrance, waypoints of designed rooms included. */
const placesOn = (grid: FloorGrid): Place[] => {
  const claims = buildRoomClaims(grid)
  const seen = new Map<string, Place>()
  const queue: Place[] = [{ at: grid.entrancePos }]
  while (queue.length > 0) {
    const place = queue.shift()!
    const key = `${place.at}|${place.waypoint ?? ""}`
    if (seen.has(key)) continue
    seen.set(key, place)
    const ctx = offerContextFrom(grid, place.at, { waypoint: place.waypoint })
    for (const { to } of ctx.choices.values())
      queue.push(
        to.kind === "waypoint" ? { at: place.at, waypoint: to.at } : { at: to.kind === "stop" ? place.at : to.at }
      )
    for (const target of offeredTargets(grid, claims, place.at, { waypoint: place.waypoint }).values())
      queue.push({ at: target })
  }
  return [...seen.values()]
}

describe("the arrows around the explorer", () => {
  for (const [name, floor] of Object.entries(FLOORS)) {
    it(`never point two ways the same direction, anywhere on ${name}`, () => {
      const grid = revealAll(floor)
      const claims = buildRoomClaims(grid)
      const places = placesOn(grid)
      expect(places.length).toBeGreaterThan(1)
      for (const { at, waypoint } of places) {
        const dirs = ringArrowList(grid, claims, offerContextFrom(grid, at, { waypoint })).map(({ dir }) => dir)
        expect([...new Set(dirs)].sort(), `standing at ${at} ${waypoint ?? ""}`).toEqual([...dirs].sort())
      }
    })
  }
})

describe("outside a designed room, the arrows around the explorer are the ways he can walk", () => {
  for (const [name, floor] of Object.entries(FLOORS)) {
    it(`point every way open from where he stands, and lead off his cell except to take a drop, on ${name}`, () => {
      const grid = revealAll(floor)
      const claims = buildRoomClaims(grid)
      for (const { at, waypoint } of placesOn(grid)) {
        const ctx = offerContextFrom(grid, at, { waypoint })
        if (ctx.choices.size > 0) continue
        const arrows = ringArrowList(grid, claims, ctx)
        const ownCell = arrows.filter(({ tap }) => tap[0] === at[0] && tap[1] === at[1])
        const open = grid.cells[at[0]][at[1]]
        expect(
          {
            pointed: arrows.map(({ dir }) => dir).filter(dir => open.type !== "empty" && open.dirs.has(dir)),
            onHisCell: ownCell.length > 0 && !dropLaunchedAt(grid, ...at),
          },
          `standing at ${at}`
        ).toEqual({ pointed: open.type === "empty" ? [] : [...open.dirs], onHisCell: false })
      }
    })
  }
})

// What a key presses is what a tap on the drawn arrow hands on: rendered, every ring arrow clicked.
describe("an arrow key and a tap on the arrow", () => {
  for (const name of [
    "a plain corridor with corners",
    "a designed room over a fork",
    "a crossing",
    "a drop going e to a corridor, entered below it",
  ]) {
    it(`hand on the same cell on ${name}`, () => {
      const grid = revealAll(FLOORS[name])
      const claims = buildRoomClaims(grid)
      for (const { at, waypoint } of placesOn(grid)) {
        const onCellClick = vi.fn()
        const { container, unmount } = render(
          <SiteMapView grid={grid} explorerPos={at} waypoint={waypoint} onCellClick={onCellClick} />
        )
        const arrows = container.querySelectorAll<HTMLElement>("[data-marker-cell]:has(svg > polygon)")
        arrows.forEach(arrow => fireEvent.click(arrow))
        unmount()
        const keyed = [...ringArrows(grid, claims, offerContextFrom(grid, at, { waypoint })).values()]
        expect(onCellClick.mock.calls.map(String).sort(), `standing at ${at} ${waypoint ?? ""}`).toEqual(
          keyed.map(String).sort()
        )
      }
    })
  }
})
