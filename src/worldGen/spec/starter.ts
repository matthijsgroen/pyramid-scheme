import { tier, journey, tomb, wardPath, sidePath, hiddenPath } from "../dsl"
import type { Rule } from "../dsl"

export const starterRules: Rule[] = [
    tier("starter", { difficulty: "starter" }),

    tier("starter").set({ consumableDensity: 0 }).sidePaths("low").settings({ pathPuzzles: 0, end: "fragment" }),

    // First pyramid is the map piece entry-point for the starter tomb.
    tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

    // The very first pyramid of the whole game has no main-path puzzles at all — just the
    // side path and the map piece. The rest of that first journey stays to a single puzzle.
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
    journey("starter_1").pyramid("2-3", { pathPuzzles: 1 }),

    // Pyramid 2: same shape as pyramid 1, but 1 main-path puzzle on floor 1, the ward
    // path steps up to expert, and the hidden path moves down to floor 2.
    journey("starter_1")
        .pyramid(2)
        .floor(0, {
            sideSections: [
                wardPath({ puzzles: 1, tier: "expert", tomb: "junior_treasure_tomb", index: 1 }),
                sidePath(),
            ],
        })
        .floor(1, {
            pathPuzzles: 2,
            difficulty: "expert",
            sideSections: [
                sidePath({ puzzles: 1 }),
                hiddenPath({ puzzles: 2, trapped: true, endReward: "mosaicPiece" }),
            ],
        }),

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
]
