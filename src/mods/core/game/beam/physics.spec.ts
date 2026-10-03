import { describe, it, expect } from "vitest"
import {
  angleFor,
  axisOf,
  BACKSLASH,
  cellKey,
  DIR,
  insideGrid,
  mod8,
  opposite,
  perpendicular,
  reflect,
  sameCell,
  SLASH,
  stepCell,
  stepsToEdge,
} from "./physics"

describe("reflect", () => {
  it("turns a beam a quarter turn off a diagonal mirror", () => {
    expect(reflect(SLASH, DIR.right)).toBe(DIR.up)
    expect(reflect(SLASH, DIR.down)).toBe(DIR.left)
    expect(reflect(BACKSLASH, DIR.right)).toBe(DIR.down)
    expect(reflect(BACKSLASH, DIR.up)).toBe(DIR.left)
  })

  it("sends a beam back the way it came when run backwards through the same mirror", () => {
    for (const angle of [SLASH, BACKSLASH])
      for (const travel of [DIR.right, DIR.up, DIR.left, DIR.down])
        expect(reflect(angle, opposite(reflect(angle, travel)))).toBe(opposite(travel))
  })
})

describe("angleFor", () => {
  it("names the mirror that makes a turn", () => {
    expect(angleFor(DIR.right, DIR.up)).toBe(SLASH)
    expect(angleFor(DIR.right, DIR.down)).toBe(BACKSLASH)
  })

  it("answers with nothing for a turn no mirror makes", () => {
    expect(angleFor(DIR.right, DIR.right)).toBeUndefined()
    expect(angleFor(DIR.right, DIR.left)).toBeUndefined()
    expect(angleFor(DIR.up, DIR.down)).toBeUndefined()
  })

  it("names a mirror that really does turn the beam that way", () => {
    for (const enter of [DIR.right, DIR.up, DIR.left, DIR.down])
      for (const exit of [DIR.right, DIR.up, DIR.left, DIR.down]) {
        const angle = angleFor(enter, exit)
        if (angle !== undefined) expect(reflect(angle, enter)).toBe(exit)
      }
  })
})

describe("perpendicular", () => {
  it("offers the two quarter turns off a beam", () => {
    expect(perpendicular(DIR.right)).toEqual([DIR.up, DIR.down])
    expect(perpendicular(DIR.up)).toEqual([DIR.left, DIR.right])
  })

  it("offers them in the same order to a beam and to one coming the other way", () => {
    for (const direction of [DIR.right, DIR.up, DIR.left, DIR.down])
      expect(perpendicular(direction)).toEqual(perpendicular(opposite(direction)))
  })
})

describe("stepsToEdge", () => {
  it("counts the cells ahead of a beam", () => {
    expect(stepsToEdge(7, { row: 3, col: 0 }, DIR.right)).toBe(6)
    expect(stepsToEdge(7, { row: 3, col: 6 }, DIR.right)).toBe(0)
    expect(stepsToEdge(7, { row: 2, col: 3 }, DIR.up)).toBe(2)
  })

  it("stops a diagonal at whichever edge it meets first", () => {
    expect(stepsToEdge(7, { row: 5, col: 1 }, DIR.upRight)).toBe(5)
    expect(stepsToEdge(7, { row: 1, col: 5 }, DIR.upRight)).toBe(1)
  })
})

describe("the grid", () => {
  it("steps one cell per direction", () => {
    expect(stepCell({ row: 3, col: 3 }, DIR.up)).toEqual({ row: 2, col: 3 })
    expect(stepCell({ row: 3, col: 3 }, DIR.downRight)).toEqual({ row: 4, col: 4 })
  })

  it("knows what falls outside it", () => {
    expect(insideGrid(5, { row: 0, col: 4 })).toBe(true)
    expect(insideGrid(5, { row: -1, col: 0 })).toBe(false)
    expect(insideGrid(5, { row: 0, col: 5 })).toBe(false)
  })

  it("names a cell by where it is, and compares by the same", () => {
    expect(cellKey({ row: 2, col: 3 })).toBe("2,3")
    expect(sameCell({ row: 2, col: 3 }, { row: 2, col: 3 })).toBe(true)
    expect(sameCell({ row: 2, col: 3 }, { row: 3, col: 2 })).toBe(false)
  })
})

describe("directions", () => {
  it("wraps round the eight", () => {
    expect(mod8(9)).toBe(1)
    expect(mod8(-1)).toBe(7)
  })

  it("turns a direction back on itself", () => {
    expect(opposite(DIR.right)).toBe(DIR.left)
    expect(opposite(DIR.upRight)).toBe(DIR.downLeft)
  })

  it("puts a direction and its opposite on one line", () => {
    for (const direction of [DIR.right, DIR.upRight, DIR.up, DIR.upLeft])
      expect(axisOf(direction)).toBe(axisOf(opposite(direction)))
  })
})
