import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { DIRS2, makePkey } from "./grid"
import { growMaze } from "./growMaze"

describe("growMaze", () => {
  const prep = prepOf(plainFloor({ pathPuzzles: 3 }))
  const grown = (attempt: number) => {
    const state = { ...freshState(prep, attempt), lay: null }
    growMaze(prep, state)
    return state.maze!
  }

  it("enters from a node on the grid's edge", () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const { n, entrance } = grown(attempt)
      const [r, c] = entrance
      expect([r, c].every(v => v % 2 === 0)).toBe(true)
      expect(r === 0 || c === 0 || r === n - 1 || c === n - 1).toBe(true)
    }
  })

  it("leaves the exit one passage, back along the main path", () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const { n, exit, mainPath, passages } = grown(attempt)
      const pkey = makePkey(n)
      const open = DIRS2.filter(([dr, dc]) => passages.has(pkey(exit[0], exit[1], exit[0] + dr, exit[1] + dc)))
      const [pr, pc] = mainPath[mainPath.length - 2]
      expect(open).toEqual([[pr - exit[0], pc - exit[1]]])
    }
  })
})
