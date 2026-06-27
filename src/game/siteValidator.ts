import type { FloorGrid, ValidationReason, ValidationResult } from "./siteTypes"

type Pos = readonly [number, number]

const posKey = (r: number, c: number) => `${r},${c}`

const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// BFS through grid. Gates require their key to be in ownedKeys.
// blockedPos: skip this cell (for keyBeforeGate check).
const reachableFrom = (
  grid: FloorGrid,
  startPos: Pos,
  ownedKeys: ReadonlySet<string> = new Set(),
  blockedPos?: Pos
): Set<string> => {
  const [sr, sc] = startPos
  const startKey = posKey(sr, sc)
  const visited = new Set<string>([startKey])
  const queue: Pos[] = [[sr, sc]]

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") continue

    const dirs = cell.type === "room" || cell.type === "corridor" ? cell.dirs : new Set()

    for (const d of dirs) {
      const [dr, dc] = MOVES[d as string]
      const nr = r + dr,
        nc = c + dc
      const nkey = posKey(nr, nc)
      if (visited.has(nkey)) continue
      if (blockedPos && nr === blockedPos[0] && nc === blockedPos[1]) continue

      const ncell = grid.cells[nr]?.[nc]
      if (!ncell || ncell.type === "empty") continue

      // Gate: only passable if we own the key
      if (
        ncell.type === "room" &&
        ncell.roomType === "gate" &&
        ncell.requiredKeyId &&
        !ownedKeys.has(ncell.requiredKeyId)
      )
        continue

      visited.add(nkey)
      queue.push([nr, nc])
    }
  }

  return visited
}

export const validateSite = (grid: FloorGrid): ValidationResult => {
  const reasons: ValidationReason[] = []

  // Collect gate rooms and their positions
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue

      if (cell.roomType === "gate" && cell.requiredKeyId && cell.gateVariant === "floor-key") {
        const gatePos: Pos = [r, c]
        const keyId = cell.requiredKeyId

        // Find the key room (treasure with tombKey reward where keyId matches)
        let keyPos: Pos | null = null
        for (let kr = 0; kr < grid.rows; kr++) {
          for (let kc = 0; kc < grid.cols; kc++) {
            const kcCell = grid.cells[kr][kc]
            if (
              kcCell.type === "room" &&
              kcCell.roomType === "treasure" &&
              kcCell.reward?.type === "tombKey" &&
              kcCell.reward.keyId === keyId
            ) {
              keyPos = [kr, kc]
            }
          }
        }

        if (!keyPos) {
          reasons.push({ type: "keyAfterGate", gatePos, keyPos: gatePos })
          continue
        }

        // Check key is reachable without traversing the gate
        const reachableWithoutGate = reachableFrom(grid, grid.entrancePos, new Set(), gatePos)
        if (!reachableWithoutGate.has(posKey(keyPos[0], keyPos[1]))) {
          reasons.push({ type: "keyAfterGate", gatePos, keyPos })
        }
      }

      if (cell.roomType === "fork") {
        const forkPos: Pos = [r, c]
        const interestingTypes = new Set(["treasure", "gate", "stairhead"])
        // BFS through corridors from each fork direction to find an interesting room
        const forkKey = posKey(r, c)
        let hasInteresting = false
        const bfsVisited = new Set<string>([forkKey])
        const bfsQueue: Pos[] = []
        for (const d of cell.dirs) {
          const [dr, dc] = MOVES[d as string]
          bfsQueue.push([r + dr, c + dc])
        }
        while (bfsQueue.length > 0 && !hasInteresting) {
          const [br, bc] = bfsQueue.shift()!
          const bkey = posKey(br, bc)
          if (bfsVisited.has(bkey)) continue
          bfsVisited.add(bkey)
          const bcell = grid.cells[br]?.[bc]
          if (!bcell || bcell.type === "empty") continue
          if (bcell.type === "room") {
            if (interestingTypes.has(bcell.roomType)) hasInteresting = true
            // Don't traverse through rooms
          } else {
            // corridor: continue BFS
            for (const d of bcell.dirs) {
              const [dr, dc] = MOVES[d as string]
              bfsQueue.push([br + dr, bc + dc])
            }
          }
        }

        if (!hasInteresting) {
          reasons.push({ type: "allBlandFork", forkPos })
        }
      }
    }
  }

  // mosaicReachable: mosaic must be reachable when all gate keys are hypothetically owned
  let mosaicPos: Pos | null = null
  const allKeyIds = new Set<string>()
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue
      if (cell.roomType === "treasure" && cell.reward?.type === "mosaicPiece") mosaicPos = [r, c]
      if (cell.roomType === "gate" && cell.requiredKeyId) allKeyIds.add(cell.requiredKeyId)
    }
  }

  if (mosaicPos) {
    const allReachable = reachableFrom(grid, grid.entrancePos, allKeyIds)
    if (!allReachable.has(posKey(mosaicPos[0], mosaicPos[1]))) {
      reasons.push({ type: "mosaicNotReachable" })
    }
  }

  return reasons.length === 0 ? { valid: true } : { valid: false, reasons }
}

export const validateJourney = (grids: FloorGrid[]): ValidationResult => {
  const reasons: ValidationReason[] = []

  const mapPieceSites = grids.filter(g => {
    for (const row of g.cells)
      for (const cell of row)
        if (cell.type === "room" && cell.roomType === "treasure" && cell.reward?.type === "mapPiece") return true
    return false
  })

  if (mapPieceSites.length === 0) {
    reasons.push({ type: "mapPieceMissing" })
  } else if (mapPieceSites.length > 1) {
    reasons.push({ type: "mapPieceDuplicate", siteIds: mapPieceSites.map(g => g.siteId) })
  } else {
    const g = mapPieceSites[0]
    let mapPiecePos: readonly [number, number] | null = null
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++) {
        const cell = g.cells[r][c]
        if (cell.type === "room" && cell.roomType === "treasure" && cell.reward?.type === "mapPiece")
          mapPiecePos = [r, c]
      }
    if (mapPiecePos) {
      const sealReachable = reachableFrom(g, g.entrancePos, new Set())
      if (!sealReachable.has(`${mapPiecePos[0]},${mapPiecePos[1]}`)) {
        reasons.push({ type: "mapPieceNotSealReachable", pos: mapPiecePos })
      }
    }
  }

  for (const g of grids) {
    let primaryCount = 0
    let mosaicCount = 0
    for (const row of g.cells)
      for (const cell of row) {
        if (cell.type !== "room" || cell.roomType !== "treasure") continue
        if (cell.reward?.type === "mosaicPiece" || cell.reward?.type === "mapPiece") primaryCount++
        if (cell.reward?.type === "mosaicPiece") mosaicCount++
      }
    if (primaryCount === 0) reasons.push({ type: "mosaicMissing" })
    else if (mosaicCount > 1) reasons.push({ type: "mosaicDuplicate", siteId: g.siteId })
  }

  return reasons.length === 0 ? { valid: true } : { valid: false, reasons }
}
