import { fitPrefab } from "@/game/carve/placePrefabs"
import { fillsOf, variantsOf } from "@/game/prefabChecks"
import type { Prefab } from "@/game/prefabTypes"
import { STEP, sideOf } from "@/game/roomShape"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { floorFromPieces } from "./floorFrom"

type Cell = readonly [number, number]

export type PrefabPreview = {
  grid: FloorGrid
  /** The node the prefab is laid over, and the cell outside each door place in use, by the way out it serves. */
  node: Cell
  /** Where the player stands. */
  stop: Cell
  doors: Partial<Record<Direction, Cell>>
  /** The door places no straight arm from the node can reach, which stay walled. */
  unusedDoors: number
}

const DIRS: readonly Direction[] = ["n", "s", "e", "w"]
// Room for the arm beyond a door and the room it ends in, and a little floor around.
const MARGIN = 3

/** How many variants the prefab has, and how many fills the chosen variant has. */
export const prefabChoices = (prefab: Prefab, variant: number): { variants: number; fills: number } => {
  const all = variantsOf(prefab)
  return { variants: all.length, fills: fillsOf(all[variant % all.length], prefab).length }
}

/** The door places a straight arm from inside cell i,j reaches, by direction, as ring cells of the variant. */
const armsFrom = (cells: readonly string[], i: number, j: number): Partial<Record<Direction, Cell>> => {
  const arms: Partial<Record<Direction, Cell>> = {}
  for (const dir of DIRS) {
    const [dr, dc] = STEP[dir]
    let [r, c] = [i + dr, j + dc]
    while (cells[r]?.[c] !== undefined && cells[r][c] !== "#" && !ring(cells, r, c)) [r, c] = [r + dr, c + dc]
    if (cells[r]?.[c] === "d") arms[dir] = [r, c]
  }
  return arms
}

const ring = (cells: readonly string[], r: number, c: number): boolean =>
  r === 0 || c === 0 || r === cells.length - 1 || c === cells[0].length - 1

/**
 * The prefab's variant and fill laid over a made-up floor by the carve's own fit. The node stands on the free floor
 * cell with the most door places in a straight line from it; each such door is joined by an arm to a room outside,
 * the first of them the entrance. Every door place a straight arm cannot reach stays walled.
 */
export const prefabPreviewFloor = (prefab: Prefab, variant = 0, fill = 0): PrefabPreview => {
  const all = variantsOf(prefab)
  const chosen = all[variant % all.length]
  const cells = chosen.cells
  const candidates: { i: number; j: number; arms: Partial<Record<Direction, Cell>> }[] = []
  cells.forEach((row, i) =>
    [...row].forEach((ch, j) => {
      if (ch === ".") candidates.push({ i, j, arms: armsFrom(cells, i, j) })
    })
  )
  candidates.sort((a, b) => Object.keys(b.arms).length - Object.keys(a.arms).length)
  const doorCount = cells.join("").split("d").length - 1
  for (const { i, j, arms } of candidates) {
    const rows = Array.from({ length: cells.length + 2 * MARGIN }, () => Array(cells[0].length + 2 * MARGIN).fill(" "))
    const at = (r: number, c: number): Cell => [MARGIN + r, MARGIN + c]
    const put = ([r, c]: Cell, ch: string) => (rows[r][c] = ch)
    put(at(i, j), "G")
    let entrance = true
    for (const dir of DIRS) {
      const door = arms[dir]
      if (!door) continue
      const [dr, dc] = STEP[dir]
      let [r, c] = [i + dr, j + dc]
      for (; r !== door[0] || c !== door[1]; [r, c] = [r + dr, c + dc]) put(at(r, c), ".")
      put(at(r, c), ".")
      put(at(r + dr, c + dc), ".")
      put(at(r + 2 * dr, c + 2 * dc), entrance ? "E" : "R")
      entrance = false
    }
    if (entrance) put([0, 0], "E")
    const floor = floorFromPieces(
      rows.map(row => row.join("")),
      {
        R: dirs => ({ type: "room", roomType: "encounter", dirs: new Set(dirs), state: "fogged" }),
        G: dirs => ({ type: "room", roomType: "chamber", dirs: new Set(dirs), state: "fogged" }),
      }
    )
    const [r, c] = at(i, j)
    const prefabRoom = fitPrefab(floor, r, c, prefab, floor.siteId, { variant, fill })
    if (!prefabRoom) continue
    const node = floor.cells[r][c]
    if (node.type === "empty") continue
    const cellsOut = floor.cells.map(row => [...row])
    cellsOut[r][c] = { ...node, prefabRoom }
    const outside = Object.fromEntries(
      prefabRoom.doors.map(([dr, dc]) => {
        const dir = sideOf(prefabRoom.rect, [dr, dc])
        return [dir, [dr + STEP[dir][0], dc + STEP[dir][1]] as Cell]
      })
    )
    return {
      grid: { ...floor, difficulty: prefab.tier, cells: cellsOut },
      node: [r, c],
      stop: prefabRoom.stop,
      doors: outside,
      unusedDoors: doorCount - prefabRoom.doors.length,
    }
  }
  throw new Error(`${prefab.name} fits no node of its variant ${variant}`)
}
