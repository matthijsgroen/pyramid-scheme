import type { FloorGrid, GridCell, Direction, CellState, TombKeyReward } from "./siteTypes"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const opposite: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

export const getCell = (grid: FloorGrid, r: number, c: number): GridCell | undefined => grid.cells[r]?.[c]

/**
 * A WAY OUT A SWITCH SHUT: a wall the player can see, not a door they walk up to.
 *
 * It wears a gate's bars and holds nothing to enter — no family renders it, and no key anything mints
 * ever satisfies it. The board standing in the fork is the only thing that opens one, and it opens it
 * by giving the cell back the corridor it was cut from. So the player may see it and read that the way
 * is shut; they may not stand on it, pass it, or have anything beyond it revealed.
 *
 * Every other gate — a ward, an authored floor-key door — carries the family that renders it, and stays
 * soft-gated: walked up to, tapped, and told what it wants.
 */
export const isSealedWayOut = (cell: GridCell | undefined): boolean =>
  cell?.type === "room" &&
  cell.family === undefined &&
  cell.requiredKeyId !== undefined &&
  (cell.tags?.includes("gate") ?? false)

export const getOwnedKeys = (grid: FloorGrid): ReadonlySet<string> => {
  const keys = new Set<string>()
  for (const row of grid.cells)
    for (const cell of row)
      if (cell.type === "room" && cell.state === "completed" && cell.reward?.type === "tombKey")
        keys.add((cell.reward as TombKeyReward).keyId)
  return keys
}

const ALL_DIRS: Direction[] = ["n", "s", "e", "w"]

/**
 * The direction from (row,col) toward a ONE-WAY MOUTH standing next to it, if any: a corridor
 * whose only direction points back at (row,col) rather than away from it — the shape a drop's
 * connector takes seen from its landing, the end that names no direction of its own into it. A
 * genuine dead end's single direction is the direction that led there, never the direction back,
 * so it never matches this.
 */
export const oneWayMouthDir = (grid: FloorGrid, row: number, col: number): Direction | undefined => {
  for (const dir of ALL_DIRS) {
    const [dr, dc] = MOVES[dir]
    const neighbor = getCell(grid, row + dr, col + dc)
    if (neighbor?.type === "corridor" && neighbor.dirs.size === 1 && neighbor.dirs.has(opposite[dir])) return dir
  }
  return undefined
}

/** Brings a one-way mouth next to (row,col) out of the fog — and only that one cell, never what
 * stands beyond it — the moment (row,col) itself is seen. Read off `grid`, the shape carved into
 * it never changing mid-walk, but written into `cells`, this call's own running state. */
const revealOneWayMouth = (cells: GridCell[][], grid: FloorGrid, row: number, col: number): void => {
  const dir = oneWayMouthDir(grid, row, col)
  if (!dir) return
  const [dr, dc] = MOVES[dir]
  const neighbor = cells[row + dr]?.[col + dc]
  if (neighbor?.type === "corridor" && neighbor.state === "fogged") {
    cells[row + dr][col + dc] = { ...neighbor, state: "visible" }
  }
}

export const completeCell = (grid: FloorGrid, row: number, col: number): FloorGrid => {
  // 1. Shallow-copy cells (immutable update)
  const newCells: GridCell[][] = grid.cells.map(r => [...r])

  // 2. Mark (row,col) as completed
  const targetCell = newCells[row][col]
  if (targetCell.type === "room") {
    newCells[row][col] = { ...targetCell, state: "completed" }
  } else if (targetCell.type === "corridor") {
    newCells[row][col] = { ...targetCell, state: "completed" }
  }
  revealOneWayMouth(newCells, grid, row, col)

  const updatedGrid = { ...grid, cells: newCells }

  // 3. BFS through corridors and rooms from (row,col)
  const cell = newCells[row][col]
  if (cell.type === "empty") return updatedGrid

  type QItem = { r: number; c: number; fromDir: Direction | null }
  const visited = new Set<string>([`${row},${col}`])
  const queue: QItem[] = []

  // Seed queue with all dirs from completed cell
  const cellDirs = cell.type === "room" || cell.type === "corridor" ? cell.dirs : new Set<Direction>()
  for (const dir of cellDirs) {
    const [dr, dc] = MOVES[dir]
    queue.push({ r: row + dr, c: col + dc, fromDir: dir })
  }

  while (queue.length > 0) {
    const { r, c, fromDir } = queue.shift()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)

    const neighbor = newCells[r]?.[c]
    if (!neighbor || neighbor.type === "empty") continue

    if (neighbor.type === "corridor") {
      // Straight-through: corridor continues in the same direction we arrived from, no branches.
      // Anything else (corner, T-junction) is a blind spot the player must click to reveal. A
      // one-way connector's single direction is the arrival direction itself (never its opposite,
      // which is what a real dead end carries instead), so it is a straight-through too: there is
      // nowhere else it could lead, and no branch to click around.
      //
      // A one-way LANDING is not this, even though it can look like it: its dirs never include the
      // direction back to the connector (that asymmetry is the whole feature), so an ordinary size-2
      // cell whose two real directions happen to include the drop's own travel direction reads as
      // "continues straight" by the size/membership check alone. A genuine two-way straight or corner
      // always carries the reciprocal (`opposite[fromDir]`) — only a one-way's blind side lacks it —
      // so requiring it here is inert for every ordinary corridor and stops the reveal exactly at the
      // landing, which is the one cell "what lies beyond stays dark" is about.
      const isStraight =
        fromDir !== null &&
        neighbor.dirs.has(fromDir) &&
        (neighbor.dirs.size === 1 || (neighbor.dirs.size === 2 && neighbor.dirs.has(opposite[fromDir])))
      if (isStraight) {
        if (neighbor.state === "fogged") {
          newCells[r][c] = { ...neighbor, state: "visible" }
        }
        const oppDir = opposite[fromDir]
        for (const d of neighbor.dirs) {
          if (d === oppDir) continue
          const [dr, dc] = MOVES[d]
          const nr = r + dr,
            nc = c + dc
          if (!visited.has(`${nr},${nc}`)) {
            queue.push({ r: nr, c: nc, fromDir: d })
          }
        }
      } else {
        // Corner/junction: mark reachable so player can click to look around it
        if (neighbor.state === "fogged") {
          newCells[r][c] = { ...neighbor, state: "reachable" }
        }
      }
    } else if (neighbor.type === "room") {
      // A room comes out of the fog so the player can see it, and the walk stops there: reachability
      // past it only happens once it is completed, which "don't traverse through rooms" below
      // enforces. That is as true of a shut way out, which is seen and never completed, as it is of a
      // gate a family renders, where the family shows "you don't have the key yet" and refuses to
      // solve — those stay approachable and clickable like any other room.
      if (neighbor.state === "fogged" || neighbor.state === "visible") {
        newCells[r][c] = { ...neighbor, state: "reachable" }
        revealOneWayMouth(newCells, grid, r, c)
      }
      // Don't traverse through rooms
    }
  }

  return { ...grid, cells: newCells }
}

export const findPath = (
  grid: FloorGrid,
  from: readonly [number, number],
  to: readonly [number, number]
): Array<readonly [number, number]> => {
  const [fr, fc] = from
  const [tr, tc] = to
  if (fr === tr && fc === tc) return [[fr, fc]]

  const key = (r: number, c: number) => `${r},${c}`
  const parent = new Map<string, string | null>([[key(fr, fc), null]])
  const queue: Array<readonly [number, number]> = [[fr, fc]]

  outer: while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") continue
    for (const d of cell.dirs) {
      const [dr, dc] = MOVES[d]
      const nr = r + dr,
        nc = c + dc
      const nk = key(nr, nc)
      if (parent.has(nk)) continue
      const neighbor = grid.cells[nr]?.[nc]
      // Now that real loops exist, the graph-shortest route isn't always the one the
      // player has actually walked — it can cut through a corridor never revealed yet.
      // Restricting to non-fogged cells keeps the animated path on ground the player has
      // genuinely seen, even if that means a longer route than the absolute shortest one.
      // A shut way out is a wall, so no route ends on it and none runs through it.
      if (!neighbor || neighbor.type === "empty" || neighbor.state === "fogged" || isSealedWayOut(neighbor)) continue
      parent.set(nk, key(r, c))
      if (nr === tr && nc === tc) break outer
      queue.push([nr, nc])
    }
  }

  // No route: an EMPTY path. It used to return `[from, to]`, a two-point straight line, and every
  // caller believed it — the explorer glided across solid stone to a cell it had no way of reaching,
  // which is what a tap on a cell with no walkable route looked like.
  if (!parent.has(key(tr, tc))) return []

  const path: Array<readonly [number, number]> = []
  let cur: string | null = key(tr, tc)
  while (cur !== null) {
    const [r, c] = cur.split(",").map(Number)
    path.unshift([r, c])
    cur = parent.get(cur) ?? null
  }
  return path
}

/** Every cell the player can WALK to from `from`: real edges only, never through ground still in
 * the dark — the same rule findPath walks, which is the point. A marker offered on a cell outside this
 * set is an affordance the map cannot honour, and the corridor holding it should read as the dead end
 * it is. */
export const walkableFrom = (grid: FloorGrid, from: readonly [number, number]): ReadonlySet<string> => {
  const [fr, fc] = from
  const seen = new Set<string>([`${fr},${fc}`])
  const queue: Array<readonly [number, number]> = [[fr, fc]]

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") continue
    for (const d of cell.dirs) {
      const [dr, dc] = MOVES[d]
      const nr = r + dr,
        nc = c + dc
      const key = `${nr},${nc}`
      if (seen.has(key)) continue
      const neighbor = grid.cells[nr]?.[nc]
      // A shut way out is a wall: drawn, and standable on by nobody.
      if (!neighbor || neighbor.type === "empty" || neighbor.state === "fogged" || isSealedWayOut(neighbor)) continue
      seen.add(key)
      queue.push([nr, nc])
    }
  }

  return seen
}

export const revealAll = (grid: FloorGrid): FloorGrid => {
  const newCells = grid.cells.map(row =>
    row.map(cell => {
      if (cell.type === "empty") return cell
      return { ...cell, state: "reachable" as CellState }
    })
  )
  return { ...grid, cells: newCells }
}

export const renderAscii = (grid: FloorGrid): string => {
  const rows: string[] = []
  for (let r = 0; r < grid.rows; r++) {
    let line = ""
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") {
        line += " "
        continue
      }
      if (cell.type === "corridor") {
        const d = cell.dirs
        const h = d.has("e") && d.has("w")
        const v = d.has("n") && d.has("s")
        const all4 = h && v
        if (cell.state === "fogged") {
          line += "░"
          continue
        }
        if (all4) {
          line += "┼"
          continue
        }
        if (d.has("n") && d.has("s") && d.has("e")) {
          line += "├"
          continue
        }
        if (d.has("n") && d.has("s") && d.has("w")) {
          line += "┤"
          continue
        }
        if (d.has("n") && d.has("e") && d.has("w")) {
          line += "┴"
          continue
        }
        if (d.has("s") && d.has("e") && d.has("w")) {
          line += "┬"
          continue
        }
        if (h) {
          line += "─"
          continue
        }
        if (v) {
          line += "│"
          continue
        }
        if (d.has("e") && d.has("s")) {
          line += "┌"
          continue
        }
        if (d.has("w") && d.has("s")) {
          line += "┐"
          continue
        }
        if (d.has("n") && d.has("e")) {
          line += "└"
          continue
        }
        if (d.has("n") && d.has("w")) {
          line += "┘"
          continue
        }
        // A cell with one way out may only be left in the direction it names, whether that is a dead
        // end or the far side of a drop, and the arrow says which direction. Without this it draws as
        // an anonymous dot and a spec reading the map cannot tell either from an open corridor.
        if (d.size === 1) {
          const [only] = d
          line += only === "n" ? "↑" : only === "s" ? "↓" : only === "e" ? "→" : "←"
          continue
        }
        line += "·"
        continue
      }
      // room
      const isEntrance = r === grid.entrancePos[0] && c === grid.entrancePos[1]
      if (cell.state === "fogged") {
        line += "?"
        continue
      }
      if (cell.state === "completed") {
        line += isEntrance ? "E" : "."
        continue
      }
      const upper = cell.state === "reachable"
      const tagLetters: Record<string, string> = { gate: "g", puzzle: "p", trap: "r", treasure: "t", shop: "$" }
      const base =
        cell.roomType === "fork"
          ? "f"
          : cell.roomType === "portal"
            ? isEntrance
              ? "e"
              : cell.stairId
                ? "s"
                : "x"
            : (cell.tags?.map(t => tagLetters[t]).find(Boolean) ?? "?")
      line += upper ? base.toUpperCase() : base
    }
    rows.push(line)
  }
  return rows.join("\n")
}
