import { describe, expect, it } from "vitest"
import type { Direction } from "@/game/siteTypes"
import { CHAR_H, CHAR_W, FOOT_LIFT } from "./ExplorerDot"
import { ARROW_RADIUS, PROMPT_HEIGHT, PROMPT_LIFT, ringDistance, ringPoint } from "./arrowRing"
import { CELL, MARKER_HIT } from "./mapScale"

const DIRS: Direction[] = ["n", "e", "s", "w"]
const stand = { x: 200, y: 300 }
const figure = {
  left: stand.x - CHAR_W / 2,
  right: stand.x + CHAR_W / 2,
  top: stand.y + CELL / 2 - CHAR_H - FOOT_LIFT,
  bottom: stand.y + CELL / 2 - FOOT_LIFT,
}
const overlapsFigure = (p: { x: number; y: number }) =>
  p.x + ARROW_RADIUS > figure.left &&
  p.x - ARROW_RADIUS < figure.right &&
  p.y + ARROW_RADIUS > figure.top &&
  p.y - ARROW_RADIUS < figure.bottom

describe("arrowRing", () => {
  it.each(DIRS)("draws the %s arrow at least half a cell out and clear of the figure", dir => {
    expect(ringDistance(dir)).toBeGreaterThanOrEqual(CELL / 2)
    expect(overlapsFigure(ringPoint(stand, dir))).toBe(false)
  })

  it("draws the arrows that open sideways at half a cell", () => {
    expect(ringPoint(stand, "e")).toEqual({ x: stand.x + ringDistance("e"), y: stand.y })
    expect(ringDistance("e")).toBeLessThan(CELL * 0.6)
  })

  it("keeps the tap areas of the four arrows apart", () => {
    const points = DIRS.map(dir => ringPoint(stand, dir))
    for (const a of points)
      for (const b of points)
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(MARKER_HIT * 2)
  })

  it("lifts the north arrow above the prompt, and moves no other arrow", () => {
    const north = ringPoint(stand, "n", stand)
    expect(north.y + ARROW_RADIUS).toBeLessThanOrEqual(stand.y - PROMPT_LIFT - PROMPT_HEIGHT)
    for (const dir of ["e", "s", "w"] as const) expect(ringPoint(stand, dir, stand)).toEqual(ringPoint(stand, dir))
  })
})
