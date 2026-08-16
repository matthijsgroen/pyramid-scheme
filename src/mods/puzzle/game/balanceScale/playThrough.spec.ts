import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { BALANCE_CONFIG } from "./balanceConfig"
import { generateBalance } from "./generateBalance"
import {
  applySwap,
  createBalanceState,
  selectGlyph,
  setWeight,
  swapSources,
  tapPiece,
  type BalanceState,
} from "./balanceState"
import { computeBalanceLines, isBalanceSolved } from "./balanceStatus"
import {
  allEquations,
  nextStep,
  scaleKey,
  type BalancePuzzleData,
  type EquationRef,
  type Glyph,
  type Pan,
  type Scale,
} from "./techniques"

// Everything the solver does, the player can do — the rule this family is built on, and the one that
// broke first: the solver used to cancel glyphs invisibly and then describe the result, so a hint
// spoke about a row nobody could see. This walks a board of every tier to solved using ONLY the taps
// the board offers, so a technique with no move behind it fails here.

const findPiece = (scale: Scale, glyph: Glyph): { pan: Pan; index: number } | undefined => {
  for (const pan of ["left", "right"] as const) {
    const index = scale[pan].findIndex(item => item.kind === "glyph" && item.glyph === glyph)
    if (index !== -1) return { pan, index }
  }
  return undefined
}

const findStone = (scale: Scale): { pan: Pan; index: number } | undefined => {
  const index = scale.left.findIndex(item => item.kind === "weight")
  return index === -1 ? undefined : { pan: "left", index }
}

const rowAt = (puzzle: BalancePuzzleData, state: BalanceState, ref: EquationRef) =>
  allEquations(puzzle, state.notes).find(row => row.ref.kind === ref.kind && row.ref.index === ref.index)!

const play = (difficulty: (typeof difficulties)[number], seed: number) => {
  const puzzle = generateBalance(seed, BALANCE_CONFIG[difficulty])
  let state: BalanceState = createBalanceState(puzzle.glyphs)

  for (let guard = 0; guard < 40; guard++) {
    const step = nextStep(puzzle, state.values, state.notes, puzzle.techniqueCap)
    if (!step) break
    const where = `${difficulty} seed ${seed}, ${step.technique}`

    if (step.decision) {
      state = setWeight(selectGlyph(state, step.decision.glyph), puzzle.glyphs, step.decision.value)
      continue
    }

    const [first, second] = step.refs
    if (step.technique === "swap") {
      // Two taps: the glyph to trade away, then the row that says what it is worth.
      const target = rowAt(puzzle, state, second)
      const piece = findPiece(target.scale, step.glyph!)!
      const tapped = tapPiece(state, puzzle, second, piece.pan, piece.index)
      const offered = swapSources(puzzle, tapped).find(
        candidate => candidate.ref.kind === first.kind && candidate.ref.index === first.index
      )
      expect(offered, `the board offers the swap the hint names (${where})`).toBeDefined()
      state = applySwap(tapped, offered!.note)
      continue
    }

    // Cancelling is one tap, on the piece that also stands across the beam.
    const row = rowAt(puzzle, state, first)
    const piece = step.glyph ? findPiece(row.scale, step.glyph) : findStone(row.scale)
    expect(piece, `the piece the hint names is on the board (${where})`).toBeDefined()
    const after = tapPiece(state, puzzle, first, piece!.pan, piece!.index)
    expect(after.notes.map(scaleKey), `the tap writes the row the hint promised (${where})`).toContain(
      scaleKey(step.note!)
    )
    state = after
  }

  return { puzzle, state }
}

describe("playing a board with the moves the board offers", () => {
  it.each(difficulties)("solves a %s board", difficulty => {
    for (let seed = 1; seed <= 5; seed++) {
      const { puzzle, state } = play(difficulty, seed)
      expect(state.values).toEqual(puzzle.solution)
      expect(isBalanceSolved(puzzle.glyphs, computeBalanceLines(puzzle.scales, state.values), state.values)).toBe(true)
    }
  })

  it("leaves nothing half-tapped once a swap is taken", () => {
    const { state } = play("wizard", 1)
    expect(state.pending).toBeUndefined()
  })
})
