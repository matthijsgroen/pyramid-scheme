import type { FloorGrid, ValidationReason, ValidationResult } from "./siteTypes"

type Pos = readonly [number, number]

const posKey = (r: number, c: number) => `${r},${c}`

const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// BFS through grid. Gates require their key to be in ownedKeys.
// blockedPos: skip this cell (for keyBeforeGate check).
// Exported for src/worldGen/reachability.ts's coarse graph — the one fine-grained
// reachability primitive the coarse solver projects from, never re-derived.
export const reachableFrom = (
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

      // Gate: only passable if we own the key(s). requiredKeyId/requiredKeyIds alone are
      // the signal — any encounter can carry a key requirement (a gate's only job; a
      // tableau's several, one per hieroglyph it needs complete), not just rooms tagged
      // "gate".
      if (ncell.type === "room" && ncell.requiredKeyId && !ownedKeys.has(ncell.requiredKeyId)) continue
      if (ncell.type === "room" && ncell.requiredKeyIds?.some(id => !ownedKeys.has(id))) continue

      visited.add(nkey)
      queue.push([nr, nc])
    }
  }

  return visited
}

// Iterative key collection: simulate exploration. BFS → collect reachable keys → unlock
// new gates → repeat. Correctly handles key chains (key behind a gate) and self-referential
// ones (a room's own tombKey reward opening its own further gate — pyramid-interior-
// design.md §8, "the treasure IS the key"). Exported for src/worldGen/reachability.ts's
// coarse graph, which needs the same fixed point across a whole multi-floor site.
export const collectReachableKeys = (
  grid: FloorGrid,
  startPos: Pos,
  initialKeys: ReadonlySet<string> = new Set()
): { reachable: Set<string>; keys: Set<string> } => {
  const collectedKeys = new Set(initialKeys)
  let reachable = reachableFrom(grid, startPos, collectedKeys)
  let changed = true
  while (changed) {
    changed = false
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.cells[r][c]
        if (
          cell.type === "room" &&
          cell.reward?.type === "tombKey" &&
          reachable.has(posKey(r, c)) &&
          !collectedKeys.has(cell.reward.keyId)
        ) {
          collectedKeys.add(cell.reward.keyId)
          changed = true
        }
      }
    }
    if (changed) reachable = reachableFrom(grid, startPos, collectedKeys)
  }
  return { reachable, keys: collectedKeys }
}

export const validateSite = (grid: FloorGrid): ValidationResult => {
  const reasons: ValidationReason[] = []

  const { keys: collectedKeys } = collectReachableKeys(grid, grid.entrancePos)

  // All floor-key gates must have a collectible key
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue

      if (cell.requiredKeyId && cell.gateVariant === "floor-key") {
        if (!collectedKeys.has(cell.requiredKeyId)) {
          const gatePos: Pos = [r, c]
          let keyPos: Pos = gatePos
          for (let kr = 0; kr < grid.rows; kr++) {
            for (let kc = 0; kc < grid.cols; kc++) {
              const kcell = grid.cells[kr][kc]
              if (
                kcell.type === "room" &&
                kcell.reward?.type === "tombKey" &&
                kcell.reward.keyId === cell.requiredKeyId
              )
                keyPos = [kr, kc]
            }
          }
          reasons.push({ type: "keyAfterGate", gatePos, keyPos })
        }
      }

      if (cell.roomType === "fork") {
        const forkPos: Pos = [r, c]
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
            // "trap" counts as neither: a fork branch leading only to a trap counts as bland.
            const isTreasureLike =
              bcell.roomType === "encounter" && (bcell.tags?.includes("treasure") || bcell.tags?.includes("shop"))
            const isPuzzleLike =
              bcell.roomType === "encounter" && (bcell.tags?.includes("puzzle") || bcell.tags?.includes("tomb-puzzle"))
            const isGate = bcell.tags?.includes("gate")
            if (isGate || bcell.roomType === "portal" || isTreasureLike) hasInteresting = true
            else if (isPuzzleLike || bcell.roomType === "fork") {
              // traverse through puzzles/forks to find what's at the end of the branch
              for (const d of bcell.dirs) {
                const [dr, dc] = MOVES[d as string]
                bfsQueue.push([br + dr, bc + dc])
              }
            }
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
      if (cell.reward?.type === "mosaicPiece") mosaicPos = [r, c]
      if (cell.requiredKeyId) allKeyIds.add(cell.requiredKeyId)
      for (const id of cell.requiredKeyIds ?? []) allKeyIds.add(id)
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
      for (const cell of row) if (cell.type === "room" && cell.reward?.type === "mapPiece") return true
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
        if (cell.type === "room" && cell.reward?.type === "mapPiece") mapPiecePos = [r, c]
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
        if (cell.type !== "room") continue
        if (cell.reward?.type === "mosaicPiece" || cell.reward?.type === "mapPiece") primaryCount++
        if (cell.reward?.type === "mosaicPiece") mosaicCount++
      }
    if (primaryCount === 0) reasons.push({ type: "mosaicMissing" })
    else if (mosaicCount > 1) reasons.push({ type: "mosaicDuplicate", siteId: g.siteId })
  }

  return reasons.length === 0 ? { valid: true } : { valid: false, reasons }
}
