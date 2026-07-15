import type { SiteConfig, TreasureReward } from "@/worldGen/types"

// Hieroglyph-owned world-gen finalize (docs/mods/distribution-primitive-design.md, §D): the two
// pieces of hieroglyph-specific logic that used to sit in the core serializer. Core stays generic
// (it just emits whatever fields a reward carries); scripts/generateWorld.ts calls these before
// serialization — the sanctioned worldGen→mod crossing (the script already imports mod data).

const HIEROGLYPH = "hieroglyphFragment"

// Walk every reward a node bears: the path-end `endReward` AND every entry of a node's `rewards[]`
// array (a shop's stock — a fragment sold at a shop lives here). One uniform sweep, mirroring what
// the detector scans. Mutating callback so the finalize can stamp pieceIndex.
const forEachReward = (configs: Record<string, SiteConfig[]>, fn: (r: TreasureReward) => void) => {
  const rewards = (rs: (TreasureReward | undefined)[] | undefined) => rs?.forEach(r => r && fn(r))
  for (const siteConfigs of Object.values(configs)) {
    for (const floors of siteConfigs) {
      for (const cfg of floors) {
        if (cfg.mainEndReward) fn(cfg.mainEndReward)
        rewards(cfg.rewards)
        for (const s of cfg.sideSections) {
          if (s.endReward) fn(s.endReward)
          rewards(s.rewards)
          for (const sub of s.sideSections ?? []) {
            if (sub.endReward) fn(sub.endReward)
            rewards(sub.rewards)
          }
        }
      }
    }
  }
}

// Stamp each hieroglyphFragment reward with a distinct pieceIndex per hieroglyph (0,1,2,… in walk
// order). The specific index is arbitrary — a fragment just needs a unique id within its hieroglyph
// so re-collecting the same piece doesn't double-count — so any deterministic walk is fine. This
// replaces the core serializer's per-hieroglyph counter (which is now generic). Mutates in place.
export const assignFragmentPieceIndices = (configs: Record<string, SiteConfig[]>): void => {
  const next = new Map<string, number>()
  forEachReward(configs, r => {
    if (r.type !== HIEROGLYPH) return
    const id = r.hieroglyphId as string
    const idx = next.get(id) ?? 0
    next.set(id, idx + 1)
    ;(r as { pieceIndex?: number }).pieceIndex = idx
  })
}

// How many fragments of each hieroglyph actually got placed.
export const placedFragmentCounts = (configs: Record<string, SiteConfig[]>): Map<string, number> => {
  const placed = new Map<string, number>()
  forEachReward(configs, r => {
    if (r.type !== HIEROGLYPH) return
    const id = r.hieroglyphId as string
    placed.set(id, (placed.get(id) ?? 0) + 1)
  })
  return placed
}

// The required-fragment count per hieroglyph, capped at how many were actually placed — never ask
// players to find more pieces than exist. (Was countPlacedFragments + the Math.min in the core
// serializer.)
export const cappedHieroglyphRequired = (
  configs: Record<string, SiteConfig[]>,
  required: Record<string, number>
): Record<string, number> => {
  const placed = placedFragmentCounts(configs)
  return Object.fromEntries(Object.keys(required).map(id => [id, Math.min(placed.get(id) ?? 1, required[id] ?? 1)]))
}

// Human-readable coverage for the generate-world stats line (hieroglyph is the only reward with a
// "you must find N of these" target, so this reporting is its own concern, not core's).
export const hieroglyphCoverage = (configs: Record<string, SiteConfig[]>, required: Record<string, number>) => {
  const placed = placedFragmentCounts(configs)
  const ids = Object.keys(required)
  return {
    total: ids.reduce((s, id) => s + (placed.get(id) ?? 0), 0),
    target: ids.reduce((s, id) => s + (required[id] ?? 0), 0),
    assigned: ids.reduce((s, id) => s + Math.min(placed.get(id) ?? 0, required[id] ?? 0), 0),
    uncovered: ids.filter(id => !placed.has(id)),
    under: ids.filter(id => (placed.get(id) ?? 0) < (required[id] ?? 0)),
  }
}
