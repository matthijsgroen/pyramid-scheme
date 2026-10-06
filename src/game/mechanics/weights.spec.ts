import { describe, expect, it } from "vitest"
import { parseLock } from "../lockNotation"
import { stoneArrangements } from "./weights"

const lockOf = (text: string) => parseLock(text).lock

describe("stoneArrangements", () => {
  it("names an arrangement by its weighted plates, sorted, and the hand last", () => {
    const { states, initial } = stoneArrangements(lockOf("in -[b]- out\nb plate @in\na plate @in stone"))
    expect(initial).toBe("a")
    expect(states).toEqual(["a", "+ hand", "b"])
  })

  it("lifts only with empty hands and sets down only on an empty plate", () => {
    const { moves } = stoneArrangements(lockOf("in -[b]- out\nb plate @in\na plate @in stone"))
    expect(moves).toEqual([
      { from: "a", to: "+ hand", plate: "a" },
      { from: "+ hand", to: "a", plate: "a" },
      { from: "+ hand", to: "b", plate: "b" },
      { from: "b", to: "+ hand", plate: "b" },
    ])
  })

  it("opens a weighted gate while its plate holds a stone, and an :empty gate while it holds none", () => {
    const { opens } = stoneArrangements(lockOf("in -[b]- hall\nhall -[a:empty]- out\nb plate @in\na plate @in stone"))
    expect(opens).toEqual({ a: [], "+ hand": ["hall-out"], b: ["in-hall", "hall-out"] })
  })

  it("opens an unladen gate in every arrangement without a stone in hand", () => {
    const { opens, carrying } = stoneArrangements(lockOf("in -[unladen]- out\na plate @in stone"))
    expect(carrying).toEqual(["+ hand"])
    expect(opens).toEqual({ a: ["in-out"], "+ hand": [] })
  })

  it("reads several stone conditions on one gate under its mode", () => {
    const every = stoneArrangements(lockOf("in -[a+b]- out\na plate @in stone\nb plate @in stone"))
    expect(every.opens["a b"]).toEqual(["in-out"])
    expect(every.opens["a + hand"]).toEqual([])
    const any = stoneArrangements(lockOf("in -[a|b]- out\na plate @in stone\nb plate @in stone"))
    expect(any.opens["a + hand"]).toEqual(["in-out"])
  })

  it("keys an arrangement by sorted plate names whatever order the plates were declared in", () => {
    const { states, initial } = stoneArrangements(lockOf("in -[a+b]- out\nb plate @in stone\na plate @in stone"))
    expect(initial).toBe("a b")
    expect(states).toHaveLength(3)
    expect(new Set(states)).toEqual(new Set(["a b", "a + hand", "b + hand"]))
  })
})
