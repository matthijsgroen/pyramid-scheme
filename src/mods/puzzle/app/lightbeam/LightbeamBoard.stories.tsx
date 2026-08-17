import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { generateLightbeam } from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { LIGHTBEAM_CONFIG } from "@/mods/puzzle/game/lightbeam/lightbeamConfig"
import { createLightbeamState, cycleLightbeamPiece } from "@/mods/puzzle/game/lightbeam/lightbeamState"
import { buildLightbeamHint } from "./lightbeamHint"
import { LightbeamBoard } from "./LightbeamBoard"

const meta = {
  title: "Puzzle/LightbeamBoard",
  component: LightbeamBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof LightbeamBoard>

export default meta
type Story = StoryObj<typeof meta>

const board = (difficulty: keyof typeof LIGHTBEAM_CONFIG, seed: number) => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  return generateLightbeam(size, seed, options)
}

const starter = board("starter", 1)
const expert = board("expert", 2)
const wizard = board("wizard", 4)

/** How the board opens: dark, with the beam running out somewhere it should not. */
export const Starter: Story = { args: { puzzle: starter, states: starter.initial, onCycle: () => {} } }

/** The same board answered — the beam bends the whole way and the shrine takes the light. */
export const Solved: Story = { args: { puzzle: starter, states: starter.solution, onCycle: () => {} } }

/** Sliding pieces and a decoy. A vacant stop keeps its dashed outline, so its track shows before it is tapped. */
export const Expert: Story = { args: { puzzle: expert, states: expert.initial, onCycle: () => {} } }

/** The widest board the family ships. Seven squares still measure a thumb across on a 360px screen. */
export const Wizard: Story = { args: { puzzle: wizard, states: wizard.initial, onCycle: () => {} } }

/** Playable, so the beam can be watched moving. Each tap cycles one piece. */
export const Playable: Story = {
  args: { puzzle: expert, states: expert.initial, onCycle: () => {} },
  render: () => {
    const [state, setState] = useState(() => createLightbeamState(expert))
    return (
      <LightbeamBoard
        puzzle={expert}
        states={state.states}
        onCycle={piece => setState(prev => cycleLightbeamPiece(prev, expert, piece))}
      />
    )
  },
}

/** The board with the hint's piece and beam lit — the state after pressing Hint. */
export const WithHint: Story = {
  args: { puzzle: starter, states: starter.initial, onCycle: () => {} },
  render: () => {
    const [state, setState] = useState(() => createLightbeamState(starter))
    const hint = buildLightbeamHint(starter, state.states)
    return (
      <div className="flex flex-col items-center gap-3">
        <LightbeamBoard
          puzzle={starter}
          states={state.states}
          highlighted={hint?.cells}
          litBeam={hint?.beam}
          onCycle={piece => setState(prev => cycleLightbeamPiece(prev, starter, piece))}
        />
        <p className="text-sm text-amber-300">{hint ? hint.key : "lit"}</p>
      </div>
    )
  },
}
