import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"

/** A shipped pyramid whose floor a release re-laid, named as a save names its level, with the
 * RELAID_FLOORS_VERSION that re-laid it. */
export type RelaidPyramid = {
  journeyId: string
  levelNr: number
  since: number
  /** A room the re-lay moved to another slot: a save that had explored `from` (a cell address, `main#0/p0`) has
   * explored `to` as well, so a room it got past before stays behind it. */
  alsoExplored?: { from: string; to: string }[]
}

/** Which re-laying of shipped pyramids a save has been through. 1: the doubleBack on the Valley of the Kings' last
 * pyramid and the stoneGate on Djoser's. 2: the junior pyramids whose side passage of another difficulty hangs as a
 * branch of its own off the lock instead of standing on one of its corridors. 3: the first pyramid of the game, whose
 * first floor gained a board right after Fez's stall, which a save that got past him has got past too. 4: the Lighthouse of
 * Alexandria's sluice and tide, whose torch became a flame the water puts out. A later re-lay adds its pyramids to
 * RELAID_PYRAMIDS with `since` set to the bumped version, and leaves the earlier entries as they are. */
export const RELAID_FLOORS_VERSION = 4

/** Every re-laid pyramid, each with the version that re-laid it. */
export const RELAID_PYRAMIDS: readonly RelaidPyramid[] = [
  { journeyId: "expert_1", levelNr: 4, since: 1 },
  { journeyId: "expert_4", levelNr: 5, since: 1 },
  { journeyId: "junior_1", levelNr: 2, since: 2 },
  { journeyId: "junior_2", levelNr: 2, since: 2 },
  { journeyId: "junior_3", levelNr: 2, since: 2 },
  { journeyId: "junior_4", levelNr: 3, since: 2 },
  { journeyId: "starter_1", levelNr: 1, since: 3, alsoExplored: [{ from: "main#0/p0", to: "main#0/p1" }] },
  { journeyId: "junior_4", levelNr: 2, since: 4 },
  { journeyId: "junior_4", levelNr: 5, since: 4 },
]

/** The levels of a save's journey re-laid after the version it is stamped with: a position it remembers there names
 * a room of the floor as it was, so it is forgotten as the place a save stands at is. */
export const relaidLevelsOf = (
  stored: Pick<StoredJourneyStateV3, "journeyId" | "relaidFloorsVersion">,
  relaid: readonly RelaidPyramid[]
): number[] =>
  relaid
    .filter(pyramid => pyramid.since > (stored.relaidFloorsVersion ?? 0) && pyramid.journeyId === stored.journeyId)
    .map(pyramid => pyramid.levelNr)

/**
 * Whether a save stands inside a pyramid re-laid after the version it is stamped with. Its saved place names a room
 * of the floor as it was; on the re-laid floor that room can lie past a door the lock has not opened, so the place is
 * forgotten and the save resumes at the entrance. A pyramid re-laid at or before the stamp was already cleared once,
 * so a place taken there since stays. Asked of the pyramid, not the floor: a player up the ward wing comes down onto
 * the re-laid floor. A save standing nowhere yet has nothing to forget.
 */
export const standsInRelaidPyramid = (
  stored: Pick<StoredJourneyStateV3, "journeyId" | "levelNr" | "positionKey" | "standingKey" | "relaidFloorsVersion">,
  relaid: readonly RelaidPyramid[]
): boolean =>
  (stored.positionKey ?? stored.standingKey ?? null) !== null &&
  relaid.some(
    pyramid =>
      pyramid.since > (stored.relaidFloorsVersion ?? 0) &&
      pyramid.journeyId === stored.journeyId &&
      pyramid.levelNr === stored.levelNr
  )

/** The save's explored cells with every re-laid pyramid's `alsoExplored` applied, for the pyramids re-laid after the
 * version it is stamped with. */
export const relaidExploredCells = (
  stored: Pick<StoredJourneyStateV3, "journeyId" | "relaidFloorsVersion" | "exploredCells">,
  relaid: readonly RelaidPyramid[]
): Record<string, string[]> | undefined => {
  let explored = stored.exploredCells
  for (const pyramid of relaid) {
    if (pyramid.since <= (stored.relaidFloorsVersion ?? 0) || pyramid.journeyId !== stored.journeyId) continue
    for (const { from, to } of pyramid.alsoExplored ?? []) {
      const [section, slot] = from.split("#")
      const [toSection, toSlot] = to.split("#")
      if (!explored?.[`${pyramid.levelNr}:${section}`]?.includes(slot)) continue
      const key = `${pyramid.levelNr}:${toSection}`
      if (explored[key]?.includes(toSlot)) continue
      explored = { ...explored, [key]: [...(explored[key] ?? []), toSlot] }
    }
  }
  return explored
}
