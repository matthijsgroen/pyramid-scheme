import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys } from "@/data/journeys"
import { hashString } from "@/support/hashString"
import { generateRewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"
import { useTableauTranslations } from "@/app/translations/useTableauTranslations"
import { resolveHieroglyphSymbol } from "@/data/resolveHieroglyphSymbol"
import { TombPuzzleView } from "./TombPuzzleView"

const meta = {
  title: "UI/TombPuzzleView",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
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
        }))}
        onInventoryItemClick={() => {}}
      />
    )
  },
}
