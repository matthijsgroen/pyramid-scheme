import { tier, journey, tomb, sidePath, wardWing } from "../dsl"
import { fragmentPrice, MOSAIC_PRICE } from "../../data/shopPricing"
import type { Rule } from "../dsl"

// Varied "come back stronger" ward wings, mixed into the back-half pyramids of each junior
// journey (where the auto tier-unlock gate already sits). Each is a bonus floor at a HARDER
// tier's difficulty, gated by that tier's unlock treasure — so you return once you've unlocked it.
const WING = {
  expert: () => wardWing({ tomb: "junior_treasure_tomb", index: 0, tier: "expert", puzzles: 1 }), // junior_a_1
  master: () => wardWing({ tomb: "expert_treasure_tomb", index: 0, tier: "master", puzzles: 2 }), // expert_a_1
  wizard: () => wardWing({ tomb: "master_treasure_tomb", index: 0, tier: "wizard", puzzles: 2 }), // master_a_1
}

export const juniorRules: Rule[] = [
  tier("junior", { difficulty: "junior" }),

  tier("junior")
    .set({})
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    // One plain-loot hidden mosaic in every pyramid; a trapped one in only ~40% (chance),
    // so junior traps stay light and some hidden paths are just loot. The chance-gated path
    // holds junk loot (uncounted budget) — `chance` + mosaic would misreserve the cap.
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "junk", encounter: "trap", chance: 0.4 }),

  // Ward wings on back-half pyramids, difficulty cycling expert→master→wizard.
  journey("junior_1").pyramid(3, { wardWings: [WING.expert()] }),
  journey("junior_2").pyramid(3, { wardWings: [WING.master()] }),
  journey("junior_2").pyramid(4, { wardWings: [WING.wizard()] }),
  journey("junior_3").pyramid(3, { wardWings: [WING.expert()] }),
  journey("junior_3").pyramid(4, { wardWings: [WING.master()] }),
  journey("junior_4").pyramid(4, { wardWings: [WING.wizard()] }),
  journey("junior_4").pyramid(5, { wardWings: [WING.expert()] }),

  tomb("junior_treasure_tomb", {
    encounter: "tableau",
    difficulty: "junior",
    levelCount: 6,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — locked stock list: fragment + mosaic.
        sideSections: [
          sidePath({ puzzles: 1, endReward: "hieroglyph", shopPrice: fragmentPrice("junior") }),
          sidePath({ puzzles: 1, endReward: "mosaicPiece", shopPrice: MOSAIC_PRICE }),
        ],
      },
      { mainEndReward: "tombTreasure" },
      // A tomb is designed exactly like a pyramid — a side path with a mosaic reward.
      { mainEndReward: "tombTreasure", sideSections: [sidePath({ puzzles: 1, endReward: "mosaicPiece" })] },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
]
