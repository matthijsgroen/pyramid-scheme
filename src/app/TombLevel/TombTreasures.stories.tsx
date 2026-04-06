import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { hashString } from "@/support/hashString"
import { allTreasures } from "@/data/treasures"

type TombLevelArgs = {
  runNr: number
  journey: TreasureTombJourney
}

const tombJourneys = journeys.filter((j): j is TreasureTombJourney => j.type === "treasure_tomb")

const meta = {
  title: "Levels/TombTreasures",
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
    journey: tombJourneys[0]!,
  },
  argTypes: {
    runNr: { control: { type: "number", min: 1 } },
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
  tags: ["autodocs"],
  render: ({ runNr, journey }) => {
    const getEligibleTreasures = (excludedTreasureIds: string[]) => {
      const eligible = journey.treasures.filter(t => !excludedTreasureIds.includes(t.id))
      return eligible.length > 0 ? eligible : journey.treasures
    }

    const getCollectedTreasureIds = (upToRun: number): string[] => {
      const collectedIds: string[] = []

      for (let previousRun = 1; previousRun < upToRun; previousRun++) {
        const journeySeed = generateNewSeed(hashString(journey.id), previousRun)
        const seed = journeySeed + 12345
        const random = mulberry32(seed)
        const eligible = getEligibleTreasures(collectedIds)
        const lootId = eligible[Math.floor(random() * eligible.length)]?.id

        if (lootId && !collectedIds.includes(lootId)) {
          collectedIds.push(lootId)
        }
      }

      return collectedIds
    }

    const treasureForRun = (tombRun: number): string | undefined => {
      const journeySeed = generateNewSeed(hashString(journey.id), tombRun)
      const seed = journeySeed + 12345
      const random = mulberry32(seed)
      const collectedTreasureIds = getCollectedTreasureIds(tombRun)
      const eligible = getEligibleTreasures(collectedTreasureIds)

      if (eligible.length === 0) {
        return undefined
      }

      return eligible[Math.floor(random() * eligible.length)].id
    }

    const treasureId = treasureForRun(runNr)
    const treasure = allTreasures.find(t => t.id === treasureId)

    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <h1 className="font-pyramid text-2xl">Run {runNr}</h1>
        {treasure ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-amber-50 p-6 shadow-md">
            <span className="text-6xl">{treasure.symbol}</span>
            <h2 className="font-pyramid text-xl font-bold text-amber-900">{treasure.name}</h2>
            <p className="max-w-xs text-center text-sm text-gray-600">{treasure.description}</p>
            <p className="text-xs text-gray-400">ID: {treasure.id}</p>
          </div>
        ) : (
          <p className="text-gray-500">No treasure found for run {runNr}</p>
        )}
      </div>
    )
  },
} satisfies Meta<TombLevelArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
