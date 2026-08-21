import { describe, expect, it } from "vitest"
import { mulberry32 } from "@/game/random"
import { cellAt, type EclipsePuzzle, type Mark } from "./eclipse"
import { nextEclipseStep } from "./techniques"

const SIZE = 6
const HALF = SIZE / 2

/** Every legal filling of one row, judged by that row's own rules — the ground truth for a line-local rung. */
const legalFillings = (puzzle: EclipsePuzzle, row: (Mark | undefined)[]) => {
  const empty = row.flatMap((mark, index) => (mark === undefined ? [index] : []))
  const out: Mark[][] = []
  for (let choice = 0; choice < 2 ** empty.length; choice++) {
    const filled = [...row] as Mark[]
    empty.forEach((index, bit) => (filled[index] = (choice >> bit) & 1 ? "moon" : "sun"))
    if (filled.filter(mark => mark === "sun").length !== HALF) continue
    if (filled.some((mark, index) => index >= 2 && mark === filled[index - 1] && mark === filled[index - 2])) continue
    const signOk = puzzle.links.every(link => {
      const [a, b] = [link.a % SIZE, link.b % SIZE]
      return (link.kind === "same") === (filled[a] === filled[b])
    })
    if (!signOk) continue
    out.push(filled)
  }
  return out
}

/**
 * **A rung that reasons inside one line must agree with every legal filling of that line.**
 *
 * Stronger than checking a rung against a generated board's answer, and it catches a different class of bug:
 * a board only ever shows the states its own solve visits, and a rung can be wrong in a shape that board
 * never takes. Random rows with random signs — deliberately including duplicated and overlapping signs —
 * cover the shapes generation does not.
 *
 * It was written after `linePairing` was found counting two × signs that met at one square as spending two
 * marks between them, and settling the rest of the line on the strength of it.
 */
describe("eclipse line-local soundness", () => {
  it("never contradicts a legal filling of the line it reasons about", () => {
    const bad: string[] = []
    const random = mulberry32(7)
    for (let trial = 0; trial < 4000 && bad.length < 5; trial++) {
      const row: (Mark | undefined)[] = Array.from({ length: SIZE }, () =>
        random() < 0.4 ? (random() < 0.5 ? "sun" : "moon") : undefined
      )
      // A random sprinkle of signs inside the row, deliberately allowed to overlap.
      const links = Array.from({ length: Math.floor(random() * 4) }, () => {
        const at = Math.floor(random() * (SIZE - 1))
        return {
          a: cellAt(SIZE, 0, at),
          b: cellAt(SIZE, 0, at + 1),
          kind: random() < 0.5 ? "same" : ("different" as const),
        }
      }) as EclipsePuzzle["links"]
      const given: (Mark | undefined)[] = new Array(SIZE * SIZE).fill(undefined)
      row.forEach((mark, col) => (given[cellAt(SIZE, 0, col)] = mark))
      const puzzle: EclipsePuzzle = { size: SIZE, given, links }
      const legal = legalFillings(puzzle, row)
      if (legal.length < 2) continue // nothing to disagree about
      const step = nextEclipseStep(puzzle, [...given])
      if (!step) continue
      const wrong = step.decisions.find(d => legal.some(filling => filling[d.cell % SIZE] !== d.mark))
      if (!wrong) continue
      bad.push(
        `${step.technique}.${step.variant ?? ""}: said ${wrong.mark} at col ${wrong.cell % SIZE}\n` +
          `  row: ${row.map(m => (m === "sun" ? "O" : m === "moon" ? "#" : ".")).join("")}` +
          `  signs: ${links.map(l => `${l.a % SIZE}${l.kind === "same" ? "=" : "x"}${l.b % SIZE}`).join(",")}\n` +
          `  legal fillings: ${legal.map(f => f.map(m => (m === "sun" ? "O" : "#")).join("")).join(" ")}`
      )
    }
    expect(bad).toEqual([])
  })
})
