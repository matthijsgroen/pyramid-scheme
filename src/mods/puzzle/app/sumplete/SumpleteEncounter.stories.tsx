import type { Meta, StoryObj } from "@storybook/react-vite"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { generateSumplete } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SUMPLETE_CONFIG } from "@/mods/puzzle/game/sumplete/sumpleteConfig"
import { SumpletePuzzle } from "./SumpletePuzzle"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"

// A real board in the frame every encounter is met in, with the wall it wears — and it exists for one
// judgement: how the board reads against the stone behind it.
//
// It lives on the MOD side though the frame is core's, because it names Sumplete: core may not import a
// mod (ARCHITECTURE.md, invariant 1 — a mod is removable), and a story is part of the build. The wall is the room the player walked into and is drawn at
// full strength; the board and its rules pull away from it onto their own translucent black blocks
// (`PuzzleFamilyShell`), the way the hieroglyph strip under a tableau does.
//
// Sumplete is the board to judge it on: the busiest one the game has, a grid of pale cells with numbers
// down two edges, so anything the wall does behind it shows up at once.
const meta = {
  title: "Puzzle/SumpleteEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

const Sumplete = ({ difficulty }: { difficulty: Difficulty }) => {
  const { size, ...options } = SUMPLETE_CONFIG[difficulty]
  return (
    <SumpletePuzzle
      puzzle={generateSumplete(size, 1, options)}
      difficulty={difficulty}
      onSolved={() => {}}
      onCancel={() => {}}
    />
  )
}

export const Starter: Story = {
  args: { difficulty: "starter", children: null },
  render: () => (
    <EncounterModal difficulty="starter">
      <Sumplete difficulty="starter" />
    </EncounterModal>
  ),
}

/** Every rank's wall behind the same board: the blocks have to work on all five stones. */
export const EveryRank: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-col gap-8">
      {difficulties.map(difficulty => (
        <div key={difficulty} className="relative min-h-180">
          <EncounterModal difficulty={difficulty}>
            <Sumplete difficulty={difficulty} />
          </EncounterModal>
        </div>
      ))}
    </div>
  ),
}
