import { tier, journey, tomb, wardPath, wardChest, sidePath, hiddenPath } from "../dsl"
import type { Rule } from "../dsl"

// Ward-chest teasers: every starter pyramid gets one ward-gated loot chest keyed to a LATER
// tier's unlock treasure — visible early, openable only once you've progressed that far. Keeps
// starter small while giving a reason to come back. `tomb`/`index` name that tier-unlock key; the
// teaser puzzle's difficulty is left unset so it auto-derives to match that key's own tier exactly
// (wardChest/wardPath/wardWing's default — see dsl.ts's wardKeyTier).
const TEASE = {
  junior: { tomb: "starter_treasure_tomb", index: 0 }, // starter_a_1
  expert: { tomb: "junior_treasure_tomb", index: 0 }, // junior_a_1
  master: { tomb: "expert_treasure_tomb", index: 0 }, // expert_a_1
  wizard: { tomb: "master_treasure_tomb", index: 0 }, // master_a_1
} as const
type TeaseName = keyof typeof TEASE
const teaseChest = (t: TeaseName) => wardChest({ ...TEASE[t], puzzles: t === "master" || t === "wizard" ? 2 : 1 })
const STARTER_CYCLE: TeaseName[] = ["junior", "expert", "master", "wizard"]

// Own-tomb HOLDBACK chests: the counterpart to the TEASE chests above. Those point FORWARD (a
// later tier's key in a starter pyramid); these point INWARD — starter's own tomb keys, so a
// starter hieroglyph needed on the tomb's 2nd+ tableau run can't complete purely from the open
// pyramids, only once you've actually descended a floor or two. Difficulty is left unset so it
// auto-derives to starter (dsl.ts's wardKeyTier). No endReward, same as teaseChest above — an open
// tomb-key gate with no endReward is still a collected slot (slots.ts), and leaving it untagged
// matters here: an explicit `endReward: "hieroglyph"` preference would make every hieroglyph in
// the tier (not just the ones that actually prefer this specific key) compete for the slot,
// starving the symbols the gate was meant for.
const holdChest = (index: number) => wardChest({ tomb: "starter_treasure_tomb", index, puzzles: 1 })
// Cycled per pyramid ordinal so no pyramid stacks two chests behind the identical key.
const HOLD_CYCLE = [1, 2, 0, 1]

export const starterRules: Rule[] = [
  // a merchant's cellar: crates, spilled stores, a cellar shaft, a prop holding the roof, a water jar.
  tier("starter", { difficulty: "starter", decorations: ["chestProp", "rubble", "pit", "pillar", "fountain"] }),

  tier("starter")
    .set({})
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "fragment" })
    // One VISIBLE mosaic per pyramid, on top of the hidden one below: the corridor detector that
    // reveals hidden paths isn't earned until the master tier, so a hidden-only mosaic would leave
    // the whole starter run with no reachable mosaic. This surplus visible end slot survives the
    // (fixed-demand) gating pass and the phase-3 capped pass fills it. Reachable = first contact.
    .sidePaths("low")
    .settings({ pathPuzzles: 0, end: "mosaic" })
    .hiddenPaths("low")
    .settings({ pathPuzzles: 1, end: "mosaic" }),

  // First pyramid of each starter journey is that journey's map-piece entry-point.
  tier("starter").pyramid("first", { mainEndReward: "mapPiece" }),

  // starter_1 — the whole game's onboarding. Pyramid 1: the map piece + a gentle ward path into
  // the starter tomb (see the deadlock fix below). Pyramid 2: one main puzzle, its chests from
  // the tier defaults. Both also carry a ward-chest teaser to a later tier.
  //
  // The tier-wide "first pyramid → mapPiece" rule lands on this pyramid's LAST floor by default;
  // on floor 1 that would gate the map piece behind the very ward path that needs
  // starter_treasure_tomb's OWN tier-unlock treasure to open — a deadlock (the map piece feeds the
  // tomb's own piecesRequired threshold, which grants the key that floor needs). So the real map
  // piece sits on floor 0 (always reachable), leaving floor 1's ward-gated reward as safe bonus
  // loot (mosaicPiece never gates anything).
  journey("starter_1")
    .pyramid(1, { pathPuzzles: 0 })
    .floor(0, {
      mainEndReward: "mapPiece",
      sideSections: [
        // Shares the starter→junior tier-unlock key — narratively you need it anyway.
        wardPath({ puzzles: 1, tomb: "starter_treasure_tomb", index: 0 }),
        sidePath(),
        hiddenPath({ puzzles: 4, encounter: "trap", endReward: "mosaicPiece" }),
        teaseChest("expert"),
        // A reachable mosaic in the onboarding pyramid (floor 0 is always reachable) — surplus end
        // slot beyond the gating pass's fixed demand, so the capped mosaic pass fills it. Without it
        // the first mosaic sits on the hidden path above, invisible until the master-tier detector.
        sidePath({ endReward: "mosaicPiece" }),
      ],
    })
    .floor(1, {
      mainEndReward: "mosaicPiece",
      pathPuzzles: 2,
      sideSections: [sidePath({ puzzles: 1 })],
    }),

  journey("starter_1")
    .pyramid(2, { pathPuzzles: 1 })
    .floor(0, {
      sideSections: [teaseChest("master"), holdChest(0)],
    }),

  // **The papyrus route is a market, so it draws only from trade.** The second journey in the game that
  // can be restricted outright rather than merely preferred, and it became one the day `trade` reached
  // four families (`rolePools.spec.ts`'s floor): balance scale weighs the goods, constellation lays the
  // haul road, canisters measures the wine and the oil, procession walks the day at the quay. Thirteen
  // sections over that pool is 3.3 turns each, well inside the 4.8 the least varied journey already ships
  // (docs/game-design/journeys.md §10).
  //
  // **Its starter sections draw from three of the four**, because canisters debuts at junior (its own
  // meta says why: three starter rooms cannot teach an arithmetic). That is 4.3 turns each on those
  // sections and still under the bar, and the fourth family joins on the ward paths, which step into
  // expert and master.
  //
  // Restricting rather than preferring, for the reason the ibis migration restricts: `["trade", "puzzle"]`
  // would re-admit every family and leave most rooms undressed, and a market should not have a room in it
  // that is not selling something.
  journey("starter_2").pyramid("1-2", { encounter: "trade" }),

  // starter_2 — two curated follow-up pyramids. One main-path puzzle each; existing ward-path
  // steps into expert then master, plus the new ward-chest teaser.
  journey("starter_2")
    .pyramid(1)
    .floor(0, {
      mainEndReward: "mapPiece",
      sideSections: [
        wardPath({ puzzles: 1, tomb: "junior_treasure_tomb", index: 1 }),
        sidePath(),
        teaseChest("wizard"),
        holdChest(0),
        // Reachable mosaic (see starter_1 floor 0) — surplus slot the capped pass fills.
        sidePath({ endReward: "mosaicPiece" }),
      ],
    })
    .floor(1, {
      mainEndReward: "mosaicPiece",
      pathPuzzles: 2,
      difficulty: "junior",
      sideSections: [sidePath({ puzzles: 1 }), hiddenPath({ puzzles: 4, encounter: "trap", endReward: "mosaicPiece" })],
    }),

  journey("starter_2")
    .pyramid(2)
    .floor(0, {
      sideSections: [
        wardPath({ puzzles: 1, tomb: "expert_treasure_tomb", index: 2 }),
        sidePath(),
        teaseChest("junior"),
      ],
    })
    .floor(1, {
      pathPuzzles: 3,
      difficulty: "expert",
      sideSections: [sidePath({ puzzles: 1 }), hiddenPath({ puzzles: 2, encounter: "trap", endReward: "mosaicPiece" })],
    }),

  // starter_3 / starter_4 — otherwise ride the tier defaults (map piece on pyramid 1, low
  // fragment + hidden mosaic side paths). Each pyramid gains one ward-chest teaser, difficulty
  // cycling junior→wizard so the tier as a whole points at every later difficulty.
  // starter_3 / starter_4 keep the tier defaults (map piece on pyramid 1, low fragment + hidden
  // mosaic side paths) and gain one ward-chest teaser each, difficulty cycling junior→wizard.
  // Authored at the .pyramid() level, NOT .floor() — a floor override drops the tier's
  // sidePaths/hiddenPaths (buildSite's authored-floors branch ignores them).
  ...["starter_3", "starter_4"].flatMap(jid =>
    [1, 2, 3, 4]
      .filter(n => !(jid === "starter_4" && n === 4))
      .map(n =>
        journey(jid).pyramid(n, {
          sideSections: [teaseChest(STARTER_CYCLE[(n - 1) % 4]), holdChest(HOLD_CYCLE[(n - 1) % 4])],
        })
      )
  ),

  // Last pyramid of the last starter journey: its ward-chest teaser + a few extra loot side
  // corridors (medium fragment side paths, on top of the tier default).
  journey("starter_4").pyramid(4, {
    sideSections: [teaseChest("wizard"), holdChest(1)],
    sidePaths: [{ density: "medium", pathPuzzles: 1, end: "fragment" }],
  }),

  tomb("starter_treasure_tomb", {
    encounter: "tomb-puzzle",
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
