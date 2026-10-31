import { describe, expect, it } from "vitest"
import {
  classifyItemMove,
  classifyMarkMove,
  cycleDecision,
  openDecisions,
  openFocus,
  openItems,
  type Decision,
  type MarkVocabulary,
} from "./markMoveEffect"

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

  it("ends every move on a mistake hint, and keeps it through a tap that changes nothing", () => {
    const mistake = { decided: new Set([0]), action: undefined }
    expect(classifyMarkMove(mistake, vocab, "tap", board({ 0: "star" }), board({}))).toBe("move")
    expect(classifyMarkMove(mistake, vocab, "tap", board({ 0: "star" }), board({ 0: "star" }))).toBe("look")
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

describe("cycleDecision", () => {
  const cycle = [undefined, "sun", "moon"] as const
  const moon = cycleDecision<(typeof cycle)[number]>(cycle, "moon")
  const sun = cycleDecision<(typeof cycle)[number]>(cycle, "sun")

  it("follows the target, and a value the cycle passes on the way to it", () => {
    expect(moon.follows(undefined, "sun")).toBe(true)
    expect(moon.follows("sun", "moon")).toBe(true)
    expect(sun.follows(undefined, "sun")).toBe(true)
  })

  it("does not follow a value past the target, or back to the cycle's start", () => {
    expect(sun.follows("sun", "moon")).toBe(false)
    expect(moon.follows("moon", undefined)).toBe(false)
  })

  it("follows nothing toward a target the cycle never reaches", () => {
    const short = cycleDecision<string | undefined>([undefined, "dark"], "star")
    expect(short.follows(undefined, "dark")).toBe(false)
    expect(short.follows(undefined, "star")).toBe(false)
  })

  it("holds only on the target", () => {
    expect(moon.holds("moon")).toBe(true)
    expect(moon.holds("sun")).toBe(false)
  })
})

describe("openDecisions and openFocus", () => {
  it("lists only the decisions not yet holding their target", () => {
    expect([...openDecisions(ruleOut, vocab, board({ 0: "dark" }))]).toEqual([1, 2])
    expect([...openDecisions(place, vocab, board({ 3: "dark" }))]).toEqual([3, 4])
    expect([...openDecisions({ decided: new Set([0]), action: undefined }, vocab, board({ 0: "star" }))]).toEqual([0])
  })

  it("moves the focus to the first open decision once its square is done", () => {
    expect(openFocus(0, new Set([1, 2]))).toBe(1)
    expect(openFocus(1, new Set([1, 2]))).toBe(1)
    expect(openFocus(0, new Set())).toBeUndefined()
  })
})

describe("classifyItemMove and openItems", () => {
  // Items are strings and values are counts: a target of two is reached through one, and never past two.
  const toward = (target: number): Decision<number> => ({
    holds: value => value === target,
    follows: (_before, after) => after <= target && after > _before,
  })
  const decisions = new Map([
    ["a", toward(2)],
    ["b", toward(1)],
  ])
  const items = ["a", "b"]
  const read = (values: Record<string, number>) => (item: string) => values[item] ?? 0
  const move = (before: Record<string, number>, after: Record<string, number>, changed: string[]) =>
    classifyItemMove(items, decisions, changed, read(before), read(after))

  it("follows a change that gets closer while another decision is still open", () => {
    expect(move({}, { a: 1 }, ["a"])).toBe("follows")
  })

  it("completes on the change that leaves every decision holding", () => {
    expect(move({ a: 2 }, { a: 2, b: 1 }, ["b"])).toBe("move")
  })

  it("ends on a change past the target, to an item without a decision, or from a mistake hint", () => {
    expect(move({ b: 1 }, { b: 2 }, ["b"])).toBe("move")
    expect(move({}, { c: 1 }, ["c"])).toBe("move")
    expect(classifyItemMove(items, new Map(), ["a"], read({}), read({ a: 1 }))).toBe("move")
  })

  it("looks when nothing changed", () => {
    expect(move({}, {}, [])).toBe("look")
  })

  it("lists the items not holding yet, and keeps an item without a decision open", () => {
    expect([...openItems(items, decisions, read({ a: 2 }))]).toEqual(["b"])
    expect([...openItems(["x"], decisions, read({}))]).toEqual(["x"])
  })
})
