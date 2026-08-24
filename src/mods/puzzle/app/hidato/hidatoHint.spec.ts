import { describe, expect, it } from "vitest"
import { generateHidato } from "@/mods/puzzle/game/hidato/generateHidato"
import { HIDATO_CONFIG } from "@/mods/puzzle/game/hidato/hidatoConfig"
import { hexKey } from "@/mods/puzzle/game/hidato/hex"
import { buildHidatoHint } from "./hidatoHint"

const board = generateHidato(3, HIDATO_CONFIG.starter)

/** The cell the answer puts a given number in. */
const cellOf = (value: number) => Object.entries(board.solution).find(([, other]) => other === value)![0]

describe("the hidato hint", () => {
  it("names a reason, a number to write, and the one cell it settles", () => {
    const hint = buildHidatoHint(board, board.givens, board.solution, board.pruning)!
    expect(hint.place).toBe(board.solution[hint.cell])
    expect(hint.key).toBeTruthy()
    // Whatever the reason argues from, it never argues from the cell it is settling: evidence and
    // conclusion are marked differently and must not be the same cell (puzzle-screens.md §4.2).
    expect(hint.evidence.has(hint.cell)).toBe(false)
  })

  it("points at the wrong number before anything else, and asks for nothing", () => {
    const wrongCell = board.cells.map(hexKey).find(key => board.givens[key] === undefined)!
    const hint = buildHidatoHint(
      board,
      { ...board.givens, [wrongCell]: board.solution[wrongCell] + 1 },
      board.solution,
      board.pruning
    )!
    expect(hint.key).toBe("mistake")
    expect(hint.cell).toBe(wrongCell)
    // Every other rung ends in a move; the way out of a wrong number is the player's to find.
    expect(hint.place).toBeUndefined()
  })

  it("runs out of things to say on a finished board", () => {
    expect(buildHidatoHint(board, board.solution, board.solution, board.pruning)).toBeUndefined()
  })

  it("reads the board the player left, so following the advice moves it on", () => {
    const first = buildHidatoHint(board, board.givens, board.solution, board.pruning)!
    const next = buildHidatoHint(board, { ...board.givens, [first.cell]: first.place! }, board.solution, board.pruning)!
    expect(next.cell).not.toBe(first.cell)
    expect(cellOf(first.place!)).toBe(first.cell)
  })
})
