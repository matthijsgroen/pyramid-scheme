import { tier, journey, tomb, sidePath, wardWing, wardChest } from "../dsl"
import type { Rule } from "../dsl"
import { TABLEAUS_PER_FLOOR } from "../../data/tableaus"

// Varied "come back stronger" ward wings, mixed into the back-half pyramids of each junior
// journey (where the auto tier-unlock gate already sits). Each is a bonus floor gated by a later
// tier's unlock treasure — so you return once you've unlocked it. Difficulty is left unset so it
// auto-derives to match that key's own tier exactly (see dsl.ts's wardKeyTier).
const WING = {
  expert: () => wardWing({ tomb: "junior_treasure_tomb", index: 0, puzzles: 1 }), // junior_a_1
  master: () => wardWing({ tomb: "expert_treasure_tomb", index: 0, puzzles: 2 }), // expert_a_1
  wizard: () => wardWing({ tomb: "master_treasure_tomb", index: 0, puzzles: 2 }), // master_a_1
}

// Own-tomb HOLDBACK chests — the counterpart to starter.ts's holdChest: gated on
// junior_treasure_tomb's own floor keys, so a junior hieroglyph needed on the tomb's 2nd+
// tableau run can't complete purely from the open pyramids. Difficulty auto-derives to junior.
const holdChest = (index: number) => wardChest({ tomb: "junior_treasure_tomb", index, puzzles: 1 })

// A starter-themed breather deep in a harder tier, gated on starter_a_1 (the tomb's FIRST floor
// key) rather than the last one — junior tier's own entry-unlock mechanism already proves any one
// of starter_a_1..4 is reachable well before starter's later tableau runs resolve
// (reachability.spec.ts's isTierUnlocked), and starter_a_1 is owned right after floor 1 — early
// enough to be a genuinely eligible, competing candidate for a real starter hieroglyph fragment,
// unlike starter_a_4 (only reachable after all starter demand is already settled). Trade-off:
// starter_a_1 is also the key starter.ts's own holdChest/HOLD_CYCLE holdback mechanism uses —
// verified empirically (fragmentHoldback.spec.ts, golden guard) that the extra competing candidate
// doesn't starve anything.
const starterEcho = () => wardChest({ tomb: "starter_treasure_tomb", index: 0, puzzles: 1, endReward: "hieroglyph" })

// Old workings — an ungated starter-difficulty corridor an earlier expedition left behind, one per
// junior journey. A slot's loot tiers by its OWN difficulty (slots.ts), so these bear starter loot
// inside a junior pyramid: an easy breather, and the starter tier's only spare loot CAPACITY.
//
// Why it exists: the starter journeys' own chests are fully subscribed by hieroglyph, mosaic, map
// piece and tomb-key placement, leaving the shop's fill six chests on two floors for the whole
// tier. All five stone trinkets then shipped as one copy each on a single floor — one behind a ward
// gate, one on a hidden path — so missing that floor left the Collection's stone row unfinishable.
// Ungated on purpose: a gate would put the spread back behind a single key.
// (lootEconomyInvariants.spec.ts guards both the ≥1-of-each and the spread.)
const oldWorkings = () => sidePath({ puzzles: 1, tier: "starter", endReward: "junk" })

export const juniorRules: Rule[] = [
  tier("junior", { difficulty: "junior" }),

  tier("junior")
    .set({})
    .sidePaths("medium")
    .settings({ pathPuzzles: 1, end: "fragment" })
    // One VISIBLE mosaic per pyramid: the corridor detector isn't earned until the master tier, so
    // the hidden mosaic below is unreachable this early (junior_1 was all-hidden = 0 reachable). A
    // surplus visible end slot the capped pass fills. See starter tier default.
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" })
    // One plain-loot hidden mosaic in every pyramid; a trapped one in only ~40% (chance),
    // so junior traps stay light and some hidden paths are just loot. The chance-gated path
    // holds junk loot (uncounted budget) — `chance` + mosaic would misreserve the cap.
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 2, end: "junk", encounter: "trap", chance: 0.4 }),

  // **The Lighthouse of Alexandria runs on sky.** Every main-path room in its five pyramids draws from the
  // `sky` pool rather than the general `puzzle` one — the beam family, the sun-and-moon grid and the star
  // map, each of which joined that pool by carrying the tag rather than by an edit here.
  //
  // `sky` rather than `["light", "sky"]` on purpose. A list is a union — the allocator draws from any tag in
  // it — so the list would only widen the pool back to what `sky` already covers. Narrowing is a narrower
  // tag’s job: `sky` is the wide cluster and `light` the narrow one inside it.
  //
  // **And it runs at night**, which is a separate axis: `encounter` decides which family renders a room,
  // `theme` decides which skin that family wears. A family with no skin registered under "night" draws its
  // default one, so naming a skin here can never leave a room unrenderable. It reaches this pyramid’s floors
  // and its side paths, including the trapped ones — half a themed pyramid reads as an accident.
  //
  // **A lighthouse is a light in the sky, so it asks for both.** A role list is a union for eligibility, and
  // `light` (eclipse, lightbeam) sits inside `sky`, so the pool is the same four families either way — what
  // the second word buys is the dressing. `light` is FIRST because the skin resolver takes the first role a
  // family has a face for, and every family here answers `sky` with its default: sky-first would win that
  // search and cancel the narrower place. Neither has a `light` face yet
  // (docs/game-design/journeys.md §9), so today this is intent rather than pixels — and the day a beacon
  // ships, this pyramid wears it without being re-authored.
  journey("junior_4").pyramid("1-5", { encounter: ["light", "sky"], theme: "night" }),

  // Ward wings on back-half pyramids, difficulty cycling expert→master→wizard.
  journey("junior_1").pyramid(3, { wardWings: [WING.expert()] }),
  journey("junior_2").pyramid(3, { wardWings: [WING.master()], sideSections: [holdChest(0)] }),
  journey("junior_2").pyramid(4, { wardWings: [WING.wizard()] }),
  journey("junior_3").pyramid(3, { wardWings: [WING.expert()], sideSections: [holdChest(0)] }),
  journey("junior_3").pyramid(4, { wardWings: [WING.master()] }),
  journey("junior_4").pyramid(4, { wardWings: [WING.wizard()] }),
  journey("junior_4").pyramid(5, { wardWings: [WING.expert()] }),

  // Own-tomb holdback chests, spread across the front-half pyramids (the back half already
  // carries a ward wing above).
  journey("junior_1").pyramid(1, { sideSections: [holdChest(0), starterEcho()] }),
  journey("junior_1").pyramid(2, { sideSections: [holdChest(1), oldWorkings()] }),
  journey("junior_2").pyramid(1, { sideSections: [holdChest(0)] }),
  journey("junior_2").pyramid(2, { sideSections: [holdChest(1), oldWorkings()] }),
  journey("junior_3").pyramid(1, { sideSections: [holdChest(0)] }),
  journey("junior_3").pyramid(2, { sideSections: [holdChest(2), oldWorkings()] }),
  journey("junior_4").pyramid(1, { sideSections: [holdChest(0)] }),
  journey("junior_4").pyramid(2, { sideSections: [holdChest(1)] }),
  journey("junior_4").pyramid(3, { sideSections: [holdChest(2), oldWorkings()] }),

  tomb("junior_treasure_tomb", {
    encounter: "tomb-puzzle",
    difficulty: "junior",
    levelCount: 6,
    sealed: true, // linear tomb — no shortcut around a tableau room
    // Every floor's treasure IS a ward key, and from junior on each one is guarded by a crocodile
    // capstone — authored per floor via a node selector (§G), not a core rule. `pathPuzzles` is one
    // ABOVE the tier's tableau count so the capstone is an EXTRA room: the selector overrides the
    // last room's family, so without the +1 the crocodile would eat a tableau and leave the floor
    // short of the `floors × TABLEAUS_PER_FLOOR` story grid tableaus.ts sizes for.
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.junior + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods (currency pieces + consumables).
        // Empty until resolveShopStock + the consumable fill land; the shop mods own its content.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.junior + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      // A tomb is designed exactly like a pyramid — a side path with a mosaic reward.
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.junior + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        sideSections: [sidePath({ puzzles: 1, endReward: "mosaicPiece" })],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.junior + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.junior + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.junior + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
]
