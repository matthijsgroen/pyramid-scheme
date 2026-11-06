import type { FloorGrid } from "@/game/siteTypes"
import { cellSlot } from "@/game/cellSlot"
import { cellAddress, legacyCellAddress } from "@/game/cellAddress"

/** The two names the domain gives a cell (`@/game/cellAddress`, `@/game/cellSlot`), re-exported because
 * a save spends them alongside every reader below. */
export { cellSlot, cellAddress, legacyCellAddress }

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

/** What a save may still file a mechanism's room under inside its section: the key of its legacy
 * address (`legacyCellAddress`), or null for a room whose key never changed. */
export const legacyCellKey = (grid: FloorGrid, floor: number, row: number, col: number): string | null => {
  const address = legacyCellAddress(grid, floor, row, col)
  return address === null ? null : keyOfAddress(address)
}

export const keyOfAddress = (address: string): string => address.split("#").slice(1).join("#")

/** Whether an address names an authored place (`cellSlot` in `@/game/cellSlot`) rather than a corridor
 * bend or a bare fork. A slotless cell's address carries its ordinal instead, marked `~` — the one shape
 * no authored slot ever takes — so recognizing one costs nothing more than reading that mark back off. */
export const isPlaceAddress = (address: string): boolean => {
  const slot = address.split("/").pop()
  return !!slot && !slot.startsWith("~")
}

/** Where an address sits in THIS carve, or null when nothing here answers to it — which is the right
 * answer for a `~ordinal` corridor after the floor has moved. A mechanism's room also answers to its
 * legacy address, which a save written before the slot named the mechanism still holds. */
export const findByAddress = (grid: FloorGrid, floor: number, address: string): [row: number, col: number] | null => {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (cellAddress(grid, floor, r, c) === address || legacyCellAddress(grid, floor, r, c) === address) return [r, c]
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

/** A floor of a journey, assembled the way the runtime assembles it. Injected so a backfill can be
 * tested without a world. */
export type AssembleFor = (levelNr: number, floorIndex: number) => FloorGrid | null
