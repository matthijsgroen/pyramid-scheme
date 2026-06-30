import { global, tier, journey, rules } from "./dsl"

// Expected reward counts — validated by configBuilder after generation.
// mosaicPieceRewards: 298 = number of unique journeyId:levelIndex steps in mosaicPieces.generated.ts
//                    distributed as extra side paths (density controlled by mosaicPaths DSL field).
// mapPieceRewards:    20 primary (1 per pyramid journey) + 16 secondary
//                    (4 journeys × 4 secondary tombs, each on last or last-1 pyramid)
export const WORLD_TARGETS = {
  mosaicPieceRewards: 298,
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
  // sidePaths/hiddenPaths: declared density-based side paths; auto-distributor handles mosaic paths.
  // sideSections: [...] = explicit sections (ward-gated map pieces, etc.); can be combined.
  global({ floorDepth: 1 }),

  // ── Difficulty + side paths per tier ─────────────────────────────────────
  tier("starter", { difficulty: "starter" }),
  tier("junior", { difficulty: "junior" }),
  tier("expert", { difficulty: "expert" }),
  tier("master", { difficulty: "master" }),
  tier("wizard", { difficulty: "wizard" }),

  tier("starter").set({ consumableDensity: 0 }).sidePaths("low").settings({ pathPuzzles: 0, end: "fragment" }),

  tier("junior")
    .set({ consumableDensity: 0.05 })
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" }),

  tier("expert")
    .set({ consumableDensity: 0.2 })
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" }),

  tier("master")
    .set({ consumableDensity: 0.25 })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .hiddenPaths("medium")
    .settings({ pathPuzzles: 0, end: "treasure" }),

  tier("wizard")
    .set({ consumableDensity: 0.3 })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .hiddenPaths("medium")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "mosaic" }),

  // ── Starter tier ──────────────────────────────────────────────────────────
  // First pyramid is the map piece entry-point for the starter tomb.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  // ── Tomb journeys: tableau puzzles, one floor per levelCount ──────────────
  journey("starter_treasure_tomb", { puzzleFamily: "tableau", difficulty: "starter" }),
  journey("junior_treasure_tomb", { puzzleFamily: "tableau", difficulty: "junior" }),
  journey("expert_treasure_tomb", { puzzleFamily: "tableau", difficulty: "expert" }),
  journey("expert_treasure_tomb_b", { puzzleFamily: "tableau", difficulty: "expert" }),
  journey("master_treasure_tomb", { puzzleFamily: "tableau", difficulty: "master" }),
  journey("master_treasure_tomb_b", { puzzleFamily: "tableau", difficulty: "master" }),
  journey("wizard_treasure_tomb", { puzzleFamily: "tableau", difficulty: "wizard" }),
  journey("wizard_treasure_tomb_b", { puzzleFamily: "tableau", difficulty: "wizard" }),
  journey("wizard_treasure_tomb_c", { puzzleFamily: "tableau", difficulty: "wizard" }),

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
