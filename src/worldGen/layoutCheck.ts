// THE LAYOUT IS PICKED BEFORE THE LOOT, AND IT IS THE LAYOUT THAT SHIPS. Every floor's `seed` + `packing` is chosen
// on the structural world (configBuilder.ts, `pickLayout`), so placement walks the floors the player walks. Loot is
// placed afterwards and must move no wall; this is the check that it did not.
import type { FloorConfig as GameFloorConfig, FloorGrid, GridCell } from "../game/siteTypes"
import { WEB_SAND_REALISATION } from "../game/webDoors"
import { hashString } from "../support/hashString"
import type { SiteConfig } from "./types"

/** Carves one floor of the final world afresh, never through a cache filled while the layout was picked. Null
 * when the floor does not carve. */
export type CarveFinalFloor = (
  journeyId: string,
  levelNr: number,
  floorIndex: number,
  config: GameFloorConfig
) => FloorGrid | null

/** How a floor is named in a layout map: its journey, 1-based level and floor index. */
export const layoutKey = (journeyId: string, levelNr: number, floorIndex: number): string =>
  `${journeyId}#${levelNr}#${floorIndex}`

// A web door or web gate is laid on a corridor of the finished carve (game/webDoors.ts) and moves no wall, so it
// reads as the corridor it stands in. Web placement has its own check (webPlacement.ts, `placementMoved`).
const isWebDoor = (cell: GridCell): boolean =>
  cell.type === "room" && (cell.webDoor !== undefined || cell.regionBarrier?.realisation === WEB_SAND_REALISATION)

const cellShape = (cell: GridCell): string => {
  if (cell.type === "empty") return "."
  const dirs = [...cell.dirs].sort().join("")
  const hidden = "hidden" in cell && cell.hidden ? "h" : ""
  if (cell.type === "corridor" || isWebDoor(cell)) return `c${dirs}${hidden}`
  return `r${cell.roomType}${dirs}${hidden}`
}

/** A hash of a floor's cells and walls: where ground lies, which way it opens, which of it is a room. What stands in
 * a room (a reward, a shop's stock, a key) and the web's doors and gates are left out. */
export const gridShape = (grid: FloorGrid): string => {
  const stairs = Object.entries(grid.staircases)
    .map(([id, [r, c]]) => `${id}@${r},${c}`)
    .sort()
    .join(";")
  const cells = grid.cells.map(row => row.map(cellShape).join(" ")).join("\n")
  const text = `${grid.rows}x${grid.cols}|${grid.entrancePos.join(",")}|${grid.exitPos.join(",")}|${stairs}\n${cells}`
  return hashString(text).toString(36)
}

/** Every floor of the final world whose shape differs from the one its layout was picked on, carving each afresh:
 * placing loot moved a wall there. A floor with no picked shape, or one that no longer carves, is named too. */
export const layoutMoved = (
  picked: ReadonlyMap<string, string>,
  configs: Record<string, SiteConfig[]>,
  carve: CarveFinalFloor
): string[] =>
  Object.entries(configs).flatMap(([journeyId, sites]) =>
    sites.flatMap((site, levelIndex) =>
      site.flatMap((floor, floorIndex) => {
        const levelNr = levelIndex + 1
        const name = `${journeyId} level ${levelNr} floor ${floorIndex}`
        const before = picked.get(layoutKey(journeyId, levelNr, floorIndex))
        if (before === undefined) return [`${name}: no layout was picked`]
        const grid = carve(journeyId, levelNr, floorIndex, floor as GameFloorConfig)
        if (!grid) return [`${name}: no longer carves after the loot was placed`]
        return gridShape(grid) === before ? [] : [`${name}: the loot placed after the layout moved a wall`]
      })
    )
  )
