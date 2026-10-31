import type { RoomCell } from "@/game/siteTypes"

/**
 * A room that still opens by itself when walked into, though it reads finished: something in it the player has
 * not yet been shown. Walking in plays it, the way a room never entered does; once it has been shown, the room
 * goes back to its family's prompt.
 *
 * Mods contribute the answer (the story mod's scenes not yet heard); core names no mod.
 */
export type OpensOnArrival = (cell: RoomCell) => boolean

/** A hook, so a contribution can read its own state (the save). Given the journey on screen. */
export type UseRoomArrivals = (journeyId: string) => OpensOnArrival

const registry: UseRoomArrivals[] = []

export const registerRoomArrivals = (useArrivals: UseRoomArrivals) => registry.push(useArrivals)

/** Any contribution saying so makes the room open on arrival. The registry is fixed at module load, so the hooks
 * are called in the same order every render. */
export const useMergedRoomArrivals = (journeyId: string): OpensOnArrival => {
  const each: OpensOnArrival[] = []
  for (const useArrivals of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    each.push(useArrivals(journeyId))
  }
  return cell => each.some(opensAt => opensAt(cell))
}
