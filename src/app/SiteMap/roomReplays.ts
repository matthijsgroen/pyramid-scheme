import type { RoomCell } from "@/game/siteTypes"

/**
 * A finished room that plays the same thing again when walked back into: its prompt says so and its marker
 * wears the replay symbol, so the map shows there is something to play back.
 *
 * Mods contribute the answer (the story mod's scenes with nothing else to say); core names no mod.
 */
export type ReplaysAt = (cell: RoomCell) => boolean

/** A hook, so a contribution can read its own state (the save). Given the journey on screen. */
export type UseRoomReplays = (journeyId: string) => ReplaysAt

const registry: UseRoomReplays[] = []

export const registerRoomReplays = (useReplays: UseRoomReplays) => registry.push(useReplays)

/** Any contribution saying so makes it a replay. The registry is fixed at module load, so the hooks are called
 * in the same order every render. */
export const useMergedRoomReplays = (journeyId: string): ReplaysAt => {
  const each: ReplaysAt[] = []
  for (const useReplays of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    each.push(useReplays(journeyId))
  }
  return cell => each.some(replaysAt => replaysAt(cell))
}
