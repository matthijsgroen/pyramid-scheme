import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"

/** A shipped pyramid whose floor a release re-laid by placing a lock on it, named as a save names its level, with the
 * RELAID_FLOORS_VERSION that re-laid it. */
export type RelaidPyramid = { journeyId: string; levelNr: number; since: number }

/** Which re-laying of shipped pyramids a save has been through. 1: the doubleBack on the Valley of the Kings' last
 * pyramid and the stoneGate on Djoser's. A later re-lay adds its pyramids to RELAID_PYRAMIDS with `since` set to the
 * bumped version, and leaves the earlier entries as they are. */
export const RELAID_FLOORS_VERSION = 1

/** Every re-laid pyramid, each with the version that re-laid it. */
export const RELAID_PYRAMIDS: readonly RelaidPyramid[] = [
  { journeyId: "expert_1", levelNr: 4, since: 1 },
  { journeyId: "expert_4", levelNr: 5, since: 1 },
]

/**
 * Whether a save stands inside a pyramid re-laid after the version it is stamped with. Its saved place names a room
 * of the floor as it was; on the re-laid floor that room can lie past a door the lock has not opened, so the place is
 * forgotten and the save resumes at the entrance. A pyramid re-laid at or before the stamp was already cleared once,
 * so a place taken there since stays. Asked of the pyramid, not the floor: a player up the ward wing comes down onto
 * the re-laid floor. A save standing nowhere yet has nothing to forget.
 */
export const standsInRelaidPyramid = (
  stored: Pick<
    StoredJourneyStateV3,
    "journeyId" | "levelNr" | "position" | "positionKey" | "standingKey" | "relaidFloorsVersion"
  >,
  relaid: readonly RelaidPyramid[]
): boolean =>
  (stored.position ?? stored.positionKey ?? stored.standingKey ?? null) !== null &&
  relaid.some(
    pyramid =>
      pyramid.since > (stored.relaidFloorsVersion ?? 0) &&
      pyramid.journeyId === stored.journeyId &&
      pyramid.levelNr === stored.levelNr
  )
