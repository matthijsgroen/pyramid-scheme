import { tier, journey, tomb, wardChest, wardWing } from "../dsl"
import type { Rule, PathEntry, SideSectionConstraint } from "../dsl"
import { TABLEAUS_PER_FLOOR } from "../../data/tableaus"

// Own-tomb HOLDBACK chests: gated on master's own SECONDARY tomb keys, since most master symbols
// first needed on a later tableau run turn out to belong to master_treasure_tomb_b, not the
// primary. Difficulty auto-derives to master.
const holdChest = (index: number) => wardChest({ tomb: "master_treasure_tomb_b", index, puzzles: 1 })
// A couple of primary-tomb holdback chests too, for the few master symbols first needed there
// instead (the tier's own structural tier-unlock gates already provide some master_a_1 supply,
// but not quite enough).
const holdChestA = (index: number) => wardChest({ tomb: "master_treasure_tomb", index, puzzles: 1 })

// FORWARD tease into the ceiling — the game's first wizard-difficulty pocket outside wizard
// itself. Replaces this pyramid's AUTO ward wing (master_treasure_tomb has exactly one
// unreserved index, 4 — see reservedTreasureIndices — which the auto wing already consumes) with
// an explicitly-keyed one. Gated on wizard_treasure_tomb_b's FIRST floor key (wizard_b_1), not any
// index of the primary wizard_treasure_tomb: every wizard symbol's real demand routes through
// wizard_treasure_tomb_b/_c (see wizard.ts's own holdChestB/holdChestC, and the total absence of a
// holdChestA-equivalent there — confirmed by walking every wizard symbol's own tableauLevels
// entry), so NO index of the primary tomb — including the last, wizard_a_4 — ever appears in any
// symbol's preferredWardKeys. Difficulty is left unset so it auto-derives to wizard (dsl.ts's
// wardKeyTier) — an emerald gate inside a gold master pyramid. `wardPaths: 0` must still
// accompany every use (unrelated to this key choice — frees master's own spare index for the path
// allocator, which would otherwise silently add a brand-new trapped master_a_5 chest). Trade-off:
// wizard_b_1 is also wizard.ts's own holdChestB(0) key — verified empirically
// (fragmentHoldback.spec.ts) that this doesn't starve wizard's own holdback balance;
// wizard_treasure_tomb_c index 0 is the documented fallback (more contested — try _b first).
const wizardWing = () => wardWing({ tomb: "wizard_treasure_tomb_b", index: 0, puzzles: 4 })

// BACKWARD echo — the first time any tier reaches back to its own immediately-preceding tier.
// Gated on expert_a_1 (the tomb's FIRST floor key) rather than the last (expert_a_4, never in any
// symbol's preferredWardKeys) — master tier's own entry-unlock mechanism already proves any one of
// expert_a_1..4 is reachable well before expert's later tableau runs resolve, and expert_a_1 is
// owned right after floor 1. Trade-off: expert_a_1 is ALSO expert.ts's own CHEST.master/WING.master
// tease key (used across roughly half of expert's front-half pyramids) — verified empirically
// (fragmentHoldback.spec.ts) that the extra competing candidate doesn't starve expert's own
// holdback balance. Difficulty auto-derives to expert.
const expertEcho = () => wardChest({ tomb: "expert_treasure_tomb", index: 0, puzzles: 1 })

// A starter-themed breather deep in a harder tier — merchant flavor, low difficulty, prefers a
// real starter hieroglyph fragment. Gated on starter_a_1 (the tomb's FIRST floor key) rather than
// the last one: junior tier's own entry-unlock mechanism already proves any one of starter_a_1..4
// is reachable well before starter's later tableau runs resolve (reachability.spec.ts's
// isTierUnlocked), and starter_a_1 is owned right after floor 1 — early enough to be a genuinely
// eligible, competing candidate for a real starter hieroglyph fragment, unlike starter_a_4 (only
// reachable after all starter demand is already settled). Trade-off: starter_a_1 is also the key
// starter.ts's own holdChest/HOLD_CYCLE holdback mechanism uses — verified empirically
// (fragmentHoldback.spec.ts, golden guard) that the extra competing candidate doesn't starve
// anything.
const starterEcho = () => wardChest({ tomb: "starter_treasure_tomb", index: 0, puzzles: 1, endReward: "hieroglyph" })

// Master's escalation (between expert's intro of traps/keys and wizard's saturation): DEEPER
// locks (multi-color floor keys + key chains) and HAZARDOUS returns (wardPathTrapped), plus the
// open junk corridors the economy needs — master is the biggest tier and generated no income.
const MASTER_SIDE_PATHS: PathEntry[] = [
  { density: "medium", pathPuzzles: 1, end: "fragment" },
  // Open junk corridor — the shop income master was missing.
  { density: "low", pathPuzzles: 2, end: "junk" },
  // Multi-color floor-key path (colors rotate through keyColorsRange below).
  { density: "low", pathPuzzles: 1, end: "fragment", gate: "floor-key" },
]
const MASTER_HIDDEN_PATHS: PathEntry[] = [{ density: "low", pathPuzzles: 2, end: "mosaic", encounter: "trap" }]

// A KEY CHAIN: a red floor-key gates a room that itself holds a green-gated vault — find the red
// key, use it to reach the green key, use that to reach the payoff. Master's deep-lock showcase.
const KEY_CHAIN: SideSectionConstraint = {
  gate: { type: "floor-key", color: "red" },
  pathPuzzles: 1,
  end: "treasure",
  endReward: "mosaicPiece",
  sideSections: [
    { gate: { type: "floor-key", color: "green" }, pathPuzzles: 1, end: "treasure", endReward: "mosaicPiece" },
  ],
}

export const masterRules: Rule[] = [
  tier("master", { difficulty: "master" }),

  tier("master").set({
    wardWings: 1,
    wardPaths: 1,
    wardPathTrapped: true, // hazardous returns — revisiting ward paths costs consumables
    keyDensity: "medium",
    keyColorsRange: { min: 2, max: 3 }, // multi-color floor keys (expert had 1 color)
    sharedKeyChance: 0.4,
    windyChance: 0.25,
    packingChance: 0.25,
    sidePaths: MASTER_SIDE_PATHS,
    hiddenPaths: MASTER_HIDDEN_PATHS,
  }),

  // Key-chain showcase on the mid pyramid of each journey, plus an extra master_b_2 holdback
  // chest on three of them (master_b_1's own supply is covered above; b_2 needed a bit more).
  ...["master_1", "master_2", "master_3", "master_4"].map((jid, i) =>
    journey(jid).pyramid(3, { sideSections: i < 3 ? [KEY_CHAIN, holdChest(1)] : [KEY_CHAIN] })
  ),

  // Own-tomb holdback chests, spread across the remaining pyramids of each journey. master_b_1
  // is by far the most-contested key (10 master_b symbols are first needed on the secondary
  // tomb's very first floor), so it gets the most chests; a couple of master_a_1 chests cover
  // the handful of symbols first needed on the primary tomb instead.
  //
  // Deliberately never on a journey's LAST pyramid: constraintResolver.ts resolves same-key
  // constraints (like sideSections) by specificity, journey-pyramid (8) over tier-pyramid (6),
  // overwriting wholesale rather than merging — and `tier("master").pyramid("last", ...)` below
  // already owns that pyramid's sideSections (the secondary-tomb map-piece unlock gate). An
  // earlier revision put chests there directly and silently deleted that gate for all 4 master
  // journeys; every entry here now targets a pyramid the tier rule doesn't touch.
  // **The Great Pyramid of Giza asks for trade puzzles.** A ROLE, not a skin: `trade` draws the balance
  // scale (weighing goods) and the bridges board, which wears its haul-road dress because that is the pool it
  // was drawn for. Which is the whole point of carrying the role into the room — the same board is a star map
  // on the lighthouse and a causeway network here, and neither site had to name a skin to get it.
  //
  // Two families is the same breadth the lighthouse ships with `sky`. A third joins the pool by carrying the
  // tag, never by an edit here.
  journey("master_1").pyramid("1-5", { encounter: "trade" }),

  journey("master_1").pyramid(1, { sideSections: [holdChest(0), holdChest(2), holdChestA(0), starterEcho()] }),
  journey("master_1").pyramid(2, { sideSections: [holdChest(1), expertEcho()] }),
  journey("master_2").pyramid(1, { sideSections: [holdChest(3), holdChest(0)] }),
  journey("master_2").pyramid(2, { sideSections: [holdChest(0)] }),
  journey("master_2").pyramid(4, {
    sideSections: [holdChest(1)],
    wardWings: [wizardWing()],
    wardPaths: 0,
  }),
  journey("master_3").pyramid(1, { sideSections: [holdChest(2), holdChest(0)] }),
  journey("master_3").pyramid(2, { sideSections: [holdChest(3), expertEcho()] }),
  journey("master_3").pyramid(4, { sideSections: [holdChest(0), holdChestA(0)] }),
  journey("master_4").pyramid(1, { sideSections: [holdChest(1), holdChest(0)] }),
  journey("master_4").pyramid(2, { sideSections: [holdChest(2)] }),
  journey("master_4").pyramid(4, {
    sideSections: [holdChest(3)],
    wardWings: [wizardWing()],
    wardPaths: 0,
  }),

  tomb("master_treasure_tomb", {
    encounter: "tomb-puzzle",
    difficulty: "master",
    levelCount: 5,
    sealed: true, // linear tomb — no shortcut around a tableau room
    // A crocodile capstone guards EVERY floor's treasure (see junior.ts for why `+ 1`).
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
  tomb("master_treasure_tomb_b", {
    encounter: "tomb-puzzle",
    difficulty: "master",
    levelCount: 5,
    sealed: true, // linear tomb — no shortcut around a tableau room
    // A crocodile capstone guards EVERY floor's treasure (see junior.ts for why `+ 1`).
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods. The tomb-treasure mod places the
        // wizard_treasure_tomb_c map-piece copy here (resolveShopStock); one of the 4 wizard-journey
        // copies is freed for this via spec/wizard.ts's journey("wizard_4") override. Empty until then.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.master + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),

  // Secondary tomb unlock: location key from master_treasure_tomb floor 2 gates master_b map piece
  tier("master").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "master_treasure_tomb", index: 1 },
        endReward: { type: "mapPiece", tombId: "master_treasure_tomb_b" },
      },
    ],
  }),
]
