import { doorKeysOf } from "./floorLock"
import type { PlacedLock } from "./floorLocks"
import type { AbsorbedDemand, LaidFloor } from "./laidFloor"
import type { RegionAppetite } from "./regions"
import type { FloorConfig, FloorGrid, GridCell, RoomCell } from "./siteTypes"

// A REGION GETS WHAT IT TAKES: a lock region whose `takes` asks for puzzles or a reward holds one on the grid. A lock
// that asks for nothing is valid holding nothing; whether it should hold an encounter is the lock's to say.

const isControl = (cell: GridCell): boolean =>
  cell.type === "room" &&
  (cell.mechanism !== undefined ||
    cell.mechanismId !== undefined ||
    cell.worksMechanism !== undefined ||
    cell.sequenceTile !== undefined ||
    cell.plate !== undefined ||
    cell.pipeHole !== undefined)

/** Any encounter room (a puzzle, a trap, a chest, a shop) that is neither a control nor a door. */
const isEncounterOnTheWay = (cell: GridCell): cell is RoomCell =>
  cell.type === "room" && cell.roomType === "encounter" && !isControl(cell) && doorKeysOf(cell).length === 0

/** A room a chain authored by position (a puzzle or a trap): what feeds a region asking for puzzles. */
const isPuzzleRoom = (cell: GridCell): boolean => isEncounterOnTheWay(cell) && cell.pathIndex !== undefined

const holdsReward = (cell: GridCell): boolean =>
  cell.type === "room" &&
  (cell.reward !== undefined ||
    cell.stock !== undefined ||
    cell.tags?.includes("treasure") === true ||
    cell.tags?.includes("shop") === true)

/** A part of a placed lock that may ask for content: one of its regions. Its corridors join once they carry an
 * appetite of their own. */
export type LockPart = { kind: "region"; placed: PlacedLock; region: string }

/** What a part of a lock asks for. */
export const appetiteOf = (part: LockPart): RegionAppetite => part.placed.lock.regions[part.region]?.takes ?? "free"

/** Every region of the floor's locks whose appetite asks for puzzles or a reward and that holds none on the grid. */
export const lockGroundUnfed = (grid: FloorGrid, floor: Pick<FloorConfig, "locks">): string[] => {
  const cells = grid.cells.flat()
  return (floor.locks ?? []).flatMap(placed => {
    const instance = placed.as ?? placed.lock.name
    return Object.keys(placed.lock.regions).flatMap(region => {
      const appetite = appetiteOf({ kind: "region", placed, region })
      if (appetite !== "puzzles" && appetite !== "reward") return []
      const label = `${instance}.${region}`
      const fed = appetite === "puzzles" ? isPuzzleRoom : holdsReward
      return cells.some(cell => cell.type !== "empty" && cell.region === label && fed(cell))
        ? []
        : [`${label} asks for ${appetite} and holds none`]
    })
  })
}

/** Every side section assigned to a lock corridor with a room standing off that corridor's laid nodes. */
export const corridorUnfed = (
  laid: Pick<LaidFloor, "stretches" | "absorbed">,
  demands: readonly AbsorbedDemand[]
): string[] =>
  demands.flatMap(({ section, corridor }) => {
    if (corridor === undefined) return []
    const nodes = new Set(laid.stretches.get(`corridor:${corridor}`) ?? [])
    const place = laid.absorbed.find(found => found.section === section)
    return place !== undefined && place.cells.every(cell => nodes.has(cell))
      ? []
      : [`side path s${section} on ${corridor} has a room off it`]
  })
