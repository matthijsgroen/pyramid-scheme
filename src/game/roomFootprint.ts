import type { FloorGrid, GridCell, RoomCell } from "./siteTypes"

/** Out of bounds reads as void, which is why a room on the grid's edge claims into the map's margin. */
export const cellAt = (grid: FloorGrid, r: number, c: number): GridCell => grid.cells[r]?.[c] ?? { type: "empty" }

/**
 * A neighbour is claimable if it is genuine void (`empty`), or — the one exception — a single corridor
 * tile that only exists to APPROACH a gate: either a real gate room two steps away (revealed), or a
 * corridor stub whose far side got masked to `empty` because it leads into an undetected hidden section.
 * Either way that corridor tile reads better as the junction's own doorway than as a separate hallway.
 * Diagonal neighbours can only ever be void — a real edge is never diagonal.
 *
 * It lives in the DOMAIN because two layers need the same answer: the renderer builds the claim itself,
 * and the assembler ranks rooms by how much floor they will draw when it hands a floor's biggest chamber
 * to the site's god. Two copies of this rule disagreed by three cells on the first floor they were
 * measured against, and the god landed in a pocket while an eight-cell hall stood empty.
 */
export const isClaimableNeighbor = (
  grid: FloorGrid,
  ownerR: number,
  ownerC: number,
  nr: number,
  nc: number
): boolean => {
  const cell = cellAt(grid, nr, nc)
  if (cell.type === "empty") return true
  if (cell.type !== "corridor") return false
  const dr = nr - ownerR,
    dc = nc - ownerC
  if (Math.abs(dr) + Math.abs(dc) !== 1) return false
  const beyond = grid.cells[ownerR + dr * 2]?.[ownerC + dc * 2]
  const leadsToGate = beyond?.type === "room" && !!beyond.tags?.includes("gate")
  return leadsToGate || cell.dirs.size === 1
}

/**
 * How many cells of its own 3x3 a room can take — the size of the chamber it will draw.
 *
 * An upper bound rather than the final claim: the renderer resolves cells two rooms both want, so a
 * room wedged against another may end up with fewer. Nothing needs the exact number — this exists to
 * RANK rooms against each other, and a contested cell lowers both sides of that comparison.
 */
export const footprintSize = (grid: FloorGrid, r: number, c: number): number => {
  let n = 0
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      if (isClaimableNeighbor(grid, r, c, r + dr, c + dc)) n++
    }
  return n
}

/** What a portal is, read off where it stands: a stair's head, the floor's way in, or its way out. */
export const portalKindOf = (
  grid: Pick<FloorGrid, "entrancePos">,
  r: number,
  c: number,
  cell: Pick<RoomCell, "stairId">
): "stairhead" | "entrance" | "exit" => {
  if (cell.stairId) return "stairhead"
  return r === grid.entrancePos[0] && c === grid.entrancePos[1] ? "entrance" : "exit"
}

/**
 * A CHAMBER claims the floor around it on the map; every other room is a stop in a 1-wide corridor. Every
 * fork is one, whatever stands in it, and every pass-through chamber, and so is a dead end that holds treasure or is a stairhead or the
 * exit. An activity a story authors on a node only dresses the room the node already is; it never makes one. A
 * portal with more than one way out is one too: the carve may hang a side section off the floor's entrance,
 * and a stair or door the player can leave two ways stands in a room that forks, never in a corridor. `kind`
 * is the shape the room is drawn as.
 *
 * It lives in the DOMAIN because the renderer claims the floor by it and the carve dresses by it: a prop
 * recorded on a room that claims no floor is a prop nobody can see.
 */
export const isChamber = (cell: Pick<RoomCell, "roomType" | "dirs">, kind: string): boolean =>
  cell.roomType === "fork" ||
  cell.roomType === "chamber" ||
  (cell.roomType === "portal" && cell.dirs.size > 1) ||
  ((kind === "treasure" || kind === "stairhead" || kind === "exit") && cell.dirs.size === 1)

/**
 * Whether the room at (r, c) claims floor on the map: the rule the renderer dresses by and the map grows rooms
 * by, read off the cell. A portal is the kind its place makes it, a treasure or shop encounter is a
 * `"treasure"`, anything else a `"room"`.
 */
export const claimsFloorAt = (grid: FloorGrid, r: number, c: number): boolean => {
  const cell = cellAt(grid, r, c)
  if (cell.type !== "room") return false
  const treasureLike =
    cell.roomType === "encounter" && (cell.tags?.includes("treasure") === true || cell.tags?.includes("shop") === true)
  const kind = cell.roomType === "portal" ? portalKindOf(grid, r, c, cell) : treasureLike ? "treasure" : "room"
  return isChamber(cell, kind)
}

const STEP_DIR: Readonly<Record<string, "n" | "s" | "e" | "w">> = { "-1,0": "n", "1,0": "s", "0,-1": "w", "0,1": "e" }

/** The near nodes a row-major scan meets after a node's own, so each pair is looked at once. */
const LATER_NEAR_NODES: ReadonlyArray<readonly [number, number]> = [
  [0, 2],
  [2, -2],
  [2, 0],
  [2, 2],
]

/**
 * Whether two rooms one node apart (ortho or diagonal) are one space on the map, so the cells their 3×3s share
 * belong to both. Two ortho rooms are when a passage joins them. Two diagonal rooms are when they stand in one
 * section, one region and are both hidden or both not, and an ungated corner node opens onto each: the shared
 * pillar is then the corner of the L the player walks anyway. Rooms of two sections never merge diagonally. A corner
 * in `shut` is a gate whether or not a door stands in it, so the carve reads a way a switch may shut the same with
 * the switch there or not.
 */
export const roomsMerge = (
  grid: FloorGrid,
  r: number,
  c: number,
  r2: number,
  c2: number,
  shut: ReadonlySet<string> = new Set()
): boolean => {
  const a = cellAt(grid, r, c)
  const b = cellAt(grid, r2, c2)
  if (a.type !== "room" || b.type !== "room") return false
  const dr = Math.sign(r2 - r),
    dc = Math.sign(c2 - c)
  if (dr === 0 || dc === 0) return a.dirs.has(STEP_DIR[`${dr},${dc}`])
  if (a.sectionAddress !== b.sectionAddress || a.region !== b.region || a.hidden !== b.hidden) return false
  const viaCorner = (cr: number, cc: number) => {
    const corner = cellAt(grid, cr, cc)
    if (corner.type === "empty") return false
    if (shut.has(`${cr},${cc}`) || (corner.type === "room" && corner.tags?.includes("gate"))) return false
    return (
      corner.dirs.has(STEP_DIR[`${Math.sign(r - cr)},${Math.sign(c - cc)}`]) &&
      corner.dirs.has(STEP_DIR[`${Math.sign(r2 - cr)},${Math.sign(c2 - cc)}`])
    )
  }
  return viaCorner(r, c2) || viaCorner(r2, c)
}

/**
 * The first two rooms that claim floor one node apart and do not merge, in scan order: one of them would lose part
 * of its 3×3 to the other. A designed room is left out, as its ring is kept clear when it is laid. A corner in `shut`
 * is read as `roomsMerge` reads it.
 */
export const bittenRooms = (grid: FloorGrid, shut: ReadonlySet<string> = new Set()): [string, string] | undefined => {
  const claims = (r: number, c: number) => {
    const cell = cellAt(grid, r, c)
    return cell.type === "room" && !cell.prefabRoom && claimsFloorAt(grid, r, c)
  }
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      if (!claims(r, c)) continue
      for (const [dr, dc] of LATER_NEAR_NODES)
        if (claims(r + dr, c + dc) && !roomsMerge(grid, r, c, r + dr, c + dc, shut))
          return [`${r},${c}`, `${r + dr},${c + dc}`]
    }
  return undefined
}
