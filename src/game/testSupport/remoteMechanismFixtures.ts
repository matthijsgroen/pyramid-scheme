import type { FloorGrid, MechanismRecord } from "@/game/siteTypes"
import { regionsOf } from "@/game/floorLock"
import { floorWithHandle, gateKey } from "./handleFixtures"

export type Pos = [number, number]

/** A carved floor with one lever (`mechanismId` "lever") whose left side opens the vault and whose right
 * side opens the pocket; it starts on the left. */
export const leverFloor = (): FloorGrid => floorWithHandle({ in: "lever", left: ["vault"], right: ["pocket"] }).grid

const cellsWhere = (grid: FloorGrid, match: (r: number, c: number) => boolean): Pos[] =>
  grid.cells.flatMap((row, r) => row.flatMap((_, c): Pos[] => (match(r, c) ? [[r, c]] : [])))

export const leverAt = (grid: FloorGrid): Pos => {
  const [found] = cellsWhere(grid, (r, c) => {
    const cell = grid.cells[r][c]
    return cell.type === "room" && cell.mechanismId === "lever" && !!cell.mechanism
  })
  return found
}

/** A room in the ground a section's door leads into: the door's neighbouring region that is not the
 * lever's own. */
export const roomBeyondDoorOf = (grid: FloorGrid, section: string): Pos => {
  const { of } = regionsOf(grid)
  const [door] = cellsWhere(grid, (r, c) => {
    const cell = grid.cells[r][c]
    return cell.type === "room" && cell.requiredKeyId === gateKey(section)
  })
  const home = of.get(leverAt(grid).join(","))
  const beyond = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ]
    .map(([dr, dc]) => of.get(`${door[0] + dr},${door[1] + dc}`))
    .find(region => region !== undefined && region !== home)
  const [room] = cellsWhere(
    grid,
    (r, c) =>
      grid.cells[r][c].type === "room" &&
      !(grid.cells[r][c] as { requiredKeyId?: string }).requiredKeyId &&
      of.get(`${r},${c}`) === beyond
  )
  return room
}

/**
 * The floor with one move of the lever also made at `at`: the lever's record places it there and the
 * room at `at` points back at it. The lever's own cell keeps every other move.
 */
export const withRemoteMove = (grid: FloorGrid, move: { from?: string; to: string; at: Pos }): FloorGrid => {
  const [hr, hc] = leverAt(grid)
  const home = grid.cells[hr][hc]
  if (home.type !== "room" || !home.mechanism) throw new Error("the lever is gone")
  const transitions: NonNullable<MechanismRecord["transitions"]> = [...(home.mechanism.transitions ?? []), move]
  const cells = grid.cells.map((row, r) =>
    row.map((cell, c) => {
      if (cell.type !== "room") return cell
      if (r === hr && c === hc) return { ...cell, mechanism: { ...cell.mechanism!, transitions } }
      if (r === move.at[0] && c === move.at[1])
        return { ...cell, worksMechanism: { mechanismId: "lever", transition: transitions.length - 1 } }
      return cell
    })
  )
  return { ...grid, cells }
}
