import { DesertBackdrop } from "@/ui/DesertBackdrop"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { PyramidDisplay } from "./PyramidDisplay"
import { generateLevel } from "@/game/generateLevel"
import { mulberry32 } from "@/game/random"

type PyramidLevelArgs = {
  levelNr: number
  floorCount: number
  openBlockPercentage: number
  blockedBlockPercentage: number
  minNumber: number
  maxNumber: number
}

const meta = {
  title: "Levels/PyramidLevel",
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
  },
  argTypes: {
    levelNr: { control: { type: "number" } },
    floorCount: { control: { type: "number" } },
    openBlockPercentage: {
      control: { type: "range", min: 0, max: 1, step: 0.1 },
    },
    blockedBlockPercentage: {
      control: { type: "range", min: 0, max: 1, step: 0.1 },
    },
    minNumber: { control: { type: "number", min: 0, max: 30 } },
    maxNumber: { control: { type: "number", min: 0, max: 30 } },
  },
  tags: ["autodocs"],
  render: ({
    levelNr,
    floorCount,
    openBlockPercentage,
    blockedBlockPercentage,
    minNumber,
    maxNumber,
  }) => {
    const random = mulberry32(1234567)
    const maxBlocks = (floorCount * (floorCount + 1)) / 2
    const maxBlocksToOpen =
      maxBlocks - floorCount - (floorCount > 8 ? floorCount - 8 : 0)
    const openBlockCount = maxBlocksToOpen * openBlockPercentage

    const potentialToBlock = maxBlocksToOpen - openBlockCount
    const blockedBlockCount = Math.min(
      Math.max(
        Math.floor(potentialToBlock * (0.8 * blockedBlockPercentage)),
        0
      ),
      8
    )

    const content = generateLevel(
      levelNr,
      {
        floorCount,
        openBlockCount,
        blockedBlockCount,
        lowestFloorNumberRange: [minNumber, maxNumber],
      },
      random
    )
    return (
      <DesertBackdrop levelNr={1} start="morning">
        <div className="relative flex h-full w-full flex-col">
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

export const Starter: Story = {
  args: {
    floorCount: 3,
    openBlockPercentage: 0.5,
    blockedBlockPercentage: 0,
    minNumber: 1,
    maxNumber: 5,
  },
}

export const Junior: Story = {
  args: {
    floorCount: 5,
    openBlockPercentage: 0.5,
    blockedBlockPercentage: 0,
    minNumber: 1,
    maxNumber: 10,
  },
}
