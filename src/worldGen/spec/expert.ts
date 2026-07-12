import { tier, journey, tomb, sidePath, wardChest, wardWing } from "../dsl"
import { fragmentPrice, MOSAIC_PRICE } from "../../data/shopPricing"
import type { Rule, PathEntry } from "../dsl"

// Expert's open side/hidden paths, as reusable arrays so a per-pyramid override can restate them
// and ADD to them (pyramid-level sidePaths REPLACES the tier's, it doesn't merge).
const EXPERT_SIDE_PATHS: PathEntry[] = [
  // Bumped to 2 puzzles: more open puzzle rooms = more consumable drops, so the open trap path
  // below is survivable.
  { density: "medium", pathPuzzles: 2, end: "fragment" },
  // First OPEN (visible) trapped path — a threat you can see, ending in junk (sellable income).
  { density: "low", pathPuzzles: 2, end: "junk", encounter: "trap" },
]
const EXPERT_HIDDEN_PATHS: PathEntry[] = [{ density: "low", pathPuzzles: 1, end: "mosaic", encounter: "trap" }]
// A floor-key-gated fragment side path — find a colored key on the floor to open it.
const FLOOR_KEY_PATH: PathEntry = { density: "low", pathPuzzles: 1, end: "fragment", gate: "floor-key" }

// Expert is the first tier with ward content on EVERY pyramid (chests up front, wings on the
// back half), varied to tease the two harder tiers (master/wizard), plus the first VISIBLE
// (open) trapped pathways — earlier tiers only trap hidden paths. Consumables to survive the
// open traps come from the extra open puzzle rooms (a trapped chain drops none itself).
const CHEST = {
  master: () => wardChest({ tomb: "expert_treasure_tomb", index: 0, tier: "master", puzzles: 2 }), // expert_a_1
  wizard: () => wardChest({ tomb: "master_treasure_tomb", index: 0, tier: "wizard", puzzles: 2 }), // master_a_1
}
const WING = {
  master: () => wardWing({ tomb: "expert_treasure_tomb", index: 0, tier: "master", puzzles: 2 }),
  wizard: () => wardWing({ tomb: "master_treasure_tomb", index: 0, tier: "wizard", puzzles: 2 }),
}
type Tease = "master" | "wizard"
// Pyramid counts per expert journey (mirror journeyStructure.ts). Front half → ward chest, back
// half → ward wing; tease alternates master/wizard.
const EXPERT_PYRAMIDS: [string, number][] = [
  ["expert_1", 4],
  ["expert_2", 4],
  ["expert_3", 5],
  ["expert_4", 5],
]

const wardRules: Rule[] = EXPERT_PYRAMIDS.flatMap(([jid, n]) => {
  const half = Math.ceil(n / 2)
  return Array.from({ length: n }, (_, k) => {
    const tease: Tease = k % 2 === 0 ? "master" : "wizard"
    const isLast = k === n - 1
    if (k < half) return journey(jid).pyramid(k + 1, { sideSections: [CHEST[tease]()] })
    // Back-half pyramids: a ward wing; the last one of each journey also gets denser open junk
    // corridors (income the still-short economy needs).
    return journey(jid).pyramid(k + 1, {
      wardWings: [WING[tease]()],
      ...(isLast ? { sidePaths: [{ density: "dense", pathPuzzles: 2, end: "junk" as const }] } : {}),
    })
  })
})

export const expertRules: Rule[] = [
  tier("expert", { difficulty: "expert" }),

  tier("expert").set({
    keyDensity: "low",
    sharedKeyChance: 0.15,
    windyChance: 0.25,
    packingChance: 0.25, // ~25% of expert pyramids already roll a broad, sprawling layout
    sidePaths: EXPERT_SIDE_PATHS,
    hiddenPaths: EXPERT_HIDDEN_PATHS,
  }),

  ...wardRules,

  // expert_4 (the last journey) — some open main-path floors gain a floor-key lock (find a
  // colored key on the floor to open a gated side room) plus an explicitly broad `packing`
  // layout (more sprawl to hide the key in). First tier to bring floor keys onto the open main
  // path. sidePaths restates the tier paths + the floor-key path, since a pyramid override
  // replaces the tier's sidePaths rather than merging.
  journey("expert_4").pyramid(2, {
    keyColors: 2,
    packing: 2,
    sidePaths: [...EXPERT_SIDE_PATHS, FLOOR_KEY_PATH],
  }),
  journey("expert_4").pyramid(4, {
    keyColors: 2,
    packing: 2,
    sidePaths: [...EXPERT_SIDE_PATHS, FLOOR_KEY_PATH],
  }),

  tomb("expert_treasure_tomb", {
    encounter: "tableau",
    difficulty: "expert",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: fragment + mosaic.
        sideSections: [
          sidePath({ puzzles: 1, endReward: "hieroglyph", shopPrice: fragmentPrice("expert") }),
          sidePath({ puzzles: 1, endReward: "mosaicPiece", shopPrice: MOSAIC_PRICE }),
        ],
      },
      // A side path opting into the same hieroglyph-fragment assignment pyramids use.
      { mainEndReward: "tombTreasure", sideSections: [{ pathPuzzles: 1, endReward: "fragmentSlot" }] },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
  tomb("expert_treasure_tomb_b", {
    encounter: "tableau",
    difficulty: "expert",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: fragment (solo slot).
        sideSections: [sidePath({ puzzles: 1, endReward: "hieroglyph", shopPrice: fragmentPrice("expert") })],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),

  // Secondary tomb unlock: location key from expert_treasure_tomb floor 2 gates expert_b map piece
  tier("expert").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "expert_treasure_tomb", index: 1 },
        endReward: { type: "mapPiece", tombId: "expert_treasure_tomb_b" },
      },
    ],
  }),
]
