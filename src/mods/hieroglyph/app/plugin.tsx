/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { mulberry32 } from "@/game/random"
import {
  buildTombCalculationSettings,
  generateRewardCalculation,
  type RewardCalculation,
} from "@/mods/hieroglyph/game/generateRewardCalculation"
import type { Operation } from "@/game/formulas/formulas"
import { TombPuzzle } from "@/app/TombLevel/TombPuzzle"
import { getTableauLevel, type TableauLevel } from "@/data/tableaus"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { useTableauTranslations } from "@/app/translations/useTableauTranslations"
import { tableauEncounterArgsSchema } from "@/mods/hieroglyph/game/keyRequirements"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { TABLEAU_META } from "@/mods/hieroglyph/game/meta"
import { isModEnabled } from "@/mods/registeredMods"

const TOMB_SYMBOLS: Record<string, string[]> = {
  starter: ["p10", "p8", "art1", "a6", "a8", "art5", "d1"],
  junior: ["p1", "p11", "p9", "a2", "a13", "art2", "art7", "art12", "d2", "d15"],
  expert: ["p2", "p3", "p7", "p12", "a5", "a7", "a11", "art3", "art4", "art6", "art14", "d3", "d4", "d9"],
  master: ["p4", "p5", "p14", "p15", "a1", "a3", "a14", "a15", "art9", "art10", "art11", "art15", "d5", "d6", "d10"],
  wizard: ["p6", "p13", "a4", "a9", "a10", "a12", "d7", "d8", "d11", "d12", "d13", "d14"],
}

type TableauConfig = {
  symbolCount: number
  numberRange: [number, number]
  operators: Operation[]
  maxMultiplyOperandResult?: number
}

const TABLEAU_CONFIG: Record<string, TableauConfig> = {
  starter: { symbolCount: 2, numberRange: [1, 5], operators: ["+"] },
  junior: { symbolCount: 3, numberRange: [1, 10], operators: ["+", "-"] },
  expert: { symbolCount: 4, numberRange: [1, 10], operators: ["+", "-", "*"], maxMultiplyOperandResult: 5 },
  master: { symbolCount: 4, numberRange: [1, 10], operators: ["+", "-", "*"], maxMultiplyOperandResult: 8 },
  wizard: { symbolCount: 5, numberRange: [1, 20], operators: ["+", "-", "*"], maxMultiplyOperandResult: 10 },
}

const TableauComponent: FamilyPlugin<RewardCalculation>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => {
  const difficulty = ctx.difficulty ?? "starter"
  // Resolve this floor's authored TableauLevel so the puzzle shows its title + micro-story
  // (translated), matching what the solver placed fragments for. Same (journeyId, runNr, levelNr)
  // key the generate + world-gen resolvers use; the tableau id/symbols still come from the
  // generated calculation. Without this the puzzle rendered an empty name/description (no story).
  const translatedTableaus = useTableauTranslations()
  const parsed = tableauEncounterArgsSchema.safeParse(ctx.encounterArgs)
  const levelNr = (ctx.pathIndex ?? 0) + 1
  const authored = parsed.success
    ? translatedTableaus.find(
        t => t.tombJourneyId === ctx.journeyId && t.runNumber === parsed.data.runNr && t.levelNr === levelNr
      )
    : undefined
  const tableau: TableauLevel = {
    id: authored?.id ?? "plugin",
    levelNr,
    symbolCount: Object.keys(puzzle.symbolCounts).length,
    inventoryIds: Object.values(puzzle.symbolMapping),
    tombJourneyId: ctx.journeyId,
    runNumber: parsed.success ? parsed.data.runNr : 1,
    name: authored?.name ?? "",
    description: authored?.description ?? "",
  }
  return (
    <PuzzleFamilyShell onSolved={onSolved} onCancel={onCancel}>
      {handleSolved => (
        <TombPuzzle tableau={tableau} calculation={puzzle} difficulty={difficulty} onComplete={handleSolved} />
      )}
    </PuzzleFamilyShell>
  )
}

// Gated on the mod: registerModApps imports this file unconditionally (static side-effect),
// so the enablement check lives here — mod off → no tableau plugin in the registry → the room
// resolves via the family-absence pass-through instead of rendering the puzzle.
if (isModEnabled("hieroglyph"))
  registerFamily({
    meta: TABLEAU_META,
    generate: (seed, ctx): RewardCalculation => {
      const random = mulberry32(seed)
      // Resolve the AUTHORED tableau for this tomb floor so the puzzle the player solves uses
      // exactly the symbols world-gen guaranteed reachable fragments for (keyRequirements.ts, via
      // the shared getTableauLevel) and that the inventory preview shows (TableauInventory). The
      // floor's `{ runNr }` rides ctx.encounterArgs (same zod schema the world-gen resolver uses);
      // levelNr is its structural pathIndex+1. This is the fix for the play-vs-authored disconnect:
      // the puzzle used to draw random symbols from the whole tier pool, so it could demand a
      // hieroglyph whose fragments were never placed reachable for that floor (unsolvable at 0/N).
      const parsed = tableauEncounterArgsSchema.safeParse(ctx.encounterArgs)
      const journey = journeys.find(
        (j): j is TreasureTombJourney => j.id === ctx.journeyId && j.type === "treasure_tomb"
      )
      if (parsed.success && journey) {
        const tableau = getTableauLevel(ctx.journeyId, parsed.data.runNr, (ctx.pathIndex ?? 0) + 1)
        if (tableau)
          return generateRewardCalculation(buildTombCalculationSettings(journey.levelSettings, tableau), random)
      }
      // Fallback for generation without a resolvable tomb floor (dummy/non-tomb): random draw from
      // the tier pool. A real tomb floor always carries encounterArgs, so it never takes this path.
      const difficulty = ctx.difficulty ?? "starter"
      const config = TABLEAU_CONFIG[difficulty] ?? TABLEAU_CONFIG.starter
      const symbols = TOMB_SYMBOLS[difficulty] ?? TOMB_SYMBOLS.starter
      return generateRewardCalculation(
        {
          amountSymbols: config.symbolCount,
          hieroglyphIds: symbols,
          numberRange: config.numberRange,
          operations: config.operators,
          maxMultiplyOperandResult: config.maxMultiplyOperandResult,
        },
        random
      )
    },
    Component: TableauComponent,
  })
