#!/usr/bin/env node
/**
 * Generates mosaicPieces.generated.ts via zone-constrained Voronoi tessellation.
 *
 * Instead of binary bisection (which produces horizontal stripes), we:
 *  1. Scatter ~2-3 seed points per pyramid level inside each zone
 *  2. Clip each seed's Voronoi cell against every other seed in the same zone
 *  3. Use the 18 zone polygons extracted from the reference image
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/generateMosaicVoronoi.ts
 */

import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Types / primitives
// ---------------------------------------------------------------------------
type Point = [number, number]
type Polygon = Point[]

function dot(a: Point, b: Point) {
  return a[0] * b[0] + a[1] * b[1]
}
function sub(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]]
}

function clipToHalfPlane(poly: Polygon, lp: Point, n: Point): Polygon {
  if (poly.length < 3) return []
  const out: Polygon = []
  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i],
      next = poly[(i + 1) % poly.length]
    const dc = dot(sub(curr, lp), n),
      dn = dot(sub(next, lp), n)
    if (dc >= 0) out.push(curr)
    if (dc >= 0 !== dn >= 0) {
      const t = dc / (dc - dn)
      out.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])])
    }
  }
  return out
}

function parsePoints(s: string): Polygon {
  return s.split(" ").map(p => p.split(",").map(Number) as Point)
}

function formatPoints(poly: Polygon): string {
  return poly.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(" ")
}

function centroid(poly: Polygon): Point {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length
  return [cx, cy]
}

function pointInPolygon(pt: Point, poly: Polygon): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32)
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
// Zone-constrained Voronoi
// ---------------------------------------------------------------------------
function voronoiInZone(zonePoly: Polygon, n: number, rng: () => number): Polygon[] {
  if (n <= 0) return []
  if (n === 1) return [zonePoly]

  const xs = zonePoly.map(p => p[0]),
    ys = zonePoly.map(p => p[1])
  const minX = Math.min(...xs),
    maxX = Math.max(...xs)
  const minY = Math.min(...ys),
    maxY = Math.max(...ys)
  const w = maxX - minX,
    h = maxY - minY

  // Scatter seed points inside zone with minimum distance enforcement
  const seeds: Point[] = []
  const minDist = Math.sqrt((w * h) / n) * 0.5
  let attempts = 0
  while (seeds.length < n && attempts < n * 500) {
    attempts++
    const x = minX + rng() * w
    const y = minY + rng() * h
    if (!pointInPolygon([x, y], zonePoly)) continue
    const tooClose = seeds.some(s => Math.hypot(s[0] - x, s[1] - y) < minDist)
    if (!tooClose) seeds.push([x, y])
  }
  // Fill remaining with centroid fallback
  while (seeds.length < n) seeds.push([minX + rng() * w, minY + rng() * h])

  // Compute cells: start with zone polygon, clip against each bisector
  const cells: Polygon[] = seeds.map(() => [...zonePoly])

  for (let i = 0; i < seeds.length; i++) {
    for (let j = 0; j < seeds.length; j++) {
      if (i === j || cells[i].length < 3) continue
      const mid: Point = [(seeds[i][0] + seeds[j][0]) / 2, (seeds[i][1] + seeds[j][1]) / 2]
      // Normal pointing from j toward i (keep the i side)
      const nv: Point = [seeds[i][0] - seeds[j][0], seeds[i][1] - seeds[j][1]]
      cells[i] = clipToHalfPlane(cells[i], mid, nv)
    }
  }

  return cells.filter(c => c.length >= 3)
}

// ---------------------------------------------------------------------------
// Journeys → level counts
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
// Zones — polygons traced from reference image (ViewBox 0 0 200 250)
//
// Colors from reference image pixel sampling.
// Skull split 3 ways (face/skull/jaw) to reach 20 zones.
// bg_mid_l/r are the background visible around the body (mid-level).
// ---------------------------------------------------------------------------
const ZONES: Array<{ id: string; journeyId: string; color: string; points: string; piecesPerLevel: number }> = [
  // Starter: outer background corners
  {
    id: "bg_tl",
    journeyId: "starter_2",
    color: "#1b2f6d",
    piecesPerLevel: 2,
    points: "19.6,13.2 89.2,13.2 72.2,49.8 19.6,52.2",
  },
  {
    id: "bg_tr",
    journeyId: "starter_3",
    color: "#142454",
    piecesPerLevel: 2,
    points: "93.3,13.2 182,13.2 182,52.2 130.9,50.3 95.9,16",
  },
  {
    id: "bg_bl",
    journeyId: "starter_4",
    color: "#08122e",
    piecesPerLevel: 2,
    points: "19.6,188 56.7,188 69.6,227.9 66.5,251.4 19.6,251.4",
  },
  {
    id: "bg_br",
    journeyId: "starter_1",
    color: "#081232",
    piecesPerLevel: 2,
    points: "132,227.9 144.8,188 182,188 182,251.4 133.5,251.4 132,232.1",
  },

  // Junior: mid background (visible beside body) + silhouette
  {
    id: "bg_mid_l",
    journeyId: "junior_2",
    color: "#0e1d47",
    piecesPerLevel: 2,
    points: "19.6,54.5 70.1,52.6 70.6,56.9 56.7,185.2 19.6,185.2",
  },
  {
    id: "skull",
    journeyId: "junior_3",
    color: "#1c1c30",
    piecesPerLevel: 2,
    points: "72.7,53.6 128.9,53.6 123.5,80 78,80",
  },
  {
    id: "leg_l",
    journeyId: "junior_1",
    color: "#763410",
    piecesPerLevel: 2,
    points: "69.1,250.5 72.2,229.8 99.5,234 99.5,251.4 69.1,251.4",
  },
  {
    id: "leg_r",
    journeyId: "junior_4",
    color: "#763410",
    piecesPerLevel: 2,
    points: "102.1,234 129.4,229.8 130.9,250 102.1,251.4",
  },

  // Expert: head features
  {
    id: "face",
    journeyId: "expert_3",
    color: "#1c1c30",
    piecesPerLevel: 2,
    points: "86.6,19.3 116.5,19.3 128.9,53.6 72.7,53.6",
  },
  {
    id: "jaw",
    journeyId: "expert_2",
    color: "#1e1e3a",
    piecesPerLevel: 2,
    points: "78,80 123.5,80 121.1,92.1 102.6,96.8 80.4,92.1",
  },
  {
    id: "eye_l",
    journeyId: "expert_1",
    color: "#da8c0b",
    piecesPerLevel: 1,
    points: "87.1,72.8 88.7,68.1 93.8,66.3 95.9,70.5 90.7,74.2 87.6,73.3",
  },
  {
    id: "eye_r",
    journeyId: "expert_4",
    color: "#da8b0b",
    piecesPerLevel: 1,
    points: "105.7,70.5 113.4,66.3 113.9,73.3 106.7,71.4",
  },

  // Master: clothing
  {
    id: "collar",
    journeyId: "master_2",
    color: "#0d9185",
    piecesPerLevel: 2,
    points: "77.3,107.6 80.4,94.5 121.1,94.5 124.2,107.6 116.5,124.1 101,128.3 85.1,124.1 77.3,110",
  },
  {
    id: "torso",
    journeyId: "master_1",
    color: "#1e3eab",
    piecesPerLevel: 2,
    points: "78.9,173.4 82,149.9 119.6,149.9 122.7,173.4 122.7,175.3 101,179.5 78.9,174.8",
  },
  {
    id: "belt",
    journeyId: "master_4",
    color: "#caa835",
    piecesPerLevel: 1,
    points: "77.3,183.7 78.4,177.2 123.2,177.2 124.2,183.7 124.2,185.6 103.6,188.9 77.3,185.6",
  },
  {
    id: "kilt",
    journeyId: "master_3",
    color: "#faf0c3",
    piecesPerLevel: 2,
    points: "72.2,227 77.3,187.5 124.7,187.5 129.4,226.5 101.5,232.1 72.2,227.4",
  },

  // Wizard: iconic elements
  {
    id: "arm_l",
    journeyId: "wizard_2",
    color: "#1e3988",
    piecesPerLevel: 2,
    points: "59.3,171.1 60.8,125 68.6,94.5 77.8,94.5 83,124.5 73.7,184.7 59.3,185.2",
  },
  {
    id: "arm_r",
    journeyId: "wizard_3",
    color: "#1e3988",
    piecesPerLevel: 2,
    points: "118.6,124.5 123.7,94.5 133,94.5 140.7,125.5 142.3,171.5 142.3,185.2 127.8,184.2 118.6,126.9",
  },
  {
    id: "torso_top",
    journeyId: "wizard_4",
    color: "#1d4cd2",
    piecesPerLevel: 2,
    points: "82,148 85.6,125.9 116,125.9 119.6,148 102.1,152.3 83.5,148.5",
  },
  {
    id: "bg_mid_r",
    journeyId: "wizard_1",
    color: "#0e1d47",
    piecesPerLevel: 2,
    points: "130.9,57.3 131.4,52.6 182,54.5 182,185.2 144.8,185.2 130.9,59.7",
  },
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
let total = 0

for (const zone of ZONES) {
  const numLevels = JOURNEY_LEVELS[zone.journeyId] ?? 1
  const ppl = zone.piecesPerLevel
  const numPieces = numLevels * ppl
  const rng = mulberry32(hashStr(zone.id))
  const zonePoly = parsePoints(zone.points)
  const shards = voronoiInZone(zonePoly, numPieces, rng)

  // Sort shards spatially (top-left to bottom-right) for predictable level assignment
  const cx = centroid(zonePoly)
  shards.sort((a, b) => {
    const ca = centroid(a),
      cb = centroid(b)
    // Spiral out from centroid: angle first, then distance
    const da = Math.atan2(ca[1] - cx[1], ca[0] - cx[0])
    const db = Math.atan2(cb[1] - cx[1], cb[0] - cx[0])
    return da - db
  })

  shards.forEach((shard, i) => {
    const levelIndex = Math.floor(i / ppl)
    pieces.push({
      id: `${zone.journeyId}_${i}`,
      journeyId: zone.journeyId,
      levelIndex: Math.min(levelIndex, numLevels - 1),
      zoneId: zone.id,
      color: zone.color,
      points: formatPoints(shard),
    })
  })
  total += shards.length
  console.log(
    `  ${zone.id.padEnd(12)} → ${zone.journeyId.padEnd(12)} ${shards.length} pieces (${ppl}/level × ${numLevels} levels)`
  )
}

console.log(`\nTotal pieces: ${total}`)

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const output = `// AUTO-GENERATED by scripts/generateMosaicVoronoi.ts — do not edit manually
// Run: node node_modules/tsx/dist/cli.mjs scripts/generateMosaicVoronoi.ts

export type MosaicPieceDef = {
  id: string
  journeyId: string
  levelIndex: number
  zoneId: string
  color: string
  points: string
}

export const MOSAIC_PIECES: MosaicPieceDef[] = ${JSON.stringify(pieces, null, 2)}
`

writeFileSync(join(__dirname, "../src/ui/mosaicPieces.generated.ts"), output)
console.log("Written to src/ui/mosaicPieces.generated.ts")
