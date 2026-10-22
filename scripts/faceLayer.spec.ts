import { describe, expect, it } from "vitest"
import { boxOf, diffMask, faceRegion, frontRegion, squaredDistanceTo } from "./faceLayer"

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

    expect([...faceRegion(bits, width, height, { erode: 1, grow: 0, spread: 5, link: 2 })].every(b => b === 0)).toBe(
      true
    )
  })

  // A 5x5 change opens to a 3x3 core of 9, which reaches 5 * 3 = 15; a 3x3 change to a speck of 1. Erode 1 +
  // grow 1 grows a core by 2, so a speck joins where its grown region meets the face's (4) plus the stroke
  // the opening took (2): cores at most 6 apart.
  const face = (rows: string[]) => {
    const { bits, width, height } = mask(rows)
    return boxOf(faceRegion(bits, width, height, { erode: 1, grow: 1, spread: 5, link: 2 }), width, height)
  }
  const head = [".#####", ".#####", ".#####", ".#####", ".#####"]
  const row = (head: string, gap: number, part: string) =>
    head + ".".repeat(gap) + part + ".".repeat(30 - gap - part.length)

  it("drops a speck far from the face — an outline redrawn at the boots is not part of it", () => {
    const speck = ["...", "###", "###", "###", "..."]
    const rows = head.map((h, y) => row(h, 20, speck[y]))

    expect(face(rows)).toEqual({ left: 0, top: 0, width: 7, height: 5 })
  })

  it("keeps a speck whose grown edge meets the face's — a stray pixel beside the cheek", () => {
    const speck = ["...", "###", "###", "###", "..."]
    const rows = head.map((h, y) => row(h, 1, speck[y]))

    expect(face(rows)?.width).toBe(11)
  })

  it("does not walk from speck to speck — a sub-pixel shift leaves them all down a figure", () => {
    const specks = ["...............", ".###..###..###.", ".###..###..###.", ".###..###..###.", "..............."]
    const rows = head.map((h, y) => row(h, 0, specks[y]))

    expect(face(rows)?.width).toBe(11)
  })

  it("keeps a part of the face that does not touch it within its reach — a floating brow, a sweat drop", () => {
    const brow = [".#####", ".#####", ".#####", ".#####", ".#####"]
    const rows = head.map((h, y) => row(h, 8, brow[y]))

    expect(face(rows)?.width).toBe(21)
  })

  it("drops a part beyond its reach of the face, however solid", () => {
    const remnant = [".#####", ".#####", ".#####", ".#####", ".#####"]
    const rows = head.map((h, y) => row(h, 20, remnant[y]))

    expect(face(rows)).toEqual({ left: 0, top: 0, width: 7, height: 5 })
  })

  it("keeps the face as the LARGEST change, wherever it is", () => {
    const big = ["#######", "#######", "#######", "#######", "#######"]
    const rows = head.map((h, y) => row(h, 20, big[y]))

    expect(face(rows)?.left).toBe(25)
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

    expect(draw(faceRegion(bits, width, height, { erode: 1, grow: 2, spread: 5, link: 2 }), width)).toEqual([
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

describe("frontRegion", () => {
  const reach = mask(["..........", ".######...", ".######...", ".######...", ".######...", ".######...", ".........."])
  const front = (changed: Uint8Array, options: { erode?: number; close?: number; grow?: number } = {}) =>
    frontRegion(changed, reach.bits, 10, 7, { erode: 1, close: 0, grow: 0, spread: 5, link: 2, ...options })

  it("is what the pose added inside a face layer's reach, cut off where the reach ends", () => {
    const straw = mask([
      "..........",
      "..........",
      "....######",
      "....######",
      "....######",
      "....######",
      "..........",
    ])

    expect(draw(front(straw.bits), 10)).toEqual([
      "..........",
      "..........",
      ".....##...",
      "....###...",
      "....###...",
      ".....##...",
      "..........",
    ])
  })

  it("is empty when the head was only redrawn a sub-pixel over, far from what the pose moved", () => {
    const head = mask(Array.from({ length: 7 }, () => "#####" + ".".repeat(25)))
    const eyes = mask([
      "..............................",
      ".###..........................",
      ".###..........................",
      ".###..........................",
      "..............................",
      "..............................",
      "..............................",
    ])
    const arm = mask(Array.from({ length: 7 }, () => ".".repeat(22) + "########"))
    const changed = eyes.bits.map((b, i) => b | arm.bits[i])

    expect(
      boxOf(frontRegion(changed, head.bits, 30, 7, { erode: 1, close: 0, grow: 0, spread: 5, link: 2 }), 30, 7)
    ).toBeUndefined()
  })

  it("is empty when the pose changed only outside every face's reach — a raised arm is no foreground", () => {
    const arm = mask([".......###", ".......###", ".......###", ".......###", "..........", "..........", ".........."])

    expect(boxOf(front(arm.bits), 10, 7)).toBeUndefined()
  })

  it("drops a hairline — an outline redrawn a pixel over is in front of nothing", () => {
    const outline = mask([
      "..........",
      "..........",
      ".#######..",
      "..........",
      "..........",
      "..........",
      "..........",
    ])

    expect(boxOf(front(outline.bits), 10, 7)).toBeUndefined()
  })

  it("closes a gap where the object's outline crosses the head's own and so did not change", () => {
    const crossed = mask([
      "..........",
      ".###.###..",
      ".###.###..",
      ".###.###..",
      ".###.###..",
      ".###.###..",
      "..........",
    ])
    const gap = 3 * 10 + 4

    expect(front(crossed.bits)[gap]).toBe(0)
    expect(front(crossed.bits, { close: 1 })[gap]).toBe(1)
  })

  it("grows the object by a few pixels so its anti-aliased edge comes with it", () => {
    const glass = mask([
      "..........",
      "..........",
      "..###.....",
      "..###.....",
      "..###.....",
      "..........",
      "..........",
    ])

    expect(draw(front(glass.bits, { grow: 1 }), 10)).toEqual([
      "..........",
      "...#......",
      "..###.....",
      ".#####....",
      "..###.....",
      "...#......",
      "..........",
    ])
  })
})
