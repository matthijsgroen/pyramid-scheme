import { DesertBackdrop } from "@/ui/DesertBackdrop"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { PyramidDisplay } from "./PyramidDisplay"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys, type PyramidJourney } from "@/data/journeys"
import { generateJourneyLevel } from "@/game/generateJourneyLevel"
import { hashString } from "@/support/hashString"

type PyramidLevelArgs = {
  levelNr: number
  journey: PyramidJourney
}

const pyramidJourneys = journeys.filter((j) => j.type === "pyramid")
const meta = {
  title: "Levels/GameLevel",
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#f3f4f6" },
        { name: "dark", value: "#1f2937" },
      ],
    },
  },
  args: {
    levelNr: 1,
    journey: pyramidJourneys[0],
  },
  argTypes: {
    levelNr: { control: { type: "number", min: 1 } },
    journey: {
      control: {
        type: "select",
        labels: pyramidJourneys.reduce(
          (acc, j) => {
            acc[j.id] = `${j.difficulty} - ${j.name}`
            return acc
          },
          {} as Record<string, string>
        ),
      },
      mapping: pyramidJourneys.reduce(
        (acc, j) => {
          acc[j.id] = j
          return acc
        },
        {} as Record<string, PyramidJourney>
      ),
      options: pyramidJourneys.map((j) => j.id),
    },
  },
  tags: ["autodocs"],
  render: ({ levelNr, journey }) => {
    const seed = generateNewSeed(hashString(journey.id), levelNr)
    const random = mulberry32(seed)

    const content = generateJourneyLevel(journey, levelNr, random)
    if (!content) return <div>Error creating level</div>
    return (
      <DesertBackdrop levelNr={1} start="morning">
        <div className="relative flex h-full w-full flex-col">
          <h1 className="pointer-events-none mt-0 inline-block pt-4 text-center font-pyramid text-2xl font-bold">
            Level {levelNr}/{journey.levelCount}
          </h1>
          <div className="flex w-full flex-1 items-center justify-center">
            <PyramidDisplay
              levelNr={levelNr}
              pyramid={content.pyramid}
              decorationOffset={0}
              values={{}}
            />
          </div>
        </div>
      </DesertBackdrop>
    )
  },
} satisfies Meta<PyramidLevelArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
