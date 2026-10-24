import { describe, expect, it } from "vitest"
import { CELL, COL_PITCH, PROP_H, ROW_PITCH, cellCenter, propFrame } from "./mapScale"

describe("propFrame", () => {
  it("draws a single-cell prop exactly where a prop has always stood", () => {
    const { cx, cy } = cellCenter(3, 4)
    expect(propFrame(3, 4, { cols: 1, rows: 1, tall: 0 })).toEqual({
      x: cx - CELL / 2,
      y: cy + CELL / 2 - PROP_H,
      w: CELL,
      h: PROP_H,
      baseY: cy + CELL / 2,
    })
  })

  it("spans two cells across for a 2x1 prop, standing on the anchor's own floor line", () => {
    const { cx, cy } = cellCenter(3, 4)
    expect(propFrame(3, 4, { cols: 2, rows: 1, tall: 0 })).toEqual({
      x: cx - CELL / 2,
      y: cy + CELL / 2 - PROP_H,
      w: CELL + COL_PITCH,
      h: PROP_H,
      baseY: cy + CELL / 2,
    })
  })

  it("stands a prop two rows deep on its bottom row's floor line, reaching up to the anchor's headroom", () => {
    const bottom = cellCenter(4, 4)
    const frame = propFrame(3, 4, { cols: 1, rows: 2, tall: 0 })
    expect(frame.h).toBe(PROP_H + ROW_PITCH)
    expect(frame.baseY).toBe(bottom.cy + CELL / 2)
    expect(frame.y + frame.h).toBe(frame.baseY)
    expect(frame.y).toBe(propFrame(3, 4, { cols: 1, rows: 1, tall: 0 }).y)
  })

  it("adds a cell of height per `tall`, upward, keeping the floor line", () => {
    const flat = propFrame(3, 4, { cols: 1, rows: 1, tall: 0 })
    const tall = propFrame(3, 4, { cols: 1, rows: 1, tall: 1 })
    expect(tall.h).toBe(PROP_H + CELL)
    expect(tall.baseY).toBe(flat.baseY)
    expect(tall.y).toBe(flat.y - CELL)
  })
})
