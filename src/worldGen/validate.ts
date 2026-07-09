import type { SiteConfig, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS, EXPECTED_HIEROGLYPH_FRAGMENTS } from "./data"
import { WORLD_TARGETS } from "./worldSpec"

const KNOWN_JOURNEY_IDS = new Set([...PYRAMID_JOURNEYS.map(j => j.id), ...TOMB_JOURNEYS.map(j => j.id)])

// Throws if: a non-last floor is set to exit, a mapPiece references an unknown journey ID,
// or the total mapPiece/mosaicPiece counts drift from WORLD_TARGETS.
export const validateRewardCounts = (configs: Record<string, SiteConfig[]>): void => {
  let mapPieces = 0
  let mosaicPieces = 0
  let fragments = 0
  const unknownTombIds: string[] = []

  const checkReward = (r: TreasureReward | undefined) => {
    if (!r) return
    if (r.type === "mapPiece") {
      mapPieces++
      if (!KNOWN_JOURNEY_IDS.has(r.tombId)) unknownTombIds.push(r.tombId)
    }
    if (r.type === "mosaicPiece") mosaicPieces++
    if (r.type === "hieroglyphFragment") fragments++
  }

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      for (let fi = 0; fi < floors.length; fi++) {
        const floor = floors[fi]
        const isLast = fi === floors.length - 1
        if (isLast && floor.exitOrStaircase !== "exit")
          throw new Error(
            `[worldSpec] Site "${siteId}" last floor has exitOrStaircase="${floor.exitOrStaircase}", expected "exit"`
          )
        checkReward(floor.mainEndReward)
        for (const s of floor.sideSections) {
          checkReward(s.endReward)
          for (const sub of s.sideSections ?? []) checkReward(sub.endReward)
        }
      }
    }
  }

  if (unknownTombIds.length > 0)
    throw new Error(
      `[worldSpec] mapPiece rewards reference unknown journey IDs: ${[...new Set(unknownTombIds)].join(", ")}`
    )
  if (mapPieces !== WORLD_TARGETS.mapPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mapPieceRewards} map pieces, got ${mapPieces}`)
  if (mosaicPieces !== WORLD_TARGETS.mosaicPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mosaicPieceRewards} mosaic pieces, got ${mosaicPieces}`)
  if (fragments !== EXPECTED_HIEROGLYPH_FRAGMENTS)
    throw new Error(`[worldSpec] Expected ${EXPECTED_HIEROGLYPH_FRAGMENTS} hieroglyph fragments, got ${fragments}`)
}

// Secondary tombs that need discovery — primary tomb ID → list of secondary tomb IDs.
// If a secondary tomb has no mapPiece/locationKey in any authored config, a locationKey
// is auto-injected as a side section on the primary tomb's last floor.
export const SECONDARY_TOMBS: Record<string, string[]> = {
  expert_treasure_tomb: ["expert_treasure_tomb_b"],
  master_treasure_tomb: ["master_treasure_tomb_b"],
  wizard_treasure_tomb: ["wizard_treasure_tomb_b"],
  wizard_treasure_tomb_b: ["wizard_treasure_tomb_c"],
}

// Collect all tombIds that have a mapPiece reward in any config OTHER than their own site
const collectDiscoveredBy = (configs: Record<string, SiteConfig[]>): Map<string, Set<string>> => {
  const discovered = new Map<string, Set<string>>()
  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        const checkReward = (r: TreasureReward | undefined) => {
          if (r?.type !== "mapPiece" || r.tombId === siteId) return
          const set = discovered.get(r.tombId) ?? new Set()
          set.add(siteId)
          discovered.set(r.tombId, set)
        }
        checkReward(floor.mainEndReward)
        for (const s of floor.sideSections) {
          checkReward(s.endReward)
          for (const sub of s.sideSections ?? []) checkReward(sub.endReward)
        }
      }
    }
  }
  return discovered
}

type SiteFloorRef = { siteId: string; floorIndex: number }

// Where each tomb-key (ward key) is actually granted — the first mainEndReward/
// sideSection(+sub) reward of type "tombKey" for that keyId, walked in floor order.
const findWardKeyGrants = (configs: Record<string, SiteConfig[]>): Map<string, SiteFloorRef> => {
  const grants = new Map<string, SiteFloorRef>()
  const record = (r: TreasureReward | undefined, ref: SiteFloorRef) => {
    if (r?.type === "tombKey" && !grants.has(r.keyId)) grants.set(r.keyId, ref)
  }
  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      floors.forEach((floor, floorIndex) => {
        const ref = { siteId, floorIndex }
        record(floor.mainEndReward, ref)
        for (const s of floor.sideSections) {
          record(s.endReward, ref)
          for (const sub of s.sideSections ?? []) record(sub.endReward, ref)
        }
      })
    }
  }
  return grants
}

// Every tomb-key gate in the world, and where it sits (which floor's content it blocks).
const findWardKeyRequirements = (configs: Record<string, SiteConfig[]>): (SiteFloorRef & { wardKeyId: string })[] => {
  const requirements: (SiteFloorRef & { wardKeyId: string })[] = []
  const record = (gate: { type: "floor-key" | "tomb-key"; wardKeyId?: string } | undefined, ref: SiteFloorRef) => {
    if (gate?.type === "tomb-key") requirements.push({ ...ref, wardKeyId: gate.wardKeyId! })
  }
  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      floors.forEach((floor, floorIndex) => {
        const ref = { siteId, floorIndex }
        for (const s of floor.sideSections) {
          record(s.gate, ref)
          for (const sub of s.sideSections ?? []) record(sub.gate, ref)
        }
      })
    }
  }
  return requirements
}

// Validate that every secondary tomb has a mapPiece reward reachable before it's needed, and
// that every tomb-key (ward) gate is satisfiable before the player reaches it: the key must be
// granted on an earlier floor of the same site, or at a different site already known reachable
// (floor-key gates are a same-floor maze mechanic, verified separately by the site assembler).
// Throws with a clear message naming the offending site + missing/out-of-order key.
export const validateDiscovery = (allConfigs: Record<string, SiteConfig[]>): void => {
  const allSecondary = new Set(Object.values(SECONDARY_TOMBS).flat())
  const discoveredBy = collectDiscoveredBy(allConfigs)

  // BFS: start from non-secondary sites (auto-discovered), expand when mapPiece host is reachable
  const reachable = new Set(Object.keys(allConfigs).filter(id => !allSecondary.has(id)))
  let changed = true
  while (changed) {
    changed = false
    for (const secId of allSecondary) {
      if (reachable.has(secId)) continue
      const hosts = discoveredBy.get(secId)
      if (hosts && [...hosts].some(h => reachable.has(h))) {
        reachable.add(secId)
        changed = true
      }
    }
  }

  const unreachable = [...allSecondary].filter(id => !reachable.has(id))
  if (unreachable.length > 0) {
    throw new Error(
      `[worldSpec] Unsolvable discovery graph — these secondary tombs are unreachable:\n` +
        unreachable.map(id => `  - ${id} (no mapPiece found in a reachable site)`).join("\n")
    )
  }

  const grants = findWardKeyGrants(allConfigs)
  const orderingErrors: string[] = []
  for (const req of findWardKeyRequirements(allConfigs)) {
    const grant = grants.get(req.wardKeyId)
    if (!grant) {
      orderingErrors.push(`  - "${req.wardKeyId}" gates ${req.siteId} floor ${req.floorIndex} but is never granted`)
      continue
    }
    const sameSiteInOrder = grant.siteId === req.siteId && grant.floorIndex <= req.floorIndex
    const otherSiteReachable = grant.siteId !== req.siteId && reachable.has(grant.siteId)
    if (!sameSiteInOrder && !otherSiteReachable) {
      orderingErrors.push(
        `  - "${req.wardKeyId}" gates ${req.siteId} floor ${req.floorIndex} but is granted at ` +
          `${grant.siteId} floor ${grant.floorIndex}, which isn't reachable first`
      )
    }
  }
  if (orderingErrors.length > 0) {
    throw new Error(`[worldSpec] Unsolvable ward-key ordering:\n${orderingErrors.join("\n")}`)
  }
}
