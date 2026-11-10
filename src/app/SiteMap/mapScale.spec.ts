import { describe, expect, it } from "vitest"
import {
  CELL,
  COL_PITCH,
  FACE_H,
  PROP_H,
  ROW_PITCH,
  WALL_FACE_H,
  WALL_H,
  cellCenter,
  cellLeft,
  cellTop,
  propFrame,
  wallItemFrame,
} from "./mapScale"

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

describe("wallItemFrame", () => {
  const faceTop = cellTop(3) - FACE_H

  it("a 2:1 tile is the band's height, centred on the face", () => {
    const { x, y, w, h } = wallItemFrame(3, 2, [112, 56])
    expect([x, w, h]).toEqual([cellLeft(2), CELL, WALL_H])
    expect(y - faceTop).toBe(cellTop(3) - (y + h))
  })

  it("a tile with no size takes the 2:1 band", () => {
    expect(wallItemFrame(3, 2)).toEqual(wallItemFrame(3, 2, [112, 56]))
  })

  it("a taller tile is drawn at its own aspect, a cell wide", () => {
    const { w, h } = wallItemFrame(3, 2, [100, 80])
    expect(w).toBe(CELL)
    expect(h).toBeCloseTo(CELL * 0.8)
  })

  it("a tile as tall as the brick fills the face under the cap", () => {
    const { y, h } = wallItemFrame(3, 2, [112, 96.32])
    expect(h).toBeCloseTo(WALL_FACE_H)
    expect(y).toBeCloseTo(cellTop(3) - WALL_FACE_H)
    expect(y + h).toBeCloseTo(cellTop(3))
  })

  it("never rises into the cap, however tall the tile", () => {
    const { y, h } = wallItemFrame(3, 2, [50, 200])
    expect(h).toBeCloseTo(WALL_FACE_H)
    expect(y).toBeCloseTo(cellTop(3) - WALL_FACE_H)
  })
})
