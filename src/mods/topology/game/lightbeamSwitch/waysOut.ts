import type { Direction as WayOut, RoomCell } from "@/game/siteTypes"

/**
 * The ways out of a fork that a switch shut, read off the room itself (RoomCell.exits).
 *
 * The board standing in the fork decides between exactly these: an exit with no `gateKeyId` was left
 * open by the builder and is none of the switch's business.
 */
export const shutWaysOut = (exits: RoomCell["exits"]): WayOut[] =>
  (exits ?? []).filter(exit => exit.gateKeyId !== undefined).map(exit => exit.dir)

/** The id naming one of those ways out, which is what says whether it stands open. */
export const wayOutId = (exits: RoomCell["exits"], way: WayOut): string | undefined =>
  (exits ?? []).find(exit => exit.dir === way)?.gateKeyId
