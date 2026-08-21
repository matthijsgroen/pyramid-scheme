import { describe, expect, it } from "vitest"
import { cellAt, type EclipsePuzzle, type Mark } from "./eclipse"
import { techniquesUpTo } from "./generateEclipse"
import { ECLIPSE_HINT_ORDER, ECLIPSE_TECHNIQUES, nextEclipseStep } from "./techniques"

const SIZE = 6
const S: Mark = "sun"
const M: Mark = "moon"

const board = (given: (Mark | undefined)[], links: EclipsePuzzle["links"] = []): EclipsePuzzle => ({
  size: SIZE,
  given,
  links,
})

const empty = () => new Array<Mark | undefined>(SIZE * SIZE).fill(undefined)

describe("eclipse techniques", () => {
  it("forces the squares beside a line's matching ends, and says why", () => {
    const given = empty()
    given[cellAt(SIZE, 0, 0)] = S
    given[cellAt(SIZE, 0, 5)] = S
    const puzzle = board(given)
    // Three of each per line, so the four middle cells hold one sun and three moons — and any sun beside an
    // end runs three moons together.
    const step = nextEclipseStep(puzzle, [...given], techniquesUpTo("squeeze"))
    // One sun left for four squares: put it beside an end and the three moons left over run together. The
    // squeeze reports that one square at a time, with the run it would create as its reason.
    expect(step?.technique).toBe("squeeze")
    expect(step?.variant).toBe("triple")
    expect(step?.decisions).toEqual([{ cell: cellAt(SIZE, 0, 1), mark: M }])
  })

  it("fills a two-gap line the way that does not copy a finished one", () => {
    const given = empty()
    // Row 0 finished, row 1 the same but for two gaps — filling them like row 0 would copy it.
    const row0: Mark[] = [S, S, M, M, S, M]
    row0.forEach((mark, col) => (given[cellAt(SIZE, 0, col)] = mark))
    row0.forEach((mark, col) => (given[cellAt(SIZE, 1, col)] = col === 1 || col === 2 ? undefined : mark))
    // Asked for by name: two suns stacked in a column give `noTriple` a cheaper reason on this board, and
    // the ladder always says the cheapest one.
    const step = nextEclipseStep(board(given), [...given], ["noCopy"])
    expect(step?.technique).toBe("noCopy")
    expect(step?.decisions).toEqual([
      { cell: cellAt(SIZE, 1, 1), mark: M },
      { cell: cellAt(SIZE, 1, 2), mark: S },
    ])
  })

  it("rules a matching pair out of the mark standing beside it", () => {
    const given = empty()
    // A sun above, and a pair below it that must match: taking the sun would be three in a row.
    given[cellAt(SIZE, 0, 0)] = S
    const links: EclipsePuzzle["links"] = [{ a: cellAt(SIZE, 1, 0), b: cellAt(SIZE, 2, 0), kind: "same" }]
    const step = nextEclipseStep(board(given, links), [...given], ["signPair"])
    expect(step?.technique).toBe("signPair")
    expect(step?.decisions).toEqual([
      { cell: cellAt(SIZE, 1, 0), mark: M },
      { cell: cellAt(SIZE, 2, 0), mark: M },
    ])
  })

  it("reads a sign next to a filled square", () => {
    const given = empty()
    given[0] = S
    const step = nextEclipseStep(board(given, [{ a: 0, b: 1, kind: "different" }]), [...given], techniquesUpTo("sign"))
    expect(step?.technique).toBe("sign")
    expect(step?.decisions).toEqual([{ cell: 1, mark: M }])
  })

  it("takes the cheapest reason available, not the strongest", () => {
    const given = empty()
    given[0] = S
    given[1] = S
    // Both `sign` and `noTriple` fire here; the ladder's order is what decides which one is said.
    const step = nextEclipseStep(board(given, [{ a: 0, b: 6, kind: "same" }]), [...given])
    expect(step?.technique).toBe("sign")
  })
})

describe("the two orders", () => {
  it("lists every rung exactly once in the hint order as well as the ladder", () => {
    expect([...ECLIPSE_HINT_ORDER].sort()).toEqual([...ECLIPSE_TECHNIQUES].sort())
  })

  it("asks for a sign first and a line's count second, which is what a player spots first", () => {
    expect(ECLIPSE_HINT_ORDER.slice(0, 2)).toEqual(["sign", "lineCount"])
  })
})
