import { hashString } from "@/support/hashString"
import { blockedCells, fillsOf, placeBlobs, variantsOf, type Variant } from "../prefabChecks"
import type { PlaceDef, PlaceKind, Prefab, SpecialPlace } from "../prefabTypes"
import { cellAt, claimsFloorAt } from "../roomFootprint"
import { inRect, STEP } from "../roomShape"
import type {
  CellRect,
  Direction,
  FloorConfig,
  FloorGrid,
  GridCell,
  PrefabObject,
  PrefabRoom,
  RoomCell,
  SubSection,
} from "../siteTypes"
import type { WebDoorFault } from "../webDoors"
import { centrality } from "./centrality"
import { NODE_STEP, OPPOSITE } from "./grid"
import { childSectionsOf } from "./sections"
import type { FloorPrep, Refusal } from "./state"

type Cell = [number, number]

export const meets = (a: CellRect, b: CellRect): boolean =>
  a.top < b.top + b.rows && b.top < a.top + a.rows && a.left < b.left + b.cols && b.left < a.left + a.cols

export const ringed = ({ top, left, rows, cols }: CellRect): CellRect => ({
  top: top - 1,
  left: left - 1,
  rows: rows + 2,
  cols: cols + 2,
})

/** A corridor an arm may run through as the room's own floor: straight along the arm, plain ground, in sight. */
export const absorbable = (cell: GridCell, dir: Direction): boolean =>
  cell.type === "corridor" &&
  !cell.hidden &&
  cell.obstacle === undefined &&
  cell.dirs.size === 2 &&
  cell.dirs.has(dir) &&
  cell.dirs.has(OPPOSITE[dir])

/** What a room holds that a prefab must have a place for; `nothing` fits every prefab. */
type Holds = "nothing" | "chest" | "portal" | "mechanism"

const isDoor = (cell: RoomCell): boolean =>
  cell.requiredKeyId !== undefined ||
  cell.requiredKeyIds !== undefined ||
  cell.gateVariant !== undefined ||
  cell.tags?.includes("gate") === true ||
  cell.regionBarrier !== undefined ||
  cell.passage !== undefined ||
  cell.webDoor !== undefined

const holdsOf = (cell: GridCell): Holds => {
  if (cell.type !== "room") return "nothing"
  if (
    cell.mechanism !== undefined ||
    cell.worksMechanism !== undefined ||
    cell.sequenceTile !== undefined ||
    cell.plate !== undefined ||
    cell.pipeHole !== undefined
  )
    return "mechanism"
  if (cell.roomType === "portal") return "portal"
  if (cell.roomType === "encounter" && cell.tags?.includes("treasure") === true) return "chest"
  return "nothing"
}

/** A dead end with nothing in it: a node in sight with one way out, a corridor's end or a room where no encounter,
 * loot, stair, mechanism or door stands and no story or pin is authored. */
const emptyDeadEnd = (cell: GridCell, r: number, c: number): boolean => {
  if (cell.type === "empty" || cell.dirs.size !== 1 || cell.hidden) return false
  if (r % NODE_STEP !== 0 || c % NODE_STEP !== 0) return false
  if (cell.type === "corridor") return cell.obstacle === undefined && cell.openGate === undefined
  return (
    cell.roomType !== "portal" &&
    cell.family === undefined &&
    !cell.tags?.length &&
    cell.reward === undefined &&
    cell.stock === undefined &&
    cell.stairId === undefined &&
    cell.authoredActivity === undefined &&
    cell.pinnedPrefab === undefined &&
    holdsOf(cell) === "nothing" &&
    !isDoor(cell)
  )
}

/** A room whose content is stood on, so its node is where he stands: a plate, a pipe's hole, a sequence tile. */
const stoodOn = (cell: RoomCell): boolean =>
  cell.plate !== undefined || cell.pipeHole !== undefined || cell.sequenceTile !== undefined

/** What a room a placement may take holds, or undefined where no placement takes it: the entrance, a room that
 * claims no floor (a puzzle stop) unless it is an empty dead end, a story's or the god's room, a door, a room whose
 * content is stood on, and any encounter but a chest. */
const takeableHolds = (grid: FloorGrid, r: number, c: number): Holds | undefined => {
  const cell = cellAt(grid, r, c)
  if (cell.type === "empty" || cell.prefabRoom) return undefined
  if (r === grid.entrancePos[0] && c === grid.entrancePos[1]) return undefined
  if (emptyDeadEnd(cell, r, c)) return "nothing"
  if (cell.type !== "room" || cell.pinnedPrefab !== undefined) return undefined
  if (!claimsFloorAt(grid, r, c) || cell.authoredActivity !== undefined || cell.patronRoom) return undefined
  if (isDoor(cell) || stoodOn(cell)) return undefined
  const holds = holdsOf(cell)
  if (holds === "nothing" && cell.family !== undefined) return undefined
  return holds
}

const placeFor: Record<Exclude<Holds, "nothing">, SpecialPlace> = {
  chest: "chest",
  portal: "portal",
  mechanism: "mechanism",
}

const takes = (prefab: Prefab, holds: Holds): boolean =>
  holds === "nothing" || Object.values(prefab.specials).includes(placeFor[holds])

type Fit = { variant: Variant; rect: CellRect; doors: Partial<Record<Direction, Cell>>; absorbed: number }

/**
 * The prefab's variant over the node at r,c, its node at the variant's inside cell i,j, or undefined: each way out
 * runs straight through plain arm corridor to a door place on the ring and crosses it onto plain corridor; every
 * other cell of the rect and its ring is void; the ring meets none of `others`.
 */
const fitAt = (
  grid: FloorGrid,
  r: number,
  c: number,
  dirs: ReadonlySet<Direction>,
  variant: Variant,
  i: number,
  j: number,
  others: readonly CellRect[]
): Fit | undefined => {
  const rect = { top: r - i + 1, left: c - j + 1, rows: variant.cells.length - 2, cols: variant.cells[0].length - 2 }
  if (rect.top < 0 || rect.left < 0 || rect.top + rect.rows > grid.rows || rect.left + rect.cols > grid.cols)
    return undefined
  const own = new Set([`${r},${c}`])
  const doors: Partial<Record<Direction, Cell>> = {}
  let absorbed = 0
  for (const dir of dirs) {
    const [dr, dc] = STEP[dir]
    let k = 1
    for (; inRect(rect, r + dr * k, c + dc * k); k++) {
      if (!absorbable(cellAt(grid, r + dr * k, c + dc * k), dir)) return undefined
      own.add(`${r + dr * k},${c + dc * k}`)
      absorbed++
    }
    if (variant.cells[i + dr * k][j + dc * k] !== "d") return undefined
    const out = cellAt(grid, r + dr * k, c + dc * k)
    if (out.type !== "corridor" || out.hidden || out.obstacle !== undefined) return undefined
    own.add(`${r + dr * k},${c + dc * k}`)
    doors[dir] = [r + dr * k, c + dc * k]
  }
  const ring = ringed(rect)
  for (let rr = ring.top; rr < ring.top + ring.rows; rr++)
    for (let cc = ring.left; cc < ring.left + ring.cols; cc++)
      if (!own.has(`${rr},${cc}`) && cellAt(grid, rr, cc).type !== "empty") return undefined
  if (others.some(other => meets(ring, other))) return undefined
  return { variant, rect, doors, absorbed }
}

/** Every other room's 3×3 that claims floor, and every prefab rect laid before, keeping r,c's own out. */
const occupied = (grid: FloorGrid, r: number, c: number): CellRect[] =>
  grid.cells.flatMap((row, rr) =>
    row.flatMap((cell, cc): CellRect[] => {
      if (rr === r && cc === c) return []
      const taken: CellRect[] = []
      if (claimsFloorAt(grid, rr, cc)) taken.push({ top: rr - 1, left: cc - 1, rows: 3, cols: 3 })
      if (cell.type !== "empty" && cell.prefabRoom) taken.push(cell.prefabRoom.rect)
      return taken
    })
  )

/** The floor's patron statue on a patron place; on a floor with none, empty for an optional place, else the
 * place's next kind. */
const kindFor = (place: PlaceDef, hash: number, patron: boolean): PlaceKind | undefined => {
  const { kinds } = place
  const at = hash % kinds.length
  if (kinds[at] !== "patron") return kinds[at]
  if (patron) return "statue"
  if (place.optional) return undefined
  for (let step = 1; step < kinds.length; step++) {
    const next = kinds[(at + step) % kinds.length]
    if (next !== "patron") return next
  }
  return undefined
}

/** A choice made by hand in place of the hash, for a preview: which variant of `variantsOf`, which fill of its fills. */
export type PrefabPick = { variant?: number; fill?: number }

const furnish = (
  grid: FloorGrid,
  r: number,
  c: number,
  prefab: Prefab,
  fit: Fit,
  siteId: string,
  pick?: PrefabPick
): PrefabRoom => {
  const { variant, rect, doors } = fit
  const pk = `${r},${c}`
  const at = (i: number, j: number): Cell => [rect.top + i - 1, rect.left + j - 1]
  const keyAt = (variantKey: string): string => {
    const [i, j] = variantKey.split(",").map(Number)
    return at(i, j).join(",")
  }
  const fills = fillsOf(variant, prefab)
  if (fills.length === 0) throw new Error(`[carve] room ${prefab.name} has no fill: its check faults`)
  const fill = fills[(pick?.fill ?? hashString(`${siteId}:prefab:${pk}:fill`)) % fills.length]
  const standing = new Map<string, true>()
  const objects: PrefabObject[] = []
  for (const blob of placeBlobs(variant, prefab)) {
    const blobKey = `${blob.top},${blob.left}`
    if (!fill.has(blobKey)) continue
    const place = prefab.places[blob.letter]
    const kind = kindFor(
      place,
      hashString(`${siteId}:prefab:${pk}:${blob.letter}:${blobKey}`),
      grid.patron !== undefined
    )
    if (kind === undefined) continue
    standing.set(blobKey, true)
    const [top, left] = at(blob.top, blob.left)
    objects.push({
      kind,
      layer: place.layer,
      top,
      left,
      rows: blob.rows,
      cols: blob.cols,
      ...(variant.mirrored && place.layer === "ground" ? { flip: true as const } : {}),
    })
  }
  const blocked = new Set([...blockedCells(variant, prefab, standing)].map(keyAt))
  const used = new Set(Object.values(doors).map(door => door.join(",")))
  const special = new Map<SpecialPlace, Cell>()
  variant.cells.forEach((row, i) =>
    [...row].forEach((ch, j) => {
      const key = at(i, j).join(",")
      if (ch === "d" && !used.has(key)) blocked.add(key)
      const kind = prefab.specials[ch]
      if (kind !== undefined && !special.has(kind)) special.set(kind, at(i, j))
    })
  )
  const holds = holdsOf(cellAt(grid, r, c))
  const nodeArt = holds === "nothing" ? undefined : special.get(placeFor[holds])
  const actor = special.get("actor")
  return {
    name: prefab.name,
    layout: variant.layout,
    mirrored: variant.mirrored,
    rect,
    stop: special.get("stop") as Cell,
    ...(actor ? { actor } : {}),
    ...(nodeArt ? { nodeArt } : {}),
    objects,
    blocked: [...blocked],
    doors,
  }
}

/**
 * THE PREFAB LAID OVER THE ROOM (OR CORRIDOR END) AT r,c, or undefined where it fits no way. Each variant is tried with its node on
 * each free inside cell (`fitAt`); the fit absorbing the fewest arm cells wins, then the hash of the variant, then
 * the first node cell in reading order. Its fill and each place's kind are hashed from the site and the room; a
 * `pick` names the variant and the fill instead.
 */
export const fitPrefab = (
  grid: FloorGrid,
  r: number,
  c: number,
  prefab: Prefab,
  siteId: string,
  pick?: PrefabPick
): PrefabRoom | undefined => {
  const cell = cellAt(grid, r, c)
  if (cell.type === "empty") return undefined
  const others = occupied(grid, r, c)
  let best: (Fit & { tie: number }) | undefined
  const variants = variantsOf(prefab)
  for (const variant of pick?.variant === undefined ? variants : [variants[pick.variant % variants.length]]) {
    const tie = hashString(`${siteId}|prefab|${r},${c}|${variant.layout}${variant.mirrored ? "m" : ""}`)
    variant.cells.forEach((row, i) =>
      [...row].forEach((ch, j) => {
        if (ch !== ".") return
        const fit = fitAt(grid, r, c, cell.dirs, variant, i, j, others)
        if (fit && (!best || (fit.absorbed - best.absorbed || tie - best.tie) < 0)) best = { ...fit, tie }
      })
    )
  }
  return best && furnish(grid, r, c, prefab, best, siteId, pick)
}

/** Every designed room the floor and its sections name, by name. */
const prefabsOf = (config: FloorConfig): Readonly<Record<string, Prefab>> => {
  const named: Record<string, Prefab> = { ...config.prefabs }
  const walk = (sections: readonly SubSection[]) => {
    for (const section of sections) {
      Object.assign(named, section.prefabs)
      walk(childSectionsOf(section))
    }
  }
  walk(config.sideSections)
  return named
}

/** Every "r,c" inside a prefab's rect, to the name of the prefab. */
export const prefabCells = (grid: FloorGrid): ReadonlyMap<string, string> => {
  const inside = new Map<string, string>()
  for (const row of grid.cells)
    for (const cell of row) {
      if (cell.type === "empty" || !cell.prefabRoom) continue
      const { rect, name } = cell.prefabRoom
      for (let r = rect.top; r < rect.top + rect.rows; r++)
        for (let c = rect.left; c < rect.left + rect.cols; c++) inside.set(`${r},${c}`, name)
    }
  return inside
}

/** The first cell inside a prefab room that laying the web's doors changed, as the fault it is. */
export const webDoorInPrefab = (before: FloorGrid, after: FloorGrid): WebDoorFault | undefined => {
  for (const [key, name] of prefabCells(before)) {
    const [r, c] = key.split(",").map(Number)
    if (before.cells[r][c] !== after.cells[r][c])
      return { type: "webDoorUnseated", where: key, why: `it stands inside room ${name}` }
  }
  return undefined
}

/**
 * THE DESIGNED ROOMS LAID OVER THE FINISHED CARVE. Pinned rooms first, each on its own node, and one that fits
 * nowhere refuses the attempt; then each placement in the order the floor names them, over the rooms a placement may
 * take (`takeableHolds`) whose contents the prefab has a place for, nearest its `central` first (`centrality`), the
 * hash breaking ties, up to `max`; fewer than `min` refuses the attempt. A room laid over keeps its type, `dirs` and
 * contents; the prefab's objects take the place of its dressing. A floor that names none is handed back as it came.
 */
export const placePrefabs = (prep: FloorPrep, grid: FloorGrid): Refusal | FloorGrid => {
  const { config } = prep.config
  const { siteId } = prep.input
  const placements = config.prefabPlacements ?? []
  const pinned: Array<{ r: number; c: number; name: string }> = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "room" && cell.pinnedPrefab !== undefined) pinned.push({ r, c, name: cell.pinnedPrefab })
    })
  )
  if (placements.length === 0 && pinned.length === 0) return grid
  const prefabs = prefabsOf(config)
  const prefabNamed = (name: string): Prefab => {
    const prefab = prefabs[name]
    if (!prefab) throw new Error(`[carve] room ${name} is named but the floor carries no such prefab`)
    return prefab
  }
  const cells = grid.cells.map(row => [...row])
  const working: FloorGrid = { ...grid, cells }
  const lay = (r: number, c: number, prefab: Prefab, room: PrefabRoom) => {
    const cell = cells[r][c]
    if (cell.type === "corridor") {
      cells[r][c] = { ...cell, prefabRoom: room }
      return
    }
    const {
      decoration: _decoration,
      decorationFallback: _fallback,
      wallDecoration: _wall,
      patronRoom: _patron,
      activity: _activity,
      ...kept
    } = cell as RoomCell
    cells[r][c] = { ...kept, ...(prefab.activity ? { activity: prefab.activity } : {}), prefabRoom: room }
  }

  for (const { r, c, name } of pinned) {
    const prefab = prefabNamed(name)
    const room = fitPrefab(working, r, c, prefab, siteId)
    if (!room) return { retry: [{ type: "prefabsNotPlaced", room: name, wanted: 1, placed: 0 }] }
    lay(r, c, prefab, room)
  }

  const rooms: Cell[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => (claimsFloorAt(grid, r, c) || emptyDeadEnd(cell, r, c)) && rooms.push([r, c]))
  )
  const central = centrality(grid, rooms)
  for (const { room: name, min, max, central: wanted } of placements) {
    const prefab = prefabNamed(name)
    const ranked = rooms
      .filter(([r, c]) => {
        const holds = takeableHolds(working, r, c)
        return holds !== undefined && takes(prefab, holds)
      })
      .map(([r, c]) => ({
        r,
        c,
        off: Math.abs((central.get(`${r},${c}`) ?? 0) - wanted),
        tie: hashString(`${siteId}|prefabRank|${name}|${r},${c}`),
      }))
      .sort((a, b) => a.off - b.off || a.tie - b.tie || a.r - b.r || a.c - b.c)
    let placed = 0
    for (const { r, c } of ranked) {
      if (placed === max) break
      const room = fitPrefab(working, r, c, prefab, siteId)
      if (!room) continue
      lay(r, c, prefab, room)
      placed++
    }
    if (placed < min) return { retry: [{ type: "prefabsNotPlaced", room: name, wanted: min, placed }] }
  }
  return working
}
