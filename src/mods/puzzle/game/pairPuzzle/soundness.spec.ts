import { describe, expect, it } from "vitest"
import { mulberry32 } from "@/game/random"
import { neighboursOf } from "../starBattle/starBattle"
import { hasPerfectPairing, type PairMark, type PairPuzzle } from "./pairPuzzle"
import { applyPairTechniques, PAIR_TECHNIQUES, type PairTechniqueId } from "./techniques"

type Marks = (PairMark | undefined)[]

const orthogonal = (size: number, cell: number) =>
  neighboursOf(size, cell).filter(at => at % size === cell % size || Math.floor(at / size) === Math.floor(cell / size))

/** Anchors and counts from a random legal answer: pieces apart, each beside an anchor of its own. */
const randomBoard = (seed: number, size: number): PairPuzzle => {
  const random = mulberry32(seed)
  const anchors = new Array(size * size).fill(false)
  const pieces = new Array(size * size).fill(false)
  const target = Math.round((size * size) / 5)
  for (let tries = 0, placed = 0; tries < 200 && placed < target; tries++) {
    const piece = Math.floor(random() * size * size)
    const beside = orthogonal(size, piece).filter(at => !anchors[at] && !pieces[at])
    if (anchors[piece] || pieces[piece] || !beside.length) continue
    if (neighboursOf(size, piece).some(at => pieces[at])) continue
    pieces[piece] = true
    anchors[beside[Math.floor(random() * beside.length)]] = true
    placed++
  }
  const count = (cells: number[]) => cells.filter(cell => pieces[cell]).length
  const line = (at: number, step: number, stride: number) =>
    Array.from({ length: size }, (_u, i) => at * stride + i * step)
  return {
    size,
    anchors,
    rowCounts: Array.from({ length: size }, (_u, row) => count(line(row, 1, size))),
    colCounts: Array.from({ length: size }, (_u, col) => count(line(col, size, 1))),
  }
}

/** Every legal answer to a board, as piece cells: the oracle every rung is held to. */
const legalFillings = (puzzle: PairPuzzle): number[][] => {
  const { size } = puzzle
  const found: number[][] = []
  const taken: number[] = []
  const inCol = new Array(size).fill(0)
  const nearAnchor = (cell: number) => orthogonal(size, cell).some(at => puzzle.anchors[at])
  const walk = (row: number) => {
    if (row === size) {
      const mask = Array.from({ length: size * size }, (_u, cell) => taken.includes(cell))
      if (inCol.every((n, col) => n === puzzle.colCounts[col]) && hasPerfectPairing(puzzle, mask))
        found.push([...taken])
      return
    }
    const choose = (col: number, owed: number) => {
      if (owed === 0) return walk(row + 1)
      for (let at = col; at < size; at++) {
        const cell = row * size + at
        if (puzzle.anchors[cell] || !nearAnchor(cell) || inCol[at] === puzzle.colCounts[at]) continue
        if (taken.some(other => neighboursOf(size, cell).includes(other))) continue
        taken.push(cell)
        inCol[at]++
        choose(at + 1, owed - 1)
        taken.pop()
        inCol[at]--
      }
    }
    choose(0, puzzle.rowCounts[row])
  }
  walk(0)
  return found
}

const BOARDS = [4, 5].flatMap(size =>
  Array.from({ length: 60 }, (_u, at) => {
    const puzzle = randomBoard(size * 1000 + at, size)
    return { size, puzzle, fillings: legalFillings(puzzle) }
  })
)

/** A state a player could be in on the way to `answer`: some of its pieces, some correct "not here" marks. */
const playerState = (puzzle: PairPuzzle, answer: readonly number[], random: () => number): Marks => {
  const pieces = random()
  const empties = random()
  return puzzle.anchors.map((anchor, cell) => {
    if (anchor) return undefined
    if (answer.includes(cell)) return random() < pieces ? "piece" : undefined
    return random() < empties ? "empty" : undefined
  })
}

const holdsIn = (way: readonly number[], decision: { cell: number; mark: PairMark }) =>
  decision.mark === "piece" ? way.includes(decision.cell) : !way.includes(decision.cell)

describe("pair puzzle soundness", () => {
  const unique = BOARDS.filter(board => board.fillings.length === 1)

  it("draws enough boards with one answer to be a guard", () => {
    expect(unique.length).toBeGreaterThan(20)
    expect(BOARDS.filter(board => board.fillings.length > 1).length).toBeGreaterThan(10)
  })

  it("every rung agrees with the answer from any state a player reaches", () => {
    const random = mulberry32(6203)
    let decided = 0
    for (const { puzzle, fillings } of unique) {
      const [answer] = fillings
      for (let round = 0; round < 30; round++) {
        for (const step of applyPairTechniques(puzzle, playerState(puzzle, answer, random)))
          for (const decision of step.decisions) {
            expect(holdsIn(answer, decision), `${step.technique} on cell ${decision.cell}`).toBe(true)
            decided++
          }
      }
    }
    expect(decided).toBeGreaterThan(1000)
  })

  /**
   * The stronger reading: from a state consistent with SOME answer, a rung's decision holds in EVERY legal
   * answer that agrees with the marks. Boards with several answers are where `claimed` and `lineBlock`
   * would be caught assuming one pairing.
   */
  it("every rung is forced by the board it fired from", () => {
    const random = mulberry32(8807)
    const fired = new Map<PairTechniqueId, number>()
    for (const { puzzle, fillings } of BOARDS) {
      if (!fillings.length) continue
      for (let round = 0; round < 30; round++) {
        const answer = fillings[Math.floor(random() * fillings.length)]
        const marks = playerState(puzzle, answer, random)
        const ways = fillings.filter(way => marks.every((mark, cell) => !mark || holdsIn(way, { cell, mark })))
        for (const ladder of [...PAIR_TECHNIQUES.map(id => [id]), [...PAIR_TECHNIQUES]]) {
          for (const step of applyPairTechniques(puzzle, [...marks], ladder)) {
            if (ladder.length === 1) fired.set(step.technique, (fired.get(step.technique) ?? 0) + 1)
            for (const decision of step.decisions)
              expect(
                ways.every(way => holdsIn(way, decision)),
                `${step.technique}${step.variant ? `.${step.variant}` : ""} on cell ${decision.cell}`
              ).toBe(true)
          }
        }
      }
    }
    // A guard that never saw a rung fire is not guarding it.
    for (const technique of PAIR_TECHNIQUES) expect(fired.get(technique) ?? 0, technique).toBeGreaterThan(50)
  })
})
