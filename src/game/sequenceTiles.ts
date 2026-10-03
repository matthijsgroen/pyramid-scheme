import { hashString } from "@/support/hashString"
import { compileSequence } from "./sequence"
import type { GridCell, RoomCell } from "./siteTypes"

type Place = [number, number]

/** One sequence to stand on the floor: where each step's tile belongs, the glyph each wears, what finishing
 * opens, and the key of the door it is reset at. */
export type SequenceDemand = {
  id: string
  regions: readonly string[]
  glyphs: readonly number[]
  gates: readonly { gateKeyId: string; mode?: "any" }[]
  doorKey: string
}

// A tile stands on a bare corridor node of its region that is no junction: ground the player walks onto,
// with nothing else on it. Nodes only (even/even), since a connector between two nodes is not somewhere a
// walk stops. Cells off the main path come first, because a tile on the way to the exit is one the player
// cannot avoid stepping on, and the order has to be a thing they can get right.
const isCandidate = (cell: GridCell, r: number, c: number, region: string): boolean =>
  cell.type === "corridor" &&
  cell.region === region &&
  !cell.hidden &&
  !cell.obstacle &&
  cell.dirs.size <= 2 &&
  r % 2 === 0 &&
  c % 2 === 0

/**
 * STANDS EVERY SEQUENCE'S TILES ON THE FINISHED CARVE, and changes no wall: a tile is a corridor node
 * becoming a room, `dirs` untouched. Each step takes its own cell in the region the author named, so two
 * steps in one region are two cells, and nothing is placed anywhere else — a region with no free node for
 * a step refuses the whole placement, naming the sequence and the step.
 *
 * The sequence's one record goes on the tile of step 0; the door named by `doorKey` works the reset.
 */
export const placeSequences = (
  cells: GridCell[][],
  sequences: readonly SequenceDemand[],
  onMainPath: ReadonlySet<string>,
  salt: string
): { id: string; step: number } | undefined => {
  const taken = new Set<string>()
  const picked = new Map<string, Place[]>()
  for (const { id, regions } of sequences) {
    const places: Place[] = []
    for (const [step, region] of regions.entries()) {
      const candidates: Place[] = []
      for (let r = 0; r < cells.length; r++)
        for (let c = 0; c < cells[r].length; c++)
          if (!taken.has(`${r},${c}`) && isCandidate(cells[r][c], r, c, region)) candidates.push([r, c])
      const rank = ([r, c]: Place) => hashString(`${salt}|sequence|${id}|${step}|${r},${c}`)
      const [best] = candidates.sort(
        (a, b) =>
          Number(onMainPath.has(`${a[0]},${a[1]}`)) - Number(onMainPath.has(`${b[0]},${b[1]}`)) || rank(a) - rank(b)
      )
      if (!best) return { id, step }
      taken.add(`${best[0]},${best[1]}`)
      places.push(best)
    }
    picked.set(id, places)
  }

  for (const { id, glyphs, gates, doorKey } of sequences) {
    const tiles = picked.get(id)!
    const doors = cells.flatMap((row, r) =>
      row.flatMap((cell, c): Place[] => (cell.type === "room" && cell.requiredKeyId === doorKey ? [[r, c]] : []))
    )
    if (doors.length !== 1) throw new Error(`[siteAssembler] sequence ${id} resets at ${doors.length} doors, not one`)
    const [door] = doors
    const record = compileSequence({ tiles, door, gates })
    const transitionAt = ([r, c]: Place) => record.transitions!.findIndex(t => t.at[0] === r && t.at[1] === c)
    tiles.forEach(([r, c], step) => {
      const cell = cells[r][c]
      if (cell.type !== "corridor") throw new Error(`[siteAssembler] sequence ${id} tile ${step} is not on a corridor`)
      const tile: RoomCell = {
        type: "room",
        roomType: "encounter",
        dirs: cell.dirs,
        state: cell.state,
        sectionAddress: cell.sectionAddress,
        sectionHash: cell.sectionHash,
        legacySectionHash: cell.legacySectionHash,
        ordinal: cell.ordinal,
        difficulty: cell.difficulty,
        region: cell.region,
        sequenceTile: { id, step, glyph: glyphs[step] },
        worksMechanism: { mechanismId: id, transition: transitionAt([r, c]) },
        ...(step === 0 ? { mechanism: record, mechanismId: id } : {}),
      }
      cells[r][c] = tile
    })
    const doorCell = cells[door[0]][door[1]]
    if (doorCell.type === "room")
      cells[door[0]][door[1]] = { ...doorCell, worksMechanism: { mechanismId: id, transition: transitionAt(door) } }
  }
  return undefined
}
