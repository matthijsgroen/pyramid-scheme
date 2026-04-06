import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { hashString } from "@/support/hashString"
import { allTreasures } from "@/data/treasures"

type TombLevelArgs = {
  runNr: number
  journey: TreasureTombJourney
}

const tombJourneys = journeys.filter(j => j.type === "treasure_tomb")
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
    journey: tombJourneys[0],
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
    const collectedTreasureIds: string[] = []

    const treasureForRun = (tombRun: number): string => {
      const journeySeed = generateNewSeed(hashString(journey.id), tombRun)
      const seed = journeySeed + 12345
      const random = mulberry32(seed)
      const eligibleTreasures = journey.treasures.filter(t => !collectedTreasureIds.includes(t.id))
      const lootId = eligibleTreasures[Math.floor(random() * eligibleTreasures.length)]?.id

      return lootId
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
