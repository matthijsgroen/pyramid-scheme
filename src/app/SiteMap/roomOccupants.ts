import type { RoomCell } from "@/game/siteTypes"

/**
 * Somebody standing in a room — a person the room is FOR, drawn on the floor beside its marker.
 *
 * Mods contribute them (the story mod's ghosts); core draws whatever it is given and names no mod. A
 * `sprite` is a map figure in the explorer's own frame (40x70, feet on the floor line). A `bust` is a
 * conversation portrait standing in until a figure is painted: its face frame cut out and stood on the
 * floor, which reads as that person and is plainly not map art.
 */
export type RoomOccupant = {
  /** Who it is, for tests and for keying. */
  id: string
  src: string
  kind: "sprite" | "bust"
  /** A bust from a 350-wide portrait (`--behind=0.4`), whose face frame is its right-hand 250. */
  wide?: boolean
  /** Drawn see-through, the way the dead are in a conversation. */
  translucent?: boolean
}

/** Who stands in `cell`, if anyone. */
export type OccupantOf = (cell: RoomCell) => RoomOccupant | undefined

/** A hook, so a contribution can read its own state (translations, the save). Given the journey on screen. */
export type UseRoomOccupants = (journeyId: string) => OccupantOf

const registry: UseRoomOccupants[] = []

export const registerRoomOccupants = (useOccupants: UseRoomOccupants) => registry.push(useOccupants)

/** Every contribution asked in turn; the first to name somebody wins. The registry is fixed at module load,
 * so the hooks are called in the same order every render. */
export const useMergedRoomOccupants = (journeyId: string): OccupantOf => {
  const each: OccupantOf[] = []
  for (const useOccupants of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    each.push(useOccupants(journeyId))
  }
  return cell => {
    for (const occupantOf of each) {
      const found = occupantOf(cell)
      if (found) return found
    }
    return undefined
  }
}
