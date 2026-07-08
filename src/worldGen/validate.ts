import type { SiteConfig, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { WORLD_TARGETS } from "./worldSpec"

const KNOWN_JOURNEY_IDS = new Set([...PYRAMID_JOURNEYS.map(j => j.id), ...TOMB_JOURNEYS.map(j => j.id)])

// Throws if: a non-last floor is set to exit, a mapPiece references an unknown journey ID,
// or the total mapPiece/mosaicPiece counts drift from WORLD_TARGETS.
export const validateRewardCounts = (configs: Record<string, SiteConfig[]>): void => {
  let mapPieces = 0
  let mosaicPieces = 0
  const unknownTombIds: string[] = []

  const checkReward = (r: TreasureReward | undefined) => {
    if (!r) return
    if (r.type === "mapPiece") {
      mapPieces++
      if (!KNOWN_JOURNEY_IDS.has(r.tombId)) unknownTombIds.push(r.tombId)
    }
    if (r.type === "mosaicPiece") mosaicPieces++
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
        for (const r of floor.chestRewards ?? []) checkReward(r)
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
        for (const r of floor.chestRewards ?? []) checkReward(r)
      }
    }
  }
  return discovered
}

// Validate that every secondary tomb has a mapPiece reward reachable before it's needed.
// Throws with a clear message listing any unreachable secondary tombs (missing or circular).
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
}
