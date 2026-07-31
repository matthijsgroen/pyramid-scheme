import { tier, journey, tomb, wardChest, wardWing } from "../dsl"
import type { Rule, PathEntry } from "../dsl"
import { TABLEAUS_PER_FLOOR } from "../../data/tableaus"

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
// Difficulty is left unset on all four so it auto-derives to match each key's own tier exactly
// (see dsl.ts's wardKeyTier).
const CHEST = {
  master: () => wardChest({ tomb: "expert_treasure_tomb", index: 0, puzzles: 2 }), // expert_a_1
  wizard: () => wardChest({ tomb: "master_treasure_tomb", index: 0, puzzles: 2 }), // master_a_1
}
const WING = {
  master: () => wardWing({ tomb: "expert_treasure_tomb", index: 0, puzzles: 2 }),
  wizard: () => wardWing({ tomb: "master_treasure_tomb", index: 0, puzzles: 2 }),
}
type Tease = "master" | "wizard"
// Own-tomb HOLDBACK chests — the counterpart to CHEST/WING above (those point forward, at a
// later tier's key). These point at expert's own SECONDARY tomb keys, since most expert symbols
// first needed on a later tableau run turn out to belong to expert_treasure_tomb_b, not the
// primary. Difficulty auto-derives to expert.
const holdChest = (index: number) => wardChest({ tomb: "expert_treasure_tomb_b", index, puzzles: 1 })

// BACKWARD echo — makes junior↔expert the first bidirectional pair (junior already hosts two
// expert-difficulty wings). junior_treasure_tomb's last floor (junior_a_6) — already used once by
// wizard.ts's own backward teaser; reusing the same key elsewhere is fine (many keys already gate
// multiple chests). Chosen because a tomb's own last-floor key can never appear in any symbol's
// preferredWardKeys, so it can't perturb junior's holdback balance. Difficulty auto-derives to
// junior.
const juniorEcho = () => wardChest({ tomb: "junior_treasure_tomb", index: 5, puzzles: 1 })
// journey id → 1-based pyramid number for the junior echo (front-half, non-`last` pyramids).
const JUNIOR_ECHO_AT: Record<string, number> = { expert_2: 2, expert_3: 3 }

// The full-circle starter echo (see master.ts/wizard.ts for the matching pattern) — a whole
// bonus floor this time, since expert already wings its own tease targets on the back half.
// Gated on starter_a_4, only obtainable by clearing starter_treasure_tomb's own 4 floors, so it's
// structurally unreachable for a symbol needed on the tomb's own first tableau run
// (placeFragments.ts's eligibility check requires the gate's key already owned) — prefers a real
// starter hieroglyph fragment, falling back to mosaic if no starter symbol has outstanding demand
// reaching this slot. Difficulty auto-derives to starter.
const starterWing = () => wardWing({ tomb: "starter_treasure_tomb", index: 3, puzzles: 2, endReward: "hieroglyph" })
// journey id → 1-based pyramid number for the starter wing (a back-half, non-`last` pyramid).
const STARTER_WING_AT: Record<string, number> = { expert_1: 3 }
// Pyramid counts per expert journey (mirror journeyStructure.ts). Front half → ward chest, back
// half → ward wing; tease alternates master/wizard.
const EXPERT_PYRAMIDS: [string, number][] = [
  ["expert_1", 4],
  ["expert_2", 4],
  ["expert_3", 5],
  ["expert_4", 5],
]

const wardRules: Rule[] = EXPERT_PYRAMIDS.flatMap(([jid, n], ji) => {
  const half = Math.ceil(n / 2)
  return Array.from({ length: n }, (_, k) => {
    const tease: Tease = k % 2 === 0 ? "master" : "wizard"
    const isLast = k === n - 1
    // expert_b_1 is the most-contested holdback key (6 expert_b symbols are first needed on the
    // secondary tomb's very first floor), so the first front-half pyramid of every journey
    // carries an extra chest behind it.
    if (k < half)
      return journey(jid).pyramid(k + 1, {
        sideSections: [
          CHEST[tease](),
          holdChest((ji + k) % 3),
          ...(k === 0 ? [holdChest(0)] : []),
          ...(JUNIOR_ECHO_AT[jid] === k + 1 ? [juniorEcho()] : []),
        ],
      })
    // Back-half pyramids: a ward wing; the last one of each journey also gets denser open junk
    // corridors (income the still-short economy needs). The first back-half pyramid of each
    // journey also carries an extra holdback chest — expert_b_1/b_2 need more supply than the
    // front-half rotation alone provides.
    return journey(jid).pyramid(k + 1, {
      wardWings: STARTER_WING_AT[jid] === k + 1 ? [WING[tease](), starterWing()] : [WING[tease]()],
      ...(k === half ? { sideSections: [holdChest(ji % 2)] } : {}),
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
    encounter: "tomb-puzzle",
    difficulty: "expert",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      // A side path opting into the same hieroglyph-fragment assignment pyramids use.
      { mainEndReward: "tombTreasure", sideSections: [{ pathPuzzles: 1, endReward: "fragmentSlot" }] },
      { mainEndReward: "tombTreasure" },
      // Crocodile capstone on the final floor — authored via a node selector (§G).
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
  tomb("expert_treasure_tomb_b", {
    encounter: "tomb-puzzle",
    difficulty: "expert",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    floors: [
      {
        mainEndReward: "tombTreasure",
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      { mainEndReward: "tombTreasure" },
      { mainEndReward: "tombTreasure" },
      // Crocodile capstone on the final floor — authored via a node selector (§G).
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
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
