import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { BALANCE_CONFIG } from "@/mods/puzzle/game/balanceScale/balanceConfig"
import { generateBalance } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { computeBalanceLines, isBalanceSolved } from "@/mods/puzzle/game/balanceScale/balanceStatus"
import {
  applySwap,
  createBalanceState,
  removeNote,
  selectGlyph,
  setWeight,
  swapSources,
  tapPiece,
} from "@/mods/puzzle/game/balanceScale/balanceState"
import { buildBalanceHint } from "./balanceHint"
import { BalanceBoard } from "./BalanceBoard"

const meta = {
  title: "Puzzle/BalanceBoard",
  component: BalanceBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof BalanceBoard>

export default meta
type Story = StoryObj<typeof meta>

const board = (difficulty: keyof typeof BALANCE_CONFIG, seed: number) =>
  generateBalance(seed, BALANCE_CONFIG[difficulty])

const starter = board("starter", 1)
const wizard = board("wizard", 3)

const noop = () => {}

const staticArgs = (puzzle: ReturnType<typeof board>) => ({
  scales: puzzle.scales,
  lines: computeBalanceLines(puzzle.scales, {}),
  notes: [],
  glyphs: puzzle.glyphs,
  values: {},
  selected: puzzle.glyphs[0],
  maxValue: puzzle.maxValue,
  onSelectGlyph: noop,
  onPickWeight: noop,
  onTapPiece: noop,
  onTapRow: noop,
  moves: { cancelling: puzzle.cancelling !== false, swapping: puzzle.techniqueCap === "swap" },
  onRemoveNote: noop,
})

export const Starter: Story = { args: staticArgs(starter) }

export const Wizard: Story = { args: staticArgs(wizard) }

/** The whole board as played: weights, swaps that write notes, and the hint lighting what it names. */
export const Played: Story = {
  args: staticArgs(wizard),
  render: () => {
    const [state, setState] = useState(createBalanceState(wizard.glyphs))
    const lines = computeBalanceLines(wizard.scales, state.values)
    const hint = buildBalanceHint(wizard, state.values, state.notes, wizard.solution, wizard.techniqueCap)
    const sources = swapSources(wizard, state)

    return (
      <div className="flex flex-col items-center gap-3">
        <BalanceBoard
          scales={wizard.scales}
          lines={lines}
          notes={state.notes}
          glyphs={wizard.glyphs}
          values={state.values}
          selected={state.selected}
          maxValue={wizard.maxValue}
          highlighted={hint?.glyph}
          litRefs={hint?.refs}
          pending={state.pending}
          swapSources={sources.map(source => source.ref)}
          moves={{ cancelling: wizard.cancelling !== false, swapping: wizard.techniqueCap === "swap" }}
          onSelectGlyph={glyph => setState(prev => selectGlyph(prev, glyph))}
          onPickWeight={value => setState(prev => setWeight(prev, wizard.glyphs, value))}
          onTapPiece={(ref, pan, index) => setState(prev => tapPiece(prev, wizard, ref, pan, index))}
          onTapRow={ref => {
            const source = sources.find(
              candidate => candidate.ref.kind === ref.kind && candidate.ref.index === ref.index
            )
            if (source) setState(prev => applySwap(prev, source.note))
          }}
          onRemoveNote={index => setState(prev => removeNote(prev, index))}
        />
        <p className="text-sm text-amber-300">{hint ? hint.key : "nothing forced"}</p>
        {isBalanceSolved(wizard.glyphs, lines, state.values) && <p className="text-sm text-green-400">Solved!</p>}
      </div>
    )
  },
}
