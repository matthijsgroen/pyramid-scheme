import type { FloorGrid, ValidationReason, ValidationResult, TombKeyReward } from "./siteTypes"

type Pos = readonly [number, number]

const posKey = (r: number, c: number) => `${r},${c}`

const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// BFS through grid. Gates require their key to be in ownedKeys.
// blockedPos: skip this cell (for keyBeforeGate check).
// Exported for src/worldGen/reachability.ts's coarse graph — the one fine-grained
// reachability primitive the coarse solver projects from, never re-derived.
// `blockedRequirements`, if given, collects every requiredKeyId/requiredKeyIds hit at the
// reachable frontier but not satisfied by `ownedKeys` — the worklist solver's own "discovered
// lock" signal (docs/game-design/keys-and-locks-solver.md, "Structure, then loot": a wish
// was always there in the structure, this is just the walk noticing it for the first time).
export const reachableFrom = (
  grid: FloorGrid,
  startPos: Pos,
  ownedKeys: ReadonlySet<string> = new Set(),
  blockedPos?: Pos,
  blockedRequirements?: Set<string>
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
      if (ncell.type === "room" && ncell.requiredKeyId && !ownedKeys.has(ncell.requiredKeyId)) {
        // An authored key (RoomCell.keyIsAuthored) is minted by a room a player solves, never
        // placed by the world-gen loot solver — reporting it as a discovered lock would ask
        // placeFragments' winnability guard to prove a fact only gameplay resolves. The door
        // still blocks this walk (a real, unopened gate); it just isn't this solver's problem.
        if (!ncell.keyIsAuthored) blockedRequirements?.add(ncell.requiredKeyId)
        continue
      }
      if (ncell.type === "room" && ncell.requiredKeyIds?.some(id => !ownedKeys.has(id))) {
        // Authored keys are none of this solver's business here either — the single-key branch above
        // says why. No family asks for several of them today; the day one does, it reads the same.
        if (!ncell.keyIsAuthored)
          for (const id of ncell.requiredKeyIds) if (!ownedKeys.has(id)) blockedRequirements?.add(id)
        continue
      }

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
): { reachable: Set<string>; keys: Set<string>; blockedRequirements: Set<string> } => {
  const collectedKeys = new Set(initialKeys)
  // Fresh set per pass — only the FINAL (post-fixed-point) pass's blocked requirements are
  // genuine discovered locks; an earlier pass's block may have been resolved by a tombKey
  // this same floor's fixed point went on to collect.
  let blockedRequirements = new Set<string>()
  let reachable = reachableFrom(grid, startPos, collectedKeys, undefined, blockedRequirements)
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
          !collectedKeys.has((cell.reward as TombKeyReward).keyId)
        ) {
          collectedKeys.add((cell.reward as TombKeyReward).keyId)
          changed = true
        }
      }
    }
    if (changed) {
      blockedRequirements = new Set<string>()
      reachable = reachableFrom(grid, startPos, collectedKeys, undefined, blockedRequirements)
    }
  }
  return { reachable, keys: collectedKeys, blockedRequirements }
}

// The room one of a fork's ways out leads to. A fork names its exits by compass point, and what stands
// down one is the next ROOM along it, with the connector cells between them walked straight through —
// nodes sit two cells apart on an assembled floor, and directly adjacent on a hand-built one.
const nodeBeyond = (grid: FloorGrid, from: Pos, dir: string): Pos | undefined => {
  const [dr, dc] = MOVES[dir]
  let [r, c] = [from[0] + dr, from[1] + dc]
  while (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
    const cell = grid.cells[r][c]
    if (cell.type === "room") return [r, c]
    if (cell.type !== "corridor") return undefined
    ;[r, c] = [r + dr, c + dc]
  }
  return undefined
}

export const validateSite = (grid: FloorGrid): ValidationResult => {
  const reasons: ValidationReason[] = []

  const { keys: collectedKeys } = collectReachableKeys(grid, grid.entrancePos)

  // WHO CLAIMS EACH GATED BOUNDARY. A gate sits in the boundary between two nodes, and the room it
  // occupies is where the floor writes it down: its own `requiredKeyId`, plus the `gateKeyId` any fork
  // closed toward it. A room's `requiredKeyIds` stays out — several hieroglyphs are one family asking
  // for its own precondition, not a second door standing in the same doorway.
  const openersAt = new Map<string, Set<string>>()
  const claim = (r: number, c: number, keyId: string) => {
    const at = openersAt.get(posKey(r, c)) ?? new Set<string>()
    at.add(keyId)
    openersAt.set(posKey(r, c), at)
  }
  const switchGates: { switchPos: Pos; gatePos: Pos }[] = []
  const allKeyIds = new Set<string>()

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue
      if (cell.requiredKeyId) {
        claim(r, c, cell.requiredKeyId)
        allKeyIds.add(cell.requiredKeyId)
      }
      for (const id of cell.requiredKeyIds ?? []) allKeyIds.add(id)
      for (const exit of cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        allKeyIds.add(exit.gateKeyId)
        const gatePos = nodeBeyond(grid, [r, c], exit.dir)
        if (!gatePos) continue
        claim(gatePos[0], gatePos[1], exit.gateKeyId)
        switchGates.push({ switchPos: [r, c], gatePos })
      }
    }
  }

  for (const [key, openers] of openersAt) {
    if (openers.size < 2) continue
    const [r, c] = key.split(",").map(Number)
    reasons.push({ type: "boundaryGatedTwice", pos: [r, c], keyIds: [...openers].sort() })
  }

  // THE OPENER COMES BEFORE THE BLOCKER. A switch's gates may be walked up to only through the switch,
  // so taking its cell out of the walk must leave every one of them unreached. Every key is granted for
  // this walk: what is asked is whether the geometry routes round the switch, not whether some key
  // happens to be short.
  for (const { switchPos, gatePos } of switchGates) {
    // Starting in the switch is standing in it, so a walk out of the entrance is already through it.
    if (switchPos[0] === grid.entrancePos[0] && switchPos[1] === grid.entrancePos[1]) continue
    const withoutSwitch = reachableFrom(grid, grid.entrancePos, allKeyIds, switchPos)
    if (withoutSwitch.has(posKey(gatePos[0], gatePos[1])))
      reasons.push({ type: "switchGateNotBehindSwitch", switchPos, gatePos })
  }

  // All floor-key gates must have a collectible key — except an authored one, whose key comes
  // from elsewhere (RoomCell.keyIsAuthored) rather than a chest this floor grows.
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue

      if (cell.requiredKeyId && cell.gateVariant === "floor-key" && !cell.keyIsAuthored) {
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
            // A trap is traversed like a puzzle: a branch that is ONLY a trap is still bland (it dead-ends
            // with nothing worth reaching), but a trap on the way to a treasure no longer hides it.
            // Stopping the search at a trap also made a floor's layout depend on which family a room was
            // given — a rejected layout is re-carved at another seed — and no encounter may move a wall.
            const isTreasureLike =
              bcell.roomType === "encounter" && (bcell.tags?.includes("treasure") || bcell.tags?.includes("shop"))
            const isPuzzleLike =
              bcell.roomType === "encounter" &&
              (bcell.tags?.includes("puzzle") || bcell.tags?.includes("tomb-puzzle") || bcell.tags?.includes("trap"))
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
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.reward?.type === "mosaicPiece") mosaicPos = [r, c]
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
