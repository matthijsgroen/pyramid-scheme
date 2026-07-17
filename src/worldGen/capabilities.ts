import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"

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
}

export const PYRAMID_CAPABILITIES: SiteCapabilities = {
  emitFragmentSlots: true,
  emitMapPiece: true,
  emitPerkStream: false,
}

export const TOMB_CAPABILITIES: SiteCapabilities = {
  emitFragmentSlots: true,
  emitMapPiece: false,
  emitPerkStream: true,
}

export const capabilitiesFor = (siteId: string): SiteCapabilities | undefined => {
  if (PYRAMID_JOURNEYS.some(j => j.id === siteId)) return PYRAMID_CAPABILITIES
  if (TOMB_JOURNEYS.some(j => j.id === siteId)) return TOMB_CAPABILITIES
  return undefined
}
