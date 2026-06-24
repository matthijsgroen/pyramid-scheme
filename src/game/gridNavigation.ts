import type { FloorGrid, GridCell, Direction, CellState } from "./siteTypes"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const opposite: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

export const getCell = (grid: FloorGrid, r: number, c: number): GridCell | undefined => grid.cells[r]?.[c]

export const getOwnedKeys = (grid: FloorGrid): ReadonlySet<string> => {
  const keys = new Set<string>()
  for (const row of grid.cells)
    for (const cell of row)
      if (cell.type === "room" && cell.state === "completed" && cell.reward?.type === "tombKey")
        keys.add(cell.reward.keyId)
  return keys
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

  // 3. Compute ownedKeys from updated cells
  const updatedGrid = { ...grid, cells: newCells }
  const ownedKeys = getOwnedKeys(updatedGrid)

  // 4. BFS through corridors and rooms from (row,col)
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
      // Mark visible if fogged
      if (neighbor.state === "fogged") {
        newCells[r][c] = { ...neighbor, state: "visible" }
      }
      // Add all dirs except opposite of fromDir
      const oppDir = fromDir ? opposite[fromDir] : null
      for (const d of neighbor.dirs) {
        if (d === oppDir) continue
        const [dr, dc] = MOVES[d]
        const nr = r + dr,
          nc = c + dc
        if (!visited.has(`${nr},${nc}`)) {
          queue.push({ r: nr, c: nc, fromDir: d })
        }
      }
    } else if (neighbor.type === "room") {
      // Gate without key: mark visible. Others: mark reachable.
      if (neighbor.roomType === "gate" && neighbor.requiredKeyId && !ownedKeys.has(neighbor.requiredKeyId)) {
        if (neighbor.state === "fogged") {
          newCells[r][c] = { ...neighbor, state: "visible" }
        }
      } else {
        if (neighbor.state === "fogged" || neighbor.state === "visible") {
          newCells[r][c] = { ...neighbor, state: "reachable" }
        }
      }
      // Don't traverse through rooms
    }
  }

  return { ...grid, cells: newCells }
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
      const letters: Record<string, string> = {
        entrance: "e",
        puzzle: "p",
        gate: "g",
        treasure: "t",
        stairhead: "s",
        exit: "x",
        fork: "f",
      }
      const base = letters[cell.roomType] ?? "?"
      line += upper ? base.toUpperCase() : base
    }
    rows.push(line)
  }
  return rows.join("\n")
}
