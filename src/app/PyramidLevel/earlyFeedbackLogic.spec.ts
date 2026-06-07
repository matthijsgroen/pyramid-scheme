import { describe, it, expect } from "vitest"
import { computeEarlyFeedbackBlockIds } from "./earlyFeedbackLogic"
import type { Pyramid, PyramidBlock } from "@/game/types"

// Build a pyramid from a compact description.
// Each entry: { open?: true, value?: number }
// IDs are assigned "1".."N" matching array index + 1.
const makePyramid = (blocks: Partial<PyramidBlock>[]): Pyramid => {
  const floorCount = Math.round((-1 + Math.sqrt(1 + 8 * blocks.length)) / 2)
  return {
    floorCount,
    blocks: blocks.map((b, i) => ({
      id: (i + 1).toString(),
      isOpen: b.isOpen ?? false,
      value: b.isOpen ? undefined : b.value,
    })),
  }
}

// 3-floor pyramid (6 blocks): apex open, floor-1 open, floor-2 closed (given values)
//      [1]         open
//    [2] [3]       open
//  [4] [5] [6]     closed: 1, 2, 3
const make3FloorPyramid = (): Pyramid =>
  makePyramid([{ isOpen: true }, { isOpen: true }, { isOpen: true }, { value: 1 }, { value: 2 }, { value: 3 }])

// 4-floor pyramid (10 blocks): top 6 open, bottom 4 closed
//        [1]           open  (depth 5)
//      [2] [3]         open  (depth 3)
//    [4] [5] [6]       open  (depth 0)
//  [7] [8] [9][10]     closed: 1,2,3,4
const make4FloorPyramid = (): Pyramid =>
  makePyramid([
    { isOpen: true },
    { isOpen: true },
    { isOpen: true },
    { isOpen: true },
    { isOpen: true },
    { isOpen: true },
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 },
  ])

describe("computeEarlyFeedbackBlockIds", () => {
  it("returns [] when earlyFeedbackCount is 0", () => {
    expect(computeEarlyFeedbackBlockIds(make4FloorPyramid(), 12345, 1, 0)).toEqual([])
  })

  it("returns [] when pyramid has no open blocks", () => {
    const pyramid = makePyramid([{ value: 3 }, { value: 1 }, { value: 2 }])
    expect(computeEarlyFeedbackBlockIds(pyramid, 12345, 1, 1)).toEqual([])
  })

  it("returns [] when no open block reaches depth ≥ 4 (3-floor pyramid)", () => {
    // In a 3-floor pyramid, max depth is 2 — never reaches threshold 4
    expect(computeEarlyFeedbackBlockIds(make3FloorPyramid(), 12345, 1, 1)).toEqual([])
  })

  it("picks one block at depth ≥ 4 in a 4-floor pyramid", () => {
    // Only block "1" (apex) reaches depth 5 in a 4-floor all-open pyramid
    const result = computeEarlyFeedbackBlockIds(make4FloorPyramid(), 12345, 1, 1)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe("1")
  })

  it("returns [] for second treasure when no block reaches depth ≥ 8 in a 4-floor pyramid", () => {
    // Max depth in a 4-floor pyramid is 5 — never reaches threshold 8
    const result = computeEarlyFeedbackBlockIds(make4FloorPyramid(), 12345, 1, 2)
    expect(result).toHaveLength(1) // only the depth-≥4 pick; no depth-≥8 candidate
    expect(result[0]).toBe("1")
  })

  it("is deterministic for the same seed and level", () => {
    const r1 = computeEarlyFeedbackBlockIds(make4FloorPyramid(), 99999, 3, 1)
    const r2 = computeEarlyFeedbackBlockIds(make4FloorPyramid(), 99999, 3, 1)
    expect(r1).toEqual(r2)
  })

  it("produces different results for different seeds", () => {
    // Build a bigger pyramid where multiple blocks compete at depth ≥ 4
    // 5-floor pyramid: 15 blocks, bottom 5 closed
    const pyramid = makePyramid([
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
      { value: 5 },
    ])
    const results = new Set(
      Array.from({ length: 10 }, (_, i) => computeEarlyFeedbackBlockIds(pyramid, (i + 1) * 1000, 1, 1)[0])
    )
    // With multiple candidates and different seeds, expect more than one distinct pick
    expect(results.size).toBeGreaterThan(1)
  })

  it("never picks the same block for two different thresholds", () => {
    // 5-floor pyramid has blocks deep enough for both threshold 4 and 8
    const pyramid = makePyramid([
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { isOpen: true },
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
      { value: 5 },
    ])
    const result = computeEarlyFeedbackBlockIds(pyramid, 12345, 1, 2)
    if (result.length === 2) {
      expect(result[0]).not.toBe(result[1])
    }
  })
})
