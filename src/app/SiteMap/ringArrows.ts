import type { Direction, FloorGrid } from "@/game/siteTypes"
import { clickTargetAt, markerAt, type OfferContext } from "./clickTargets"
import type { RoomClaims } from "./roomClaims"
import { drawnOwner } from "./roomWalk"

/** The cell a tap on r,c hands on: a room choice's own cell (`roomChoiceAt` reads it back), or a cell something used is
 * drawn on (`drawnOwner`; its node may hold a choice's arrow), else the offer it resolves to. */
export const tapCellAt = (
  grid: FloorGrid,
  ctx: OfferContext,
  r: number,
  c: number,
  offer: readonly [number, number] | null
): readonly [number, number] | null =>
  offer && (ctx.choices.has(`${r},${c}`) || drawnOwner(grid, r, c)) ? [r, c] : offer

export type RingArrow = { dir: Direction; at: readonly [number, number]; tap: readonly [number, number] }

/** Every arrow drawn around the explorer, with the cell a tap on it hands on. Arrows stand only on cells the context
 * names around him (`markerAt`), so only those are asked. */
export const ringArrowList = (grid: FloorGrid, claims: RoomClaims, ctx: OfferContext): RingArrow[] => {
  const keys = new Set([...ctx.nearCells.keys(), ...ctx.choices.keys(), ...ctx.runTargets.keys()])
  return [...keys].flatMap(key => {
    const [r, c] = key.split(",").map(Number)
    const offer = clickTargetAt(grid, claims, r, c, ctx)
    const marker = markerAt(grid, claims, r, c, ctx, offer)
    const tap = tapCellAt(grid, ctx, r, c, offer)
    return marker?.kind === "arrow" && tap ? [{ dir: marker.dir, at: [r, c] as const, tap }] : []
  })
}

/** The tap each compass direction's arrow makes: what an arrow key presses. A direction with no arrow is absent. */
export const ringArrows = (
  grid: FloorGrid,
  claims: RoomClaims,
  ctx: OfferContext
): ReadonlyMap<Direction, readonly [number, number]> =>
  new Map(ringArrowList(grid, claims, ctx).map(({ dir, tap }) => [dir, tap]))
