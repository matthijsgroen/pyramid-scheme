import { describe, expect, it } from "vitest"
import type { Tileset } from "@/game/siteTypes"
import { CELL, WALL_H, cellLeft, cellTop } from "./mapScale"
import { floorGroups, floorOutline, wornFaceCorners } from "./floorOutline"
import { ALL_STATES, buildTileRegions, rectsToPath, type FloorAt, type OpenBetween } from "./tileRegions"

// `R` room, `C` corridor, `.` stone; lower case is starter stone on the same floor. Neighbouring floor is always open.
const regionsOf = (plan: string[], tier: Tileset) => {
  const rows = plan.length
  const cols = plan[0].length
  const at = (r: number, c: number) => plan[r]?.[c] ?? "."
  const floorAt: FloorAt = (r, c) => {
    const ch = at(r, c)
    if (ch === ".") return "stone"
    return {
      state: "reachable",
      kind: ch.toUpperCase() === "R" ? "room" : "corridor",
      tier: ch === ch.toLowerCase() ? "starter" : tier,
    }
  }
  const openBetween: OpenBetween = (r, c, dir) =>
    at(r, c) !== "." && (dir === "s" ? at(r + 1, c) : at(r, c + 1)) !== "."
  return buildTileRegions(rows, cols, floorAt, openBetween, tier)
}

const floorCellsOf = (plan: string[]) =>
  plan.flatMap((line, r) => [...line].flatMap((ch, c) => (ch === "." ? [] : [[r, c] as const])))

const loopsOf = (d: string): [number, number][][] => {
  const loops: [number, number][][] = []
  let loop: [number, number][] = []
  const tokens = d.match(/[MLQCZ]|-?\d+(?:\.\d+)?/g) ?? []
  let i = 0
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    const op = tokens[i++]
    if (op === "M") {
      loop = [[num(), num()]]
      loops.push(loop)
    } else if (op === "L") loop.push([num(), num()])
    else if (op === "C") {
      const [x0, y0] = loop[loop.length - 1]
      const [x1, y1, x2, y2, x3, y3] = [num(), num(), num(), num(), num(), num()]
      for (let t = 0.1; t <= 1.0001; t += 0.1) {
        const u = 1 - t
        loop.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ])
      }
    } else if (op === "Q") {
      const [x0, y0] = loop[loop.length - 1]
      const [x1, y1, x2, y2] = [num(), num(), num(), num()]
      for (let t = 0.1; t <= 1.0001; t += 0.1) {
        const u = 1 - t
        loop.push([u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2])
      }
    } else if (op !== "Z") throw new Error(`the outline uses ${op}, which this reader does not know`)
  }
  return loops
}

const inside = (loops: [number, number][][], [px, py]: readonly [number, number]) => {
  let crossings = 0
  for (const loop of loops) {
    for (let k = 0; k < loop.length; k++) {
      const [ax, ay] = loop[k]
      const [bx, by] = loop[(k + 1) % loop.length]
      if (ay > py !== by > py && px < ax + ((py - ay) * (bx - ax)) / (by - ay)) crossings++
    }
  }
  return crossings % 2 === 1
}

const PLAN = [
  "......", //
  ".RRRCC",
  ".RRR..",
  ".RRR..",
  "..C...",
  "..C...",
]

describe("floorOutline", () => {
  it("draws a floor that is not cave exactly as the rectangles it is built of", () => {
    const regions = regionsOf(PLAN, "starter")
    const groups = floorGroups(regions, t => t === "cave")
    const { outline, fills } = floorOutline(groups, "site-a")
    expect(outline).toBe(rectsToPath(groups.flatMap(g => g.rects)))
    for (const g of groups) expect(fills.get(g.id)).toBe(rectsToPath(g.rects))
  })

  it("keeps every walkable cell's centre inside a cave's softened outline", () => {
    const { outline } = floorOutline(
      floorGroups(regionsOf(PLAN, "cave"), t => t === "cave"),
      "site-a"
    )
    const loops = loopsOf(outline)
    for (const [r, c] of floorCellsOf(PLAN))
      expect(inside(loops, [cellLeft(c) + CELL / 2, cellTop(r) + CELL / 2]), `cell ${r},${c}`).toBe(true)
  })

  it("traces a cave's floor as one outline rather than a box per rectangle", () => {
    const { outline } = floorOutline(
      floorGroups(regionsOf(PLAN, "cave"), t => t === "cave"),
      "site-a"
    )
    expect(outline.match(/M/g)).toHaveLength(1)
  })

  it("draws the same cave edge for the same site, and a different one for another site", () => {
    const groups = floorGroups(regionsOf(PLAN, "cave"), t => t === "cave")
    const a = floorOutline(groups, "site-a")
    expect(floorOutline(groups, "site-a")).toEqual(a)
    expect(floorOutline(groups, "site-b").outline).not.toBe(a.outline)
  })

  it("traces two separate caves on one floor as two outlines", () => {
    const islands = ["......", ".RR.RR", ".RR.RR"]
    const { outline } = floorOutline(
      floorGroups(regionsOf(islands, "cave"), t => t === "cave"),
      "site-a"
    )
    expect(outline.match(/M/g)).toHaveLength(2)
  })

  it("keeps the pillar of rock inside a ring of cave floor out of the floor", () => {
    const ring = [".......", ".RRRRR.", ".RR.RR.", ".RRRRR."]
    const { outline } = floorOutline(
      floorGroups(regionsOf(ring, "cave"), t => t === "cave"),
      "site-a"
    )
    const loops = loopsOf(outline)
    expect(loops).toHaveLength(2)
    expect(inside(loops, [cellLeft(3) + CELL / 2, cellTop(2) + CELL / 2])).toBe(false)
    for (const [r, c] of floorCellsOf(ring))
      expect(inside(loops, [cellLeft(c) + CELL / 2, cellTop(r) + CELL / 2]), `cell ${r},${c}`).toBe(true)
  })

  it("leaves a starter pocket on a cave floor drawn as its own rectangles", () => {
    const mixed = ["......", ".RRrr.", ".RRrr."]
    const groups = floorGroups(regionsOf(mixed, "cave"), t => t === "cave")
    const { fills } = floorOutline(groups, "site-a")
    const starter = groups.filter(g => g.id.startsWith("starter:") && g.rects.length > 0)
    expect(starter.length).toBeGreaterThan(0)
    for (const g of starter) expect(fills.get(g.id)).toBe(rectsToPath(g.rects))
  })

  it("leaves the floor edge under a wall face straight and at its own height", () => {
    const { outline } = floorOutline(
      floorGroups(regionsOf(PLAN, "cave"), t => t === "cave"),
      "site-a"
    )
    const points = loopsOf(outline)[0]
    // The room's back wall runs along its top row, from its west edge to the corridor's east end.
    const y = cellTop(1)
    expect(Math.min(...points.map(([, py]) => py))).toBe(y)
    // One unbroken run along that line, from where the west corner's curve ends to where the east end's
    // curve begins.
    const runs: number[][] = []
    points.forEach(([px, py], k) => {
      if (py !== y) return
      if (k > 0 && points[k - 1][1] === y) runs[runs.length - 1].push(px)
      else runs.push([px])
    })
    const straight = runs.some(
      xs => Math.min(...xs) <= cellLeft(1) + CELL / 2 && Math.max(...xs) >= cellLeft(5) + CELL / 2
    )
    expect(straight).toBe(true)
  })
})

describe("wornFaceCorners", () => {
  const cutsOf = (plan: string[]) => {
    const groups = regionsOf(plan, "cave").get("cave")!
    const faces = ALL_STATES.flatMap(s => groups.wallFace[s])
    const floor = ALL_STATES.flatMap(s => [...groups.floorRoom[s], ...groups.floorCorridor[s]])
    return wornFaceCorners(faces, faces, floor, WALL_H / 2).match(/M[\d.-]+/g) ?? []
  }

  it("rounds the top of a back wall where a side wall closes it, at both ends", () => {
    expect(cutsOf(["......", ".RRR..", ".RRR.."])).toEqual([`M${cellLeft(1)}`, `M${cellLeft(3) + CELL}`])
  })

  it("keeps the corner a doorway's jamb stands on", () => {
    // The corridor's own dead end is closed both sides, so its top is worn too.
    expect(cutsOf(["..C...", ".RRR..", ".RRR.."]).sort()).toEqual(
      [cellLeft(1), cellLeft(2), cellLeft(2) + CELL, cellLeft(3) + CELL].map(x => `M${x}`).sort()
    )
  })
})
