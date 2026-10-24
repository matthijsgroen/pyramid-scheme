import type { Meta, StoryObj } from "@storybook/react-vite"
import { CaveBackdrop, CaveMouth, cavernFloor } from "./CaveBackdrop"
import { DesertBackdrop } from "./DesertBackdrop"
import { PyramidDisplay } from "@/app/PyramidLevel/PyramidDisplay"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { journeys } from "@/data/journeys"
import { generateJourneyLevel } from "@/game/generateJourneyLevel"
import { hashString } from "@/support/hashString"

const meta = {
  component: CaveMouth,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CaveMouth>

export default meta
type Story = StoryObj<typeof meta>

/** The tomb's way in: the hill stands on the desert where a pyramid's board would. */
export const Mouth: Story = {
  render: () => (
    <div className="h-screen">
      <DesertBackdrop levelNr={1} start="afternoon" timeStepSize={1}>
        <div className="flex flex-1 items-center justify-center">
          <CaveMouth />
        </div>
      </DesertBackdrop>
    </div>
  ),
}

const difficulties = ["starter", "junior", "expert", "master", "wizard"] as const

// The biggest board a tier draws: the last level of its longest pyramid journey.
const biggestBoard = (difficulty: (typeof difficulties)[number]) => {
  const journey = journeys
    .filter(j => j.exterior === "pyramid" && j.difficulty === difficulty)
    .sort((a, b) => b.levelCount - a.levelCount)[0]
  return generateJourneyLevel(
    journey,
    journey.levelCount,
    mulberry32(generateNewSeed(hashString(journey.id), journey.levelCount))
  )
}

/** The cavern with a board standing in it, laid out as the expedition screen lays a level. Pick a tier to
 * check its biggest board still stands on the sunlight. */
export const Cavern: StoryObj<{ difficulty: (typeof difficulties)[number] }> = {
  args: { difficulty: "junior" },
  argTypes: { difficulty: { control: "select", options: difficulties } },
  render: ({ difficulty }) => {
    const level = biggestBoard(difficulty)
    return (
      <div className="h-screen">
        <CaveBackdrop>
          <div className="flex size-full flex-col">
            <div className="h-12 flex-shrink-0" />
            <div className="relative flex-1">
              <div className={`absolute inset-0 flex justify-center ${cavernFloor}`}>
                {level && (
                  <PyramidDisplay
                    levelNr={2}
                    pyramid={level.pyramid}
                    decorationOffset={0}
                    dayTime="afternoon"
                    values={{}}
                  />
                )}
              </div>
            </div>
          </div>
        </CaveBackdrop>
      </div>
    )
  },
}
