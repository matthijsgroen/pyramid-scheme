import { produce } from "immer"
import {
  allEquations,
  cancelGlyph,
  cancelStones,
  definitionOf,
  scaleKey,
  swapGlyph,
  type BalanceAssignment,
  type BalancePuzzleData,
  type EquationRef,
  type Glyph,
  type Note,
  type Pan,
} from "./techniques"

// The player's board uses the same vocabulary the solver reasons in, so a hint's move drops straight
// onto it: a glyph with no weight is one the solver still calls unknown, and a note is a row the
// player worked out that the solver reads exactly like a scale.
export type BalanceState = {
  values: BalanceAssignment
  /** The glyph the number palette is setting. */
  selected?: Glyph
  /** Rows worked out from the scales — the player's own scratch (design doc §7). */
  notes: Note[]
  /** A glyph tapped in a pan with no twin to cancel, waiting for a row that says what it is worth. */
  pending?: { ref: EquationRef; glyph: Glyph }
}

export const createBalanceState = (glyphs: Glyph[]): BalanceState => ({
  values: {},
  selected: glyphs[0],
  notes: [],
})

export const selectGlyph = produce((state: BalanceState, glyph: Glyph) => {
  state.selected = glyph
})

// Tapping the weight a glyph already has takes it off again — the clear, without a button for it.
// After a weight is set the selection walks on to the next glyph still missing one, so answering a
// board is a run of taps rather than an alternation of picking and answering.
export const setWeight = produce((state: BalanceState, glyphs: Glyph[], value: number) => {
  const glyph = state.selected
  if (glyph === undefined) return
  state.values[glyph] = state.values[glyph] === value ? undefined : value
  state.selected = glyphs.find(candidate => state.values[candidate] === undefined) ?? glyph
})

const sameRef = (a: EquationRef, b: EquationRef) => a.kind === b.kind && a.index === b.index

const rowsOf = (puzzle: BalancePuzzleData, state: BalanceState) => allEquations(puzzle, state.notes)

const rowAt = (puzzle: BalancePuzzleData, state: BalanceState, ref: EquationRef) =>
  rowsOf(puzzle, state).find(equation => sameRef(equation.ref, ref))

const addNote = (state: BalanceState, note: Note) => {
  const known = new Set([...state.notes.map(scaleKey)])
  if (!known.has(scaleKey(note))) state.notes.push(note)
  state.pending = undefined
}

/**
 * Tapping a piece in a pan. What it does depends on what is opposite it, which is what makes the
 * board teachable: a piece with its twin across the beam comes off both pans in one tap, and a glyph
 * with no twin is the start of a swap, waiting for the row that says what it is worth.
 */
export const tapPiece = produce(
  (state: BalanceState, puzzle: BalancePuzzleData, ref: EquationRef, pan: Pan, index: number) => {
    const row = rowAt(puzzle, state, ref)
    const piece = row?.scale[pan][index]
    if (!piece) return

    // Below the tier that teaches it, taking things off both pans is not on offer at all: the move
    // would do the board's own arithmetic (techniques.ts, `cancelling`).
    if (puzzle.cancelling !== false) {
      if (piece.kind === "weight") {
        const note = cancelStones(row.scale, state.values)
        if (note) addNote(state, note)
        return
      }

      const cancelled = cancelGlyph(row.scale, piece.glyph, state.values)
      if (cancelled) {
        addNote(state, cancelled)
        return
      }
    }
    if (piece.kind === "weight") return

    const pending = state.pending
    state.pending =
      pending && pending.glyph === piece.glyph && sameRef(pending.ref, ref) ? undefined : { ref, glyph: piece.glyph }
  }
)

/**
 * Which rows can answer the pending tap — the ones holding that glyph alone on a pan, so the swap is
 * a trade the player can picture. The board lights these, and tapping one writes the note.
 */
export const swapSources = (puzzle: BalancePuzzleData, state: BalanceState): { ref: EquationRef; note: Note }[] => {
  const { pending } = state
  if (!pending) return []
  const target = rowAt(puzzle, state, pending.ref)
  if (!target) return []
  const known = new Set(rowsOf(puzzle, state).map(equation => scaleKey(equation.scale)))
  return rowsOf(puzzle, state).flatMap(source => {
    if (sameRef(source.ref, pending.ref)) return []
    const definition = definitionOf(source.scale, state.values)
    if (definition?.glyph !== pending.glyph) return []
    const note = swapGlyph(target.scale, definition)
    return note && !known.has(scaleKey(note)) ? [{ ref: source.ref, note }] : []
  })
}

export const applySwap = produce((state: BalanceState, note: Note) => {
  addNote(state, note)
})

export const removeNote = produce((state: BalanceState, index: number) => {
  state.notes.splice(index, 1)
  state.pending = undefined
})
