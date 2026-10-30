import { describe, expect, it } from "vitest"
import { classifyMarkMove, openDecisions, openFocus, type MarkVocabulary } from "./markMoveEffect"

type Mark = "star" | "dark"
const vocab: MarkVocabulary<Mark> = { place: "star", ruleOut: "dark" }
const ruleOut = { decided: new Set([0, 1, 2]), action: "ruleOut" as const }
const place = { decided: new Set([3, 4]), action: "place" as const }
const board = (marks: Record<number, Mark>) => Array.from({ length: 9 }, (_, cell) => marks[cell])

describe("classifyMarkMove", () => {
  it("follows a tap that darkens one of several rule-out squares", () => {
    expect(classifyMarkMove(ruleOut, vocab, "tap", board({}), board({ 0: "dark" }))).toBe("follows")
  })

  it("completes on the tap that settles the last rule-out square", () => {
    const before = board({ 0: "dark", 1: "dark" })
    expect(classifyMarkMove(ruleOut, vocab, "tap", before, board({ 0: "dark", 1: "dark", 2: "dark" }))).toBe("move")
  })

  it("ends on a tap elsewhere", () => {
    expect(classifyMarkMove(ruleOut, vocab, "tap", board({}), board({ 8: "dark" }))).toBe("move")
  })

  it("ends on a tap that takes a decided square past its target", () => {
    expect(classifyMarkMove(ruleOut, vocab, "tap", board({ 0: "dark" }), board({ 0: "star" }))).toBe("move")
  })

  it("follows the dark mark on the way to a star", () => {
    expect(classifyMarkMove(place, vocab, "tap", board({}), board({ 3: "dark" }))).toBe("follows")
  })

  it("follows a star on one of several place squares and completes on the last", () => {
    expect(classifyMarkMove(place, vocab, "tap", board({ 3: "dark" }), board({ 3: "star" }))).toBe("follows")
    expect(
      classifyMarkMove(place, vocab, "tap", board({ 3: "star", 4: "dark" }), board({ 3: "star", 4: "star" }))
    ).toBe("move")
  })

  it("ends on a star at a square the hint did not name", () => {
    expect(classifyMarkMove(place, vocab, "tap", board({ 5: "dark" }), board({ 5: "star" }))).toBe("move")
  })

  it("ends every move on a mistake hint", () => {
    const mistake = { decided: new Set([0]), action: undefined }
    expect(classifyMarkMove(mistake, vocab, "tap", board({ 0: "star" }), board({}))).toBe("move")
  })

  it("follows a sweep that only darkens decided rule-out squares", () => {
    expect(classifyMarkMove(ruleOut, vocab, "sweep", board({}), board({ 0: "dark", 1: "dark" }))).toBe("follows")
  })

  it("ends a sweep that darkens anything else, or darkens place squares", () => {
    expect(classifyMarkMove(ruleOut, vocab, "sweep", board({}), board({ 0: "dark", 8: "dark" }))).toBe("move")
    expect(classifyMarkMove(place, vocab, "sweep", board({}), board({ 3: "dark" }))).toBe("move")
  })

  it("ends a sweep that completes the hint", () => {
    expect(classifyMarkMove(ruleOut, vocab, "sweep", board({}), board({ 0: "dark", 1: "dark", 2: "dark" }))).toBe(
      "move"
    )
  })

  it("looks when nothing on the board changes", () => {
    expect(classifyMarkMove(ruleOut, vocab, "tap", board({}), board({}))).toBe("look")
  })
})

describe("openDecisions and openFocus", () => {
  it("lists only the decisions not yet holding their target", () => {
    expect([...openDecisions(ruleOut, vocab, board({ 0: "dark" }))]).toEqual([1, 2])
    expect([...openDecisions(place, vocab, board({ 3: "dark" }))]).toEqual([3, 4])
  })

  it("moves the focus to the first open decision once its square is done", () => {
    expect(openFocus(0, new Set([1, 2]))).toBe(1)
    expect(openFocus(1, new Set([1, 2]))).toBe(1)
    expect(openFocus(0, new Set())).toBeUndefined()
  })
})
