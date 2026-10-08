import type { RegionGraph } from "./regions"
import type { Direction, GridCell } from "./siteTypes"

/**
 * WHETHER THE CARVE THE BUILDER PRODUCED IS THE FLOOR THE AUTHOR DREW. The authored layout and the
 * carved grid are different objects, and the grid is what gets walked: a side chain hosting off-route
 * regions takes its labels from the layout, but physically hangs off whichever main-path cell the
 * carve found roomy. Nothing in the carve ties the two, so these read the finished cells back against
 * the layout and say where they disagree, in the author's own region and obstacle names.
 *
 * Read off the grid alone — no seed, no attempt — so each is as cheap as the flood it runs.
 */
export type CarveFault =
  /** `region` joined `through` in the carve, where the layout joins it to `authored` instead (empty
   * when the layout has no connection of `region` the carve failed to make). */
  | { type: "regionAttachedThrough"; region: string; through: string; authored: string[] }
  /** The layout connects these two regions and no pair of neighbouring cells in the carve does. */
  | { type: "regionsNotJoined"; between: [string, string] }
  /** A gate's door stands where it touches `touches` lock regions, not the two a gate separates.
   * `around` is every region label standing beside it. */
  | { type: "gateDoorMisplaced"; id: string; between: [string, string]; touches: number; around: string[] }
  /** A drop lands in `region`, in ground that does not reach the door of every gate that bounds
   * `region` — the gates named in `apart`. */
  | { type: "dropLandsApart"; id: string; region: string; apart: string[] }

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }
const posKey = (r: number, c: number) => `${r},${c}`

type Cells = ReadonlyArray<ReadonlyArray<GridCell>>

const walkable = (cell: GridCell | undefined) =>
  !!cell && (cell.type === "room" || cell.type === "corridor") && !cell.hidden

const dirsOf = (cell: GridCell): ReadonlySet<Direction> =>
  cell.type === "room" || cell.type === "corridor" ? cell.dirs : new Set<Direction>()

const doorKeysOf = (cell: GridCell | undefined): string[] =>
  cell?.type === "room" ? [...(cell.requiredKeyId ? [cell.requiredKeyId] : []), ...(cell.requiredKeyIds ?? [])] : []

/** The walkable cells a cell opens onto AND that open back onto it — the ground a player crosses both
 * ways. A drop names only the way onward, so it is never one of these. */
const twoWayNeighbours = (cells: Cells, r: number, c: number): Array<[number, number]> => {
  const here = cells[r][c]
  const found: Array<[number, number]> = []
  for (const dir of dirsOf(here)) {
    const [nr, nc] = [r + MOVES[dir][0], c + MOVES[dir][1]]
    const next = cells[nr]?.[nc]
    if (walkable(next) && dirsOf(next!).has(OPPOSITE[dir])) found.push([nr, nc])
  }
  return found
}

const pairKey = (a: string, b: string) => JSON.stringify([a, b].sort())

const sameRegionGround = (cells: Cells, skip: ReadonlySet<string>): Map<string, string> => {
  const of = new Map<string, string>()
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++) {
      const cell = cells[r][c]
      if (!walkable(cell) || of.has(posKey(r, c)) || skip.has(posKey(r, c))) continue
      const isDoor = doorKeysOf(cell).length > 0
      const id = isDoor ? `door ${r},${c}` : `at ${r},${c}`
      of.set(posKey(r, c), id)
      const queue: Array<[number, number]> = [[r, c]]
      while (!isDoor && queue.length > 0) {
        const [qr, qc] = queue.shift()!
        for (const [nr, nc] of twoWayNeighbours(cells, qr, qc)) {
          if (doorKeysOf(cells[nr][nc]).length > 0 || of.has(posKey(nr, nc)) || skip.has(posKey(nr, nc))) continue
          of.set(posKey(nr, nc), id)
          queue.push([nr, nc])
        }
      }
    }
  return of
}

/** Every pair of different region labels whose cells the player walks between both ways. */
const carvedAdjacency = (cells: Cells): Map<string, [string, string]> => {
  const found = new Map<string, [string, string]>()
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++) {
      const here = cells[r][c]
      if (!walkable(here)) continue
      const region = (here as { region?: string }).region
      if (region === undefined) continue
      for (const [nr, nc] of twoWayNeighbours(cells, r, c)) {
        const beside = (cells[nr][nc] as { region?: string }).region
        if (beside === undefined || beside === region) continue
        found.set(pairKey(region, beside), [region, beside].sort() as [string, string])
      }
    }
  return found
}

/**
 * THE CARVE'S REGION ADJACENCY AGAINST THE LAYOUT'S CONNECTIONS. Two regions that touch in the carve
 * without a connection, or a connection no cells cross, are the floor not being the one drawn. Read as
 * "region attached through X, authored with Y" where a missing connection and a wrong one share an
 * end — the usual shape, since a side chain hanging off the wrong cell swaps one neighbour for another.
 *
 * THE CARVE IS FREE WHERE THE LAYOUT IS SILENT (designer, 2026-10-08): a corridor may circle back on ground of its own
 * region, and an obstacle may stand anywhere along its corridor, so long as the corridor's obstacles keep their order.
 * Only region adjacency and that order are the layout's; everything else is the carve's to choose, so it succeeds
 * more often.
 */
export const adjacencyFaults = (cells: Cells, layout: RegionGraph): CarveFault[] => {
  const carved = carvedAdjacency(cells)
  const authored = new Map(layout.connections.map(([a, b]) => [pairKey(a, b), [a, b] as [string, string]]))
  const extra = [...carved].filter(([key]) => !authored.has(key)).sort(([a], [b]) => a.localeCompare(b))
  const missing = [...authored].filter(([key]) => !carved.has(key))
  const explained = new Set<string>()
  const faults: CarveFault[] = []
  for (const [, [x, y]] of extra) {
    const partnersOf = (region: string) =>
      missing.filter(([, pair]) => pair.includes(region)).map(([key, [a, b]]) => ({ key, other: a === region ? b : a }))
    const [region, through] = partnersOf(x).length > 0 ? [x, y] : partnersOf(y).length > 0 ? [y, x] : [y, x]
    const partners = partnersOf(region)
    for (const { key } of partners) explained.add(key)
    faults.push({ type: "regionAttachedThrough", region, through, authored: partners.map(p => p.other) })
  }
  for (const [key, between] of missing) if (!explained.has(key)) faults.push({ type: "regionsNotJoined", between })
  return faults
}

/** The door cells standing for each gate: `keyOf` says which key a gate's door asks for. */
const doorsOfGate = (cells: Cells, key: string): Array<[number, number]> => {
  const doors: Array<[number, number]> = []
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++) if (doorKeysOf(cells[r][c]).includes(key)) doors.push([r, c])
  return doors
}

/** `bounds` are the regions this gate stands against: of several gates in series on one connection only
 * the first and last touch a region, so a drop landing in one reaches the door at its own end. Absent: both. */
type Gate = { id: string; between: readonly [string, string]; key: string; bounds?: readonly string[] }

/**
 * EVERY GATE'S DOOR SEPARATES EXACTLY TWO LOCK REGIONS — the ground a door shuts off from the ground
 * beside it. A door standing in a junction of three, or at the mouth of a dead end the carve then
 * joined to its other side, is not the boundary the authoring drew however the labels line up.
 * `skip` is the cells of the drops' runs, which belong to the ground they fall from and are no ground
 * of their own.
 */
export const gateDoorFaults = (cells: Cells, gates: readonly Gate[], skip: ReadonlySet<string>): CarveFault[] => {
  const ground = sameRegionGround(cells, skip)
  const faults: CarveFault[] = []
  for (const gate of gates)
    for (const [r, c] of doorsOfGate(cells, gate.key)) {
      const beside = twoWayNeighbours(cells, r, c)
      const touched = new Set(beside.map(([nr, nc]) => ground.get(posKey(nr, nc))).filter(id => id !== undefined))
      if (touched.size === 2) continue
      const around = new Set(
        [[r, c], ...beside]
          .map(([nr, nc]) => (cells[nr][nc] as { region?: string }).region)
          .filter(x => x !== undefined)
      )
      faults.push({
        type: "gateDoorMisplaced",
        id: gate.id,
        between: [gate.between[0], gate.between[1]],
        touches: touched.size,
        around: ([...around] as string[]).sort(),
      })
    }
  return faults
}

/**
 * A DROP LANDS IN GROUND THAT REACHES EVERY DOOR BOUNDING THE REGION IT NAMES. A region carved as
 * several pockets can take the landing into one no gate borders, which is not the place the author
 * sent the player: the trick a drop exists for is arriving BETWEEN two doors.
 */
export const dropLandingFaults = (
  cells: Cells,
  drops: ReadonlyArray<{ id: string; region: string; landing: readonly [number, number] }>,
  gates: readonly Gate[],
  skip: ReadonlySet<string>
): CarveFault[] => {
  const ground = sameRegionGround(cells, skip)
  const faults: CarveFault[] = []
  for (const drop of drops) {
    const landedOn = ground.get(posKey(drop.landing[0], drop.landing[1]))
    const apart = gates
      .filter(gate => (gate.bounds ?? gate.between).includes(drop.region))
      .filter(
        gate =>
          !doorsOfGate(cells, gate.key).some(([r, c]) =>
            twoWayNeighbours(cells, r, c).some(([nr, nc]) => ground.get(posKey(nr, nc)) === landedOn)
          )
      )
      .map(gate => gate.id)
    if (apart.length > 0) faults.push({ type: "dropLandsApart", id: drop.id, region: drop.region, apart })
  }
  return faults
}
