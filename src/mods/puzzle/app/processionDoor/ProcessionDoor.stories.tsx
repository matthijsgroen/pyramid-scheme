import type { FC } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { gateOwnerIcon } from "@/app/SiteMap/gateOwnerIcon"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { castGlyphs } from "@/mods/puzzle/game/procession/casts"
import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
import type { ProcessionPuzzle } from "@/mods/puzzle/game/procession/procession"
import { doorVariant } from "@/mods/puzzle/game/procession/processionConfig"
import { ProcessionDoor } from "./ProcessionDoor"
import "@/mods/registerModApps"

// A procession door at every stage: nothing walked, some tiles walked, read, and beside a torch it also waits on.
// The board is a shipped expert door board; the signs are the default cast's, in a made-up step order.
const STEPS = 4
const PUZZLE = generatePuzzle<ProcessionPuzzle>(PROCESSION_META, 1, {
  difficulty: "expert",
  variant: doorVariant(STEPS),
  boardIndex: 0,
})
const SIGNS = castGlyphs("default")
const STEP_SIGNS = [SIGNS[2], SIGNS[5], SIGNS[0], SIGNS[3]]

const Door: FC<{ walked: boolean[]; read?: boolean; torch?: "lit" | "unlit" }> = ({ walked, read = false, torch }) => (
  <ProcessionDoor
    puzzle={PUZZLE}
    face={{
      id: "P",
      tiles: STEP_SIGNS.map(glyph => ({ glyph, status: "unwalked" })),
      hidden: { address: "main#0/P", read, walked },
    }}
    markers={
      torch
        ? [
            {
              id: "torch",
              icon: gateOwnerIcon({ kind: "mechanism", family: "torch" }),
              lit: torch === "lit",
              label: "Torch",
            },
          ]
        : []
    }
    onStarts={() => {}}
    onRead={() => {}}
    onReset={() => {}}
    onTurnAround={() => {}}
  />
)

const meta = {
  title: "Puzzle/Procession door",
  component: Door,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Door>

export default meta
type Story = StoryObj<typeof meta>

export const Locked: Story = { args: { walked: [false, false, false, false] } }

export const PartlyUnlocked: Story = { args: { walked: [true, false, true, false] } }

export const Solved: Story = { args: { walked: [true, true, true, true], read: true } }

export const BesideATorch: Story = { args: { walked: [true, true, true, false], torch: "unlit" } }
