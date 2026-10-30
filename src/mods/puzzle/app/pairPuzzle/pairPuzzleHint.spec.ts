import { describe, expect, it } from "vitest"
import en from "../../../../../public/locales/en/common.json"
import nl from "../../../../../public/locales/nl/common.json"
import { createPairState } from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import type { PairMark } from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import { generatePairPuzzle } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import { PAIR_PUZZLE_CONFIG } from "@/mods/puzzle/game/pairPuzzle/pairPuzzleConfig"
import { PAIR_TECHNIQUES } from "@/mods/puzzle/game/pairPuzzle/techniques"
import { buildPairHint } from "./pairPuzzleHint"

const board = generatePairPuzzle(3, PAIR_PUZZLE_CONFIG.master)

describe("pair puzzle hints", () => {
  it("names a move on a fresh board, and points at what it reasons from", () => {
    const hint = buildPairHint(board, createPairState(board))
    expect(hint).toBeDefined()
    expect(hint!.decided.has(hint!.focus!)).toBe(true)
  })

  it("calls out a wrong piece before advising anything else", () => {
    const marks = createPairState(board).marks.slice()
    const wrong = board.solution.findIndex((piece, cell) => !piece && !board.anchors[cell])
    marks[wrong] = "piece"
    const hint = buildPairHint(board, { marks })
    expect(hint?.key).toBe("mistake")
    expect(hint!.focus).toBe(wrong)
    expect(hint!.action).toBeUndefined()
  })

  it("runs out of advice once the board is done", () => {
    const marks = board.solution.map((piece, cell): PairMark | undefined =>
      board.anchors[cell] ? undefined : piece ? "piece" : "empty"
    )
    expect(buildPairHint(board, { marks })).toBeUndefined()
  })

  it("never decides an anchor cell, from 20 player-reachable states", { timeout: 120_000 }, () => {
    for (const difficulty of ["master", "wizard"] as const) {
      const puzzle = generatePairPuzzle(5, PAIR_PUZZLE_CONFIG[difficulty])
      const marks: (PairMark | undefined)[] = new Array(puzzle.size ** 2).fill(undefined)
      let seen = 0
      for (let guard = 0; guard < 20; guard++) {
        const hint = buildPairHint(puzzle, { marks })
        if (!hint) break
        seen++
        for (const cell of hint.decided) expect(puzzle.anchors[cell], `${difficulty} decided ${cell}`).toBe(false)
        expect(puzzle.anchors[hint.focus!], "focus").toBe(false)
        marks[hint.focus!] = puzzle.solution[hint.focus!] ? "piece" : "empty"
      }
      expect(seen).toBeGreaterThan(0)
    }
  })

  it("never advises a mistake while the player follows it", { timeout: 120_000 }, () => {
    const puzzle = generatePairPuzzle(2, PAIR_PUZZLE_CONFIG.wizard)
    const marks: (PairMark | undefined)[] = new Array(puzzle.size ** 2).fill(undefined)
    for (let guard = 0; guard < 400; guard++) {
      const hint = buildPairHint(puzzle, { marks })
      if (!hint) break
      expect(hint.key).not.toBe("mistake")
      for (const cell of hint.decided) marks[cell] = puzzle.solution[cell] ? "piece" : "empty"
    }
    expect(buildPairHint(puzzle, { marks })).toBeUndefined()
  })
})

describe("mummy rest copy", () => {
  const lines = ["row", "col"]
  const plural = (key: string) => [`${key}_one`, `${key}_other`]
  const keys = [
    "mistake",
    "touch",
    ...lines.map(line => `zeroLine.${line}`),
    "noAnchor",
    ...lines.flatMap(line => plural(`lineFull.${line}`)),
    ...lines.flatMap(line => plural(`lineTight.${line}`)),
    "onlyWay",
    "claimed",
    ...["rowsToCols", "colsToRows"].flatMap(variant => plural(`lineBlock.${variant}`)),
    ...["row", "col", "anchor"].map(variant => `wouldStrand.${variant}`),
    ...["ruleOut_one", "ruleOut_other", "place_one", "place_other"].map(move => `action.${move}`),
  ]

  it("covers every rung of the ladder", () => {
    for (const technique of PAIR_TECHNIQUES) expect(keys.some(key => key.startsWith(technique))).toBe(true)
  })

  it.each(keys)("%s reads as a sentence in English and Dutch", key => {
    for (const locale of [en, nl]) {
      const block = locale.pairPuzzle.hint.mummies as unknown as Record<string, unknown>
      const phrase = key.startsWith("action.") ? (block.action as Record<string, string>)[key.slice(7)] : block[key]
      expect(typeof phrase).toBe("string")
    }
  })

  it("has the name, the goal and the four rules in both", () => {
    for (const locale of [en, nl]) {
      expect(typeof locale.pairPuzzle.name.mummies).toBe("string")
      expect(typeof locale.pairPuzzle.goal.mummies).toBe("string")
      const rules = locale.pairPuzzle.rules.mummies as Record<string, string>
      for (const rule of ["pair", "count", "touch", "enter"]) expect(typeof rules[rule], rule).toBe("string")
    }
  })
})
