import { current, produce } from "immer"
import { hexKey, hexNeighbours, type Hex } from "./hex"
import type { HidatoPuzzleData } from "./techniques"

// The board as the player leaves it, per docs/instructions/state-models.md.
export type HidatoState = {
  /** Every number on the board, by cell key — the givens and the player's own, in one map. */
  values: Record<string, number>
  /**
   * The number the run is being carried on from: the cell key the next tap counts from.
   *
   * A run needs somewhere to be picked up, and this is it — there is no number pad, because a comb of
   * 37 cells would need a pad of 37 buttons (design doc §6). Tapping a number picks the run up there;
   * tapping a touching cell carries it on.
   */
  pen?: string
  /**
   * Which way the run is being counted — up from the number it was picked up at, or down.
   *
   * A drag reads the same two cells whichever way it goes, and only this tells them apart: the number
   * below the one being carried is the cell the finger came from when counting up, and the cell it is
   * heading for when counting down. Unset until something says which — the first number laid, or a
   * given the run passes through.
   */
  way?: 1 | -1
  /** Board states this one replaced, oldest first — the undo stack. */
  past: Record<string, number>[]
}

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit.
const UNDO_LIMIT = 200

export const createHidatoState = (puzzle: HidatoPuzzleData): HidatoState => ({
  values: { ...puzzle.givens },
  past: [],
})

const recordMove = (state: HidatoState) => {
  state.past.push(current(state.values))
  if (state.past.length > UNDO_LIMIT) state.past.shift()
}

const touching = (a: string, b: string): boolean => hexNeighbours(cellOf(a)).some(cell => hexKey(cell) === b)

const cellOf = (key: string): Hex => {
  const [q, r] = key.split(",").map(Number)
  return { q, r }
}

/** Picks the run up at a numbered cell, or puts it back down if that cell already held it. */
export const armHidato = produce((state: HidatoState, key: string) => {
  if (state.values[key] === undefined) return
  state.pen = state.pen === key ? undefined : key
  state.way = undefined
})

/**
 * Picks the run up at a numbered cell and nothing else — no toggle, no rubbing out.
 *
 * What a finger landing on a cell means cannot be settled until it lifts: pressing a number to START A
 * DRAG must not be read as tapping it, or a drag begun on the cell the run is already standing on
 * rubs that number out before the finger has moved (design doc §6.5). So the press only ever picks the
 * run up, and the tap is decided on release.
 */
export const pickUpHidato = produce((state: HidatoState, key: string) => {
  if (state.values[key] === undefined) return
  state.pen = key
  state.way = undefined
})

/**
 * Every number on the board that can still be counted back to one the puzzle wrote in — by stepping to
 * the number before or after it **and finding it next door**.
 *
 * The board's numbers only mean anything as a chain hanging off a given: 6, 7, 8 written in with no 5
 * anywhere are three cells the player committed to for a reason that is no longer on the board.
 *
 * **Adjacency is half the rule, and leaving it out was a bug.** Counting by value alone, a 4 stays
 * "anchored" after the 3 it was laid beside has been moved to the far side of the comb — the numbers
 * still read 1, 2, 3, 4 and nothing notices that the chain no longer touches. It is exactly the case
 * that matters, because moving a number is what re-drawing a run does.
 */
const stillAnchored = (values: Record<string, number>, givens: Record<string, number>): Set<number> => {
  const cellFor = new Map(Object.entries(values).map(([key, value]) => [value, key]))
  const anchored = new Set(Object.values(givens).filter(value => cellFor.has(value)))
  const queue = [...anchored]
  while (queue.length) {
    const value = queue.pop()!
    const here = cellFor.get(value)!
    for (const along of [value - 1, value + 1]) {
      const there = cellFor.get(along)
      if (there === undefined || anchored.has(along) || !touching(here, there)) continue
      anchored.add(along)
      queue.push(along)
    }
  }
  return anchored
}

/** Drops every number that can no longer be counted back to one the puzzle wrote in. */
const dropUnanchored = (state: HidatoState, givens: Record<string, number>) => {
  const anchored = stillAnchored(state.values, givens)
  for (const [cell, value] of Object.entries(state.values)) if (!anchored.has(value)) delete state.values[cell]
}

/**
 * Carries the run on into a touching cell.
 *
 * **One rule does nearly all of it: lay the next number here.** Onto open ground, or straight over a
 * number FURTHER ALONG the run than the one being carried — that is the run's own tail, and drawing
 * over it is how a line gets redrawn. Whatever held that number loses it, and anything left counting
 * back to nothing goes with it (stillAnchored).
 *
 * **Which number is "next" depends on the way the run is being counted** (`way`), because a run counted
 * down is the same gesture with every reading mirrored: the number below is what lies ahead of the
 * finger, and the number above is the way it came. A run that has laid nothing yet has no way, and is
 * read as counting up — which is what it becomes the moment a number goes down.
 *
 * What it will not do:
 *
 * - **write over a number the puzzle wrote in**, or move one that is standing somewhere else. Those are
 *   the board's fixed points.
 * - **write over a number the run has already come along.** That is the line the finger has just drawn,
 *   and cutting it was never the intention.
 *
 * Two more readings, for when laying cannot happen at all:
 *
 * 2. **the number the other way**, where the one ahead is out of reach and the one behind is not on the
 *    board. *Counting down needs no gesture of its own*: the first and last numbers always ship written
 *    in (generateHidato), so every stretch of empty cells lies between two known numbers and can be
 *    filled forwards from the lower of them, and counting down is what happens when a player picks the
 *    run up at the far end instead.
 * 3. **moving the number the run is standing on**, where the run has simply stopped — its next number is
 *    one the puzzle wrote in, standing somewhere this cell does not touch. There is nothing to lay and
 *    nothing to redraw, so what the player means is "this one goes here instead", which it may as long as
 *    the number before it still touches where it lands.
 *
 * **An earlier version worked out the whole stretch a redraw would sweep away and refused anything
 * outside it.** That read the run as a thing with a shape rather than a line being drawn, and it refused
 * the ordinary case: one number the puzzle wrote in standing anywhere in the tail put every cell past it
 * out of reach, on a board where those were the only cells worth dragging to.
 */
export const stepHidato = produce((state: HidatoState, key: string, puzzle: HidatoPuzzleData) => {
  const { pen, way } = state
  if (pen === undefined || !touching(pen, key)) return
  const from = state.values[pen]
  const standing = state.values[key]
  const last = puzzle.cells.length
  const homeOf = (value: number) => Object.entries(state.values).find(([, other]) => other === value)?.[0]

  // The number one step BACK along the way the run is being counted is the cell the finger came from, so
  // the last one was a wrong turn: it comes off, along with everything that was only on the board
  // because of it, and the run picks up where it came from. A given cannot be taken off, so there the
  // run only picks up.
  if (way !== undefined && standing === from - way) {
    if (puzzle.givens[pen] === undefined) {
      recordMove(state)
      delete state.values[pen]
      dropUnanchored(state, puzzle.givens)
    }
    state.pen = state.values[key] !== undefined ? key : undefined
    return
  }

  // Either number beside it in the run is the run passing THROUGH what is already written — which is
  // what lets a drag cross the board's givens instead of stopping dead at the first one — and which of
  // the two it is says which way the run is being counted.
  if (standing === from + 1 || standing === from - 1) {
    state.pen = key
    state.way = standing === from + 1 ? 1 : -1
    return
  }

  const lay = (value: number) => {
    recordMove(state)
    const home = homeOf(value)
    if (home !== undefined) delete state.values[home]
    state.values[key] = value
    dropUnanchored(state, puzzle.givens)
    state.pen = key
    state.way = value > from ? 1 : -1
  }

  /**
   * Drawing over what is already on the board — the run's own tail, or a number standing where it is
   * wanted — belongs to the way the run is being counted. Counting up is the default reading, so a run
   * that has not said otherwise redraws upwards only: a lower number is behind an ascending run, and
   * dragging onto it means nothing.
   */
  const redrawing = (step: 1 | -1) => step === 1 || way === -1

  const canGo = (step: 1 | -1) => {
    const value = from + step
    if (value < 1 || value > last) return false
    // Onto open ground, or over the run's own tail, which is every cell FURTHER ALONG than the one being
    // carried — never over a number the puzzle wrote in.
    if (
      standing !== undefined &&
      !(redrawing(step) && puzzle.givens[key] === undefined && (standing - from) * step > 0)
    )
      return false
    const home = homeOf(value)
    // That number standing somewhere already: the run stops if the puzzle wrote it there, and otherwise
    // it comes with the finger.
    return home === undefined || (redrawing(step) && puzzle.givens[home] === undefined)
  }

  const step = (way === -1 ? ([-1, 1] as const) : ([1, -1] as const)).find(canGo)
  if (step !== undefined) {
    lay(from + step)
    return
  }

  const behind = homeOf(from - 1)
  if (standing !== undefined || puzzle.givens[pen] !== undefined || behind === undefined || !touching(behind, key))
    return
  recordMove(state)
  delete state.values[pen]
  state.values[key] = from
  state.pen = key
})

/**
 * Takes a number the player wrote back off, along with everything that was only on the board because
 * of it — and leaves the run picked up where it came from.
 *
 * **The cascade is the point.** Backing out of a wrong turn one cell at a time is what a drag does, but
 * a player who spots the mistake six cells later means all six: the numbers past the hole cannot be
 * counted back to anything now, so leaving them would leave a stretch that no longer claims anything.
 * What survives is what is still anchored, which is why a stretch running between two written-in
 * numbers keeps both of its ends — erase in the middle of one and the two halves are each still
 * counted from something.
 */
export const eraseHidato = produce((state: HidatoState, key: string, puzzle: HidatoPuzzleData) => {
  const value = state.values[key]
  if (value === undefined || puzzle.givens[key] !== undefined) return
  recordMove(state)
  delete state.values[key]
  dropUnanchored(state, puzzle.givens)
  const previous = Object.entries(state.values).find(([, other]) => other === value - 1)
  state.pen = previous?.[0]
  // A tap is a gesture of its own, so the run it leaves has no way yet — the next number laid says which.
  state.way = undefined
})

export const undoHidato = produce((state: HidatoState) => {
  const previous = state.past.pop()
  if (previous) {
    state.values = previous
    state.pen = undefined
    state.way = undefined
  }
})

export const canUndoHidato = (state: HidatoState): boolean => state.past.length > 0

/**
 * Whether the comb holds one unbroken run.
 *
 * The full check rather than a cell count, and it has to be: every tap places a number beside the one
 * it counts from, but nothing stops a player filling 4–5 in one corner and 6–7 in another, and those
 * two stretches meeting nowhere is exactly the board that looks finished and is not.
 */
export const isHidatoSolved = (puzzle: HidatoPuzzleData, values: Record<string, number>): boolean => {
  if (Object.keys(values).length !== puzzle.cells.length) return false
  const cellFor = new Map(Object.entries(values).map(([key, value]) => [value, key]))
  for (let value = 1; value < puzzle.cells.length; value++) {
    const from = cellFor.get(value)
    const to = cellFor.get(value + 1)
    if (from === undefined || to === undefined || !touching(from, to)) return false
  }
  return true
}
