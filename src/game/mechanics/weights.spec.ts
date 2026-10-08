import { describe, expect, it } from "vitest"
import { compileLock } from "../lockCompile"
import { parseLock } from "../lockNotation"
import { isWeights } from "../obstacles"
import { arrangementOf, compileWeights, stoneArrangements } from "./weights"

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

  it("treats a lever named like an Object.prototype key as a mechanic, never a plate", () => {
    const text = "in -[constructor+p]- out\np plate @in stone\nconstructor toggle @in"
    const { opens } = stoneArrangements(lockOf(text))
    expect(opens).toEqual({ p: ["in-out"], "+ hand": [] })
    expect(controlOf(text).plates.map(plate => plate.id)).toEqual(["p"])
  })

  it("keys an arrangement by sorted plate names whatever order the plates were declared in", () => {
    const { states, initial } = stoneArrangements(lockOf("in -[a+b]- out\nb plate @in stone\na plate @in stone"))
    expect(initial).toBe("a b")
    expect(states).toHaveLength(3)
    expect(new Set(states)).toEqual(new Set(["a b", "a + hand", "b + hand"]))
  })
})

const controlOf = (text: string) => {
  const result = compileLock(parseLock(text).lock, { weights: "stonePlate", toggle: "handle" })
  if (!result.ok) throw new Error(JSON.stringify(result.faults))
  return result.fragment.controls.find(isWeights)!
}
const cells: Record<string, [number, number]> = { a: [0, 0], b: [0, 2] }
const recordOf = (text: string, mode?: "any") =>
  compileWeights(
    controlOf(text),
    p => cells[p],
    id => ({ gateKeyId: `k:${id}`, ...(mode ? { mode } : {}) })
  )

describe("compileWeights", () => {
  it("places every lift and set-down at its plate's cell, from the arrangement it leaves", () => {
    const record = recordOf("in -[b]- out\nb plate @in\na plate @in stone")
    expect(record).toMatchObject({ initial: "a", returnsToInitial: true, placedOnly: true, carrying: ["+ hand"] })
    expect(record.transitions).toContainEqual({ from: "+ hand", to: "b", at: [0, 2] })
    expect(record.positions).toEqual([{ state: "b", gateKeyId: "k:in-out" }])
  })

  it("stands an :empty gate open in the arrangement the floor starts in", () => {
    const record = recordOf("in -[b:empty]- out\nb plate @in\na plate @in stone")
    expect(record.initial).toBe("a")
    expect(record.positions).toContainEqual({ state: record.initial, gateKeyId: "k:in-out" })
  })

  it("keeps a gate's mode, so the door folds the stones with a lever by it", () => {
    const record = recordOf("in -[b|L]- out\nb plate @in\na plate @in stone\nL toggle @in", "any")
    expect(record.positions).toEqual([{ state: "b", gateKeyId: "k:in-out", mode: "any" }])
  })

  it("lists a plate+lever gate under every arrangement its plate holds, whatever the lever says", () => {
    const record = recordOf("in -[a+L]- out\na plate @in stone\nb plate @in\nL toggle @in")
    expect(record.positions).toEqual([{ state: "a", gateKeyId: "k:in-out" }])
  })

  it("lists a plate|plate|lever gate under every arrangement where either plate term holds", () => {
    const record = recordOf("in -[a|b|L]- out\na plate @in stone\nb plate @in\nL toggle @in", "any")
    expect(record.positions.map(p => p.state)).toEqual(["a", "b"])
    expect(record.positions.every(p => p.mode === "any")).toBe(true)
  })
})

describe("arrangementOf", () => {
  it("reads back every key stoneArrangements writes", () => {
    const { states } = stoneArrangements(lockOf("in -[a+b]- out\na plate @in stone\nb plate @in stone\nc plate @in"))
    for (const key of states) {
      const { weighted, hand } = arrangementOf(key)
      const rewritten = [...weighted.sort(), ...(hand ? ["+ hand"] : [])].join(" ") || "none"
      expect(rewritten).toBe(key)
    }
  })

  it("names the plates holding a stone and whether the hand holds one", () => {
    expect(arrangementOf("a.p a.q + hand")).toEqual({ weighted: ["a.p", "a.q"], hand: true })
    expect(arrangementOf("+ hand")).toEqual({ weighted: [], hand: true })
    expect(arrangementOf("a.p")).toEqual({ weighted: ["a.p"], hand: false })
    expect(arrangementOf("none")).toEqual({ weighted: [], hand: false })
  })
})

describe("the explorer's weight", () => {
  it("lists, for every arrangement and every plate empty in it, what pressing that plate opens", () => {
    const { underfoot } = stoneArrangements(lockOf("in -[b]- out\nb plate @in\na plate @in stone"))
    expect(underfoot).toEqual([
      { from: "a", plate: "b", opens: ["in-out"] },
      { from: "+ hand", plate: "a", opens: [] },
      { from: "+ hand", plate: "b", opens: ["in-out"] },
      { from: "b", plate: "a", opens: ["in-out"] },
    ])
  })

  it("is placed at the pressed plate's cell, each gate as its door asks for it", () => {
    const record = recordOf("in -[b]- out\nb plate @in\na plate @in stone")
    expect(record.underfoot).toContainEqual({ from: "a", at: [0, 2], opens: [{ gateKeyId: "k:in-out" }] })
  })

  it("shuts an :empty way while the plate it waits on is pressed", () => {
    const { underfoot } = stoneArrangements(lockOf("in -[b:empty]- out\nb plate @in\na plate @in stone"))
    expect(underfoot).toContainEqual({ from: "a", plate: "b", opens: [] })
  })
})

describe("a gate's stone terms", () => {
  it("names each plate a gate waits on and what it wants of it", () => {
    const control = controlOf("in -[a+b:empty]- out\na plate @in stone\nb plate @in")
    expect(control.terms).toEqual({
      "in-out": [
        { kind: "plate", plate: "a", wants: "stone" },
        { kind: "plate", plate: "b", wants: "empty" },
      ],
    })
  })

  it("is carried on the record under the key the door asks for", () => {
    const record = recordOf("in -[b]- out\nb plate @in\na plate @in stone")
    expect(record.weighs).toEqual([{ gateKeyId: "k:in-out", terms: [{ kind: "plate", plate: "b", wants: "stone" }] }])
  })
})
