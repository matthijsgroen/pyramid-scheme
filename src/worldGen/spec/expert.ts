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
  { density: "low", pathPuzzles: 4, end: "junk", encounter: "trap" },
]
const EXPERT_HIDDEN_PATHS: PathEntry[] = [{ density: "low", pathPuzzles: 2, end: "mosaic", encounter: "trap" }]
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
// expert-difficulty wings). Gated on junior_a_1 (the tomb's FIRST floor key) rather than the last
// one: expert tier's own entry-unlock mechanism already proves any one of junior_a_1..4 is
// reachable well before junior's later tableau runs resolve (reachability.spec.ts's
// isTierUnlocked), and junior_a_1 is owned right after floor 1 — early enough to be a genuinely
// eligible, competing candidate for a real junior hieroglyph fragment, unlike junior_a_6 (never in
// any symbol's preferredWardKeys at all — the same class of bug already fixed for the starter
// echoes). Trade-off: junior_a_1 is also the key junior.ts's own holdChest/WING.expert mechanism
// uses — verified empirically (fragmentHoldback.spec.ts) that the extra competing candidate
// doesn't starve anything. Difficulty auto-derives to junior.
const juniorEcho = () => wardChest({ tomb: "junior_treasure_tomb", index: 0, puzzles: 1 })
// journey id → 1-based pyramid number for the junior echo (front-half, non-`last` pyramids).
const JUNIOR_ECHO_AT: Record<string, number> = { expert_2: 2, expert_3: 3 }

// The full-circle starter echo (see master.ts/wizard.ts for the matching pattern) — a whole
// bonus floor this time, since expert already wings its own tease targets on the back half. Gated
// on starter_a_1 (the tomb's FIRST floor key) rather than the last one: junior tier's own
// entry-unlock mechanism already proves any one of starter_a_1..4 is reachable well before
// starter's later tableau runs resolve (reachability.spec.ts's isTierUnlocked), and starter_a_1 is
// owned right after floor 1 — early enough to be a genuinely eligible, competing candidate for a
// real starter hieroglyph fragment, unlike starter_a_4 (only reachable after all starter demand is
// already settled). Trade-off: starter_a_1 is also the key starter.ts's own holdChest/HOLD_CYCLE
// holdback mechanism uses — verified empirically (fragmentHoldback.spec.ts, golden guard) that the
// extra competing candidate doesn't starve anything. Difficulty auto-derives to starter.
const starterWing = () => wardWing({ tomb: "starter_treasure_tomb", index: 0, puzzles: 2, endReward: "hieroglyph" })
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
  // a priest's temple: canopic jars, an altar, the sacred pool, a veil before the shrine.
  tier("expert", {
    difficulty: "expert",
    decorations: [
      "shelf",
      "chestProp",
      "jarRack",
      "offeringTable",
      "basin",
      "statue",
      "lamp",
      "hanging",
      "shrine",
      "sarcophagus",
      "pillar",
      "brazier",
      "rubble",
      "pit",
      "mat",
    ],
    // a priest's wing: the veil before the shrine, a wall shrine, a hanging lamp.
    wallDecorations: ["veil", "wallShrine", "sconce"],
  }),

  tier("expert").set({
    keyDensity: "low",
    sharedKeyChance: 0.15,
    windyChance: 0.25,
    packingChance: 0.25, // ~25% of expert pyramids already roll a broad, sprawling layout
    sidePaths: EXPERT_SIDE_PATHS,
    hiddenPaths: EXPERT_HIDDEN_PATHS,
  }),

  ...wardRules,

  // **The Nile Delta Expedition wants water puzzles, and the role is the part that waits.** The pool is no
  // longer thin: the bridges board carries `water` and `agriculture`, and so does the hive (hidato), which
  // brings the number line rather than a second dress. What is left is playtesting them side by side in the
  // lab — five pyramids of one role is only varied if its members read as different rooms.
  //
  // The generated half of that question is answered: authored, `water` draws all four of its families
  // across this journey's 37 sections — constellation 12, hidato 11, star-battle 8, twin stars 6, so a
  // 32% top share, the same spread `sky` ships at. It clears rolePools.spec.ts and the world validates.
  // What is untested is the only part paper cannot settle, which is whether four boards drawn for one
  // role read as four different ROOMS. Then this is the whole change:
  //
  //   journey("expert_3").pyramid("1-5", { encounter: "water" })
  //
  // Deliberately not authored as a skin instead. `theme` is the place — night, sandstorm — and asking for a
  // dress without asking for the puzzles that wear it is how a trade pyramid ends up looking like a
  // waterworks.

  // **The tomb journeys ask for the place their story is already set in** (docs/game-design/journeys.md §9).
  // Four families have a funerary face — balance scale weighs a heart against the feather, constellation
  // paints a ceiling, hidato opens sealed chambers, and sudoku's default already IS a wall of cut signs.
  //
  // **`puzzle` rides along on purpose, and it is what makes this safe.** A role list is a union, so the pool
  // stays every family and the draw does not change at all — what changes is that the four which can dress
  // now do. Restricting to the four instead would be 9.3 turns each across its 37 sections, far past the 6.3 repeats-per-family the
  // least varied journey in the game already ships (§11), so a tomb would be the same four boards over and
  // over. The share that comes out dressed is therefore the pool's natural rate rather than a chosen one;
  // weighting a preferred role is designed and unbuilt (§11).
  journey("expert_1").pyramid("1-4", { encounter: ["funerary", "puzzle"] }),

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
    // A crocodile capstone guards EVERY floor's treasure (see junior.ts for why `+ 1`).
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      // A side path opting into the same hieroglyph-fragment assignment pyramids use.
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        sideSections: [{ pathPuzzles: 1, endReward: "fragmentSlot" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
  tomb("expert_treasure_tomb_b", {
    encounter: "tomb-puzzle",
    difficulty: "expert",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    // A crocodile capstone guards EVERY floor's treasure (see junior.ts for why `+ 1`).
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.expert + 1,
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
