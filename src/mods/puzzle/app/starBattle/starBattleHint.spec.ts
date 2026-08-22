import { describe, expect, it } from "vitest"
import en from "../../../../../public/locales/en/common.json"
import nl from "../../../../../public/locales/nl/common.json"
import { difficulties } from "@/data/difficultyLevels"
import { createStarBattleState, type CellMark } from "@/mods/puzzle/game/starBattle/starBattle"
import { STAR_BATTLE_CONFIG } from "@/mods/puzzle/game/starBattle/starBattleConfig"
import { generateStarBattle } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { STAR_BATTLE_TECHNIQUES } from "@/mods/puzzle/game/starBattle/techniques"
import { buildStarBattleHint } from "./starBattleHint"

const board = generateStarBattle(5, STAR_BATTLE_CONFIG.expert)
const answer = (): (CellMark | undefined)[] => board.solution.map(star => (star ? "star" : "dark"))

describe("star battle hints", () => {
  it("names a move on a fresh board, and points at what it reasons from", () => {
    const hint = buildStarBattleHint(board, createStarBattleState(board))
    expect(hint).toBeDefined()
    expect(hint!.cells.size).toBeGreaterThan(0)
    // The square it is about is drawn apart from the squares it argues from, and every square the step
    // settles is drawn too — its sentence talks about all of them.
    expect(hint!.focus).toBeDefined()
    expect(hint!.decided.has(hint!.focus!)).toBe(true)
  })

  it("calls out a wrong mark before advising anything else", () => {
    const marks = createStarBattleState(board).marks.slice()
    const wrong = board.solution.findIndex(star => !star)
    marks[wrong] = "star"
    const hint = buildStarBattleHint(board, { marks })
    expect(hint?.key).toBe("mistake")
    // A wrong mark has no evidence to argue from — it IS the thing being pointed at.
    expect([...hint!.decided]).toEqual([wrong])
    expect(hint!.focus).toBe(wrong)
    expect([...hint!.cells]).toEqual([])
  })

  it("calls out a wrong dark mark too, which is the mistake this family invites", () => {
    const marks = createStarBattleState(board).marks.slice()
    const star = board.solution.findIndex(Boolean)
    marks[star] = "dark"
    expect(buildStarBattleHint(board, { marks })?.key).toBe("mistake")
  })

  it("runs out of advice only once the board is done", () => {
    expect(buildStarBattleHint(board, { marks: answer() })).toBeUndefined()
  })

  it("never advises a guess, on any tier", { timeout: 120_000 }, () => {
    // Every reason the family can give is a forward deduction: a board only ships if the ladder settles it
    // step by step, so there is no rung that says "try a star and see the board break".
    for (const difficulty of difficulties) {
      const board = generateStarBattle(2, STAR_BATTLE_CONFIG[difficulty])
      const marks: (CellMark | undefined)[] = new Array(board.size ** 2).fill(undefined)
      for (let guard = 0; guard < 400; guard++) {
        const hint = buildStarBattleHint(board, { marks })
        if (!hint) break
        expect(hint.key, `${difficulty} advised a mistake`).not.toBe("mistake")
        expect(hint.focus).toBeDefined()
        marks[hint.focus!] = board.solution[hint.focus!] ? "star" : "dark"
      }
      expect(marks.every((mark, cell) => (mark === "star") === board.solution[cell])).toBe(true)
    }
  })
})

describe("every reason the ladder can give is phrased in both locales", () => {
  // A hint that reaches the player as a raw translation key is worse than no hint, so the keys are checked
  // against the ladder itself rather than against whatever the specs above happened to trip over.
  const keys = [
    "mistake",
    "touch",
    ...["row", "col", "region"].flatMap(group => [`groupFull.${group}`, `groupTight.${group}`]),
    ...["row", "col"].flatMap(line => [`regionLine.${line}`, `lineRegion.${line}`]),
    ...["toRows", "toCols", "fromRows", "fromCols"].map(way => `spanning.${way}`),
  ]

  // Every hint but the mistake one ends with an imperative naming the squares it marked, so both of those
  // have to be phrased too — a reason with no move is the hint doing half its job.
  const actions = ["ruleOut", "place"]

  const phrase = (block: Record<string, unknown>, key: string) => block[key]

  it("covers every rung of the ladder", () => {
    for (const technique of STAR_BATTLE_TECHNIQUES) expect(keys.some(key => key.startsWith(technique))).toBe(true)
  })

  it.each(keys)("%s reads as a sentence in English and Dutch", key => {
    expect(typeof phrase(en.starBattle.hint, key)).toBe("string")
    expect(typeof phrase(nl.starBattle.hint, key)).toBe("string")
  })

  it.each(actions)("the %s move is spelled out in both", action => {
    for (const locale of [en, nl])
      expect(typeof (locale.starBattle.hint.action as Record<string, string>)[action]).toBe("string")
  })

  it("asks for a move on every rung, and for none on a mistake", { timeout: 120_000 }, () => {
    // The action is derived from what the step decides, so a rung that places a star must ask for a star and
    // every other rung must ask for the ruling-out — a hint that named the wrong move would be worse than
    // silence.
    const board = generateStarBattle(9, STAR_BATTLE_CONFIG.master)
    const marks: (CellMark | undefined)[] = new Array(board.size ** 2).fill(undefined)
    const seen = new Set<string>()
    for (let guard = 0; guard < 400; guard++) {
      const hint = buildStarBattleHint(board, { marks })
      if (!hint) break
      expect(hint.action, hint.key).toBeDefined()
      seen.add(hint.action!)
      marks[hint.focus!] = board.solution[hint.focus!] ? "star" : "dark"
    }
    expect([...seen].sort()).toEqual(["place", "ruleOut"])

    const wrong = board.solution.findIndex(star => !star)
    const broken: (CellMark | undefined)[] = new Array(board.size ** 2).fill(undefined)
    broken[wrong] = "star"
    expect(buildStarBattleHint(board, { marks: broken })?.action).toBeUndefined()
  })

  it("has the goal and the rules in both", () => {
    for (const locale of [en, nl]) {
      // The goal is its own section above the rules (`puzzle-screens.md` §1), not a bullet in them.
      expect(typeof locale.starBattle.goal).toBe("string")
      for (const rule of ["touch", "enter"]) expect(typeof phrase(locale.starBattle.rules, rule)).toBe("string")
    }
  })
})
