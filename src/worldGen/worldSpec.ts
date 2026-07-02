import { global, tier, tomb, rules } from "./dsl"

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
  global({ floorDepth: 1, consumableRates: { bandage: 3, oil: 1, trapTool: 1 } }),

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
    .sidePaths("low")
    .settings({ pathPuzzles: 1, end: "consumable", trapped: true })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" }),

  tier("master")
    .set({ consumableDensity: 0.25 })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .sidePaths("low")
    .settings({ pathPuzzles: 1, end: "consumable", trapped: true })
    .hiddenPaths("medium")
    .settings({ pathPuzzles: 0, end: "treasure" }),

  tier("wizard")
    .set({ consumableDensity: 0.3 })
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .sidePaths("low")
    .settings({ pathPuzzles: 1, end: "consumable", trapped: true })
    .hiddenPaths("medium")
    .settings({ pathPuzzles: 0, end: "treasure" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "mosaic" }),

  // ── Starter tier ──────────────────────────────────────────────────────────
  // First pyramid is the map piece entry-point for the starter tomb.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  // ── Tomb journeys: tableau puzzles, one tombTreasure per floor ──────────────
  tomb("starter_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "starter",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("junior_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "junior",
    levelCount: 6,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("expert_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "expert",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("expert_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "expert",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("master_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "master",
    levelCount: 5,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("master_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "master",
    levelCount: 5,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("wizard_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("wizard_treasure_tomb_b", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("wizard_treasure_tomb_c", {
    puzzleFamily: "tableau",
    difficulty: "wizard",
    levelCount: 4,
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),

  // ── Secondary tomb unlock chain: map pieces behind location-key gates ───────
  // Each secondary tomb is unlocked by the "location key" treasure (floor 2) of the preceding tomb.
  // 4 journeys × 1 piece each = 4 available per secondary tomb (piecesRequired ≤ 3).
  tier("expert").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "expert_treasure_tomb", index: 1 }, // Location key → Expert B
        endReward: { type: "mapPiece", tombId: "expert_treasure_tomb_b" },
      },
    ],
  }),
  tier("master").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "master_treasure_tomb", index: 1 }, // Location key → Master B
        endReward: { type: "mapPiece", tombId: "master_treasure_tomb_b" },
      },
    ],
  }),
  tier("wizard").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "wizard_treasure_tomb", index: 1 }, // Location key → Wizard B
        endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_b" },
      },
    ],
  }),
  tier("wizard").pyramid("last-1", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "wizard_treasure_tomb_b", index: 1 }, // Location key → Wizard C
        endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_c" },
      },
    ],
  }),
])
