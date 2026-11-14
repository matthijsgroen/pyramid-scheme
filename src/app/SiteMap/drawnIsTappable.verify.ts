import { expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { TOPOLOGY_ON } from "@/game/testSupport/modOff"
import { cellAt } from "@/game/roomFootprint"
import { prefabRoomAt, prefabRoomCells } from "@/game/roomShape"
import { walkableFrom } from "@/game/gridNavigation"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"
import { buildRoomClaims, floorTier, type RoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { clickTargetAt, markerAt, offerContextFrom, roomChoiceAt, type OfferContext } from "./clickTargets"
import { ringArrowList, tapCellAt } from "./ringArrows"
import { ringPoint } from "./arrowRing"
import { freeCells, markerCell } from "./roomWalk"
import { occupantOffset, standingOffset } from "./standingSpot"
import { CELL, COL_PITCH, PAD, PAD_TOP, PROP_H, ROW_PITCH, cellCenter } from "./mapScale"
import "@/mods/registerModApps"

// WHAT IS DRAWN AND USABLE TAKES THE TAP TO ITS NODE ON THE CELL WHERE IT IS DRAWN, on every shipped floor: a room's
// art, its marker and somebody standing in it, read off the drawing code, tapped from the node and from every walkable
// cell beside it, through the boxes and ring arrows the map draws and the way the map hands a tap on.

type Cell = readonly [number, number]
type Place = { pos: Cell; waypoint?: Cell }
const key = ([r, c]: Cell) => `${r},${c}`
const same = (a: Cell | null | undefined, b: Cell) => !!a && a[0] === b[0] && a[1] === b[1]
const cellOfPoint = (x: number, y: number): Cell => [
  Math.floor((y - PAD_TOP) / ROW_PITCH),
  Math.floor((x - PAD) / COL_PITCH),
]
// A gate's and a shut way's leaves hang on the approach seam beside the node; the gate's own marker on the node is its tap.
const SEAM_ART = new Set(["gate", "wall", "drop"])

const lit = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map(cell => (cell.type === "empty" ? cell : ({ ...cell, state: "completed" } as GridCell)))
  ),
})

/** Every usable thing a floor draws: its node and the cell it is drawn on. */
const drawnThings = (grid: FloorGrid, claims: RoomClaims, floorIndex: number) => {
  const things: { what: string; node: Cell; drawn: Cell }[] = []
  for (const sprite of nodeSpritesFor(grid, claims, floorTier(grid), new Map(), floorIndex)) {
    const [kind, at] = sprite.key.split(":")
    if (SEAM_ART.has(kind)) continue
    const x = sprite.x + (sprite.w ?? CELL) / 2
    const y = sprite.y + (sprite.h ?? PROP_H) - CELL / 2
    things.push({ what: kind, node: at.split(",").map(Number) as unknown as Cell, drawn: cellOfPoint(x, y) })
  }
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room") return
      things.push({ what: "marker", node: [r, c], drawn: markerCell(grid, r, c) })
      if (cell.family === undefined || !getFamilyPlugin(cell.family)?.meta.actor) return
      const { cx, cy } = cellCenter(r, c)
      const { dx, dy } = occupantOffset(grid, claims, r, c)
      const drawn = cellOfPoint(cx + dx, cy + dy)
      // Somebody standing in a room's only way is walked over (`freeCells`): that cell is a way first, its arrow's.
      const room = prefabRoomAt(grid, r, c)
      if (room && freeCells(grid, [r, c], room).has(key(drawn))) return
      things.push({ what: "figure", node: [r, c], drawn })
    })
  )
  return things
}

it("every usable thing drawn on a shipped floor is tapped to its node where it is drawn", () => {
  const failures: string[] = []
  for (const floor of allFloors()) {
    const carved = assembleFloor(floor.journeyId, floor.config, floor.seed, TOPOLOGY_ON.resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
    })
    if (!carved.success) continue
    const grid = lit(carved.grid)
    const claims = buildRoomClaims(grid)
    const owners = prefabRoomCells(grid)
    // The cells whose marker box the map draws on each cell.
    const boxesOn = new Map<string, Cell[]>()
    for (let r = -1; r <= grid.rows; r++)
      for (let c = -1; c <= grid.cols; c++) {
        const at = key(markerCell(grid, r, c))
        boxesOn.set(at, [...(boxesOn.get(at) ?? []), [r, c]])
      }
    const contexts = new Map<string, OfferContext>()
    const contextOf = ({ pos, waypoint }: Place) => {
      const id = `${key(pos)}|${waypoint ? key(waypoint) : ""}`
      if (!contexts.has(id)) contexts.set(id, offerContextFrom(grid, pos, { waypoint }))
      return contexts.get(id)!
    }
    // Where a tap the map hands on takes him, as `useSiteNavigation` reads it.
    const leadsTo = (place: Place, ctx: OfferContext, tap: Cell, node: Cell) => {
      const choice = roomChoiceAt(grid, ctx, place.pos, tap[0], tap[1])
      if (choice) return same(choice.to.kind === "stop" ? place.pos : choice.to.at, node)
      return same(clickTargetAt(grid, claims, tap[0], tap[1], ctx), node)
    }
    const tapsTo = (place: Place, drawn: Cell, node: Cell) => {
      const ctx = contextOf(place)
      const handed = (boxesOn.get(key(drawn)) ?? []).flatMap(([r, c]): Cell[] => {
        const offer = clickTargetAt(grid, claims, r, c, ctx)
        if (!offer) return []
        // A room's box is handed on as the cell it is drawn on; any other cell's arrow stands on the ring instead.
        if (cellAt(grid, r, c).type === "room") return [markerCell(grid, r, c)]
        const tap = tapCellAt(grid, ctx, r, c, offer)
        return tap && markerAt(grid, claims, r, c, ctx, offer)?.kind !== "arrow" ? [tap] : []
      })
      const { cx, cy } = cellCenter(...(place.waypoint ?? place.pos))
      const offset = place.waypoint ? { dx: 0, dy: 0 } : standingOffset(grid, claims, ...place.pos)
      const stand = { x: cx + offset.dx, y: cy + offset.dy }
      const arrows = ringArrowList(grid, claims, ctx)
        .filter(arrow => {
          const at = ringPoint(stand, arrow.dir)
          return same(cellOfPoint(at.x, at.y), drawn)
        })
        .map(arrow => arrow.tap)
      return [...handed, ...arrows].some(tap => leadsTo(place, ctx, tap, node))
    }
    // Where he can stand on a cell: in a designed room on its free floor, its stop being the node's own place.
    const placeOn = (at: Cell): Place | undefined => {
      const owner = owners.get(key(at))
      if (owner) {
        const node = owner.split(",").map(Number) as unknown as Cell
        const room = prefabRoomAt(grid, ...node)!
        if (!freeCells(grid, node, room).has(key(at))) return undefined
        return same(at, room.stop) ? { pos: node } : { pos: node, waypoint: at }
      }
      const cell = cellAt(grid, ...at)
      return cell.type === "empty" || (cell.type === "room" && cell.passage) ? undefined : { pos: at }
    }

    for (const { what, node, drawn } of drawnThings(grid, claims, floor.floorIndex)) {
      const name = `${floor.label}: ${what} of ${key(node)} drawn on ${key(drawn)}`
      if (!tapsTo({ pos: node }, drawn, node)) failures.push(`${name}, from the node`)
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const place = placeOn([drawn[0] + dr, drawn[1] + dc])
        if (!place || (same(place.pos, node) && !place.waypoint)) continue
        if (!walkableFrom(grid, place.pos).has(key(node))) continue
        if (!tapsTo(place, drawn, node))
          failures.push(`${name}, from ${key(place.pos)}${place.waypoint ? ` on ${key(place.waypoint)}` : ""}`)
      }
    }
  }
  expect(failures).toEqual([])
}, 600_000)
