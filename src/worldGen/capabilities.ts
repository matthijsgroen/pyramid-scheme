import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"

// Which reward economies a site participates in. Presets select capabilities instead of
// code branching on "is this a pyramid?" — a site opts into a capability by having it here,
// not by which builder function happened to construct it. See
// docs/game-design/worldgen-builder-unification.md Phase 4/5.
export type SiteCapabilities = {
  /** Auto-distributed chest rewards along the main path (buildChestRewards). */
  placeChests: boolean
  /** fragmentSlot sentinels eligible for collectSlots / assignFragments. */
  emitFragmentSlots: boolean
  /** Auto-distributed mosaic side paths (computeMosaicPaths + the buildSideSections auto loop). */
  emitMosaics: boolean
  /** The hardcoded mapPiece side-branch auto-injected by buildSideSections. */
  emitMapPiece: boolean
  /** The stateful tomb perk/ward-key allocator (resolveTombReward's "tombTreasure" hint). */
  emitPerkStream: boolean
}

export const PYRAMID_CAPABILITIES: SiteCapabilities = {
  placeChests: true,
  emitFragmentSlots: true,
  emitMosaics: true,
  emitMapPiece: true,
  emitPerkStream: false,
}

export const TOMB_CAPABILITIES: SiteCapabilities = {
  placeChests: true,
  emitFragmentSlots: true,
  emitMosaics: true,
  emitMapPiece: false,
  emitPerkStream: true,
}

export const capabilitiesFor = (siteId: string): SiteCapabilities | undefined => {
  if (PYRAMID_JOURNEYS.some(j => j.id === siteId)) return PYRAMID_CAPABILITIES
  if (TOMB_JOURNEYS.some(j => j.id === siteId)) return TOMB_CAPABILITIES
  return undefined
}
