import { describe, expect, it } from "vitest"
import { compileLock } from "../lockCompile"
import { parseLock } from "../lockNotation"
import { isWeights } from "../obstacles"
import { arrangementOf, compileWeights, poolStones, stoneArrangements } from "./weights"

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
      { from: "a", to: "+ hand", kind: "lift", plate: "a" },
      { from: "+ hand", to: "a", kind: "set", plate: "a" },
      { from: "+ hand", to: "b", kind: "set", plate: "b" },
      { from: "b", to: "+ hand", kind: "lift", plate: "b" },
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
  const result = compileLock(parseLock(text).lock, { weights: "stonePlate", toggle: "handle", pipe: "stonePipe" })
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
    expect(arrangementOf("a.p a.q + hand")).toEqual({ weighted: ["a.p", "a.q"], holes: [], hand: true })
    expect(arrangementOf("+ hand")).toEqual({ weighted: [], holes: [], hand: true })
    expect(arrangementOf("a.p")).toEqual({ weighted: ["a.p"], holes: [], hand: false })
    expect(arrangementOf("none")).toEqual({ weighted: [], holes: [], hand: false })
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

describe("poolStones", () => {
  const controlOf = (text: string, namespace: string) => {
    const result = compileLock(parseLock(text, namespace).lock, { weights: "stonePlate" }, { namespace })
    if (!result.ok) throw new Error(JSON.stringify(result.faults))
    return result.fragment.controls.filter(isWeights)[0]
  }
  const a = controlOf("in -[p]- out\np plate @in\nshelf plate @in stone\nin ?\nout ?", "a")
  const b = controlOf("in -[q]- out\nq plate @in\nrest plate @in stone\nin ?\nout ?", "b")
  const pooled = poolStones("a.stones", [a, b], new Set())

  it("is each lock's own control where the pool holds one lock", () => {
    expect(poolStones("a.stones", [a], new Set())).toEqual(a)
  })

  it("holds every plate of both locks, and both stones where they start", () => {
    expect(pooled.plates.map(plate => plate.id)).toEqual(["a.p", "a.shelf", "b.q", "b.rest"])
    expect(pooled.initial).toBe("a.shelf b.rest")
  })

  it("sets a stone lifted in one lock on a plate of the other", () => {
    expect(pooled.moves).toContainEqual({ from: "a.shelf b.rest", to: "b.rest + hand", kind: "lift", plate: "a.shelf" })
    expect(pooled.moves).toContainEqual({ from: "b.rest + hand", to: "b.q b.rest", kind: "set", plate: "b.q" })
  })

  it("never lifts a second stone while one is in hand", () => {
    const fromCarrying = pooled.moves.filter(move => pooled.carrying.includes(move.from))
    expect(fromCarrying.length).toBeGreaterThan(0)
    for (const move of fromCarrying) expect(pooled.carrying).not.toContain(move.to)
  })

  it("opens a lock's gate on a stone on its plate, wherever the stone came from", () => {
    expect(pooled.opens["b.q b.rest"]).toEqual(["b.in-out"])
  })
})

describe("a stone pipe", () => {
  const PIPED = "in -- hall\nin -[q]- out\nshelf plate @in stone\nq plate @hall\nP pipe @in @hall"
  const { states, moves, initial } = stoneArrangements(lockOf(PIPED))

  it("posts a stone in hand at one hole and lays it in the other, leaving the hand empty", () => {
    expect(moves).toContainEqual({ from: "+ hand", to: "P@hall", kind: "post", hole: "P@in" })
    expect(moves).toContainEqual({ from: "+ hand", to: "P@in", kind: "post", hole: "P@hall" })
  })

  it("takes a stone out of the hole it lies in, with empty hands", () => {
    expect(moves).toContainEqual({ from: "P@hall", to: "+ hand", kind: "take", hole: "P@hall" })
    expect(moves.filter(move => move.from === "P@hall" && move.kind === "take")).toHaveLength(1)
  })

  it("posts nothing while either hole holds a stone", () => {
    const two = stoneArrangements(lockOf(`${PIPED}\nrest plate @in stone`))
    const posts = two.moves.filter(move => move.kind === "post")
    expect(posts.length).toBeGreaterThan(0)
    expect(posts.every(move => !arrangementOf(move.from).holes.length)).toBe(true)
    expect(two.states).toContain("rest P@hall")
    expect(two.states).toContain("P@hall + hand")
    expect(two.moves.filter(move => move.from === "P@hall + hand" && move.kind === "post")).toEqual([])
  })

  it("never creates or loses a stone: plates, holes and hand add up to the lock's stones in every arrangement", () => {
    const two = stoneArrangements(lockOf(`${PIPED}\nrest plate @in stone`))
    for (const key of two.states) {
      const { weighted, holes, hand } = arrangementOf(key)
      expect(weighted.length + holes.length + Number(hand)).toBe(2)
    }
    expect(states.every(key => arrangementOf(key).holes.length <= 1)).toBe(true)
  })

  it("starts a stone in the hole the line names", () => {
    const started = stoneArrangements(lockOf("in -- hall\nin -[q]- out\nq plate @in\nP pipe @in @hall stone"))
    expect(started.initial).toBe("P@hall")
    expect(started.moves).toContainEqual({ from: "P@hall", to: "+ hand", kind: "take", hole: "P@hall" })
  })

  it("leaves a pipe-free lock's arrangements as they were", () => {
    const plain = stoneArrangements(lockOf("in -[b]- out\nb plate @in\na plate @in stone"))
    expect(plain.states).toEqual(["a", "+ hand", "b"])
    expect(initial).toBe("shelf")
  })

  it("places a hole's moves at its hole's cell", () => {
    const control = controlOf(PIPED)
    const record = compileWeights(
      control,
      place => (place === "P@hall" ? [4, 4] : place === "P@in" ? [2, 2] : [0, 0]),
      id => ({ gateKeyId: `k:${id}` })
    )
    expect(record.transitions).toContainEqual({ from: "P@hall", to: "+ hand", at: [4, 4] })
    expect(record.transitions).toContainEqual({ from: "+ hand", to: "P@hall", at: [2, 2] })
  })
})
