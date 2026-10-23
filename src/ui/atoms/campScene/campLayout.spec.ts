import { describe, it, expect } from "vitest"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { CampCatalogue, CampPiece, CampRow, CampSpotId } from "./campTypes"
import {
  CAMP_LAYOUT_PARAMS,
  CAMP_SHADOW_PARAMS,
  fullSteps,
  layoutCamp,
  type CampLayout,
  type CampLayoutInput,
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
      row: 1,
      slot: 0,
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
      row: 0,
      slot: -1,
      steps: [
        { chapter: "starter", pieces: [piece("mat", { height: 0.3 })] },
        { chapter: "junior", pieces: [piece("tent"), piece("flag", { dx: 0.3, dy: -0.8, width: 0.2, height: 0.3 })] },
      ],
    },
    { id: "water", row: 2, slot: 1, steps: [{ chapter: "junior", pieces: [piece("jar")] }] },
    { id: "cooking", row: 1, slot: -1, steps: [{ chapter: "expert", pieces: [piece("pot")] }] },
    { id: "camel", row: 1, slot: 2, steps: [{ chapter: "master", pieces: [piece("camel", { width: 1, height: 1 })] }] },
    {
      id: "lookout",
      row: 0,
      slot: -2.5,
      steps: [{ chapter: "wizard", pieces: [piece("post", { width: 0.3, height: 1 })] }],
    },
    {
      id: "godStatues",
      row: 2,
      slot: 2.5,
      steps: [{ chapter: "wizard", pieces: [piece("ra", { dx: 0.9, width: 0.5, height: 1 })] }],
    },
  ],
  fixed: [
    { id: "chest", row: 2, slot: -1, piece: piece("chest", { height: 0.6, lights: [glow(0.8)] }) },
    { id: "window", row: 0, slot: 1, piece: piece("window", { width: 1, height: 1 }) },
    { id: "campfire", row: 1, slot: 0, piece: piece("smallFlame", { width: 0.5, height: 0.5, lights: [glow(2)] }) },
  ],
}

const rowOf = (spot: string): CampRow =>
  (catalogue.spots.find(s => s.id === spot) ?? catalogue.fixed.find(f => f.id === spot))!.row

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

const pieceIds = (l: CampLayout) => l.pieces.map(p => p.piece.id)

const SIZES: [number, number][] = [
  [390, 844],
  [820, 1180],
  [1000, 836],
  [1600, 700],
  [320, 900],
]
const INSETS = [
  { top: 56, bottom: 96 },
  { top: 0, bottom: 0 },
]

const sweep = (check: (l: CampLayout, i: CampLayoutInput) => void) => {
  for (const [width, height] of SIZES)
    for (const insets of INSETS)
      for (const chapter of difficulties) {
        const i = input({ width, height, insets, chapter, steps: fullSteps(catalogue, chapter) })
        check(layoutCamp(i)!, i)
      }
}

const anchorX = (p: CampLayout["pieces"][number]) => p.x - p.piece.dx * p.scale

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

  it("a step can replace a fixed piece, and its glow goes with it", () => {
    const before = layout({ steps: { fire: 1 } })
    expect(pieceIds(before)).toContain("smallFlame")
    expect(before.glows.map(g => g.radius / before.unit)).toContainEqual(expect.closeTo(2 * 0.89, 6))

    const after = layout({ steps: { fire: 2 } })
    expect(pieceIds(after)).not.toContain("smallFlame")
    const fireGlows = after.glows.filter(g => g.key.startsWith("campfire") || g.key.startsWith("fire"))
    expect(fireGlows.map(g => g.radius / after.unit)).toEqual([expect.closeTo(3 * 0.89, 6)])
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

  it("draws only the latest step of a spot when each step replaces the one before", () => {
    const wholeSpot: CampCatalogue = {
      spots: [
        {
          id: "water",
          row: 1,
          slot: 0,
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
          row: 0,
          slot: 0,
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
        const half = (p.piece.width * p.scale) / 2
        expect(p.x - half).toBeGreaterThanOrEqual(0)
        expect(p.x + half).toBeLessThanOrEqual(width)
        expect(p.y - p.piece.height * p.scale).toBeGreaterThanOrEqual(insets.top)
        expect(p.y).toBeLessThanOrEqual(height - insets.bottom)
      }
    })
  })

  it("keeps spacing within its bounds and never overlaps a row", () => {
    sweep(l => {
      expect(l.spacing).toBeGreaterThanOrEqual(CAMP_LAYOUT_PARAMS.spacingMin)
      expect(l.spacing).toBeLessThanOrEqual(CAMP_LAYOUT_PARAMS.spacingMax)
      for (const row of [0, 1, 2]) {
        const anchors = new Map<string, { x: number; scale: number }>()
        for (const p of l.pieces) if (rowOf(p.spot) === row) anchors.set(p.spot, { x: anchorX(p), scale: p.scale })
        const xs = [...anchors.values()].sort((a, b) => a.x - b.x)
        for (let k = 1; k < xs.length; k++) {
          if (Math.abs(xs[k].x - xs[k - 1].x) < 1e-9) continue
          expect(xs[k].x - xs[k - 1].x).toBeGreaterThanOrEqual(xs[k].scale)
        }
      }
    })
  })

  it("keeps at least 0.5u of far sand under the horizon", () => {
    const { depth, backHeadroom, farSandMin } = CAMP_LAYOUT_PARAMS
    for (const size of [...SIZES, [1000, 400] as [number, number]])
      for (const insets of INSETS)
        for (const chapter of difficulties) {
          const [width, height] = size
          const l = layout({ width, height, insets, chapter })
          const backBaseline = l.pieces.find(p => p.spot === "window")!.y
          const farSand = (backBaseline - (depth[0] + backHeadroom) * l.unit - l.horizon) / l.unit
          expect(farSand).toBeGreaterThanOrEqual(farSandMin - 1e-9)
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
        const xs = new Map(l.pieces.map(p => [p.spot, anchorX(p)]))
        return [...xs.entries()].sort((a, b) => a[1] - b[1]).map(([spot]) => spot)
      })
      for (let k = 1; k < orders.length; k++) {
        const [before, after] = [orders[k - 1], orders[k]]
        expect(after.filter(s => before.includes(s))).toEqual(before.filter(s => after.includes(s)))
      }
    }
  })

  it("zooms out as the chapter rises", () => {
    for (const [width, height] of [
      [390, 844],
      [1000, 836],
    ]) {
      const units = difficulties.map(chapter => layout({ width, height, chapter }).unit)
      for (let k = 1; k < units.length; k++) expect(units[k]).toBeLessThanOrEqual(units[k - 1])
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
      l.spacing,
      l.rowGap,
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
  // One fire in the middle of the front row with a glow of `fireRadius`; pieces at the given slots around it.
  const around = (fireRadius: number, slots: number[]): CampCatalogue => {
    const ids: CampSpotId[] = ["water", "cooking", "donkey", "camel", "lookout"]
    return {
      spots: slots.map((slot, i) => ({
        id: ids[i],
        row: 2,
        slot,
        steps: [{ chapter: "starter", pieces: [piece(`p${slot}`)] }],
      })),
      fixed: [{ id: "campfire", row: 2, slot: 0, piece: piece("fire", { lights: [glow(fireRadius)] }) }],
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
    const { at } = shadowsOf(around(1.5, [-1, 2.5, 6]))
    const [near, mid, far] = ["p-1", "p2.5", "p6"].map(id => at(id).shadow)
    expect(near.strength).toBeGreaterThan(mid.strength)
    expect(mid.strength).toBeGreaterThan(far.strength)
    expect(far.light).toBeUndefined()
    expect(far.strength).toBe(CAMP_SHADOW_PARAMS.strengthMin)
    expect(far.strength).toBeGreaterThan(0)
  })

  it("lengthens a shadow farther from the fire, up to a clamp", () => {
    const { at } = shadowsOf(around(1.5, [-1, 2.5, 6]))
    const [near, mid, far] = ["p-1", "p2.5", "p6"].map(id => at(id).shadow)
    expect(near.length).toBeLessThan(mid.length)
    expect(mid.length).toBeLessThan(far.length)
    expect(far.length).toBe(CAMP_SHADOW_PARAMS.lengthMax)
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
