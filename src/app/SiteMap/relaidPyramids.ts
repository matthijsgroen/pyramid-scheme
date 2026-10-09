import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"

/** A shipped pyramid whose floor a release re-laid by placing a lock on it, named as a save names its level. */
export type RelaidPyramid = { journeyId: string; levelNr: number }

/** Which re-laying of shipped pyramids a save has been through. 1: the doubleBack on the Valley of the Kings' last
 * pyramid and the stoneGate on Djoser's. Bumped together with a new entry in RELAID_PYRAMIDS. */
export const RELAID_FLOORS_VERSION = 1

/** The pyramids RELAID_FLOORS_VERSION re-lays. */
export const RELAID_PYRAMIDS: readonly RelaidPyramid[] = [
  { journeyId: "expert_1", levelNr: 4 },
  { journeyId: "expert_4", levelNr: 5 },
]

/**
 * Whether a save stands inside a re-laid pyramid. Its saved place names a room of the floor as it was; on the
 * re-laid floor that room can lie past a door the lock has not opened, so the place is forgotten and the save resumes
 * at the entrance. Asked of the pyramid, not the floor: a player up the ward wing comes down onto the re-laid floor.
 * A save standing nowhere yet has nothing to forget.
 */
export const standsInRelaidPyramid = (
  stored: Pick<StoredJourneyStateV3, "journeyId" | "levelNr" | "position" | "positionKey" | "standingKey">,
  relaid: readonly RelaidPyramid[]
): boolean =>
  (stored.position ?? stored.positionKey ?? stored.standingKey ?? null) !== null &&
  relaid.some(pyramid => pyramid.journeyId === stored.journeyId && pyramid.levelNr === stored.levelNr)
