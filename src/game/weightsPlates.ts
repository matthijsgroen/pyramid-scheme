import { hashString } from "@/support/hashString"
import { compileWeights } from "./mechanics/weights"
import type { WeightsControl } from "./obstacles"
import { isCandidate, standOnCorridor } from "./sequenceTiles"
import type { GridCell } from "./siteTypes"

type Place = [number, number]

/** One lock's stones to stand on the floor, and how a gate id reads as the key its door asks for. */
export type WeightsDemand = { control: WeightsControl; gate: (id: string) => { gateKeyId: string; mode?: "any" } }

/**
 * STANDS EVERY LOCK'S PLATES ON THE FINISHED CARVE, and changes no wall: a plate is a corridor node becoming a
 * room, `dirs` untouched. A plate stands where a sequence tile would, a bare node of its region, but need not
 * be a node every walk crosses: the player chooses to go to a plate. Each plate takes its own node, off the
 * main path first; a region with no free node refuses the whole placement, naming the plate. The stones'
 * record goes on the first plate, and every plate works the moves the record places at it.
 *
 * `reserved` are cells a plate may never take, as for `placeSequences`.
 */
export const placeWeights = (
  cells: GridCell[][],
  demands: readonly WeightsDemand[],
  onMainPath: ReadonlySet<string>,
  salt: string,
  reserved: ReadonlySet<string> = new Set()
): { plate: string } | undefined => {
  const taken = new Set<string>()
  const placed: { demand: WeightsDemand; at: Map<string, Place> }[] = []
  for (const demand of demands) {
    const at = new Map<string, Place>()
    for (const plate of demand.control.plates) {
      const candidates: Place[] = []
      for (let r = 0; r < cells.length; r++)
        for (let c = 0; c < cells[r].length; c++)
          if (!taken.has(`${r},${c}`) && !reserved.has(`${r},${c}`) && isCandidate(cells[r][c], r, c, plate.in))
            candidates.push([r, c])
      const rank = ([r, c]: Place) => hashString(`${salt}|plate|${plate.id}|${r},${c}`)
      const onRoute = ([r, c]: Place) => Number(onMainPath.has(`${r},${c}`))
      const [best] = candidates.sort((a, b) => onRoute(a) - onRoute(b) || rank(a) - rank(b))
      if (!best) return { plate: plate.id }
      taken.add(`${best[0]},${best[1]}`)
      at.set(plate.id, best)
    }
    placed.push({ demand, at })
  }

  for (const { demand, at } of placed) {
    const { control, gate } = demand
    const record = compileWeights(control, plate => at.get(plate)!, gate)
    control.plates.forEach((plate, n) => {
      const [r, c] = at.get(plate.id)!
      const cell = cells[r][c]
      if (cell.type !== "corridor") throw new Error(`[siteAssembler] plate ${plate.id} is not on a corridor`)
      cells[r][c] = standOnCorridor(cell, {
        plate: { id: plate.id },
        worksMechanism: {
          mechanismId: control.id,
          transition: record.transitions!.findIndex(t => t.at[0] === r && t.at[1] === c),
        },
        ...(n === 0 ? { mechanism: record, mechanismId: control.id } : {}),
      })
    })
  }
  return undefined
}
