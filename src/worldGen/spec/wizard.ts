import { tier, tomb, journey, wardChest, wardWing } from "../dsl"
import type { Rule, SideSectionConstraint } from "../dsl"
import { TABLEAUS_PER_FLOOR } from "../../data/tableaus"

// The ceiling saturates every mechanic, including a key chain (a red floor-key gates a room
// holding a green-gated vault). Kept to two levels: the maze assembler flattens deeper nesting
// on wizard's dense floors, so a 3-level chain doesn't survive as an actual chain.
const WIZARD_CHAIN: SideSectionConstraint = {
  gate: { type: "floor-key", color: "red" },
  pathPuzzles: 1,
  end: "treasure",
  endReward: "mosaicPiece",
  sideSections: [
    { gate: { type: "floor-key", color: "green" }, pathPuzzles: 1, end: "treasure", endReward: "mosaicPiece" },
  ],
}

// Own-tomb HOLDBACK chests: gated on wizard's own secondary/tertiary tomb keys, since most
// wizard symbols first needed on a later tableau run turn out to belong to wizard_treasure_tomb_b
// or _c, not the primary. Difficulty auto-derives to wizard.
const holdChestB = (index: number) => wardChest({ tomb: "wizard_treasure_tomb_b", index, puzzles: 1 })
const holdChestC = (index: number) => wardChest({ tomb: "wizard_treasure_tomb_c", index, puzzles: 1 })

// BACKWARD echo, one tier nearer than the junior teasers below. Gated on expert_b_1 (the tomb's
// FIRST floor key) rather than the last (expert_b_4, never in any symbol's preferredWardKeys).
// Trade-off, bigger than the other echoes: expert_b_1 is already expert.ts's own MOST-CONTESTED
// holdback key (6 expert_b symbols are first needed on this exact floor — see expert.ts's own
// holdChest comment) — verified empirically (fragmentHoldback.spec.ts, one test per expert_b
// symbol) that this doesn't starve expert's own holdback balance; expert_b_2 (index 1) is the
// documented fallback if it ever does. Difficulty auto-derives to expert.
const expertEcho = () => wardChest({ tomb: "expert_treasure_tomb_b", index: 0, puzzles: 1 })

// The full-circle moment: a starter-themed bonus floor, deep in the endgame. Gated on
// starter_a_1 (the tomb's FIRST floor key) rather than the last one: junior tier's own
// entry-unlock mechanism already proves any one of starter_a_1..4 is reachable well before
// starter's later tableau runs resolve (reachability.spec.ts's isTierUnlocked), and starter_a_1 is
// owned right after floor 1 — early enough to be a genuinely eligible, competing candidate for a
// real starter hieroglyph fragment, unlike starter_a_4 (only reachable after all starter demand is
// already settled). Trade-off: starter_a_1 is also the key starter.ts's own holdChest/HOLD_CYCLE
// holdback mechanism uses — verified empirically (fragmentHoldback.spec.ts, golden guard) that the
// extra competing candidate doesn't starve anything. Difficulty auto-derives to starter.
const starterWing = () => wardWing({ tomb: "starter_treasure_tomb", index: 0, puzzles: 3, endReward: "hieroglyph" })

// The wizard_treasure_tomb_c map-piece unlock gate, shared between its normal home (the tier-wide
// "last-1" rule below) and wizard_1's pyramid 3 (which happens to BE that journey's last-1
// pyramid too, and would otherwise silently overwrite this same-key `sideSections` constraint —
// constraintResolver.ts resolves same-key constraints by specificity, replacing wholesale, not
// merging).
const wizardCMapPieceGate: SideSectionConstraint = {
  gate: { type: "tomb-key", tombId: "wizard_treasure_tomb_b", index: 1 },
  endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_c" },
}

export const wizardRules: Rule[] = [
  // the gods' vault: an open coffin, a figure of light, a shaft with no bottom, columns of light.
  tier("wizard", { difficulty: "wizard", decorations: ["sarcophagus", "statue", "pit", "pillar", "rubble"] }),

  // Wizard's character is DEPTH, where master's is BREADTH — the two tiers are meant to feel
  // structurally different, not just numerically harder. `mainFloors: 2` (master has one), two ward
  // paths (master has one), 4 key colours and the 3-level key chain below are what make a wizard
  // pyramid a descent rather than a bigger sprawl. Branch density stays LOW to match (see the
  // sidePaths comment); the two knobs are a pair, so raising density here would put back the
  // "master but more of everything" shape that made half of wizard's chests loose change.
  tier("wizard")
    .set({
      mainFloors: 2,
      wardWings: 1,
      wardPaths: 2,
      wardPathTrapped: true,
      keyDensity: "medium",
      keyColorsRange: { min: 2, max: 4 },
      windyChance: 0.25,
      packingChance: 0.25,
    })
    // Wizard is DEEP, not BROAD — see the tier's own comment above `mainFloors`. Branch density is
    // deliberately `low` across the board, unlike master's `medium` fragment path: wizard earns its
    // character from two main floors, two ward paths and 3-level key chains, not from more dead-end
    // pockets per floor. Before this, wizard was "master but more of everything" — 954 puzzle rooms
    // against only 160 pieces of real loot (6.0 rooms per reward, where master sits at 3.2), which
    // left 138 of its 314 chests holding nothing but loose change.
    .sidePaths("low")
    .settings({ pathPuzzles: 1, end: "fragment", gate: "floor-key" })
    // Open (visible) trapped path — the ceiling carries the open-trap mechanic expert introduced,
    // ending in junk (income). Two puzzles, matching master's junk corridor: a 4-room trapped chain
    // is a long walk for income, and wizard already carries the tier's trap weight in volume.
    .sidePaths("low")
    .settings({ pathPuzzles: 2, end: "junk", encounter: "trap" })
    // Wizard is trap-heavy: trapped hidden mosaics, plus one plain-loot hidden.
    .hiddenPaths("low")
    .settings({ pathPuzzles: 2, end: "mosaic", encounter: "trap" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" }),

  // 3-level key-chain showcase on the 2nd pyramid of each wizard journey.
  ...["wizard_1", "wizard_2", "wizard_3", "wizard_4"].map(jid =>
    journey(jid).pyramid(2, { sideSections: [WIZARD_CHAIN] })
  ),

  // "Vice versa" teasers: bonus loot pockets in wizard pyramids gated by early-junior-tier
  // treasures (junior_a_5/junior_a_6, both otherwise-spare "max-health" floors) — the mirror of
  // the many existing early-pyramid-gated-by-late-key teasers (see starter.ts's TEASE/wardPath
  // calls). A player who cleared junior_treasure_tomb long ago already holds the key; this just
  // gives that old treasure one more thing to be worth, deep in the game. Difficulty is left unset
  // so the puzzle behind the gate auto-derives to match the key's own (junior) tier exactly,
  // rather than the wizard-tier pyramid it happens to sit in — see dsl.ts's wardKeyTier.
  // wizard_1 has only 4 pyramids, so THIS pyramid is also the tier's `last-1` — the rule below
  // wins on `sideSections` by specificity (journey-pyramid 8 > tier-pyramid 6, replacing
  // wholesale), so it must restate that pyramid's wizard_c map-piece gate or silently delete it
  // (exactly the bug fixed in commit 6b4bee2 for master/wizard's other pyramids, just missed here
  // since this call predates that fix).
  journey("wizard_1").pyramid(3, {
    sideSections: [
      wizardCMapPieceGate,
      wardChest({ tomb: "junior_treasure_tomb", index: 4, puzzles: 1 }), // junior_a_5
    ],
  }),
  // Gated on junior_a_1 (the tomb's FIRST floor key), not the last (junior_a_6, never in any
  // symbol's preferredWardKeys) — see expert.ts's juniorEcho for the full rationale, the same fix
  // applied there.
  journey("wizard_3").pyramid(4, {
    sideSections: [wardChest({ tomb: "junior_treasure_tomb", index: 0, puzzles: 1 })], // junior_a_1
  }),

  // Own-tomb holdback chests, spread across pyramids that don't already carry a chain/teaser.
  //
  // Deliberately never on a journey's LAST or LAST-1 pyramid: constraintResolver.ts resolves
  // same-key constraints (like sideSections) by specificity, journey-pyramid (8) over
  // tier-pyramid (6), overwriting wholesale rather than merging — and the tier("wizard")
  // .pyramid("last"/"last-1", ...) rules below already own those pyramids' sideSections (the
  // secondary/tertiary-tomb map-piece unlock gates). An earlier revision put chests directly on
  // those pyramids and silently deleted those gates for wizard_1/2/3; every entry here now
  // targets a pyramid neither tier rule touches (and, for wizard_4, avoids the journey-specific
  // "last-1" override further below that intentionally keeps that one pyramid slot-free).
  journey("wizard_1").pyramid(1, {
    sideSections: [holdChestC(0), holdChestC(1)],
    wardWings: [starterWing()], // the full-circle starter-echo (see helper above)
  }),
  // **The tomb journeys ask for the place their story is already set in** (docs/game-design/journeys.md §9).
  // Four families have a funerary face — balance scale weighs a heart against the feather, constellation
  // paints a ceiling, hidato opens sealed chambers, and sudoku's default already IS a wall of cut signs.
  //
  // **`puzzle` rides along on purpose, and it is what makes this safe.** A role list is a union, so the pool
  // stays every family and the draw does not change at all — what changes is that the four which can dress
  // now do. Restricting to the four instead would be 10 to 16 turns each across their 41 to 63 sections, far past the 6.3 repeats-per-family the
  // least varied journey in the game already ships (§11), so a tomb would be the same four boards over and
  // over. The share that comes out dressed is therefore the pool's natural rate rather than a chosen one;
  // weighting a preferred role is designed and unbuilt (§11).
  //
  // **The Chamber of Ma'at is a judgement too**, and its brief names the scales and the feather of truth
  // outright — the largest single journey any of this reaches, at 207 rooms.
  journey("wizard_1").pyramid("1-4", { encounter: ["funerary", "puzzle"] }),
  journey("wizard_3").pyramid("1-6", { encounter: ["judgement", "funerary", "puzzle"] }),

  journey("wizard_2").pyramid(1, { sideSections: [holdChestC(0), holdChestC(2)] }),
  journey("wizard_2").pyramid(3, { sideSections: [holdChestB(0), holdChestC(0), holdChestC(0), expertEcho()] }),
  journey("wizard_3").pyramid(1, { sideSections: [holdChestC(1), holdChestC(0), holdChestC(0)] }),
  journey("wizard_3").pyramid(3, { sideSections: [holdChestC(0), holdChestB(0), holdChestB(0)] }),
  journey("wizard_4").pyramid(1, { sideSections: [holdChestC(2), holdChestB(0), holdChestB(0)] }),
  journey("wizard_4").pyramid(3, { sideSections: [holdChestC(1)] }),
  journey("wizard_4").pyramid(4, { sideSections: [holdChestC(0), holdChestC(0), expertEcho()] }),

  tomb("wizard_treasure_tomb", {
    encounter: "tomb-puzzle",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    // A crocodile capstone guards EVERY floor's treasure (see junior.ts for why `+ 1`).
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
  tomb("wizard_treasure_tomb_b", {
    encounter: "tomb-puzzle",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    // A crocodile capstone guards EVERY floor's treasure (see junior.ts for why `+ 1`).
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),
  tomb("wizard_treasure_tomb_c", {
    encounter: "tomb-puzzle",
    difficulty: "wizard",
    levelCount: 4,
    sealed: true, // linear tomb — no shortcut around a tableau room
    // A crocodile capstone guards EVERY floor's treasure (see junior.ts for why `+ 1`).
    floors: [
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
        // Fez shop — a 6-slot stock node, filled by the mods. Empty until resolveShopStock lands.
        sideSections: [{ pathPuzzles: 0, encounter: "shop" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
      {
        mainEndReward: "tombTreasure",
        pathPuzzles: TABLEAUS_PER_FLOOR.wizard + 1,
        nodes: [{ where: "last", encounter: "capstone" }],
      },
    ],
  }),

  // Secondary tomb unlocks: location keys gate wizard_b and wizard_c map pieces
  tier("wizard").pyramid("last", {
    sideSections: [
      {
        gate: { type: "tomb-key", tombId: "wizard_treasure_tomb", index: 1 },
        endReward: { type: "mapPiece", tombId: "wizard_treasure_tomb_b" },
      },
    ],
  }),
  tier("wizard").pyramid("last-1", { sideSections: [wizardCMapPieceGate] }),
  // One of the 4 wizard journeys' wizard_treasure_tomb_c map-piece copies is relocated
  // into master_treasure_tomb_b's Fez shop instead — freeing this specific
  // journey's slot keeps the world total at exactly 36 map pieces. journey-pyramid
  // specificity (8) overrides the tier-pyramid rule above (6) for wizard_4 only;
  // wizard_1/2/3 keep the normal gated branch untouched.
  journey("wizard_4").pyramid("last-1", { sideSections: [] }),
]
