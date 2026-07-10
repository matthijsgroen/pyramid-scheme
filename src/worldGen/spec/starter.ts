import { tier, journey, tomb, wardPath, sidePath, hiddenPath } from "../dsl"
import type { Rule } from "../dsl"

export const starterRules: Rule[] = [
  tier("starter", { difficulty: "starter" }),

  tier("starter")
    .set({})
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "fragment" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "mosaic" }),

  // First pyramid of each starter journey is that journey's map-piece entry-point.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  // starter_1 — the whole game's onboarding: a single pyramid, no main-path puzzles, just
  // the map piece and a gentle ward path into the starter tomb.
  journey("starter_1")
    .pyramid(1, { pathPuzzles: 0 })
    .floor(0, {
      sideSections: [
        // Shares the starter→junior tier-unlock key — narratively you need it anyway.
        wardPath({ puzzles: 1, tier: "junior", tomb: "starter_treasure_tomb", index: 0 }),
        sidePath(),
        hiddenPath({ puzzles: 2, trapped: true, endReward: "mosaicPiece" }),
      ],
    })
    .floor(1, {
      pathPuzzles: 2,
      difficulty: "junior",
      sideSections: [sidePath({ puzzles: 1 })],
    }),

  // starter_2 — the two follow-up curated pyramids (moved out of starter_1). One main-path
  // puzzle each; ward path steps up expert then master, with a hidden mosaic on the deeper floor.
  journey("starter_2")
    .pyramid(1)
    .floor(0, {
      sideSections: [wardPath({ puzzles: 1, tier: "expert", tomb: "junior_treasure_tomb", index: 1 }), sidePath()],
    })
    .floor(1, {
      pathPuzzles: 2,
      difficulty: "expert",
      sideSections: [sidePath({ puzzles: 1 }), hiddenPath({ puzzles: 2, trapped: true, endReward: "mosaicPiece" })],
    }),

  journey("starter_2")
    .pyramid(2)
    .floor(0, {
      sideSections: [wardPath({ puzzles: 1, tier: "master", tomb: "expert_treasure_tomb", index: 2 }), sidePath()],
    })
    .floor(1, {
      pathPuzzles: 3,
      difficulty: "master",
      sideSections: [sidePath({ puzzles: 1 }), hiddenPath({ puzzles: 1, trapped: true, endReward: "mosaicPiece" })],
    }),

  tomb("starter_treasure_tomb", {
    puzzleFamily: "tableau",
    difficulty: "starter",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
    ],
  }),
]
