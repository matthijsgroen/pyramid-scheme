import { hashString } from "@/support/hashString"
import { switchAddress } from "../seeds/boardIndex"
import { placeSequences } from "../sequenceTiles"
import { placeWeights } from "../weightsPlates"
import { keyOf } from "./derive"
import { gateKeyOf, obstacleMode } from "./ids"
import type { WritableGrid } from "./render"
import { duplicateSlot } from "./validate"
import type { CarveState, FloorPrep, Refusal } from "./state"

/** What standing the pieces reads beyond the grid: the route, and every reserved junction's ways out. */
export type PiecesState = Pick<Required<CarveState>, "maze" | "switchWays" | "pipeHoles">

/**
 * THE PIECES A WALK STEPS ON, STOOD ON THE RENDERED GRID: sequence tiles, then plates. The one write after
 * `render`, because where a piece may stand is read off the walk the grid draws — every way into a region,
 * through its doors and down its drops — which no pass holds. Neither moves a wall: a piece turns a bare
 * corridor node into a room. A switch's way out is never one, whether or not a switch shuts it.
 */
export const standPieces = (prep: FloorPrep, state: PiecesState, grid: WritableGrid): Refusal | void => {
  const { siteId, floorRef } = prep.input
  const { authored } = prep.config
  const { allocation, sequenceSigns } = prep.marks
  const { sequences, weights } = prep.mechanisms
  const shutWays = () => new Set(state.switchWays.flatMap(ways => ways.map(({ cell }) => cell)))
  const gateOf = (id: string) => {
    const mode = obstacleMode(authored, id)
    return { gateKeyId: gateKeyOf(floorRef, id), ...(mode ? { mode } : {}) }
  }

  // A door's board is dealt by its sequence's address, as a switch's is; off the baked world, by its door's key.
  const boardIndexOf = (id: string, board: string | undefined) =>
    board === undefined
      ? undefined
      : (prep.input.resolveBoardIndex?.(board, switchAddress(id)) ?? hashString(`${gateKeyOf(floorRef, id)}|${board}`))

  // A step whose region has no free node on some way in fails the attempt: a longer path may have one.
  if (sequences.length > 0) {
    const unplaced = placeSequences(
      grid.cells,
      grid,
      sequences.map(sequence => ({
        id: sequence.id,
        regions: sequence.steps.map(step => step.in),
        glyphs:
          sequenceSigns.get(sequence.id)?.glyphs ??
          sequence.steps.map((_, step) => allocation.tileGlyphs.get(`${sequence.id}#${step}`)!),
        orderReader: sequenceSigns.get(sequence.id)?.orderReader,
        boardIndex: boardIndexOf(sequence.id, sequenceSigns.get(sequence.id)?.board),
        gates: sequence.opens.done.map(gateOf),
        doorKey: gateKeyOf(floorRef, sequence.resetAt),
      })),
      shutWays()
    )
    if (unplaced) return { retry: [{ type: "sequenceTileNotPlaced", ...unplaced }] }
    const tileDuplicate = duplicateSlot(grid)
    if (tileDuplicate) return tileDuplicate
  }

  // A plate stands on a bare node the tiles left free; a pipe's holes stand where the carve put them.
  if (weights.length > 0) {
    const holes = new Map(
      [...state.pipeHoles].map(([hole, { cell }]) => [hole, cell.split(",").map(Number) as [number, number]] as const)
    )
    const unplaced = placeWeights(
      grid.cells,
      weights.map(control => ({ control, gate: gateOf })),
      new Set(state.maze.mainPath.map(keyOf)),
      siteId,
      shutWays(),
      holes
    )
    if (unplaced) return { retry: [{ type: "plateNotPlaced", ...unplaced }] }
    const plateDuplicate = duplicateSlot(grid)
    if (plateDuplicate) return plateDuplicate
  }
}
