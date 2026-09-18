import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys } from "@/data/journeys"
import { hashString } from "@/support/hashString"
import { generateRewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"
import { useTableauTranslations } from "@/app/translations/useTableauTranslations"
import { resolveHieroglyphSymbol } from "@/data/resolveHieroglyphSymbol"
import { TombPuzzleView } from "@/ui/organisms/TombPuzzleView"

// It lives on the MOD side though the component is core's, because it names hieroglyph: core may not
// import a mod (ARCHITECTURE.md, invariant 1 — a mod is removable), and a story is part of
// `yarn build-storybook`. Same reasoning as `SumpleteEncounter.stories.tsx`, moved in #271. The
// component itself stays in `src/ui/` and names nothing: only the fixture is hieroglyph's.
const meta = {
  title: "Hieroglyph/TombPuzzleView",
  parameters: { layout: "fullscreen" },
} satisfies Meta<Record<string, never>>

export default meta
type Story = StoryObj<typeof meta>

const journey = journeys.find(j => j.type === "treasure_tomb")!
const seed = generateNewSeed(hashString(journey.id), 1)

export const InProgress: Story = {
  render: () => {
    const tableaus = useTableauTranslations()
    const tableau = tableaus.find(t => t.tombJourneyId === journey.id)!
    const calculation = generateRewardCalculation(
      {
        amountSymbols: tableau.symbolCount,
        hieroglyphIds: tableau.inventoryIds,
        numberRange: journey.levelSettings.numberRange,
        operations: journey.levelSettings.operators,
      },
      mulberry32(seed)
    )
    const resolveTile = (symbolId: string) => resolveHieroglyphSymbol(symbolId, journey.difficulty)

    return (
      <TombPuzzleView
        difficulty={journey.difficulty}
        tableau={tableau}
        calculation={calculation}
        filledState={{ symbolCounts: {}, filledPositions: {} }}
        resolveTile={resolveTile}
        hintFormulas={calculation.hintFormulas.map((f, i) => ({ formula: f, index: i }))}
        annotations={{}}
        isPuzzleCompleted={false}
        lockState="empty"
        lockValue=""
        onLockChange={() => {}}
        onLockSubmit={() => {}}
        inventoryTitle="Available symbols"
        inventoryItems={Object.keys(calculation.symbolCounts).map(symbolId => ({
          symbolId,
          ...resolveTile(symbolId),
          owned: true,
          found: 2,
          required: 2,
          neededLabel: "2/2 needed",
        }))}
        onInventoryItemClick={() => {}}
      />
    )
  },
}
