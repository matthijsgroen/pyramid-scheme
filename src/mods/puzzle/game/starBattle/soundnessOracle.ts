import { blankMarks, cellAt, neighboursOf, type StarBattlePuzzle } from "./starBattle"
import type { StarBattlePuzzleWithAnswer } from "./generateStarBattle"
import type { Marks, StarBattleDecision } from "./techniques"

/**
 * Every legal star set that agrees with what is on the board — the oracle a forced step is held to.
 *
 * Checking a decision against the ANSWER only proves the rung is not lying about this board. Checking it
 * against every completion proves the step was FORCED, which is the claim a hint makes and the claim
 * uniqueness rests on.
 *
 * Walks the rows and takes each row's stars as a COMBINATION, so it enumerates at either quota — the quota
 * is what makes a row's choice one square or several, and every other rule reads the same way round.
 */
export const completions = (puzzle: StarBattlePuzzle, marks: Marks, limit: number): number[][] => {
  const { size, quota } = puzzle
  const found: number[][] = []
  const taken: number[] = []
  const inColumn = new Array(size).fill(0)
  const inRegion = new Array(size).fill(0)
  const walk = (row: number) => {
    if (found.length >= limit) return
    if (row === size) {
      found.push([...taken])
      return
    }
    const cells = Array.from({ length: size }, (_unused, col) => cellAt(size, row, col))
    // Stars the player already wrote down are part of the state, so a completion that leaves one out is a
    // completion of a different board.
    const written = cells.filter(cell => marks[cell] === "star")
    const from = taken.length
    const choose = (col: number, owed: number) => {
      if (found.length >= limit) return
      if (owed === 0) {
        if (written.every(cell => taken.slice(from).includes(cell))) walk(row + 1)
        return
      }
      for (let at = col; at < size; at++) {
        const cell = cells[at]
        if (marks[cell] === "dark") continue
        if (inColumn[at] === quota || (puzzle.regions && inRegion[puzzle.regions[cell]] === quota)) continue
        if (taken.some(other => neighboursOf(size, cell).includes(other))) continue
        taken.push(cell)
        inColumn[at]++
        if (puzzle.regions) inRegion[puzzle.regions[cell]]++
        choose(at + 1, owed - 1)
        taken.pop()
        inColumn[at]--
        if (puzzle.regions) inRegion[puzzle.regions[cell]]--
      }
    }
    choose(0, quota)
  }
  walk(0)
  return found
}

/** A state a player could be in on a walled board: its walls, some of the answer's stars, some correct dark marks. */
export const walledState = (board: StarBattlePuzzleWithAnswer, random: () => number): Marks => {
  const stars = random()
  const darks = random()
  const base = blankMarks(board)
  return board.solution.map((star, cell) => {
    if (base[cell]) return base[cell]
    if (star) return random() < stars ? "star" : undefined
    return random() < darks ? "dark" : undefined
  })
}

export const holdsIn = (way: readonly number[], decision: StarBattleDecision) =>
  decision.mark === "star" ? way.includes(decision.cell) : !way.includes(decision.cell)
