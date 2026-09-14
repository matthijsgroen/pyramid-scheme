import type { DecorationKind, Direction, FloorGrid, GridCell, RoomCell, RoomType } from "@/game/siteTypes"
import { cellAt, isClaimableNeighbor } from "@/game/roomFootprint"
import { DIR_MOVES, OPPOSITE_DIR } from "./corridorRuns"
import { buildTileRegions, type FloorAt, type TileRegions } from "./tileRegions"
import { authoredKindsFor } from "./authoredKinds"
import { companionFor } from "./companionProps"
import { tileUrl } from "./tileAssets"
import { isLockedGate, shapeKindFor } from "./nodeKinds"
import type { Difficulty } from "@/data/difficultyLevels"

// ─── Floor tiles ────────────────────────────────────────────────────────────────
// Every occupied cell (room or corridor) is a floor tile composited from a full-cell
// fill plus 0-4 wall strips, chosen per side from the same `dirs` bitmask the future
// sprite-tile renderer will use (see docs/game-design/spritesheet-renderer-prep.md).

// Forks and dead-end (leaf) treasure/stairhead/exit rooms claim adjacent grid cells as
// part of their own footprint — real extra tiles, grid-aligned, rather than a rendering
// stretch. That keeps every room shape made of whole cells, which is what the eventual
// sprite-tile renderer needs to tile cleanly (see
// docs/game-design/spritesheet-renderer-prep.md). Purely derived at render time from
// the existing grid — no generation-side bookkeeping.
const canClaimVoid = (
  grid: FloorGrid,
  r: number,
  c: number,
  roomType: RoomType,
  tags: string[] | undefined,
  stairId: string | undefined,
  dirsSize: number
): boolean => {
  if (roomType === "fork") return true
  const kind = shapeKindFor(grid, r, c, roomType, tags, stairId)
  return (kind === "treasure" || kind === "stairhead" || kind === "exit") && dirsSize === 1
}

const ORTHO_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]
// Each diagonal offset paired with the two orthogonal offsets flanking it — a diagonal
// only joins the claim if at least one flank "belongs" to the owner too (either also
// claimed void, or the owner's own real corridor arm), otherwise it'd be a tile touching
// the room by a single corner point with walls on all 4 sides (nothing to open toward),
// which reads as a floating box rather than part of the room.
const DIAGONAL_OFFSETS: ReadonlyArray<{
  offset: readonly [number, number]
  flanks: readonly [readonly [number, number], readonly [number, number]]
}> = [
  {
    offset: [-1, -1],
    flanks: [
      [-1, 0],
      [0, -1],
    ],
  },
  {
    offset: [-1, 1],
    flanks: [
      [-1, 0],
      [0, 1],
    ],
  },
  {
    offset: [1, -1],
    flanks: [
      [1, 0],
      [0, -1],
    ],
  },
  {
    offset: [1, 1],
    flanks: [
      [1, 0],
      [0, 1],
    ],
  },
]

const OFFSET_TO_DIR: Record<string, Direction> = { "-1,0": "n", "1,0": "s", "0,-1": "w", "0,1": "e" }
const edgeKey = (r1: number, c1: number, r2: number, c2: number): string => {
  const a = `${r1},${c1}`,
    b = `${r2},${c2}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export type RoomClaims = {
  /** claimed-cell key ("r,c") -> owning room's key ("r,c") */
  claimedBy: ReadonlyMap<string, string>
  /** the one claimed cell (per owner) that carries the owner's decoration, if any */
  decorationAt: ReadonlyMap<string, DecorationKind>
  /** unordered cell-pair keys with no wall between them (owner<->claim, or diagonal<->flank) */
  openEdges: ReadonlySet<string>
  /** unordered OWNER-pair keys for two chambers the player can already walk between */
  joinedOwners: ReadonlySet<string>
}

// Row-major scan order, plus a strength ranking for contested diagonals (see below), so
// two nearby claimable rooms never fight unpredictably over the same cell. Each owner
// independently claims whichever of its 8 immediate neighbors (sides + diagonals) are
// free — no flood-fill beyond that ring, so the shape stays a direct "3x3 minus whatever's
// occupied" instead of wandering off into open floor further away. A diagonal's flank can
// be either claimed void or the owner's own real corridor arm — either way the diagonal
// ends up visually flush with a wall the owner already has open, not floating by itself.

export const buildRoomClaims = (grid: FloorGrid): RoomClaims => {
  const claimedBy = new Map<string, string>()
  const openEdges = new Set<string>()
  // Every claim of an owner's that a prop could stand on, in claim order: genuinely EMPTY cells only. A
  // claimed corridor (a gate's approach, absorbed into the junction's footprint) is a real passage the
  // player walks down, and a sarcophagus standing in it is something they walk straight through. A room
  // with no empty cell to spare simply holds no prop.
  const ownerPropCandidates = new Map<string, string[]>()
  const noteClaim = (cellKey: string, ownerKey: string) => {
    claimedBy.set(cellKey, ownerKey)
    const [r, c] = cellKey.split(",").map(Number)
    if (cellAt(grid, r, c).type !== "empty") return
    const candidates = ownerPropCandidates.get(ownerKey)
    if (candidates) candidates.push(cellKey)
    else ownerPropCandidates.set(ownerKey, [cellKey])
  }

  // Ortho claims commit immediately, row-major first-come — two owners contending for the
  // same orthogonal neighbor is rare enough not to warrant the ranking below. Diagonal
  // claims are only proposed here and resolved afterward (see below).
  type DiagonalCandidate = {
    ownerKey: string
    ownerRow: number
    ownerCol: number
    scanOrder: number
    attachedFlanks: ReadonlyArray<readonly [number, number]>
    realFlankCount: number
  }
  const diagonalCandidates = new Map<string, DiagonalCandidate[]>()
  let scanOrder = 0

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !canClaimVoid(grid, r, c, cell.roomType, cell.tags, cell.stairId, cell.dirs.size))
        continue
      const ownerKey = `${r},${c}`
      const claimedThisOwner = new Set<string>()
      for (const [dr, dc] of ORTHO_OFFSETS) {
        const nr = r + dr,
          nc = c + dc
        const key = `${nr},${nc}`
        if (claimedBy.has(key) || !isClaimableNeighbor(grid, r, c, nr, nc)) continue
        noteClaim(key, ownerKey)
        claimedThisOwner.add(key)
        openEdges.add(edgeKey(r, c, nr, nc))
      }
      for (const {
        offset: [dr, dc],
        flanks,
      } of DIAGONAL_OFFSETS) {
        const nr = r + dr,
          nc = c + dc
        const key = `${nr},${nc}`
        if (!isClaimableNeighbor(grid, r, c, nr, nc)) continue
        // A flank attached via the owner's own real graph edge is a durable structural
        // fact; one attached only because this same pass just claimed it as void is
        // incidental and shouldn't count as equally strong when ranking contested claims.
        let realFlankCount = 0
        const attachedFlanks = flanks.filter(([fr, fc]) => {
          if (cell.dirs.has(OFFSET_TO_DIR[`${fr},${fc}`])) {
            realFlankCount++
            return true
          }
          return claimedThisOwner.has(`${r + fr},${c + fc}`)
        })
        if (attachedFlanks.length === 0) continue
        const existing = diagonalCandidates.get(key) ?? []
        existing.push({ ownerKey, ownerRow: r, ownerCol: c, scanOrder: scanOrder++, attachedFlanks, realFlankCount })
        diagonalCandidates.set(key, existing)
      }
    }
  }

  // A room's *type* — unlike its progression state — never changes for the rest of the
  // session, so it makes a stable tiebreaker. A completed/reachable/visible rank was tried
  // here before and reintroduced the same bug one level up: two claimants tied on state
  // (e.g. both eventually "completed") fell back to scan order and flipped ownership all
  // over again the moment the player finished exploring. Forks are junctions, structurally
  // meant to absorb the void around them; leaf rooms (treasure/stairhead/exit) are
  // endpoints that happen to reach a shared diagonal too. Prefer the fork, permanently.
  const roomTypeRankOf = (row: number, col: number): number => {
    const owner = grid.cells[row]?.[col]
    return owner?.type === "room" && owner.roomType === "fork" ? 1 : 0
  }

  // Resolve each contested diagonal by attachment strength — a diagonal flush against
  // both its neighboring arms is a stronger, more established claim than one flush
  // against only one. Without this, revealing a hidden room can introduce a new,
  // weakly-attached claimant that — by pure scan order — steals a diagonal cell out from
  // under a room that was already flush against it on two sides, visibly moving a wall.
  for (const [key, candidates] of diagonalCandidates) {
    if (claimedBy.has(key)) continue // already an ortho claim, which always wins
    const winner = candidates.reduce((best, c) => {
      if (c.realFlankCount !== best.realFlankCount) return c.realFlankCount > best.realFlankCount ? c : best
      if (c.attachedFlanks.length !== best.attachedFlanks.length) {
        return c.attachedFlanks.length > best.attachedFlanks.length ? c : best
      }
      const cRank = roomTypeRankOf(c.ownerRow, c.ownerCol)
      const bestRank = roomTypeRankOf(best.ownerRow, best.ownerCol)
      if (cRank !== bestRank) return cRank > bestRank ? c : best
      return c.scanOrder < best.scanOrder ? c : best
    })
    noteClaim(key, winner.ownerKey)
    const [kr, kc] = key.split(",").map(Number)
    for (const [fr, fc] of winner.attachedFlanks) {
      const flankKey = `${winner.ownerRow + fr},${winner.ownerCol + fc}`
      openEdges.add(edgeKey(kr, kc, winner.ownerRow + fr, winner.ownerCol + fc))
      if (!claimedBy.has(flankKey)) noteClaim(flankKey, winner.ownerKey)
    }
  }

  // Decoration only ever lands on an empty claimed cell — the room's own space, never a passage
  // through it (see noteClaim).
  //
  // **A prop stands against a wall where it can.** Its sprite is a cell plus a face band tall, so it
  // leans a band's worth into the cell to its north; on a cell with void above, that headroom lands on
  // wall, which is where a statue belongs and where nothing can be behind it. On a cell with floor above
  // it, the statue leans over ground the player walks, and the explorer dot — drawn last — passes in
  // FRONT of its head. Half the props in the world stood that way before this preference.
  const wallBehind = (cellKey: string): boolean => {
    const [r, c] = cellKey.split(",").map(Number)
    return cellAt(grid, r - 1, c).type === "empty"
  }
  // ON THE MAP, not off the edge of it. A claim takes out-of-bounds cells too — the renderer reads
  // beyond the grid as void — so an edge room's own furniture could stand in the margin outside the
  // floor, which is where the Temple of Bastet put its statue of her. Inside first, and the
  // wall-behind preference decides among what is left.
  const onGrid = (key: string): boolean => {
    const [r, c] = key.split(",").map(Number)
    return r >= 0 && c >= 0 && r < grid.rows && c < grid.cols
  }
  const decorationAt = new Map<string, DecorationKind>()
  const roomsForCompanion: { ownerKey: string; leader: DecorationKind; free: string[] }[] = []
  for (const [ownerKey, candidates] of ownerPropCandidates) {
    const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
    const owner = grid.cells[ownerRow]?.[ownerCol]
    if (owner?.type !== "room" || !owner.decoration) continue
    const inside = candidates.filter(onGrid)
    const usable = inside.length ? inside : candidates
    const taken = usable.find(wallBehind) ?? usable[0]
    decorationAt.set(taken, owner.decoration)
    // THE GOD'S ROOM is written on the cell by the assembler (RoomCell.patronRoom). It used to be
    // inferred from prop and wall item both being patron kinds, which is unreachable at a rank whose
    // wall pool holds nothing a god can appear on — the merchant hangs a goods niche and a tally board.
    const shrine = owner.patronRoom === true
    roomsForCompanion.push({
      ownerKey,
      leader: owner.decoration,
      free: candidates.filter(key => key !== taken),
      ...(shrine ? { shrine } : {}),
    })
  }
  // What this rank is furnished with at all — see the two tests below.
  const authoredHere = authoredKindsFor(grid.difficulty ?? "starter").props
  // A SECOND prop of the same purpose, in some of the rooms with space for one — see `companionProps`.
  // It goes into `decorationAt` rather than into a layer of its own, which is what keeps the rest of the
  // map honest for free: `floorScatter` dresses the cells this map does NOT hold, so a companion is a cell
  // scatter avoids without anything being told about it.
  for (const [key, kind] of companionFor(
    grid.siteId,
    roomsForCompanion,
    // TWO TESTS, and the first one is the one this got wrong.
    //
    // **A rank may only be dressed with what it is AUTHORED to hold.** A companion is placed by rule
    // rather than by the world, so without this it can reach for any kind that shares a purpose — and a
    // crystal is a wizard thing, the gods' vault, not something the Valley of the Kings has in it. One
    // landed beside Anubis at expert exactly that way. `authoredKindsFor` is the rank's own vocabulary,
    // read off the world artifact, so the answer moves when the authoring does.
    //
    // **And it has to be PAINTED here**, which is rule 3 of `companionProps`: `tileUrl` skips
    // `placeholder/` on purpose, so a stand-in can never be multiplied across the map by a rule nobody
    // is watching.
    kind => authoredHere.includes(kind) && !!tileUrl(grid.difficulty ?? "starter", kind),
    // Same rule as the leader: on the map first, then the wall-behind preference.
    free => {
      const inside = free.filter(onGrid)
      const usable = inside.length ? inside : free
      return usable.find(wallBehind) ?? usable[0]
    }
  )) {
    decorationAt.set(key, kind)
  }

  /**
   * Two chambers the player can ALREADY walk between are one space, so no partition is drawn anywhere
   * along their shared boundary.
   *
   * A footprint is several cells wide and only the one cell-pair carrying the graph edge was open, so
   * the rest of the boundary stayed walled: a partition running partway into a room you can walk
   * straight across. Nothing here changes what is walkable or the shape of either footprint — the
   * rooms are already where they are, and the wall between them is the only thing that goes.
   *
   * Keyed by OWNER pair rather than by cell pair, because the question is about the two rooms and not
   * about the boundary: find the edge once, and the whole seam opens.
   */
  const joinedOwners = new Set<string>()
  const ownerOfKey = (key: string): string | undefined => {
    const [r, c] = key.split(",").map(Number)
    return claimedBy.get(key) ?? (cellAt(grid, r, c).type === "room" ? key : undefined)
  }
  for (const key of [...claimedBy.keys(), ...new Set(claimedBy.values())]) {
    const [r, c] = key.split(",").map(Number)
    const own = ownerOfKey(key)
    if (!own) continue
    for (const [dr, dc] of ORTHO_OFFSETS) {
      const nr = r + dr,
        nc = c + dc
      const other = ownerOfKey(`${nr},${nc}`)
      if (!other || other === own) continue
      // A REAL way through, from either side — the graph, not the claim.
      const here = cellAt(grid, r, c)
      const there = cellAt(grid, nr, nc)
      const dir = dr === 1 ? "s" : dr === -1 ? "n" : dc === 1 ? "e" : "w"
      const open =
        ((here.type === "room" || here.type === "corridor") && here.dirs.has(dir)) ||
        ((there.type === "room" || there.type === "corridor") && there.dirs.has(OPPOSITE_DIR[dir]))
      if (open) joinedOwners.add([own, other].sort().join("|"))
    }
  }

  return { claimedBy, decorationAt, openEdges, joinedOwners }
}

// The room a claimed cell renders as part of, if that room is lit — the claim borrows the owner's
// state, so a fogged owner takes its whole blob (void cells included) with it.
export const litClaimOwner = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): RoomCell | undefined => {
  const cell = cellAt(grid, r, c)
  if (cell.type !== "empty" && cell.type !== "corridor") return undefined
  const ownerKey = claims.claimedBy.get(`${r},${c}`)
  if (!ownerKey) return undefined
  const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
  const owner = grid.cells[ownerRow]?.[ownerCol]
  return owner?.type === "room" && owner.state !== "fogged" ? owner : undefined
}

// True if the void/corridor cell at `key` was claimed by a junction (fork) room — the other end of
// a fork-to-fork merge (see isPassable below).
const claimedByFork = (grid: FloorGrid, claims: RoomClaims, key: string): boolean => {
  const ownerKey = claims.claimedBy.get(key)
  if (!ownerKey) return false
  const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
  const owner = grid.cells[ownerRow]?.[ownerCol]
  return owner?.type === "room" && owner.roomType === "fork"
}

// Whether the player can pass between two cells the map draws floor for. Adjacency is NOT passage:
// a room claims the cells around it as footprint, so its floor can sit flush against a corridor it
// has no way through to, and that boundary needs a partition (see tileRegions.ts) or the room reads
// as something to walk around.
export const isPassable = (grid: FloorGrid, claims: RoomClaims, r: number, c: number, dir: "s" | "e"): boolean => {
  const cell = cellAt(grid, r, c)
  const [dr, dc] = DIR_MOVES[dir]
  const nr = r + dr
  const nc = c + dc
  const neighbor = cellAt(grid, nr, nc)
  // A real graph edge, from either side.
  if ((cell.type === "room" || cell.type === "corridor") && cell.dirs.has(dir)) return true
  if ((neighbor.type === "room" || neighbor.type === "corridor") && neighbor.dirs.has(OPPOSITE_DIR[dir])) return true
  if (claims.openEdges.has(edgeKey(r, c, nr, nc))) return true
  // Two junction rooms that each claim their own side of a shared void/corridor cell
  // (buildRoomClaims assigns that cell to whichever claims first) should still read as one open
  // space — junctions are connective tissue, not a distinct place, unlike other room types, which
  // stay visually separate even sitting right next to someone else's claim.
  const isForkMeetingClaim = (a: GridCell, bKey: string): boolean =>
    a.type === "room" && a.roomType === "fork" && claimedByFork(grid, claims, bKey)
  if (isForkMeetingClaim(cell, `${nr},${nc}`)) return true
  if (isForkMeetingClaim(neighbor, `${r},${c}`)) return true
  // Cells of one room's own footprint are one space: the claim is the room.
  const ownerOf = (row: number, col: number): string | undefined =>
    claims.claimedBy.get(`${row},${col}`) ?? (cellAt(grid, row, col).type === "room" ? `${row},${col}` : undefined)
  const own = ownerOf(r, c)
  const other = ownerOf(nr, nc)
  if (own && other && own !== other) return claims.joinedOwners.has([own, other].sort().join("|"))
  return !!own && own === other
}

// **A wall is a cell, not an edge.** Whether two neighbouring drawn cells read as one open space is
// no longer a question the renderer asks: they are both floor, and the wall is whatever cell the map
// draws no floor for (see tileRegions.ts). Two junctions each claiming their side of the void
// between them therefore merge for free, and two rooms flanking unclaimed void keep the wall
// between them for free.

/** Everything on the ENTRANCE side of every gate, as "r,c" keys — the part of a floor you can walk
 * without ever crossing a ward.
 *
 * A GATED SECTION DOES NOT BEGIN AT ITS GATE. World-gen authors the whole branch at the pocket's tier,
 * gate included, and the gate can sit well down the branch — so the corridor leading TO it was already
 * built of the pocket's stone. Drawn honestly that reads as starter, then expert, then a starter gate,
 * then expert again: the material changes three times to say one thing. 693 cells over 59 floors did
 * that, up to 30 on a single floor.
 *
 * So the seam is placed by TOPOLOGY, at the ward itself: this side of it is the floor's own stone,
 * beyond it is the tier it is guarding. One crossing, exactly where the bars are drawn, which is also
 * where the map lays its sill.
 *
 * The walk stops at a gate whatever STATE it is in. Stopping only at shut ones would flatten the whole
 * floor to one tier the moment a gate was opened — the seam is where the ward stands, not whether the
 * player has got through it yet.
 */
const entranceSide = new WeakMap<FloorGrid, ReadonlySet<string>>()
const cellsThisSideOfAWard = (grid: FloorGrid): ReadonlySet<string> => {
  const cached = entranceSide.get(grid)
  if (cached) return cached
  const isGate = (r: number, c: number) => {
    const cell = grid.cells[r]?.[c]
    return cell?.type === "room" && (cell.tags?.includes("gate") ?? false)
  }
  const [er, ec] = grid.entrancePos
  // Nothing to place a seam against, and nowhere to walk from: a floor with no ward keeps every tier its
  // sections were authored at, and one whose entrance is void would otherwise reach nothing and so call
  // the whole map the far side.
  const none: ReadonlySet<string> = new Set()
  const start = grid.cells[er]?.[ec]
  if (!start || start.type === "empty") return none
  let anyGate = false
  for (let r = 0; r < grid.rows && !anyGate; r++)
    for (let c = 0; c < grid.cols && !anyGate; c++) if (isGate(r, c)) anyGate = true
  if (!anyGate) {
    entranceSide.set(grid, none)
    return none
  }
  const reached = new Set([`${er},${ec}`])
  const queue: Array<readonly [number, number]> = [grid.entrancePos]
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i]
    // A ward is reached and not passed: it stands on this side, and everything past it does not.
    if (isGate(r, c) && !(r === er && c === ec)) continue
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") continue
    for (const dir of cell.dirs) {
      const [dr, dc] = DIR_MOVES[dir]
      const key = `${r + dr},${c + dc}`
      if (reached.has(key)) continue
      reached.add(key)
      queue.push([r + dr, c + dc])
    }
  }
  entranceSide.set(grid, reached)
  return reached
}

export const cellFloorAt = (
  grid: FloorGrid,
  claims: RoomClaims,
  ownedKeys: ReadonlySet<string> | undefined,
  r: number,
  c: number
): ReturnType<FloorAt> => {
  // The stone a cell is built of is its own SECTION's tier, not its floor's: a pocket gated behind a
  // junior key is junior stone inside a starter pyramid, and walking through the gate should say so.
  const floorTierOf = grid.difficulty ?? "starter"
  // A GATE NOT YET OPENED WEARS THE PYRAMID'S OWN STONE. The pocket behind it keeps its authored tier —
  // that is the point of the material, and walking through says so — but the gate's own square is on
  // THIS side of the door, and paving it in the pocket's stone let the player read next tier's
  // difficulty off the floor before earning the right to see it. Everything further in is dark until
  // the gate opens, so this one square was the whole of the peek.
  // THE SEAM IS AT THE WARD. Everything this side of one — the gate's own square included — is the
  // pyramid's own stone, and only what the gate guards is built of the tier it guards. That is one
  // crossing instead of three, and it lands where the bars are (`cellsThisSideOfAWard`).
  const thisSide = cellsThisSideOfAWard(grid)
  const tierOf = (cell: { difficulty?: Difficulty }, row: number, col: number): Difficulty =>
    thisSide.has(`${row},${col}`) ? floorTierOf : (cell.difficulty ?? floorTierOf)
  const owner = litClaimOwner(grid, claims, r, c)
  // A claimed cell renders as part of its owner: same material, same state, one continuous chamber.
  // A claimed cell is grid VOID and so on no walk of the floor: it asks the question at its OWNER's
  // square, or every chamber would come out the far side of every ward.
  if (owner) {
    const ownerKey = claims.claimedBy.get(`${r},${c}`) ?? `${r},${c}`
    const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
    return { state: owner.state, kind: "room", tier: tierOf(owner, ownerRow, ownerCol) }
  }
  const cell = cellAt(grid, r, c)
  if (cell.type === "empty") return "stone"
  // A real passage still in the dark is not stone — see FloorAt.
  if (cell.state === "fogged") return "unlit"
  const kind = cell.type === "room" ? "room" : "corridor"
  const tier = tierOf(cell, r, c)
  // A locked gate reads as not-yet-yours: cosmetic only, exactly as its icon does below.
  if (cell.type === "room" && cell.state === "reachable" && isLockedGate(cell, ownedKeys)) {
    return { state: "visible", kind, tier }
  }
  return { state: cell.state, kind, tier }
}

/** Which cells the map paints as floor and which as wall. Exported for tests: it is where the claim
 * rules above meet the wall model, and asserting on cells beats sniffing rendered SVG. */

export const tileRegionsFor = (grid: FloorGrid, claims: RoomClaims, ownedKeys?: ReadonlySet<string>): TileRegions =>
  buildTileRegions(
    grid.rows,
    grid.cols,
    (r, c) => cellFloorAt(grid, claims, ownedKeys, r, c),
    (r, c, dir) => isPassable(grid, claims, r, c, dir),
    grid.difficulty ?? "starter"
  )

// A corridor is a "corner" (and thus a valid click target for corner-reveal/hidden-
// passage interaction) whenever it isn't a plain straight-through segment.
