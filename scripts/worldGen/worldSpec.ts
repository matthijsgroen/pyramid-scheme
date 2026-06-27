import { global, tier, rules } from "./dsl"

// Expected reward counts — validated by configBuilder after generation.
// mosaicPieceRewards: one per pyramid journey (4 journeys × 5 tiers = 20).
// mapPieceRewards:    one per pyramid journey (starter via mainEndReward, others via side branch = 20).
export const WORLD_TARGETS = {
  mosaicPieceRewards: 20,
  mapPieceRewards: 20,
}

/**
 * Declarative world-builder constraints.
 * Rules cascade: global → tier → journey → pyramid → floor.
 * Within the same specificity level, later rules win.
 * Missing fields = builder decides.
 */
export const worldSpec = rules([
  // ── Defaults ──────────────────────────────────────────────────────────────
  global({ floorDepth: 1, sideSections: "sparse" }),

  // ── Difficulty per tier ───────────────────────────────────────────────────
  tier("starter", { difficulty: "easy" }),
  tier("junior", { difficulty: "easy" }),
  tier("expert", { difficulty: "medium" }),
  tier("master", { difficulty: "medium" }),
  tier("wizard", { difficulty: "hard" }),

  // ── Starter tier ──────────────────────────────────────────────────────────
  // First pyramid is the map piece entry-point for the starter tomb.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  // ── All tiers: last pyramid yields the journey's mosaic piece ─────────────
  tier("starter").pyramid("last", { mainEndReward: "mosaicPiece" }),
  tier("junior").pyramid("last", { mainEndReward: "mosaicPiece" }),
  tier("expert").pyramid("last", { mainEndReward: "mosaicPiece" }),
  tier("master").pyramid("last", { mainEndReward: "mosaicPiece" }),
  tier("wizard").pyramid("last", { mainEndReward: "mosaicPiece" }),
])
