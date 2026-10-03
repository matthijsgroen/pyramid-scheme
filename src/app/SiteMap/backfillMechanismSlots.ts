import type { FloorGrid } from "@/game/siteTypes"
import { cellAddress, legacyCellAddress } from "@/game/cellAddress"
import { keyOfAddress, sectionOfAddress, type AssembleFor } from "./cellIdentity"

export type MechanismSlotBackfillInput = {
  exploredCells?: Record<string, string[]>
  mechanismStates?: Record<string, string>
}

export type MechanismSlotBackfill = {
  exploredCells: Record<string, string[]>
  mechanismStates: Record<string, string>
}

/** The (level, floor) pairs a save names a mechanism room on: the level is the stored key's prefix, the
 * floor is in the cell key or address. */
const floorsNamed = (stored: MechanismSlotBackfillInput): [levelNr: number, floor: number][] => {
  const seen = new Set<string>()
  const note = (levelNr: number, floor: number) => {
    if (Number.isFinite(levelNr) && Number.isFinite(floor)) seen.add(`${levelNr}:${floor}`)
  }
  for (const [key, cells] of Object.entries(stored.exploredCells ?? {}))
    for (const cell of cells) note(Number(key.split(":")[0]), Number(cell.split("/")[0]))
  for (const key of Object.keys(stored.mechanismStates ?? {})) {
    const [levelNr, rest] = [key.split(":")[0], key.slice(key.indexOf(":") + 1)]
    note(Number(levelNr), Number(rest.split("#")[1]?.split("/")[0]))
  }
  return [...seen].map(pair => pair.split(":").map(Number) as [number, number])
}

/** Every mechanism room of a grid, with the address it has and the one it had. */
const renamedRooms = (grid: FloorGrid, floor: number): { address: string; legacy: string }[] => {
  const rooms: { address: string; legacy: string }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const address = cellAddress(grid, floor, r, c)
      const legacy = legacyCellAddress(grid, floor, r, c)
      if (address && legacy && address !== legacy) rooms.push({ address, legacy })
    }
  return rooms
}

/**
 * COPIES WHAT A SAVE FILED UNDER A MECHANISM ROOM'S OLD ADDRESS TO ITS NEW ONE, and deletes nothing.
 *
 * Both collections that name a mechanism room are covered: the explored cell, and the mechanism's state
 * together with every record filed beside it under the same address (`<address>:angles`). An entry is
 * copied only where the new key is absent, so running it again — or after the player has already moved
 * the mechanism under the new address — changes nothing. The old entries stay, which is what lets the
 * readers fall back to them until a later release drops them.
 *
 * Only the floors the save names are assembled.
 */
export const backfillMechanismSlots = (
  stored: MechanismSlotBackfillInput,
  assembleFor: AssembleFor
): MechanismSlotBackfill => {
  const exploredCells: Record<string, string[]> = Object.fromEntries(
    Object.entries(stored.exploredCells ?? {}).map(([section, keys]) => [section, [...keys]])
  )
  const mechanismStates: Record<string, string> = { ...stored.mechanismStates }

  for (const [levelNr, floor] of floorsNamed(stored)) {
    const grid = assembleFor(levelNr, floor)
    if (!grid) continue
    for (const { address, legacy } of renamedRooms(grid, floor)) {
      const section = `${levelNr}:${sectionOfAddress(address)}`
      const legacyKey = keyOfAddress(legacy)
      const key = keyOfAddress(address)
      const held = exploredCells[section]
      if (held?.includes(legacyKey) && !held.includes(key)) held.push(key)

      const from = `${levelNr}:${legacy}`
      const to = `${levelNr}:${address}`
      for (const [stateKey, value] of Object.entries(stored.mechanismStates ?? {})) {
        if (stateKey !== from && !stateKey.startsWith(`${from}:`)) continue
        const target = to + stateKey.slice(from.length)
        if (!(target in mechanismStates)) mechanismStates[target] = value
      }
    }
  }
  return { exploredCells, mechanismStates }
}
