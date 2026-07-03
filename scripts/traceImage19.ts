#!/usr/bin/env node
/**
 * Traces all stained glass regions from image #19 (landscape profile Anubis)
 * and outputs them as MosaicPieceDef entries.
 *
 * ViewBox: 0 0 200 121 (maintains 924:559 image aspect ratio)
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/traceImage19.ts
 */

import sharp from "sharp"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
const __dirname = dirname(fileURLToPath(import.meta.url))

const IMAGE_PATH = "/Users/matthijsgroen/.claude/image-cache/b3a9d7f1-7362-4685-a96b-582aec8a06c1/19.png"

// Window bounds within image (stone arch excluded)
const WIN_X0 = 28,
  WIN_Y0 = 0
const WIN_W = 924,
  WIN_H = 559

// ViewBox
const VB_W = 200,
  VB_H = 121

function toVB(px: number, py: number): [number, number] {
  return [Math.round(((px - WIN_X0) / WIN_W) * VB_W * 10) / 10, Math.round((py / WIN_H) * VB_H * 10) / 10]
}

function isStone(r: number, g: number, b: number) {
  return r > 28 && r < 130 && g > 18 && g < 90 && b > 8 && b < 60 && r > g + 8 && g > b
}
function isLead(r: number, g: number, b: number) {
  return r < 35 && g < 30 && b < 25
}

const { data, info } = await sharp(IMAGE_PATH).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = info

// Mark visited: stone walls, lead lines, outside window
const visited = new Uint8Array(width * height)
for (let i = 0; i < width * height; i++) {
  const r = data[i * 3],
    g = data[i * 3 + 1],
    b = data[i * 3 + 2]
  const x = i % width
  if (isLead(r, g, b) || isStone(r, g, b) || x < WIN_X0 || x > WIN_X0 + WIN_W) {
    visited[i] = 1
  }
}

function flood(sx: number, sy: number): number[] {
  const stack = [sy * width + sx]
  const region: number[] = []
  while (stack.length) {
    const idx = stack.pop()!
    if (visited[idx]) continue
    visited[idx] = 1
    region.push(idx)
    const x = idx % width,
      y = (idx / width) | 0
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nx = x + dx,
        ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (!visited[ny * width + nx]) stack.push(ny * width + nx)
    }
  }
  return region
}

type Region = { n: number; r: number; g: number; b: number; cx: number; cy: number; pixels: number[] }
const regions: Region[] = []

for (let y = WIN_Y0; y < WIN_H; y++) {
  for (let x = WIN_X0; x < WIN_X0 + WIN_W; x++) {
    const idx = y * width + x
    if (!visited[idx]) {
      const px = flood(x, y)
      if (px.length < 80) continue
      let rs = 0,
        gs = 0,
        bs = 0,
        cxs = 0,
        cys = 0
      for (const i of px) {
        rs += data[i * 3]
        gs += data[i * 3 + 1]
        bs += data[i * 3 + 2]
        cxs += i % width
        cys += (i / width) | 0
      }
      const n = px.length
      regions.push({
        n,
        r: (rs / n) | 0,
        g: (gs / n) | 0,
        b: (bs / n) | 0,
        cx: (cxs / n) | 0,
        cy: (cys / n) | 0,
        pixels: px,
      })
    }
  }
}

regions.sort((a, b) => b.n - a.n)
console.error(`Extracted ${regions.length} regions`)

// ---------------------------------------------------------------------------
// Boundary tracing (raster boundary → simplified polygon)
// ---------------------------------------------------------------------------
function douglasPeucker(pts: number[][], eps: number): number[][] {
  if (pts.length <= 2) return pts
  let maxD = 0,
    idx = 0
  const [x1, y1] = pts[0],
    [x2, y2] = pts[pts.length - 1]
  const len = Math.hypot(x2 - x1, y2 - y1)
  for (let i = 1; i < pts.length - 1; i++) {
    const d =
      len === 0
        ? Math.hypot(pts[i][0] - x1, pts[i][1] - y1)
        : Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / len
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD > eps) {
    const l = douglasPeucker(pts.slice(0, idx + 1), eps)
    const r = douglasPeucker(pts.slice(idx), eps)
    return l.slice(0, -1).concat(r)
  }
  return [pts[0], pts[pts.length - 1]]
}

// Angular boundary sampling: for each angle bucket around the centroid,
// keep the outermost boundary pixel. Produces a non-convex polygon that
// follows the actual piece outline — unlike convex hull, which fills in
// concave corners and leaves gaps between adjacent pieces.
function angularBoundary(boundary: number[][], cx: number, cy: number, nBuckets = 180): number[][] {
  const buckets = new Array<number[] | null>(nBuckets).fill(null)
  const bucketDist = new Array<number>(nBuckets).fill(0)
  for (const [x, y] of boundary) {
    const angle = Math.atan2(y - cy, x - cx)
    const b = ((Math.floor(((angle + Math.PI) / (2 * Math.PI)) * nBuckets) % nBuckets) + nBuckets) % nBuckets
    const dist = Math.hypot(x - cx, y - cy)
    if (dist > bucketDist[b]) {
      buckets[b] = [x, y]
      bucketDist[b] = dist
    }
  }
  // Fill empty buckets from nearest neighbour so the polygon stays closed
  for (let i = 0; i < nBuckets; i++) {
    if (!buckets[i]) {
      for (let d = 1; d < nBuckets; d++) {
        const p = buckets[(i - d + nBuckets) % nBuckets] ?? buckets[(i + d) % nBuckets]
        if (p) {
          buckets[i] = p
          break
        }
      }
    }
  }
  return buckets.filter(Boolean) as number[][]
}

function regionToPoints(region: Region): string | null {
  const set = new Set(region.pixels)
  const boundary: number[][] = []
  for (const idx of region.pixels) {
    const x = idx % width,
      y = (idx / width) | 0
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      if (!set.has((y + dy) * width + (x + dx))) {
        boundary.push([x, y])
        break
      }
    }
  }
  const outline = angularBoundary(boundary, region.cx, region.cy)
  const simplified = douglasPeucker(outline, 3)
  const vbPts = simplified.map(([px, py]) => toVB(px, py))
  const vbXs = vbPts.map(p => p[0]),
    vbYs = vbPts.map(p => p[1])
  if (Math.max(...vbXs) - Math.min(...vbXs) < 2 || Math.max(...vbYs) - Math.min(...vbYs) < 2) return null
  return vbPts.map(p => p.join(",")).join(" ")
}

// ---------------------------------------------------------------------------
// Zone definitions — 20 journey zones mapped to image #19 composition
//
// Classification: for each region, score against each zone using
// color distance + position distance, assign to best-match zone.
//
// Image coordinate space: x 28–952 (window), y 0–559
// Normalized: nx = (cx-28)/924, ny = cy/559
// ---------------------------------------------------------------------------
type ZoneDef = {
  id: string
  journeyId: string
  color: string // target hex color for the zone
  tr: number
  tg: number
  tb: number // target RGB
  nx: number
  ny: number // target normalized position
  posWeight: number // how much to weight position vs color
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
}

const ZONE_DEFS = [
  // Starter: sky background (both large panels, broad color match)
  { id: "bg_sky", journeyId: "starter_1", color: "#8fa5a5", nx: 0.5, ny: 0.35, posWeight: 0.25 },
  { id: "arch_top", journeyId: "wizard_2", color: "#79603f", nx: 0.49, ny: 0.06, posWeight: 0.5 },
  { id: "arch_l", journeyId: "starter_3", color: "#2b1a0d", nx: 0.18, ny: 0.3, posWeight: 0.5 },
  { id: "arch_r", journeyId: "starter_2", color: "#2b1a0d", nx: 0.82, ny: 0.3, posWeight: 0.5 },

  // Junior: structural areas
  { id: "arch_l_lo", journeyId: "junior_1", color: "#291a0f", nx: 0.15, ny: 0.7, posWeight: 0.6 },
  { id: "arch_r_lo", journeyId: "junior_2", color: "#2a1b0e", nx: 0.85, ny: 0.6, posWeight: 0.6 },
  { id: "bg_base", journeyId: "junior_3", color: "#bc8f3e", nx: 0.5, ny: 0.92, posWeight: 0.5 },
  // Upper arch blue corners (starter_4 = 2 levels, arch_blue has 2 pieces → exact match)
  { id: "arch_blue", journeyId: "starter_4", color: "#2e527c", nx: 0.5, ny: 0.16, posWeight: 0.5 },

  // Expert: decorative plant areas
  { id: "lotus_l_dk", journeyId: "expert_1", color: "#2e4a4a", nx: 0.23, ny: 0.62, posWeight: 0.5 },
  { id: "lotus_l_lt", journeyId: "expert_2", color: "#3b5a50", nx: 0.27, ny: 0.4, posWeight: 0.5 },
  { id: "lotus_r_dk", journeyId: "expert_3", color: "#486848", nx: 0.76, ny: 0.56, posWeight: 0.5 },
  { id: "lotus_r_lt", journeyId: "expert_4", color: "#3a6a56", nx: 0.75, ny: 0.36, posWeight: 0.5 },

  // Master: Anubis figure (center)
  { id: "body_tan", journeyId: "master_1", color: "#8f7857", nx: 0.5, ny: 0.58, posWeight: 0.4 },
  // Dark figure pieces (darker grays/blacks at center)
  { id: "body_dk", journeyId: "master_2", color: "#404550", nx: 0.52, ny: 0.44, posWeight: 0.5 },
  // Blue pieces in the lower figure area
  { id: "body_blue", journeyId: "master_3", color: "#1070aa", nx: 0.52, ny: 0.68, posWeight: 0.65 },
  { id: "body_lo", journeyId: "master_4", color: "#72361b", nx: 0.49, ny: 0.78, posWeight: 0.4 },

  // Wizard: iconic elements
  { id: "gold_deco", journeyId: "wizard_1", color: "#cf9e44", nx: 0.62, ny: 0.38, posWeight: 0.2 },
  // Blue spread (junior_4 = 3 levels, sky_blue has 4 pieces → OK)
  { id: "sky_blue", journeyId: "junior_4", color: "#2d5272", nx: 0.5, ny: 0.18, posWeight: 0.4 },
  // Anubis head + upper body area (center, cy 0.15-0.45) — position-dominant
  { id: "anubis_hi", journeyId: "wizard_3", color: "#7a8a88", nx: 0.54, ny: 0.35, posWeight: 0.7 },
  { id: "center_misc", journeyId: "wizard_4", color: "#7a6454", nx: 0.43, ny: 0.6, posWeight: 0.3 },
].map(z => {
  const [tr, tg, tb] = hexToRgb(z.color)
  return { ...z, tr, tg, tb }
}) as ZoneDef[]

// ---------------------------------------------------------------------------
// Zone assignment
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

function colorDist(r: number, g: number, b: number, tr: number, tg: number, tb: number): number {
  return Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) / 441 // max 255*sqrt(3)
}

function assignZone(region: Region): string {
  const nx = (region.cx - WIN_X0) / WIN_W
  const ny = region.cy / WIN_H
  let best = ZONE_DEFS[0].id,
    bestScore = Infinity

  for (const z of ZONE_DEFS) {
    const cd = colorDist(region.r, region.g, region.b, z.tr, z.tg, z.tb)
    const pd = Math.sqrt((nx - z.nx) ** 2 + (ny - z.ny) ** 2) / Math.sqrt(2) // 0-1
    const score = cd * (1 - z.posWeight) + pd * z.posWeight
    if (score < bestScore) {
      bestScore = score
      best = z.id
    }
  }
  return best
}

// Assign zones
const zoneMap = new Map<string, Region[]>()
for (const z of ZONE_DEFS) zoneMap.set(z.id, [])

for (const region of regions) {
  const zoneId = assignZone(region)
  zoneMap.get(zoneId)!.push(region)
}

// Log assignment
for (const z of ZONE_DEFS) {
  const rs = zoneMap.get(z.id)!
  console.error(`  ${z.id.padEnd(12)} → ${z.journeyId.padEnd(12)} ${rs.length} regions`)
}

// ---------------------------------------------------------------------------
// Generate MosaicPieceDef entries
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

for (const z of ZONE_DEFS) {
  const zoneRegions = zoneMap.get(z.id)!
  if (zoneRegions.length === 0) continue

  const numLevels = JOURNEY_LEVELS[z.journeyId] ?? 1
  zoneRegions.sort((a, b) => a.cy - b.cy || a.cx - b.cx)

  zoneRegions.forEach((region, i) => {
    const levelIndex = Math.min(Math.floor((i * numLevels) / zoneRegions.length), numLevels - 1)
    const pts = regionToPoints(region)
    if (!pts || pts.split(" ").length < 3) return

    // Use average color of region (not zone target color)
    const hex = `#${region.r.toString(16).padStart(2, "0")}${region.g.toString(16).padStart(2, "0")}${region.b.toString(16).padStart(2, "0")}`

    pieces.push({
      id: `${z.journeyId}_${i}`,
      journeyId: z.journeyId,
      levelIndex,
      zoneId: z.id,
      color: hex,
      points: pts,
    })
  })
}

console.error(`\nTotal pieces: ${pieces.length}`)

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const output = `// AUTO-GENERATED by scripts/traceImage19.ts — do not edit manually
// Run: node node_modules/tsx/dist/cli.mjs scripts/traceImage19.ts
// ViewBox: 0 0 ${VB_W} ${VB_H}

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
console.error("Written to src/ui/mosaicPieces.generated.ts")
