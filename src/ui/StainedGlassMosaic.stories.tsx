import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { StainedGlassMosaic } from "./StainedGlassMosaic"
import { MOSAIC_PIECES } from "./mosaicPieces.generated"

const meta = {
  title: "UI/StainedGlassMosaic",
  component: StainedGlassMosaic,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof StainedGlassMosaic>

export default meta
type Story = StoryObj<typeof meta>

export const Unrevealed: Story = {
  args: { revealedPieces: new Set() },
  decorators: [
    Story => (
      <div className="w-96 bg-black p-4">
        <Story />
      </div>
    ),
  ],
}

export const FullyRevealed: Story = {
  args: { revealedPieces: new Set(MOSAIC_PIECES.map(p => p.id)) },
  decorators: [
    Story => (
      <div className="w-96 bg-black p-4">
        <Story />
      </div>
    ),
  ],
}

const JOURNEY_ORDER = [
  "starter_1",
  "starter_2",
  "starter_3",
  "starter_4",
  "starter_treasure_tomb",
  "junior_1",
  "junior_2",
  "junior_3",
  "junior_4",
  "junior_treasure_tomb",
  "expert_1",
  "expert_2",
  "expert_3",
  "expert_4",
  "expert_treasure_tomb",
  "master_1",
  "master_2",
  "master_3",
  "master_4",
  "master_treasure_tomb",
  "wizard_1",
  "wizard_2",
  "wizard_3",
  "wizard_4",
  "wizard_treasure_tomb",
]

// Pre-build ordered level steps: each step = one (journeyId, levelIndex) group
const LEVEL_STEPS = (() => {
  const steps: Array<{ journeyId: string; levelIndex: number }> = []
  for (const journeyId of JOURNEY_ORDER) {
    const maxLevel = MOSAIC_PIECES.filter(p => p.journeyId === journeyId).reduce(
      (m, p) => Math.max(m, p.levelIndex),
      -1
    )
    for (let l = 0; l <= maxLevel; l++) steps.push({ journeyId, levelIndex: l })
  }
  return steps
})()

// Map piece id → step index for O(1) reveal lookup
const PIECE_STEP = new Map(
  MOSAIC_PIECES.map(p => [
    p.id,
    LEVEL_STEPS.findIndex(s => s.journeyId === p.journeyId && s.levelIndex === p.levelIndex),
  ])
)

export const RevealSlider: Story = {
  render: () => {
    const [step, setStep] = useState(0)
    const revealed = new Set(MOSAIC_PIECES.filter(p => (PIECE_STEP.get(p.id) ?? 0) < step).map(p => p.id))
    const pieceCount = revealed.size

    return (
      <div className="flex flex-col items-center gap-4 bg-black p-6">
        <div className="w-96">
          <StainedGlassMosaic revealedPieces={revealed} />
        </div>
        <input
          type="range"
          min={0}
          max={LEVEL_STEPS.length}
          value={step}
          onChange={e => setStep(Number(e.target.value))}
          className="w-96 accent-amber-500"
        />
        <p className="text-xs text-white/60">
          step {step} / {LEVEL_STEPS.length} — {pieceCount} / {MOSAIC_PIECES.length} pieces revealed
        </p>
      </div>
    )
  },
}
