import { describe, it, expect } from "vitest"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { CampCatalogue, CampPiece, CampRow, CampSpotId } from "./campTypes"
import {
  CAMP_LAYOUT_PARAMS,
  CAMP_SHADOW_PARAMS,
  ENTRANCE_MIN,
  entranceAreas,
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
      row: 0,
      slot: -1,
      frame: 1.3,
      footprint: 1,
      steps: [
        { chapter: "starter", pieces: [piece("mat", { height: 0.3 })] },
        { chapter: "junior", pieces: [piece("tent"), piece("flag", { dx: 0.3, dy: -0.8, width: 0.2, height: 0.3 })] },
      ],
    },
    { id: "water", row: 2, slot: 1, frame: 1, footprint: 0.7, steps: [{ chapter: "junior", pieces: [piece("jar")] }] },
    {
      id: "cooking",
      row: 1,
      slot: -1,
      frame: 1.4,
      footprint: 1.1,
      steps: [{ chapter: "expert", pieces: [piece("pot")] }],
    },
    {
      id: "camel",
      row: 1,
      slot: 2,
      frame: 1.2,
      footprint: 0.9,
      steps: [{ chapter: "master", pieces: [piece("camel", { width: 1, height: 1 })] }],
    },
    {
      id: "lookout",
      row: 0,
      slot: -2.5,
      frame: 2.2,
      footprint: 0.8,
      steps: [{ chapter: "wizard", pieces: [piece("post", { width: 0.3, height: 1 })] }],
    },
    {
      id: "godStatues",
      row: 2,
      slot: 2.5,
      frame: 1.5,
      footprint: 1.3,
      steps: [{ chapter: "wizard", pieces: [piece("ra", { dx: 0.9, width: 0.5, height: 1 })] }],
    },
  ],
  fixed: [
    { id: "chest", row: 2, slot: -1, footprint: 0.7, piece: piece("chest", { height: 0.6, lights: [glow(0.8)] }) },
    { id: "window", row: 0, slot: 1, footprint: 0.5, piece: piece("window", { width: 1, height: 1 }) },
    {
      id: "campfire",
      row: 1,
      slot: 0,
      footprint: 0.4,
      piece: piece("smallFlame", { width: 0.5, height: 0.5, lights: [glow(2)] }),
    },
  ],
}

const placeOf = (spot: string) =>
  (catalogue.spots.find(s => s.id === spot) ?? catalogue.fixed.find(f => f.id === spot))!
const rowOf = (spot: string): CampRow => placeOf(spot).row

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

// A piece's offset is in frame units: its drawn width over its own width is one frame in px.
const anchorX = (p: CampLayout["pieces"][number]) => p.x - (p.piece.dx * p.width) / p.piece.width

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
    expect(before.glows.map(g => g.radius / before.unit)).toContainEqual(
      expect.closeTo(2 * CAMP_LAYOUT_PARAMS.depth[1], 6)
    )

    const after = layout({ steps: { fire: 2 } })
    expect(pieceIds(after)).not.toContain("smallFlame")
    const fireGlows = after.glows.filter(g => g.key.startsWith("campfire") || g.key.startsWith("fire"))
    expect(fireGlows.map(g => g.radius / after.unit)).toEqual([expect.closeTo(3 * CAMP_LAYOUT_PARAMS.depth[1], 6)])
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
          row: 0,
          slot: 0,
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
        expect(p.y - p.height).toBeGreaterThanOrEqual(insets.top)
        expect(p.y).toBeLessThanOrEqual(height - insets.bottom)
      }
    })
  })

  it("keeps spacing under its maximum and never overlaps two footprints in a row", () => {
    sweep(l => {
      expect(l.spacing).toBeLessThanOrEqual(CAMP_LAYOUT_PARAMS.spacingMax)
      for (const row of [0, 1, 2]) {
        const anchors = new Map<string, { x: number; scale: number; footprint: number }>()
        for (const p of l.pieces)
          if (rowOf(p.spot) === row)
            anchors.set(p.spot, { x: anchorX(p), scale: p.scale, footprint: placeOf(p.spot).footprint })
        const xs = [...anchors.values()].sort((a, b) => a.x - b.x)
        for (let k = 1; k < xs.length; k++) {
          if (Math.abs(xs[k].x - xs[k - 1].x) < 1e-9) continue
          const apart = ((xs[k].footprint + xs[k - 1].footprint) / 2) * CAMP_LAYOUT_PARAMS.gapFactor * xs[k].scale
          expect(xs[k].x - xs[k - 1].x).toBeGreaterThanOrEqual(apart - 1e-9)
        }
      }
    })
  })

  // Two wide frames with narrow footprints, side by side in the front row, on a phone too narrow to spread them.
  const pair = (frame: number, footprint: number): CampCatalogue => ({
    spots: (["water", "camel"] as const).map((id, slot) => ({
      id,
      row: 2,
      slot,
      frame,
      footprint,
      steps: [{ chapter: "starter", pieces: [piece(id, { width: 1, height: 1 })] }],
    })),
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
    expect(fixed.width).toBeCloseTo(fixed.scale)
  })

  it("keeps a light's place on its piece when the frame is bigger", () => {
    const lit = (frame: number): CampCatalogue => ({
      spots: [
        {
          id: "fire",
          row: 2,
          slot: 0,
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
        frame: 1,
        footprint: 0.8,
        steps: [{ chapter: "starter", pieces: [piece(`p${slot}`)] }],
      })),
      fixed: [
        { id: "campfire", row: 2, slot: 0, footprint: 0.5, piece: piece("fire", { lights: [glow(fireRadius)] }) },
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

  // A chest, a map table and a window crowded around the fire: small art, close slots.
  const crowded: CampCatalogue = {
    spots: [
      {
        id: "mapTable",
        row: 2,
        slot: 0,
        frame: 1.4,
        footprint: 0.5,
        steps: [{ chapter: "starter", pieces: [piece("table")] }],
      },
    ],
    fixed: [
      { id: "chest", row: 2, slot: -0.5, footprint: 0.4, piece: piece("chest", { width: 0.5, height: 0.4 }) },
      { id: "window", row: 1, slot: -0.3, footprint: 0.4, piece: piece("window", { width: 0.5, height: 0.5 }) },
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
