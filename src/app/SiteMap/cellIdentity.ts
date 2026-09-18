import type { FloorGrid } from "@/game/siteTypes"
import { decodeEdge } from "./edgeId"

/**
 * WHAT A SAVE CALLS A CELL, once the carve is free to move.
 *
 * A coordinate is an accident of the carve, and so — this is the part that took measuring — is the
 * ordinal. A cell's `ordinal` is its step along the CARVED walk, and how many steps that walk takes is
 * the carve's own choice (`targetDistance` in siteAssembler). Re-carving one expert floor at a
 * neighbouring seed took it from 685 cells to 668 and moved the main chain's forks from steps
 * 26/49/58 to 5/6/13/22/29/50: everything past the first divergence renumbers. An ordinal survives a
 * floor being re-SHUFFLED; it does not survive one being re-LENGTHENED, which is what compacting the
 * corridors will do to all 74 floors.
 *
 * What does survive is what the floor was AUTHORED from, which is the room list:
 *
 * - a puzzle, trap or tableau room is the k-th room of its chain — `p${pathIndex}`
 * - a chest, shop or gate is its section's one `end` or `gate` — named by the family that fills it
 * - a staircase is its `stairId`; the two plain portals are the entrance and the exit
 *
 * Measured over the baked world: 5250 such slots, no two alike inside a (section, floor), and all 1303
 * sections hold at least one. Re-carved at two different seeds, four floors across four tiers and a
 * tomb kept every slot.
 *
 * Corridors and forks have no slot, because they have no authored identity — how many corridor cells
 * there are and where the chain turns IS the carve. They are addressed by `~${ordinal}`, which resolves
 * inside one carve and deliberately resolves to nothing after the floor moves. Their fog comes back by
 * the high-water mark instead (`applyExplored` in useAssembledFloor).
 *
 * The section is named by its AUTHORING ADDRESS — `main`, `s0`, `s0.1` — and not by the structural hash
 * that used to key exploration. The hash covers the floor's own carve knobs (`packing`,
 * `corridorStraightness`), so retuning them moved every hash in the world and reset every run: exactly
 * the knobs corridor compaction turns. The address does not move, and the slots below degrade far more
 * gracefully than a reset when a section's contents are re-authored — add two puzzles to `s0` and
 * `p0`–`p3` still restore while `p4`–`p5` are simply new.
 *
 * The floor is in the address because a section carries none, and floors authored to the same shape
 * used to hash identically: 62 (level, hash) pairs in the baked world span more than one floor, and
 * every floor of every tomb shares one with all the others. Without it, walking a tomb's ground floor
 * would loot the floors above.
 */
export const cellSlot = (grid: FloorGrid, row: number, col: number): string | null => {
  const cell = grid.cells[row]?.[col]
  if (!cell || cell.type !== "room" || cell.roomType === "fork") return null
  if (cell.roomType === "portal") {
    if (cell.stairId) return `stair:${cell.stairId}`
    return row === grid.entrancePos[0] && col === grid.entrancePos[1] ? "entrance" : "exit"
  }
  // A room the chain authored by position is named by that position; the ones a section gets exactly
  // one of — its terminal chest or shop, its gate — are named by what fills them.
  return cell.pathIndex !== undefined ? `p${cell.pathIndex}` : `x${cell.family ?? "?"}`
}

/** The full name of a cell: which section, which floor, and which slot of it. Null only for a cell
 * that is not there at all. */
export const cellAddress = (grid: FloorGrid, floor: number, row: number, col: number): string | null => {
  const cell = grid.cells[row]?.[col]
  if (!cell || cell.type === "empty") return null
  const slot = cellSlot(grid, row, col) ?? (cell.ordinal ? `~${cell.ordinal}` : null)
  if (!slot || cell.sectionAddress === undefined) return null
  return `${cell.sectionAddress}#${floor}/${slot}`
}

/** Which authored section an address belongs to, and which floor — both readable without assembling
 * anything, which is what lets the map pick a floor to build before it can resolve the rest. */
export const sectionOfAddress = (address: string): string => address.split("#")[0]

export const floorOfAddress = (address: string | null | undefined): number => {
  const floor = Number(address?.split("#")[1]?.split("/")[0])
  return Number.isFinite(floor) ? floor : 0
}

/** What a save files a cell under, inside its section's entry: the floor and the slot, without the
 * section that the entry is already keyed by. */
export const cellKey = (grid: FloorGrid, floor: number, row: number, col: number): string | null => {
  const address = cellAddress(grid, floor, row, col)
  return address === null ? null : keyOfAddress(address)
}

export const keyOfAddress = (address: string): string => address.split("#").slice(1).join("#")

/** Where an address sits in THIS carve, or null when nothing here answers to it — which is the right
 * answer for a `~ordinal` corridor after the floor has moved. */
export const findByAddress = (grid: FloorGrid, floor: number, address: string): [row: number, col: number] | null => {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (cellAddress(grid, floor, r, c) === address) return [r, c]
    }
  }
  return null
}

/**
 * How far along its section's walk a cell sits, as a number that can be compared.
 *
 * A node carries its step; a connector carries the pair of steps it joins, sorted as text, so the order
 * of the two says nothing. It sits between them, so it counts as just short of the far end: reaching
 * step 4 reveals the connector out of step 3, reaching step 3 does not.
 */
export const walkPosition = (ordinal: string): number => {
  const ends = ordinal.split("|").map(Number)
  return ends.length > 1 ? Math.max(...ends) - 0.5 : ends[0]
}

/** A floor of a journey, assembled the way the runtime assembles it. Injected so the migration can be
 * tested without a world, and so it reads the SAME carve the coordinates were written against. */
export type AssembleFor = (levelNr: number, floorIndex: number) => FloorGrid | null

/** Which (levelNr, floor) pairs a stored `exploredSections` covers. The key carries the level, the
 * cell ids carry the floor, so the set of floors to assemble is already in the save. */
const floorsIn = (exploredSections: Record<string, string[]>): [levelNr: number, floor: number][] => {
  const seen = new Set<string>()
  for (const [key, cellIds] of Object.entries(exploredSections)) {
    const levelNr = Number(key.split(":")[0])
    if (!Number.isFinite(levelNr)) continue
    for (const cellId of cellIds) seen.add(`${levelNr}:${decodeEdge(cellId)[0]}`)
  }
  return [...seen].map(pair => pair.split(":").map(Number) as [number, number])
}

/**
 * The cell keys a floor's stored coordinates stand for, read off the grid those coordinates were
 * written against.
 *
 * Corridors come across too, under their carve-bound `~ordinal` key. They are worth translating because
 * the re-keying runs BEFORE the floors move, so until they do, the fog is restored exactly as it was
 * stored. Once a floor is re-carved those keys stop matching and the high-water mark takes over.
 *
 * The archive is keyed by the old structural hash and the result is filed by the authoring address, so
 * this is the one place both still have to be on the cell.
 */
export const cellKeysForFloor = (
  grid: FloorGrid,
  floor: number,
  exploredSections: Record<string, string[]>
): Record<string, string[]> => {
  const result: Record<string, string[]> = {}
  for (const [sectionHash, cellIds] of Object.entries(exploredSections)) {
    for (const cellId of cellIds) {
      const [cellFloor, r, c] = decodeEdge(cellId)
      if (cellFloor !== floor) continue
      const cell = grid.cells[r]?.[c]
      if (!cell || cell.type === "empty" || cell.sectionAddress === undefined) continue
      // A save written before the section hash stopped covering the encounter files its cells under
      // the old hash, so that one counts as a match too.
      if (cell.sectionHash !== sectionHash && cell.legacySectionHash !== sectionHash) continue
      const key = cellKey(grid, floor, r, c)
      if (!key) continue
      const current = result[cell.sectionAddress] ?? []
      if (!current.includes(key)) result[cell.sectionAddress] = [...current, key]
    }
  }
  return result
}

/**
 * Translate a save's coordinate-keyed exploration into cell keys, filed by authoring address.
 *
 * RUN IT WHILE THE OLD CARVE IS STILL THE ONE THE CODE PRODUCES. That is the whole reason this is a
 * two-release migration rather than a reset: a coordinate only means something against the floor it
 * was written against, so the translation has to happen in the release BEFORE the one that moves the
 * floors. Afterwards the slots stand on their own and the coordinates can go.
 */
export const migrateExploredToCells = (
  exploredSections: Record<string, string[]>,
  assembleFor: AssembleFor
): Record<string, string[]> => {
  const result: Record<string, string[]> = {}
  for (const [levelNr, floor] of floorsIn(exploredSections)) {
    const grid = assembleFor(levelNr, floor)
    if (!grid) continue
    const prefix = `${levelNr}:`
    const forLevel: Record<string, string[]> = {}
    for (const [key, cellIds] of Object.entries(exploredSections)) {
      if (key.startsWith(prefix)) forLevel[key.slice(prefix.length)] = cellIds
    }
    for (const [sectionHash, keys] of Object.entries(cellKeysForFloor(grid, floor, forLevel))) {
      const storedKey = `${prefix}${sectionHash}`
      const current = result[storedKey] ?? []
      result[storedKey] = [...current, ...keys.filter(key => !current.includes(key))]
    }
  }
  return result
}

/**
 * The address a stored coordinate stands for, under each level the save has been in.
 *
 * The trap, shop and consumable collections store a bare `floor:row,col` with no level beside it, so a
 * coordinate on floor 1 means "floor 1 of whichever level you are on" — the same entry answers for
 * every level of a multi-level pyramid. Translating it against each of those levels in turn keeps that
 * exactly as it was; going forward the writers file one address per level, which is stricter.
 */
const addressesForEdge = (edgeId: string, levels: number[], assembleFor: AssembleFor): string[] => {
  const [floor, r, c] = decodeEdge(edgeId)
  const found: string[] = []
  for (const levelNr of levels) {
    const grid = assembleFor(levelNr, floor)
    const address = grid && cellAddress(grid, floor, r, c)
    if (address) found.push(`${levelNr}:${address}`)
  }
  return found
}

/** What one save's per-cell collections look like once every one of them names cells the way a
 * re-carve cannot move. Everything not listed here was never keyed by a coordinate or a hash. */
export type CarveIndependentState = {
  exploredCells: Record<string, string[]>
  positionKey: string | null
  disabledTraps: string[]
  skippedConsumables: string[]
  purchasedStock: string[]
  knownHiddenCorridors: string[]
  foundHiddenCorridors: string[]
}

type Migratable = {
  levelNr: number
  /** The coordinate archive to translate. Absent in a save written before there was one, which still
   * comes through here on its cellKeyVersion: there is nothing to translate, so it re-keys to empty
   * rather than taking the launch down with it. */
  exploredSections?: Record<string, string[]>
  position?: string | null
  disabledTraps?: string[]
  skippedConsumables?: string[]
  purchasedStock?: string[]
  knownHiddenCorridors?: string[]
  foundHiddenCorridors?: string[]
}

/**
 * Every structural hash on one floor, and the authored section it belongs to.
 *
 * The corridor detector files a found hidden corridor by section, and those records were keyed by the
 * hash. Without this they would all stop matching and every passage the player has already uncovered
 * would go back to being hidden.
 */
const addressByHash = (grid: FloorGrid): Map<string, string> => {
  const map = new Map<string, string>()
  for (const row of grid.cells) {
    for (const cell of row) {
      if (cell.type === "empty" || cell.sectionAddress === undefined) continue
      if (cell.sectionHash !== undefined) map.set(cell.sectionHash, cell.sectionAddress)
      if (cell.legacySectionHash !== undefined) map.set(cell.legacySectionHash, cell.sectionAddress)
    }
  }
  return map
}

/**
 * One save, re-keyed — every collection that named cells by coordinate, translated against the carve
 * those coordinates were written against.
 *
 * Grids are assembled once each and shared across the collections: a save that has been into four
 * floors carves four floors, not four per collection.
 */
export const migrateJourneyToCarveIndependent = (
  stored: Migratable,
  assembleFor: AssembleFor
): CarveIndependentState => {
  const grids = new Map<string, FloorGrid | null>()
  const cached: AssembleFor = (levelNr, floorIndex) => {
    const key = `${levelNr}:${floorIndex}`
    if (!grids.has(key)) grids.set(key, assembleFor(levelNr, floorIndex))
    return grids.get(key) ?? null
  }

  const floors = floorsIn(stored.exploredSections ?? {})
  const levels = [...new Set(floors.map(([levelNr]) => levelNr))]
  const translate = (edgeIds: readonly string[] | undefined): string[] => [
    ...new Set((edgeIds ?? []).flatMap(edgeId => addressesForEdge(edgeId, levels, cached))),
  ]

  // A stock entry is a cell plus which slot of it was bought, so it translates as its cell and keeps
  // the slot number. `!` separates them because the address already spends `#` on its section.
  const stock = [
    ...new Set(
      (stored.purchasedStock ?? []).flatMap(entry => {
        const at = entry.lastIndexOf("#")
        if (at < 0) return []
        return addressesForEdge(entry.slice(0, at), levels, cached).map(address => `${address}!${entry.slice(at + 1)}`)
      })
    ),
  ]

  // The detector's records are `${levelNr}:${sectionHash}`, and the level says which floors to look on.
  // A player who found a hidden corridor walked to its junction, so the floor is one the save names.
  const hashMaps = new Map<string, Map<string, string>>()
  const hashesOn = (levelNr: number, floor: number): Map<string, string> => {
    const key = `${levelNr}:${floor}`
    if (!hashMaps.has(key)) {
      const grid = cached(levelNr, floor)
      hashMaps.set(key, grid ? addressByHash(grid) : new Map())
    }
    return hashMaps.get(key) ?? new Map()
  }
  const sections = (entries: readonly string[] | undefined): string[] => {
    const out = new Set<string>()
    for (const entry of entries ?? []) {
      const at = entry.indexOf(":")
      const levelNr = Number(entry.slice(0, at))
      const hash = entry.slice(at + 1)
      if (at < 0 || !Number.isFinite(levelNr)) continue
      for (const [, floor] of floors.filter(([lvl]) => lvl === levelNr)) {
        const address = hashesOn(levelNr, floor).get(hash)
        if (address) out.add(`${levelNr}:${address}`)
      }
    }
    return [...out]
  }

  // Position belongs to the level the player is actually in, not to every level they have visited.
  const [positionFloor, pr, pc] = stored.position ? decodeEdge(stored.position) : [0, -1, -1]
  const positionGrid = stored.position ? cached(stored.levelNr, positionFloor) : null

  return {
    exploredCells: migrateExploredToCells(stored.exploredSections ?? {}, cached),
    positionKey: positionGrid ? cellAddress(positionGrid, positionFloor, pr, pc) : null,
    disabledTraps: translate(stored.disabledTraps),
    skippedConsumables: translate(stored.skippedConsumables),
    purchasedStock: stock,
    knownHiddenCorridors: sections(stored.knownHiddenCorridors),
    foundHiddenCorridors: sections(stored.foundHiddenCorridors),
  }
}
