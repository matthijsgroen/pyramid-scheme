import type { Direction, FloorGrid, GridCell, MechanismRecord } from "@/game/siteTypes"
import { MECHANISM_AT_REST } from "@/game/siteTypes"

/**
 * A minimal 3x3 grid with one room carrying `mechanism`, addressed exactly by `address`.
 *
 * `address` is `${sectionAddress}#${floor}/p${pathIndex}` — the same shape `cellAddress` produces for a
 * chain room (see src/game/cellSlot.ts): the floor is read back by whoever calls `cellAddress`, so only
 * the section and the path index need to be carved into the cell itself.
 */
export const gridWithMechanism = (
  address: string,
  positions: MechanismRecord["positions"],
  machine: Partial<Omit<MechanismRecord, "positions">> = {}
): FloorGrid => {
  const { initial = MECHANISM_AT_REST, returnsToInitial = false } = machine
  const states = machine.states ?? [initial, ...positions.map(({ state }) => state).filter(s => s !== initial)]
  const [sectionAddress, rest] = address.split("#")
  const slot = rest.split("/")[1]
  const pathIndex = Number(slot.slice(1))

  const room: GridCell = {
    type: "room",
    roomType: "encounter",
    dirs: new Set<Direction>(["n", "s"]),
    state: "fogged",
    sectionAddress,
    pathIndex,
    mechanism: { states, initial, returnsToInitial, positions },
  }
  const empty: GridCell = { type: "empty" }

  return {
    cells: [
      [empty, empty, empty],
      [empty, room, empty],
      [empty, empty, empty],
    ],
    rows: 3,
    cols: 3,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    siteId: "hand-built",
    staircases: {},
  }
}
