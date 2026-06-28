import { global, tier, journey, rules } from "./worldGen/dsl"

// Expected reward counts — validated by configBuilder after generation.
// mosaicPieceRewards: one per pyramid journey (4 journeys × 5 tiers = 20).
// mapPieceRewards:    20 primary (1 per pyramid journey) + 16 secondary
//                    (4 journeys × 4 secondary tombs, each on last or last-1 pyramid)
export const WORLD_TARGETS = {
  mosaicPieceRewards: 20,
  mapPieceRewards: 36,
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

  // ── Tomb journeys: tableau puzzles, one floor per levelCount ──────────────
  journey("starter_treasure_tomb", { puzzleFamily: "tableau", difficulty: "easy" }),
  journey("junior_treasure_tomb", { puzzleFamily: "tableau", difficulty: "easy" }),
  journey("expert_treasure_tomb", { puzzleFamily: "tableau", difficulty: "medium" }),
  journey("expert_treasure_tomb_b", { puzzleFamily: "tableau", difficulty: "medium" }),
  journey("master_treasure_tomb", { puzzleFamily: "tableau", difficulty: "medium" }),
  journey("master_treasure_tomb_b", { puzzleFamily: "tableau", difficulty: "medium" }),
  journey("wizard_treasure_tomb", { puzzleFamily: "tableau", difficulty: "hard" }),
  journey("wizard_treasure_tomb_b", { puzzleFamily: "tableau", difficulty: "hard" }),
  journey("wizard_treasure_tomb_c", { puzzleFamily: "tableau", difficulty: "hard" }),

  // ── Secondary tombs: override tier "last → mosaicPiece" rule (tombs don't give mosaic) ──
  journey("expert_treasure_tomb_b").pyramid("last", { mainEndReward: "hieroglyphFragment" }),
  journey("master_treasure_tomb_b").pyramid("last", { mainEndReward: "hieroglyphFragment" }),
  journey("wizard_treasure_tomb_c").pyramid("last", { mainEndReward: "hieroglyphFragment" }),

  // ── Primary tombs: last floor drops a ward key (unlocks gated pyramid content) ──
  journey("starter_treasure_tomb").pyramid("last", { mainEndReward: { type: "tombKey", keyId: "starter_ward" } }),
  journey("junior_treasure_tomb").pyramid("last", { mainEndReward: { type: "tombKey", keyId: "junior_ward" } }),
  journey("expert_treasure_tomb").pyramid("last", { mainEndReward: { type: "tombKey", keyId: "expert_ward" } }),
  journey("master_treasure_tomb").pyramid("last", { mainEndReward: { type: "tombKey", keyId: "master_ward" } }),
  journey("wizard_treasure_tomb").pyramid("last", { mainEndReward: { type: "tombKey", keyId: "wizard_ward" } }),
  // wizard_b drops its own key so wizard_c can be unlocked via a separate ward gate
  journey("wizard_treasure_tomb_b").pyramid("last", { mainEndReward: { type: "tombKey", keyId: "wizard_b_ward" } }),

  // ── Secondary tomb unlock chain: map pieces behind tier ward gates ──────────
  // Requires the primary tomb's ward key to access — enforces tomb ordering.
  // 4 journeys × 1 piece each = 4 available per secondary tomb (piecesRequired ≤ 3).
  tier("expert").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "expert_treasure_tomb" },
        endReward: { type: "mapPiece", tombId: "expert_treasure_tomb_b" },
      },
    ],
  }),
  tier("master").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "master_treasure_tomb" },
        endReward: { type: "mapPiece", tombId: "master_treasure_tomb_b" },
      },
    ],
  }),
  tier("wizard").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "wizard_treasure_tomb" },
        endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_b" },
      },
    ],
  }),
  tier("wizard").pyramid("last-1", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "wizard_treasure_tomb_b" },
        endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_c" },
      },
    ],
  }),
])
