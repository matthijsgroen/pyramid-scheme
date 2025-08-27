import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { hashString } from "@/support/hashString"
import { generateTableaus } from "@/data/tableaus"
import { generateRewardCalculation } from "@/game/generateRewardCalculation"
import { useMemo } from "react"
import { TombTableau } from "./TombTableau"
import { createFilledPositions } from "../Formulas/filledPositions"

type TombLevelArgs = {
  runNr: number
  levelNr: number
  journey: TreasureTombJourney
  filled: number
}

const tableaus = generateTableaus()

const fillPositions = (
  filledPositions: Record<string, number>,
  value: number
) => {
  const keys = Object.keys(filledPositions)
  const copy = { ...filledPositions }
  keys.forEach((key, index) => {
    copy[key] = value > index / keys.length ? 1 : 0
  })
  return copy
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
    filled: 1,
  },
  argTypes: {
    runNr: { control: { type: "number", min: 1 } },
    levelNr: { control: { type: "number", min: 1 } },
    filled: {
      control: { type: "range", min: 0, max: 1, step: 0.1 },
    },
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
  render: ({ runNr, levelNr, journey, filled }) => {
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

    const filledPositions: Record<string, number> = fillPositions(
      createFilledPositions(calculation),
      filled
    )

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
