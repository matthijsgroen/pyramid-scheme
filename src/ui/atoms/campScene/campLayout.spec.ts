import { describe, it, expect } from "vitest"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { CampCatalogue, CampPiece, CampSpot, CampSpotId } from "./campTypes"
import {
  CAMP_LAYOUT_PARAMS,
  CAMP_SHADOW_PARAMS,
  ENTRANCE_MIN,
  entranceAreas,
  fullSteps,
  layoutCamp,
  type CampLayout,
  type CampLayoutInput,
  type PlacedPiece,
} from "./campLayout"

const piece = (id: string, options: Partial<CampPiece> = {}): CampPiece => ({
  id,
  dx: 0,
  dy: 0,
  width: 0.8,
  height: 0.8,
  ...options,
})

const glow = (radius: number) => ({
  dx: 0,
  dy: -0.2,
  radius,
  color: "rgb(1,2,3)",
  mode: "flicker" as const,
  strength: 0.7,
})

const catalogue: CampCatalogue = {
  spots: [
    {
      id: "fire",
      x: 0,
      y: 0,
      frame: 1.6,
      footprint: 1.2,
      steps: [
        { chapter: "starter", pieces: [piece("ring", { height: 0.3 })] },
        {
          chapter: "starter",
          pieces: [piece("flame", { dy: -0.1, height: 0.6, replaces: ["smallFlame"], lights: [glow(3)] })],
        },
        { chapter: "junior", pieces: [piece("bigRing", { width: 1, height: 0.4, replaces: ["ring"] })] },
      ],
    },
    {
      id: "sleeping",
      x: -0.8,
      y: -2,
      frame: 1.3,
      footprint: 1,
      steps: [
        { chapter: "starter", pieces: [piece("mat", { height: 0.3 })] },
        { chapter: "junior", pieces: [piece("tent"), piece("flag", { dx: 0.3, dy: -0.8, width: 0.2, height: 0.3 })] },
      ],
    },
    { id: "water", x: 0.9, y: 1, frame: 1, footprint: 0.7, steps: [{ chapter: "junior", pieces: [piece("jar")] }] },
    {
      id: "cooking",
      x: -1.6,
      y: -0.2,
      frame: 1.4,
      footprint: 1.1,
      steps: [{ chapter: "expert", pieces: [piece("pot")] }],
    },
    {
      id: "camel",
      x: 2,
      y: 0.1,
      frame: 1.2,
      footprint: 0.9,
      steps: [{ chapter: "master", pieces: [piece("camel", { width: 1, height: 1 })] }],
    },
    {
      id: "lookout",
      x: -2,
      y: -2.2,
      frame: 2.2,
      footprint: 0.8,
      steps: [{ chapter: "wizard", pieces: [piece("post", { width: 0.3, height: 1 })] }],
    },
    {
      id: "godStatues",
      x: 2.2,
      y: 1.6,
      frame: 1.5,
      footprint: 1.3,
      steps: [{ chapter: "wizard", pieces: [piece("ra", { dx: 0.9, width: 0.5, height: 1 })] }],
    },
  ],
  fixed: [
    {
      id: "chest",
      x: -1.2,
      y: 0.8,
      frame: 1,
      footprint: 0.7,
      piece: piece("chest", { height: 0.6, lights: [glow(0.8)] }),
    },
    { id: "window", x: 0.9, y: -1.8, frame: 1.2, footprint: 0.5, piece: piece("window", { width: 1, height: 1 }) },
    {
      id: "campfire",
      x: 0,
      y: 0,
      frame: 1,
      footprint: 0.4,
      piece: piece("smallFlame", { width: 0.5, height: 0.5, lights: [glow(2)] }),
    },
  ],
}

const input = (overrides: Partial<CampLayoutInput> = {}): CampLayoutInput => ({
  width: 390,
  height: 844,
  insets: { top: 56, bottom: 96 },
  chapter: "starter",
  steps: {},
  catalogue,
  ...overrides,
})

const layout = (overrides: Partial<CampLayoutInput> = {}): CampLayout => {
  const result = layoutCamp(input(overrides))
  if (!result) throw new Error("expected a layout")
  return result
}

const pieceIds = (l: CampLayout) => l.pieces.filter(p => p.visible).map(p => p.piece.id)

const SIZES: [number, number][] = [
  [390, 844],
  [820, 1180],
  [1000, 836],
  [1600, 700],
  [320, 900],
  [320, 640],
]
const INSETS = [
  { top: 56, bottom: 96 },
  { top: 0, bottom: 0 },
]

const sweep = (check: (l: CampLayout, i: CampLayoutInput) => void, c: CampCatalogue = catalogue) => {
  for (const [width, height] of SIZES)
    for (const insets of INSETS)
      for (const chapter of difficulties) {
        const i = input({ width, height, insets, chapter, steps: fullSteps(c, chapter), catalogue: c })
        check(layoutCamp(i)!, i)
      }
}

// A piece's offset is in frame units: its drawn width over its own width is one frame in px.
const framePx = (p: PlacedPiece) => p.width / p.piece.width
const anchorOf = (p: PlacedPiece) => ({ x: p.x - p.piece.dx * framePx(p), y: p.y - p.piece.dy * framePx(p) })
const anchors = (l: CampLayout) => new Map(l.pieces.map(p => [p.spot, { ...anchorOf(p), scale: p.scale }]))

const lone = (id: CampSpotId, x: number, y: number, frame: number, footprint: number): CampSpot => ({
  id,
  x,
  y,
  frame,
  footprint,
  steps: [{ chapter: "starter", pieces: [piece(id, { width: 1, height: 1 })] }],
})

describe("layoutCamp", () => {
  it("returns null for a zero-size container", () => {
    expect(layoutCamp(input({ width: 0 }))).toBeNull()
    expect(layoutCamp(input({ height: 0 }))).toBeNull()
    expect(layoutCamp(input({ width: -5 }))).toBeNull()
  })

  it("draws no spot with zero steps and no spot of a later chapter", () => {
    const l = layout({ chapter: "starter", steps: { fire: 0, water: 1, camel: 1 } })
    const spots = new Set(l.pieces.map(p => p.spot))
    expect(spots).toEqual(new Set(["chest", "window", "campfire"]))
  })

  it("clamps step counts to what the chapter allows", () => {
    const full = layout({ steps: { fire: fullSteps(catalogue, "starter").fire } })
    expect(layout({ steps: { fire: 99 } })).toEqual(full)
    expect(pieceIds(full)).toContain("flame")
    expect(pieceIds(full)).not.toContain("bigRing")
    expect(layout({ steps: { fire: -3 } })).toEqual(layout({ steps: {} }))
  })

  it("hides a piece a later step replaces", () => {
    expect(pieceIds(layout({ chapter: "junior", steps: { fire: 1 } }))).toContain("ring")
    const ids = pieceIds(layout({ chapter: "junior", steps: { fire: 3 } }))
    expect(ids).toContain("bigRing")
    expect(ids).not.toContain("ring")
  })

  it("keeps a replaced step in place, hidden, so the scene can fade between steps", () => {
    const l = layout({ chapter: "junior", steps: { fire: 3 } })
    const ring = l.pieces.find(p => p.piece.id === "ring")!
    const bigRing = l.pieces.find(p => p.piece.id === "bigRing")!
    expect([ring.visible, bigRing.visible]).toEqual([false, true])
    expect([ring.x, ring.y]).toEqual([bigRing.x, bigRing.y])
    expect(ring.shadow).toBeUndefined()
    expect(l.glows.every(g => !g.key.startsWith(`${ring.key}:`))).toBe(true)
    expect(l.pieces.indexOf(ring)).toBeLessThan(l.pieces.indexOf(bigRing))
  })

  it("a step can replace a fixed piece, and its glow goes with it", () => {
    const before = layout({ steps: { fire: 1 } })
    const smallFlame = before.pieces.find(p => p.piece.id === "smallFlame")!
    expect(before.glows.map(g => g.radius)).toContainEqual(expect.closeTo(2 * smallFlame.scale, 6))

    const after = layout({ steps: { fire: 2 } })
    expect(pieceIds(after)).not.toContain("smallFlame")
    const flame = after.pieces.find(p => p.piece.id === "flame")!
    const fireGlows = after.glows.filter(g => g.key.startsWith("campfire") || g.key.startsWith("fire"))
    expect(fireGlows.map(g => g.radius)).toEqual([expect.closeTo(3 * flame.scale, 6)])
  })

  it("lights a glow at its piece, scaled by the piece's depth", () => {
    const l = layout({ steps: {} })
    const chest = l.pieces.find(p => p.spot === "chest")!
    const chestGlow = l.glows.find(g => g.key === `${chest.key}:0`)!
    expect(chestGlow.x).toBeCloseTo(chest.x)
    expect(chestGlow.y).toBeCloseTo(chest.y - 0.2 * chest.scale)
    expect(chestGlow.radius).toBeCloseTo(0.8 * chest.scale)
    expect(l.glows.map(g => g.key)).not.toContain(l.pieces.find(p => p.spot === "window")!.key)
  })

  it("gives a glow the foot of its piece, where its light lands on the sand", () => {
    const l = layout({ steps: {} })
    const chest = l.pieces.find(p => p.spot === "chest")!
    const chestGlow = l.glows.find(g => g.key === `${chest.key}:0`)!
    expect(chestGlow.floor).toBeCloseTo(chest.y)
  })

  it("draws only the latest step of a spot when each step replaces the one before", () => {
    const wholeSpot: CampCatalogue = {
      spots: [
        {
          id: "water",
          x: 0,
          y: 0,
          frame: 1,
          footprint: 1,
          steps: [
            { chapter: "starter", pieces: [piece("water1", { width: 1, height: 1 })] },
            { chapter: "starter", pieces: [piece("water2", { width: 1, height: 1, replaces: ["water1"] })] },
            { chapter: "junior", pieces: [piece("water3", { width: 1, height: 1, replaces: ["water2"] })] },
          ],
        },
      ],
      fixed: [],
    }
    const at = (n: number) => pieceIds(layout({ catalogue: wholeSpot, chapter: "junior", steps: { water: n } }))
    expect(at(1)).toEqual(["water1"])
    expect(at(2)).toEqual(["water2"])
    expect(at(3)).toEqual(["water3"])
  })

  it("keeps every light of a piece that carries several", () => {
    const twoLights: CampCatalogue = {
      spots: [],
      fixed: [
        {
          id: "window",
          x: 0,
          y: 0,
          frame: 1,
          footprint: 1,
          piece: piece("window", { lights: [glow(1.1), { ...glow(0.9), dy: -0.5, color: "rgb(9,9,9)" }] }),
        },
      ],
    }
    const l = layout({ catalogue: twoLights, steps: {} })
    expect(l.glows).toHaveLength(2)
    expect(new Set(l.glows.map(g => g.key)).size).toBe(2)
    expect(l.glows.map(g => g.color)).toEqual(["rgb(1,2,3)", "rgb(9,9,9)"])
    expect(l.glows[1].y).toBeLessThan(l.glows[0].y)
  })

  it("keeps every piece inside the container and outside the insets", () => {
    sweep((l, { width, height, insets }) => {
      for (const p of l.pieces) {
        expect(p.x - p.width / 2).toBeGreaterThanOrEqual(-1e-9)
        expect(p.x + p.width / 2).toBeLessThanOrEqual(width + 1e-9)
        expect(p.y - p.height).toBeGreaterThanOrEqual(insets.top - 1e-9)
        expect(p.y).toBeLessThanOrEqual(height - insets.bottom + 1e-9)
      }
    })
  })

  it("places each anchor at the fire's plus its impression offset times the stretch", () => {
    sweep(l => {
      const at = anchors(l)
      const fire = at.get("campfire") ?? at.get("fire")!
      for (const place of [...catalogue.spots, ...catalogue.fixed]) {
        const a = at.get(place.id)
        if (!a) continue
        expect(a.x - fire.x).toBeCloseTo(place.x * l.stretch.x * l.unit, 6)
        expect(a.y - fire.y).toBeCloseTo(place.y * l.stretch.y * l.unit, 6)
      }
    })
  })

  it("keeps both stretches within their range", () => {
    const { stretchX, stretchY } = CAMP_LAYOUT_PARAMS
    sweep(l => {
      expect(l.stretch.x).toBeGreaterThanOrEqual(stretchX[0] - 1e-9)
      expect(l.stretch.x).toBeLessThanOrEqual(stretchX[1] + 1e-9)
      expect(l.stretch.y).toBeGreaterThanOrEqual(stretchY[0] - 1e-9)
      expect(l.stretch.y).toBeLessThanOrEqual(stretchY[1] + 1e-9)
    })
  })

  it("spreads sideways on a wide container and downward on a tall one", () => {
    const steps = fullSteps(catalogue, "wizard")
    const at = (width: number, height: number) => layout({ width, height, chapter: "wizard", steps })
    const narrow = at(390, 844)
    const wide = at(1600, 700)
    expect(wide.stretch.x).toBeGreaterThan(narrow.stretch.x)

    const short = at(390, 700)
    const tall = at(390, 1100)
    expect(tall.unit).toBeCloseTo(short.unit)
    expect(tall.stretch.y).toBeGreaterThan(short.stretch.y)
    expect(tall.stretch.x).toBeCloseTo(short.stretch.x)
  })

  it("draws the farthest anchor at the back depth and the nearest at full size", () => {
    const [back, front] = CAMP_LAYOUT_PARAMS.depth
    const l = layout({ chapter: "wizard", steps: fullSteps(catalogue, "wizard") })
    const at = anchors(l)
    expect(at.get("lookout")!.scale).toBeCloseTo(back * l.unit)
    expect(at.get("godStatues")!.scale).toBeCloseTo(front * l.unit)
    expect(at.get("fire")!.scale).toBeGreaterThan(at.get("window")!.scale)
  })

  it("draws a farther piece first, so a nearer one overlaps it", () => {
    sweep(l => {
      const ys = l.pieces.map(p => anchorOf(p).y)
      for (let k = 1; k < ys.length; k++) expect(ys[k]).toBeGreaterThanOrEqual(ys[k - 1] - 1e-6)
    })
  })

  it("keeps every spot's relative order in x and in y as the container changes", () => {
    for (const chapter of difficulties) {
      const orders = SIZES.map(([width, height]) => {
        const at = [...anchors(layout({ width, height, chapter, steps: fullSteps(catalogue, chapter) })).entries()]
        return {
          x: [...at].sort((a, b) => a[1].x - b[1].x || a[0].localeCompare(b[0])).map(([spot]) => spot),
          y: [...at].sort((a, b) => a[1].y - b[1].y || a[0].localeCompare(b[0])).map(([spot]) => spot),
        }
      })
      for (const order of orders) expect(order).toEqual(orders[0])
    }
  })

  // Two spots at about the same depth whose footprints overlap at the minimum stretch, and one far behind.
  const crowdedRow: CampCatalogue = {
    spots: [lone("water", 0, 0, 1.4, 1.2), lone("camel", 1, 0.2, 1.4, 1.2), lone("donkey", 0.5, -1.5, 1.4, 1.2)],
    fixed: [],
  }
  const crowdedSteps = { water: 1, camel: 1, donkey: 1 }

  it("keeps spots at the same depth from overlapping", () => {
    const { gapFactor, sameDepth } = CAMP_LAYOUT_PARAMS
    const footprintOf = (spot: string) => crowdedRow.spots.find(s => s.id === spot)!.footprint
    sweep(l => {
      const at = [...anchors(l).entries()]
      for (const [a, pa] of at)
        for (const [b, pb] of at) {
          if (a >= b) continue
          const sameRow = Math.abs(pa.y - pb.y) <= sameDepth * l.stretch.y * l.unit + 1e-9
          if (!sameRow) continue
          const apart = ((footprintOf(a) * pa.scale + footprintOf(b) * pb.scale) / 2) * gapFactor
          expect(Math.abs(pa.x - pb.x)).toBeGreaterThanOrEqual(apart - 1e-6)
        }
    }, crowdedRow)
    expect(layout({ catalogue: crowdedRow, steps: crowdedSteps, width: 200, height: 1200 }).stretch.x).toBeGreaterThan(
      CAMP_LAYOUT_PARAMS.stretchX[0]
    )
  })

  it("lets spots at different depths overlap", () => {
    const apart: CampCatalogue = { spots: [crowdedRow.spots[0], crowdedRow.spots[2]], fixed: [] }
    const l = layout({ catalogue: apart, steps: crowdedSteps, width: 200, height: 1200 })
    expect(l.stretch.x).toBeCloseTo(CAMP_LAYOUT_PARAMS.stretchX[0])
  })

  // Two wide frames with narrow footprints at the same depth, on a phone too narrow to spread them.
  const pair = (frame: number, footprint: number): CampCatalogue => ({
    spots: [lone("water", 0, 0, frame, footprint), lone("camel", 0.5, 0, frame, footprint)],
    fixed: [],
  })
  const narrow = (c: CampCatalogue) => layout({ catalogue: c, width: 320, height: 900, steps: { water: 1, camel: 1 } })

  it("keeps neighbours apart by their footprints, not their frames", () => {
    const { gapFactor } = CAMP_LAYOUT_PARAMS
    const tight = narrow(pair(2, 0.6))
    const [a, b] = tight.pieces
    expect(b.x - a.x).toBeCloseTo(0.6 * gapFactor * tight.unit)
    expect(b.x - a.x).toBeLessThan(a.width)

    const wide = narrow(pair(2, 1.6))
    const [c, d] = wide.pieces
    expect(d.x - c.x).toBeCloseTo(1.6 * gapFactor * wide.unit)
  })

  it("draws a spot's image at its frame size", () => {
    const l = narrow(pair(1.8, 0.6))
    for (const p of l.pieces) {
      expect(p.width).toBeCloseTo(1.8 * p.scale)
      expect(p.height).toBeCloseTo(1.8 * p.scale)
    }
    const fixed = layout({ steps: {} }).pieces.find(p => p.spot === "window")!
    expect(fixed.width).toBeCloseTo(1.2 * fixed.scale)
  })

  it("keeps a light's place on its piece when the frame is bigger", () => {
    const lit = (frame: number): CampCatalogue => ({
      spots: [
        {
          id: "fire",
          x: 0,
          y: 0,
          frame,
          footprint: 1,
          steps: [{ chapter: "starter", pieces: [piece("pit", { width: 1, height: 1, lights: [glow(2)] })] }],
        },
      ],
      fixed: [],
    })
    for (const frame of [1, 2.4]) {
      const l = layout({ catalogue: lit(frame), steps: { fire: 1 } })
      const [pit] = l.pieces
      expect((pit.y - l.glows[0].y) / pit.height).toBeCloseTo(0.2)
      expect(l.glows[0].radius).toBeCloseTo(2 * pit.scale)
    }
  })

  it("keeps at least the minimum far sand between the horizon and the farthest frame top", () => {
    const { farSandMin } = CAMP_LAYOUT_PARAMS
    for (const size of [...SIZES, [1000, 400] as [number, number]])
      for (const insets of INSETS)
        for (const chapter of difficulties) {
          const [width, height] = size
          const l = layout({ width, height, insets, chapter, steps: fullSteps(catalogue, chapter) })
          const farthestTop = Math.min(...l.pieces.map(p => p.y - p.height))
          expect((farthestTop - l.horizon) / l.unit).toBeGreaterThanOrEqual(farSandMin - 1e-9)
        }
  })

  it("keeps the horizon no lower than max(27% of the inset-free height, the minimum sky)", () => {
    sweep((l, { height, insets }) => {
      const hc = height - insets.top - insets.bottom
      const lowest = insets.top + Math.max(hc * 0.27, CAMP_LAYOUT_PARAMS.skyMin * l.unit)
      expect(l.horizon).toBeLessThanOrEqual(lowest + 1e-9)
      expect(l.horizon).toBeLessThanOrEqual(l.frame.y + l.frame.height)
    })
  })

  it("keeps each spot's left-to-right order when the chapter rises", () => {
    const steps = fullSteps(catalogue, "wizard")
    for (const [width, height] of SIZES) {
      const orders = difficulties.map(chapter => {
        const l = layout({ width, height, chapter, steps })
        return [...anchors(l).entries()].sort((a, b) => a[1].x - b[1].x).map(([spot]) => spot)
      })
      for (let k = 1; k < orders.length; k++) {
        const [before, after] = [orders[k - 1], orders[k]]
        expect(after.filter(s => before.includes(s))).toEqual(before.filter(s => after.includes(s)))
      }
    }
  })

  it("zooms out as the chapter rises", () => {
    for (const [width, height] of SIZES) {
      const units = difficulties.map(chapter => layout({ width, height, chapter }).unit)
      for (let k = 1; k < units.length; k++) expect(units[k]).toBeLessThanOrEqual(units[k - 1] + 1e-9)
    }
  })

  it("gives one pyramid per chapter, the fifth golden", () => {
    difficulties.forEach((chapter, i) => {
      const { pyramids } = layout({ chapter })
      expect(pyramids).toHaveLength(i + 1)
      expect(pyramids.map(p => p.golden)).toEqual(pyramids.map((_, k) => k === 4))
    })
  })

  it("keeps every pyramid inside the container", () => {
    sweep((l, { width }) => {
      for (const p of l.pyramids) {
        expect(p.x - p.width / 2).toBeGreaterThanOrEqual(0)
        expect(p.x + p.width / 2).toBeLessThanOrEqual(width)
      }
    })
  })

  it("survives insets larger than the container", () => {
    const l = layout({
      width: 400,
      height: 300,
      insets: { top: 200, bottom: 200 },
      chapter: "wizard",
      steps: fullSteps(catalogue, "wizard"),
    })
    const numbers = [
      l.unit,
      l.stretch.x,
      l.stretch.y,
      l.horizon,
      l.frame.width,
      l.frame.height,
      ...l.pieces.flatMap(p => [p.x, p.y, p.scale]),
    ]
    for (const n of numbers) expect(Number.isFinite(n)).toBe(true)
    expect(l.unit).toBeGreaterThan(0)
    expect(l.frame.width).toBeGreaterThan(0)
    for (const p of l.pieces) expect(p.y).toBeLessThanOrEqual(300)
  })
})

describe("layoutCamp shadows", () => {
  // One fire at the front with a glow of `fireRadius`; pieces at the given x offsets beside it.
  const around = (fireRadius: number, xs: number[]): CampCatalogue => {
    const ids: CampSpotId[] = ["water", "cooking", "donkey", "camel", "lookout"]
    return {
      spots: xs.map((x, i) => ({
        id: ids[i],
        x,
        y: 0,
        frame: 1,
        footprint: 0.8,
        steps: [{ chapter: "starter", pieces: [piece(`p${x}`)] }],
      })),
      fixed: [
        {
          id: "campfire",
          x: 0,
          y: 0,
          frame: 1,
          footprint: 0.5,
          piece: piece("fire", { lights: [glow(fireRadius)] }),
        },
      ],
    }
  }
  const shadowsOf = (c: CampCatalogue) => {
    const l = layout({ catalogue: c, steps: { water: 1, cooking: 1, donkey: 1, camel: 1, lookout: 1 } })
    const fireGlow = l.glows[0]
    const find = (id: string) => l.pieces.find(p => p.piece.id === id)!
    const at = (id: string) => ({ ...find(id), shadow: find(id).shadow! })
    return { l, fireGlow, at, find }
  }
  const degrees = (dy: number, dx: number) => (Math.atan2(dy, dx) * 180) / Math.PI

  it("casts a firelit shadow away from the fire", () => {
    const { fireGlow, at } = shadowsOf(around(3, [-1, 1]))
    for (const id of ["p-1", "p1"]) {
      const p = at(id)
      expect(p.shadow.angle).toBeCloseTo(degrees(p.y - fireGlow.y, p.x - fireGlow.x))
      expect(p.shadow.light).toBe(fireGlow.key)
    }
    expect(at("p-1").shadow.angle).not.toBeCloseTo(at("p1").shadow.angle)
  })

  it("falls back to the moon shadow out of the fire's reach", () => {
    const { at } = shadowsOf(around(0.1, [-2, 2]))
    for (const id of ["p-2", "p2"]) {
      expect(at(id).shadow.angle).toBe(CAMP_SHADOW_PARAMS.moonAngle)
      expect(at(id).shadow.light).toBeUndefined()
    }
  })

  it("casts no shadow from a piece that burns: its own fire lights the ground around it", () => {
    const { find } = shadowsOf(around(0.1, []))
    expect(find("fire").shadow).toBeUndefined()
  })

  it("darkens a shadow nearer the fire, keeping a floor so nothing floats", () => {
    const { at } = shadowsOf(around(1.5, [-1, 2.5, 9]))
    const [near, mid, far] = ["p-1", "p2.5", "p9"].map(id => at(id).shadow)
    expect(near.strength).toBeGreaterThan(mid.strength)
    expect(mid.strength).toBeGreaterThan(far.strength)
    expect(far.light).toBeUndefined()
    expect(far.strength).toBe(CAMP_SHADOW_PARAMS.strengthMin)
    expect(far.strength).toBeGreaterThan(0)
  })

  it("offsets a contact shadow away from the fire", () => {
    const firelit = shadowsOf(around(3, [-1, 1]))
    for (const id of ["p-1", "p1"]) {
      const p = firelit.at(id)
      const a = (p.shadow.angle * Math.PI) / 180
      expect(Math.sign(Math.cos(a) * p.shadow.offset)).toBe(Math.sign(p.x - firelit.fireGlow.x))
      expect(p.shadow.offset).toBeCloseTo(CAMP_SHADOW_PARAMS.offsetFire * p.scale)
    }
    const moonlit = shadowsOf(around(0.1, [-2])).at("p-2")
    expect(moonlit.shadow.offset).toBeCloseTo(CAMP_SHADOW_PARAMS.offsetMoon * moonlit.scale)
  })
})

describe("entranceAreas", () => {
  type Area = ReturnType<typeof entranceAreas>[number]
  const overlap = (a: Area, b: Area) =>
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 1e-9 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 1e-9
  const expectUsable = (areas: Area[]) => {
    for (const a of areas) {
      expect(a.width).toBeGreaterThanOrEqual(ENTRANCE_MIN)
      expect(a.height).toBeGreaterThanOrEqual(ENTRANCE_MIN)
    }
    for (let i = 0; i < areas.length; i++)
      for (let k = i + 1; k < areas.length; k++) expect(overlap(areas[i], areas[k])).toBe(false)
  }

  // A chest, a map table and a window crowded around the fire: small art, close together.
  const crowded: CampCatalogue = {
    spots: [
      {
        id: "mapTable",
        x: 0,
        y: 0.5,
        frame: 1.4,
        footprint: 0.5,
        steps: [{ chapter: "starter", pieces: [piece("table")] }],
      },
    ],
    fixed: [
      { id: "chest", x: -0.5, y: 0.5, frame: 1, footprint: 0.4, piece: piece("chest", { width: 0.5, height: 0.4 }) },
      { id: "window", x: -0.3, y: 0, frame: 1, footprint: 0.4, piece: piece("window", { width: 0.5, height: 0.5 }) },
    ],
  }

  it("keeps entrance hit areas at least 44px and apart", () => {
    for (const [width, height] of [
      [390, 844],
      [320, 640],
    ]) {
      const l = layout({ catalogue: crowded, width, height, chapter: "wizard", steps: { mapTable: 1 } })
      const areas = entranceAreas(l.pieces, ["chest", "window", "mapTable"])
      expect(areas.map(a => a.spot)).toEqual(["chest", "window", "mapTable"])
      expectUsable(areas)
    }
  })

  it("separates entrances whose art stands in the same place", () => {
    const l = layout({ steps: {} })
    const chest = l.pieces.find(p => p.spot === "chest")!
    const stacked = [chest, { ...chest, spot: "window" as const }]
    expectUsable(entranceAreas(stacked, ["chest", "window"]))
  })

  it("covers the whole art of a large entrance", () => {
    const big = { ...layout({ steps: {} }).pieces.find(p => p.spot === "chest")!, width: 200, height: 120 }
    const [area] = entranceAreas([big], ["chest"])
    expect([area.width, area.height]).toEqual([200, 120])
    expect([area.x, area.y]).toEqual([big.x, big.y - 60])
  })
})

describe("fullSteps", () => {
  it("fills a chapter with every step up to it", () => {
    const expected = (chapter: Difficulty): Partial<Record<CampSpotId, number>> => fullSteps(catalogue, chapter)
    expect(expected("starter")).toMatchObject({ fire: 2, sleeping: 1, water: 0, cooking: 0, camel: 0, lookout: 0 })
    expect(expected("junior")).toMatchObject({ fire: 3, sleeping: 2, water: 1, cooking: 0 })
    expect(expected("wizard")).toMatchObject({
      fire: 3,
      sleeping: 2,
      water: 1,
      cooking: 1,
      camel: 1,
      lookout: 1,
      godStatues: 1,
    })
  })
})
