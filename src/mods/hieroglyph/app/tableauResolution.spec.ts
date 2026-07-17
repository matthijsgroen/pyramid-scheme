import { describe, it, expect } from "vitest"
import "./plugin" // side-effect: registers the "tableau" family
import { getFamilyPlugin, type FamilyContext } from "@/app/families/familyRegistry"
import { getTableauLevel } from "@/data/tableaus"

// Regression guard for the play-vs-authored tableau disconnect: the tableau the player SOLVES
// (this family's generate) must use exactly the symbols world-gen placed fragments for — the
// authored TableauLevel resolved from the floor's `encounterArgs.runNr`. It used to draw random
// symbols from the whole tier pool, so it could demand a hieroglyph never made reachable for that
// floor (stuck at 0/N). See src/mods/hieroglyph/app/plugin.tsx.
const ctxFor = (journeyId: string, runNr: number): FamilyContext => ({
  journeyId,
  edgeId: `edge-${runNr}`,
  sectionHash: "",
  freshArrival: true,
  difficulty: "starter",
  encounterArgs: { runNr },
  pathIndex: 0,
})

const symbolsOf = (journeyId: string, runNr: number): string[] => {
  const plugin = getFamilyPlugin("tableau")!
  const puzzle = plugin.generate(1234, ctxFor(journeyId, runNr)) as { symbolMapping: Record<number, string> }
  return [...new Set(Object.values(puzzle.symbolMapping))].sort()
}

const authored = (runNr: number): string[] =>
  [...getTableauLevel("starter_treasure_tomb", runNr, 1)!.inventoryIds].sort()

describe("tableau symbol resolution", () => {
  it("the played tableau uses the AUTHORED symbols for its floor, not a random tier draw", () => {
    for (const runNr of [1, 2, 3, 4]) {
      expect(symbolsOf("starter_treasure_tomb", runNr)).toEqual(authored(runNr))
    }
  })

  it("different floors resolve to different authored symbol sets (proves it reads runNr)", () => {
    // floor 1 = Merchant+Ankh, floor 4 = Cartouche+Fish — never the same fixed/random pool.
    expect(symbolsOf("starter_treasure_tomb", 1)).not.toEqual(symbolsOf("starter_treasure_tomb", 4))
  })
})
