import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { StainedGlassMosaic } from "./StainedGlassMosaic"
import { MOSAIC_PIECES } from "./mosaicPieces.generated"
import { LEVEL_STEPS } from "./mosaicRevealOrder"

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

// First step's pieces used as the "new" highlight demo
const FIRST_STEP_PIECES = new Set(
  MOSAIC_PIECES.filter(p => p.journeyId === "starter_1" && p.levelIndex === 0).map(p => p.id)
)

export const NewPiecesGlow: Story = {
  args: {
    revealedPieces: FIRST_STEP_PIECES,
    newPieces: FIRST_STEP_PIECES,
  },
  decorators: [
    Story => (
      <div className="w-96 bg-black p-4">
        <Story />
      </div>
    ),
  ],
}

// Map piece id → step index for O(1) reveal lookup (using spatially-ordered steps)
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
