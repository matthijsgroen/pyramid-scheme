import type { Meta, StoryObj } from "@storybook/react-vite"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { Tileset } from "@/game/siteTypes"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { EclipsePuzzle } from "./EclipsePuzzle"

// An eclipse board in the frame it is met in, played by keys: the cursor (look C, the lifted cell) is what
// these stories are for. Arrows or WASD move it, Enter or Space cycles the square, Z undoes, H asks for the
// hint, Escape leaves.
const meta = {
  title: "Puzzle/EclipseEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
  globals: { input: "keys" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

const Eclipse = ({ difficulty, theme }: { difficulty: Difficulty; theme?: string }) => (
  <EclipsePuzzle
    puzzle={generateEclipse(3, ECLIPSE_CONFIG[difficulty])}
    difficulty={difficulty}
    theme={theme}
    onSolved={() => {}}
    onCancel={() => {}}
  />
)

export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  render: () => (
    <EncounterModal tileset="junior">
      <Eclipse difficulty="junior" />
    </EncounterModal>
  ),
}

/** A board with = and × signs on its edges: a sign beside the cursor steps out with the lift. */
export const KeyboardCursorSigns: Story = {
  args: { tileset: "expert", children: null },
  render: () => (
    <EncounterModal tileset="expert">
      <Eclipse difficulty="expert" />
    </EncounterModal>
  ),
}

/** The night skin: the cursor over a star and a dark sky. */
export const KeyboardCursorNight: Story = {
  args: { tileset: "cave", children: null },
  render: () => (
    <EncounterModal tileset="cave">
      <Eclipse difficulty="junior" theme="night" />
    </EncounterModal>
  ),
}

/** The cursor on every wall: it has to read on the pale stones as well as the dark ones. */
export const KeyboardCursorEveryRank: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-col gap-8">
      {[...difficulties, "cave", "sphinx"].map(tileset => (
        <div key={tileset} className="relative min-h-180">
          <EncounterModal tileset={tileset as Tileset}>
            <Eclipse difficulty="starter" />
          </EncounterModal>
        </div>
      ))}
    </div>
  ),
}
