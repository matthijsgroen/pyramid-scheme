import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys, type TreasureTombJourney } from "@/data/journeys"
import { hashString } from "@/support/hashString"

type TombLevelArgs = {
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
    journey: tombJourneys[0],
  },
  argTypes: {
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
  render: ({ journey }) => {
    const treasureIds: string[] = []

    const treasureForRun = (tombRun: number): string => {
      const journeySeed = generateNewSeed(hashString(journey.id), tombRun)
      const seed = journeySeed + 12345
      const random = mulberry32(seed)
      const eligibleTreasures = journey.treasures.filter(t => !treasureIds.includes(t.id))
      const lootId = eligibleTreasures[Math.floor(random() * eligibleTreasures.length)]?.id

      return lootId
    }

    return (
      <div>
        <h1 className="font-pyramid">Run {runNr}</h1>
      </div>
    )
  },
} satisfies Meta<TombLevelArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
