import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { hashString } from "@/support/hashString"
import { generateTableaus } from "@/data/tableaus"
import {
  generateRewardCalculation,
  type RewardCalculation,
} from "@/game/generateRewardCalculation"
import { useMemo } from "react"
import { TombTableau } from "./TombTableau"
import type { Formula } from "@/game/formulas"

type TombLevelArgs = {
  runNr: number
  levelNr: number
  journey: TreasureTombJourney
}

const tableaus = generateTableaus()

const createFormulaFilledPositions = (
  filledPositions: Record<string, number>,
  positionPrefix: string,
  formula: Formula
) => {
  if (typeof formula.left === "number") {
    filledPositions[`${positionPrefix}-left`] = 1
  } else {
    createFormulaFilledPositions(
      filledPositions,
      `${positionPrefix}-left`,
      formula.left
    )
  }

  if (typeof formula.right === "number") {
    filledPositions[`${positionPrefix}-right`] = 1
  } else {
    createFormulaFilledPositions(
      filledPositions,
      `${positionPrefix}-right`,
      formula.right
    )
  }
}

const createFilledPositions = (
  calculation: RewardCalculation
): Record<string, number> => {
  const filledPositions: Record<string, number> = {}
  calculation.hintFormulas.forEach((formula, index) => {
    createFormulaFilledPositions(filledPositions, `formula-${index}`, formula)
  })
  createFormulaFilledPositions(
    filledPositions,
    `formula-${calculation.hintFormulas.length}`,
    calculation.mainFormula
  )

  return filledPositions
}

const tombJourneys = journeys.filter((j) => j.type === "treasure_tomb")
const meta = {
  title: "Levels/TombLevel",
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#f3f4f6" },
        { name: "dark", value: "#1f2937" },
      ],
    },
  },
  args: {
    runNr: 1,
    levelNr: 1,
    journey: tombJourneys[0],
  },
  argTypes: {
    runNr: { control: { type: "number", min: 1 } },
    levelNr: { control: { type: "number", min: 1 } },
    journey: {
      control: {
        type: "select",
        labels: tombJourneys.reduce(
          (acc, j) => {
            acc[j.id] = `${j.difficulty} - ${j.name}`
            return acc
          },
          {} as Record<string, string>
        ),
      },
      mapping: tombJourneys.reduce(
        (acc, j) => {
          acc[j.id] = j
          return acc
        },
        {} as Record<string, TreasureTombJourney>
      ),
      options: tombJourneys.map((j) => j.id),
    },
  },
  tags: ["autodocs"],
  render: ({ runNr, levelNr, journey }) => {
    const tableau = tableaus.filter(
      (tab) => tab.tombJourneyId === journey.id && tab.runNumber === runNr
    )[levelNr - 1]

    if (!tableau) {
      return <p>No tableau</p>
    }
    const journeySeed = generateNewSeed(hashString(journey.id), runNr)
    const seed = generateNewSeed(journeySeed, levelNr)

    const calculation = useMemo(() => {
      const random = mulberry32(seed)
      if (!tableau) return null
      const settings = {
        amountSymbols: tableau.symbolCount,
        hieroglyphIds: tableau.inventoryIds,
        numberRange: journey.levelSettings.numberRange,
        operations: journey.levelSettings.operators,
      }
      const calc = generateRewardCalculation(settings, random)
      return calc
    }, [seed, tableau, journey.levelSettings])
    if (!calculation) return <p>No calculation</p>

    const filledPositions: Record<string, number> =
      createFilledPositions(calculation)

    return (
      <TombTableau
        difficulty={journey.difficulty}
        tableau={tableau}
        calculation={calculation}
        filledState={{
          symbolCounts: calculation.symbolCounts,
          filledPositions,
        }}
      />
    )
  },
} satisfies Meta<TombLevelArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
