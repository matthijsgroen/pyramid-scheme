import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { hashString } from "@/support/hashString"
import { generateRewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"
import { useMemo } from "react"
import { TombTableau } from "@/ui/organisms/TombTableau"
import { createPositionOverview } from "@/mods/hieroglyph/game/filledPositions"
import { useTableauTranslations } from "@/app/translations/useTableauTranslations"
import { resolveHieroglyphSymbol } from "@/data/resolveHieroglyphSymbol"

type TombLevelArgs = {
  tableauNr: number
  journey: TreasureTombJourney
  filled: number
}

const fillPositions = (keys: string[], value: number) => {
  const result: Record<string, number> = {}
  keys.forEach((key, index) => {
    result[key] = value > index / keys.length ? 1 : 0
  })
  return result
}

const tombJourneys = journeys.filter(j => j.type === "treasure_tomb")
// It lives on the MOD side though the component is core's, because it names hieroglyph: core may not
// import a mod (ARCHITECTURE.md, invariant 1 — a mod is removable), and a story is part of
// `yarn build-storybook`. Same reasoning as `SumpleteEncounter.stories.tsx`, moved in #271. The
// component itself stays in `src/ui/` and names nothing: only the fixture is hieroglyph's.
const meta = {
  title: "Hieroglyph/TombTableau",
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
    tableauNr: 1,
    journey: tombJourneys[0],
    filled: 1,
  },
  argTypes: {
    tableauNr: { control: { type: "number", min: 1 } },
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
      options: tombJourneys.map(j => j.id),
    },
  },
  render: ({ tableauNr, journey, filled }) => {
    const tableaus = useTableauTranslations()
    const tableau = tableaus.filter(tab => tab.tombJourneyId === journey.id)[tableauNr - 1]
    const runNr = tableau?.runNumber
    const levelNr = tableau?.levelNr

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
    if (!tableau) {
      return <p>No tableau</p>
    }
    if (!calculation) return <p>No calculation</p>

    const filledPositions: Record<string, number> = fillPositions(
      Object.keys(createPositionOverview(calculation)),
      filled
    )

    return (
      <div>
        <h1 className="font-pyramid">
          Run {runNr} - Level {levelNr}
        </h1>
        <TombTableau
          difficulty={journey.difficulty}
          tableau={tableau}
          calculation={calculation}
          filledState={{
            symbolCounts: calculation.symbolCounts,
            filledPositions,
          }}
          resolveTile={symbolId => resolveHieroglyphSymbol(symbolId, journey.difficulty)}
          hintFormulas={calculation.hintFormulas.map((f, i) => ({ formula: f, index: i }))}
        />
      </div>
    )
  },
} satisfies Meta<TombLevelArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
