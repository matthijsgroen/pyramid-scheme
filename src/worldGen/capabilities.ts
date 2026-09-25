import { DEV_JOURNEYS, PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"

// Which reward economies a site participates in. Presets select capabilities instead of
// code branching on "is this a pyramid?" — a site opts into a capability by having it here,
// not by which builder function happened to construct it.
export type SiteCapabilities = {
  /** fragmentSlot sentinels eligible for collectSlots / assignFragments. */
  emitFragmentSlots: boolean
  /** The hardcoded mapPiece side-branch auto-injected by buildSideSections. */
  emitMapPiece: boolean
  /** The stateful tomb perk/ward-key allocator (resolveTombReward's "tombTreasure" hint). */
  emitPerkStream: boolean
  /**
   * Every board this site serves must have been proven offline, so the build stops rather than let a
   * room search on the player's device.
   *
   * The point of pre-seeding is that a board's quality is no longer bounded by what a phone can find
   * in the moment; a live fallback that quietly covers a missing list gives that back without saying
   * so. A site that requires baked boards makes the gap an error the author has to settle — by baking
   * the list, or by not authoring the room.
   */
  requireBakedBoards: boolean
}

export const PYRAMID_CAPABILITIES: SiteCapabilities = {
  emitFragmentSlots: true,
  emitMapPiece: true,
  emitPerkStream: false,
  requireBakedBoards: true,
}

export const TOMB_CAPABILITIES: SiteCapabilities = {
  emitFragmentSlots: true,
  emitMapPiece: false,
  emitPerkStream: true,
  requireBakedBoards: true,
}

// A dev site stands outside every reward economy. Nothing collects its path ends, so no chest on it
// can take a mosaic piece or a fragment off a real pyramid: the loot a playtest floor contributes is
// none, by construction rather than by careful authoring. Its ends therefore hold nothing at all —
// see slots.ts's clearUncollectedSlots and validate.ts's findEmptyChests.
export const DEV_CAPABILITIES: SiteCapabilities = {
  emitFragmentSlots: false,
  emitMapPiece: false,
  emitPerkStream: false,
  // A playtest floor is where an unbaked tier is MEANT to be walked: it stands one mechanic at every
  // difficulty so a developer can look at it, long before any of those tiers is worth an offline list.
  // So its boards are searched for on the spot — slower, never wrong, and the only site allowed it.
  requireBakedBoards: false,
}

export const capabilitiesFor = (siteId: string): SiteCapabilities | undefined => {
  if (DEV_JOURNEYS.some(j => j.id === siteId)) return DEV_CAPABILITIES
  if (PYRAMID_JOURNEYS.some(j => j.id === siteId)) return PYRAMID_CAPABILITIES
  if (TOMB_JOURNEYS.some(j => j.id === siteId)) return TOMB_CAPABILITIES
  return undefined
}
