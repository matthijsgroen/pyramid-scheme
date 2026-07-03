#!/usr/bin/env tsx
/**
 * Generates mosaicPieces.generated.ts — 117 stained-glass shards for a
 * profile-view Anubis mosaic.
 *
 * 20 zones (one per pyramid journey) are each subdivided into levelCount
 * irregular polygons using recursive bisection with angle jitter.
 *
 * Run: npx tsx scripts/generateMosaicPieces.ts
 */

import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Point = [number, number]
type Polygon = Point[]

// ---------------------------------------------------------------------------
// Seeded random (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

// ---------------------------------------------------------------------------
// Polygon math
// ---------------------------------------------------------------------------
function dot(a: Point, b: Point): number {
  return a[0] * b[0] + a[1] * b[1]
}
function sub(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]]
}

/** Clip polygon to the half-plane where dot(x - lp, n) >= 0 */
function clipToHalfPlane(poly: Polygon, lp: Point, n: Point): Polygon {
  if (poly.length < 3) return []
  const result: Polygon = []
  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i]
    const next = poly[(i + 1) % poly.length]
    const dCurr = dot(sub(curr, lp), n)
    const dNext = dot(sub(next, lp), n)
    if (dCurr >= 0) result.push(curr)
    if (dCurr >= 0 !== dNext >= 0) {
      const t = dCurr / (dCurr - dNext)
      result.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])])
    }
  }
  return result
}

/** Split a polygon into two pieces with a slightly angled line */
function splitPolygon(poly: Polygon, rng: () => number): [Polygon, Polygon] {
  const xs = poly.map(p => p[0])
  const ys = poly.map(p => p[1])
  const minX = Math.min(...xs),
    maxX = Math.max(...xs)
  const minY = Math.min(...ys),
    maxY = Math.max(...ys)
  const w = maxX - minX,
    h = maxY - minY

  const t = 0.4 + rng() * 0.2 // split position 40–60%
  const a = (rng() - 0.5) * 0.3 // ±~8.5° angle jitter

  let lp: Point, n: Point

  if (w >= h) {
    // Dominant axis: horizontal → split with near-horizontal cut
    lp = [(minX + maxX) / 2, minY + h * t]
    n = [-Math.sin(a), Math.cos(a)]
  } else {
    // Dominant axis: vertical → split with near-vertical cut
    lp = [minX + w * t, (minY + maxY) / 2]
    n = [Math.cos(a), Math.sin(a)]
  }

  const neg: Point = [-n[0], -n[1]]
  const p1 = clipToHalfPlane(poly, lp, n)
  const p2 = clipToHalfPlane(poly, lp, neg)
  return [p1.length >= 3 ? p1 : poly, p2.length >= 3 ? p2 : poly]
}

/** Recursively subdivide a polygon into n pieces */
function subdivide(poly: Polygon, n: number, rng: () => number): Polygon[] {
  if (n <= 1 || poly.length < 3) return poly.length >= 3 ? [poly] : []
  const [a, b] = splitPolygon(poly, rng)
  const nA = Math.ceil(n / 2)
  return [...subdivide(a, nA, rng), ...subdivide(b, n - nA, rng)]
}

function parsePoints(s: string): Polygon {
  return s.split(" ").map(pair => pair.split(",").map(Number) as Point)
}

function formatPoints(poly: Polygon): string {
  return poly.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(" ")
}

// ---------------------------------------------------------------------------
// Journey → levelCount  (matches src/data/journeys.ts)
// ---------------------------------------------------------------------------
const JOURNEY_LEVELS: Record<string, number> = {
  starter_1: 3,
  starter_2: 4,
  starter_3: 5,
  starter_4: 2,
  junior_1: 3,
  junior_2: 6,
  junior_3: 8,
  junior_4: 3,
  expert_1: 4,
  expert_2: 6,
  expert_3: 9,
  expert_4: 4,
  master_1: 4,
  master_2: 4,
  master_3: 9,
  master_4: 8,
  wizard_1: 5,
  wizard_2: 9,
  wizard_3: 11,
  wizard_4: 10,
}

// ---------------------------------------------------------------------------
// 20 zones — frontal-view Anubis (stained-glass, image-traced)
//
// ViewBox 0 0 200 250.  Background tiles fill canvas; figure zones overlay.
// SVG z-order: backgrounds → body → collar → head → face details → eyes.
//
// Difficulty → visual prominence:
//   starter  → background (least prominent)
//   junior   → outer silhouette (ears, skull mass, legs)
//   expert   → head features   (forehead plate, jaw, eyes)
//   master   → clothing        (collar, torso, belt, kilt)
//   wizard   → iconic          (neck, arms, upper torso)
// ---------------------------------------------------------------------------
const ZONES: Array<{ id: string; journeyId: string; color: string; points: string }> = [
  // ── Starter: background ──────────────────────────────────────────────────
  { id: "bg_tl", journeyId: "starter_2", color: "#1b2f6e", points: "0,0 100,0 100,124 0,124" },
  { id: "bg_tr", journeyId: "starter_3", color: "#162555", points: "100,0 200,0 200,124 100,124" },
  { id: "bg_bl", journeyId: "starter_4", color: "#08122e", points: "0,124 100,124 100,250 0,250" },
  { id: "bg_br", journeyId: "starter_1", color: "#0a1535", points: "100,124 200,124 200,250 100,250" },

  // ── Junior: outer silhouette ─────────────────────────────────────────────
  { id: "ear_l", journeyId: "junior_4", color: "#0d0d1e", points: "42,2 68,2 70,50 54,56 40,40" },
  { id: "skull", journeyId: "junior_3", color: "#0d0d20", points: "54,56 70,50 130,50 146,56 148,106 52,106" },
  { id: "ear_r", journeyId: "junior_2", color: "#0d0d1e", points: "132,2 158,2 160,40 146,56 130,50" },
  { id: "legs", journeyId: "junior_1", color: "#78350f", points: "70,218 130,218 128,244 72,244" },

  // ── Expert: head features ─────────────────────────────────────────────────
  { id: "face", journeyId: "expert_3", color: "#0a0a1c", points: "68,2 132,2 130,50 70,50" },
  { id: "jaw", journeyId: "expert_2", color: "#13132a", points: "52,106 148,106 142,124 58,124" },
  { id: "eye_l", journeyId: "expert_1", color: "#f59e0b", points: "76,88 93,86 93,106 76,106" },
  { id: "eye_r", journeyId: "expert_4", color: "#f59e0b", points: "107,86 124,88 124,106 107,106" },

  // ── Master: clothing ─────────────────────────────────────────────────────
  { id: "collar", journeyId: "master_2", color: "#0d9488", points: "58,124 142,124 138,148 62,148" },
  { id: "torso", journeyId: "master_1", color: "#2563eb", points: "64,175 136,175 134,196 66,196" },
  { id: "kilt", journeyId: "master_3", color: "#fef3c7", points: "68,202 132,202 130,218 70,218" },
  { id: "belt", journeyId: "master_4", color: "#d4af37", points: "66,196 134,196 132,202 68,202" },

  // ── Wizard: iconic ───────────────────────────────────────────────────────
  { id: "neck", journeyId: "wizard_1", color: "#1e1e38", points: "88,106 112,106 112,124 88,124" },
  { id: "arm_l", journeyId: "wizard_2", color: "#1d4ed8", points: "44,148 62,148 64,196 44,196" },
  { id: "arm_r", journeyId: "wizard_3", color: "#1d4ed8", points: "138,148 156,148 156,196 136,196" },
  { id: "torso_top", journeyId: "wizard_4", color: "#1e40af", points: "62,148 138,148 136,175 64,175" },
]

// ---------------------------------------------------------------------------
// Generate pieces
// ---------------------------------------------------------------------------
type PieceDef = {
  id: string
  journeyId: string
  levelIndex: number
  zoneId: string
  color: string
  points: string
}

const pieces: PieceDef[] = []

for (const zone of ZONES) {
  const n = JOURNEY_LEVELS[zone.journeyId] ?? 1
  const rng = mulberry32(hashStr(zone.id))
  const shards = subdivide(parsePoints(zone.points), n, rng)

  shards.forEach((shard, i) => {
    pieces.push({
      id: `${zone.journeyId}_${i}`,
      journeyId: zone.journeyId,
      levelIndex: i,
      zoneId: zone.id,
      color: zone.color,
      points: formatPoints(shard),
    })
  })
}

const total = pieces.length
console.log(`Generated ${total} pieces across ${ZONES.length} zones`)

const byZone = ZONES.map(z => {
  const count = pieces.filter(p => p.zoneId === z.id).length
  return `  ${z.id.padEnd(10)} → ${z.journeyId.padEnd(12)} ${count} pieces`
})
console.log(byZone.join("\n"))

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const output = `// AUTO-GENERATED by scripts/generateMosaicPieces.ts — do not edit manually
// Run: npx tsx scripts/generateMosaicPieces.ts

export type MosaicPieceDef = {
  id: string
  journeyId: string
  levelIndex: number
  zoneId: string
  color: string
  points: string
}

export const MOSAIC_PIECES: MosaicPieceDef[] = ${JSON.stringify(pieces, null, 2)} as const
`

writeFileSync(join(__dirname, "../src/ui/mosaicPieces.generated.ts"), output)
console.log("Written to src/ui/mosaicPieces.generated.ts")
