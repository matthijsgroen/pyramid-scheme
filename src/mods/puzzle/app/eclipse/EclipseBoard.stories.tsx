import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type FC } from "react"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import {
  createEclipseState,
  cycleEclipseCell,
  eclipseSolved,
  type EclipsePuzzle,
  type Mark,
} from "@/mods/puzzle/game/eclipse/eclipse"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { eclipseGivenCount, generateEclipse, techniquesUpTo } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { ECLIPSE_TECHNIQUES, nextEclipseStep, techniqueRank } from "@/mods/puzzle/game/eclipse/techniques"
import { EclipseBoard } from "./EclipseBoard"

const meta = {
  title: "Puzzle/EclipseBoard",
  component: EclipseBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof EclipseBoard>

export default meta
type Story = StoryObj<typeof meta>

const board = (difficulty: Difficulty, seed: number) => generateEclipse(seed, ECLIPSE_CONFIG[difficulty])

/**
 * A playable board, with the next deduction the solver would make shown underneath — the same ladder the
 * board was accepted under, so the panel is the hint engine seen from the side rather than a debug view.
 */
const Playable: FC<{ difficulty: Difficulty; seed: number }> = ({ difficulty, seed }) => {
  const [puzzle] = useState(() => board(difficulty, seed))
  const [state, setState] = useState(() => createEclipseState(puzzle))
  const step = nextEclipseStep(puzzle, [...state.marks], techniquesUpTo(puzzle.techniqueCap))
  return (
    <div className="flex flex-col items-center gap-3">
      <EclipseBoard
        puzzle={puzzle}
        state={state}
        highlighted={step && new Set(step.cells)}
        onTapCell={cell => setState(cycleEclipseCell(puzzle, state, cell))}
      />
      <span className="text-xs text-stone-400">
        {difficulty} · {puzzle.size}×{puzzle.size} · {puzzle.links.length} signs · {eclipseGivenCount(puzzle)} given ·{" "}
        {eclipseSolved(puzzle, state) ? "solved" : (step?.technique ?? "stuck")}
        {step?.variant ? ` (${step.variant})` : ""}
      </span>
    </div>
  )
}

const playable = (difficulty: Difficulty, seed: number): Story => {
  const puzzle = board(difficulty, seed)
  return {
    args: { puzzle, state: createEclipseState(puzzle), onTapCell: () => {} },
    render: () => <Playable difficulty={difficulty} seed={seed} />,
  }
}

export const Starter: Story = playable("starter", 3)
export const Junior: Story = playable("junior", 4)
export const Expert: Story = playable("expert", 5)
export const Master: Story = playable("master", 2)
export const Wizard: Story = playable("wizard", 7)

/** Every tier at once: how many signs a board carries is the family's difficulty curve made visible. */
export const EveryTier: Story = {
  args: { puzzle: board("starter", 1), state: createEclipseState(board("starter", 1)), onTapCell: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-8">
      {difficulties.map(difficulty => (
        <div key={difficulty} className="w-72">
          <Playable difficulty={difficulty} seed={11} />
        </div>
      ))}
    </div>
  ),
}

const S: Mark = "sun"
const M: Mark = "moon"
const _ = undefined

/** A board mid-mistake: three in a row, and a sign contradicted. */
export const Conflicts: Story = {
  args: {
    puzzle: { size: 4, given: new Array(16).fill(undefined), links: [{ a: 0, b: 1, kind: "same" }] } as EclipsePuzzle,
    state: {
      // prettier-ignore
      marks: [
        S, M, _, _,
        M, M, M, _,
        _, _, _, _,
        _, _, _, _,
      ],
    },
    onTapCell: () => {},
  },
}

/** The ladder itself, cheapest first — the order a hint reaches for. */
export const TechniqueOrder: Story = {
  args: { puzzle: board("starter", 1), state: createEclipseState(board("starter", 1)), onTapCell: () => {} },
  render: () => (
    <ol className="flex flex-col gap-1 text-sm text-stone-300">
      {ECLIPSE_TECHNIQUES.map(id => (
        <li key={id}>
          {techniqueRank(id) + 1}. {id}
        </li>
      ))}
    </ol>
  ),
}
