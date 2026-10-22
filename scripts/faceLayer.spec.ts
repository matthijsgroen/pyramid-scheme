import { describe, expect, it } from "vitest"
import { boxOf, diffMask, faceRegion, squaredDistanceTo } from "./faceLayer"

/** A picture of `.` white and `#` black, read as RGB the way sharp hands it over. */
const picture = (rows: string[]) => {
  const width = rows[0].length
  const data = new Uint8Array(width * rows.length * 3)
  rows.forEach((row, y) =>
    [...row].forEach((cell, x) => data.fill(cell === "#" ? 0 : 255, (y * width + x) * 3, (y * width + x) * 3 + 3))
  )
  return { data, width, height: rows.length }
}

/** A mask of `#` set and `.` clear. */
const mask = (rows: string[]) => {
  const width = rows[0].length
  const bits = new Uint8Array(width * rows.length)
  rows.forEach((row, y) => [...row].forEach((cell, x) => (bits[y * width + x] = cell === "#" ? 1 : 0)))
  return { bits, width, height: rows.length }
}

const draw = (bits: Uint8Array, width: number) =>
  Array.from({ length: bits.length / width }, (_, y) =>
    Array.from(bits.subarray(y * width, (y + 1) * width), b => (b ? "#" : ".")).join("")
  )

describe("diffMask", () => {
  it("marks the pixels that changed between the base and the expression", () => {
    const base = picture(["....", ".##.", "...."])
    const worried = picture(["....", ".#..", "...#"])

    expect(
      draw(diffMask({ a: base.data, b: worried.data, width: 4, height: 3, channels: 3, threshold: 64 }), 4)
    ).toEqual(["....", "..#.", "...#"])
  })

  it("ignores a change within the threshold — compression noise is not an expression", () => {
    const base = new Uint8Array([200, 200, 200])
    const noisy = new Uint8Array([230, 180, 210])

    expect([...diffMask({ a: base, b: noisy, width: 1, height: 1, channels: 3, threshold: 64 })]).toEqual([0])
  })
})

describe("squaredDistanceTo", () => {
  it("is the squared distance to the nearest set pixel", () => {
    const { bits, width, height } = mask(["#....", "....."])

    expect([...squaredDistanceTo(bits, width, height)]).toEqual([0, 1, 4, 9, 16, 1, 2, 5, 10, 17])
  })

  it("is infinite everywhere when nothing is set", () => {
    const { bits, width, height } = mask(["..", ".."])

    expect([...squaredDistanceTo(bits, width, height)].every(d => d === Infinity)).toBe(true)
  })
})

describe("faceRegion", () => {
  it("drops a thin stroke — an outline redrawn a pixel over is not the face", () => {
    const { bits, width, height } = mask([".........", "#########", "........."])

    expect([...faceRegion(bits, width, height, { erode: 1, grow: 0 })].every(b => b === 0)).toBe(true)
  })

  it("keeps a solid change and grows it outward by the grow radius", () => {
    const { bits, width, height } = mask([
      ".........",
      ".........",
      ".........",
      "...###...",
      "...###...",
      "...###...",
      ".........",
      ".........",
      ".........",
    ])

    expect(draw(faceRegion(bits, width, height, { erode: 1, grow: 2 }), width)).toEqual([
      ".........",
      "....#....",
      "..#####..",
      "..#####..",
      ".#######.",
      "..#####..",
      "..#####..",
      "....#....",
      ".........",
    ])
  })
})

describe("boxOf", () => {
  it("is the bounding box of the set pixels", () => {
    const { bits, width, height } = mask([".....", "..#..", "...#.", "....."])

    expect(boxOf(bits, width, height)).toEqual({ left: 2, top: 1, width: 2, height: 2 })
  })

  it("is undefined for an empty mask — two masters that do not differ", () => {
    const { bits, width, height } = mask(["..", ".."])

    expect(boxOf(bits, width, height)).toBeUndefined()
  })
})
