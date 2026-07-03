#!/usr/bin/env node
/**
 * Traces piece polygons from stained-glass-mask.png (grayscale mask where
 * bright pixels = piece interior, dark pixels = lead lines).
 *
 * The component renders stained-glass.png as background and uses the traced
 * polygons as a dark overlay — revealing a piece makes its polygon transparent.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/traceMask.ts
 */

import sharp from "sharp"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
const __dirname = dirname(fileURLToPath(import.meta.url))

const MASK_PATH = "src/assets/stained-glass-mask.png"
// 128 = pure midpoint: snaps anti-aliased edge pixels to lead rather than including gray fringes
const THRESHOLD = 128
const MIN_PIXELS = 40

// ViewBox: width 200, height derived from actual image dimensions after load
const VB_W = 200
let VB_H = 358 // updated after image is loaded

// Keep alpha channel — transparent pixels (stone surround) are treated as lead
const { data, info } = await sharp(MASK_PATH).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = info
const STRIDE = 4 // RGBA
VB_H = Math.round((VB_W * height) / width)
console.error(`Mask: ${width}×${height}  ViewBox: ${VB_W}×${VB_H}`)

function toVB(px: number, py: number): [number, number] {
  return [Math.round((px / width) * VB_W * 10) / 10, Math.round((py / height) * VB_H * 10) / 10]
}

// ---------------------------------------------------------------------------
// Build visited map: dark pixels (lead lines) + transparent pixels are pre-visited
// ---------------------------------------------------------------------------
const visited = new Uint8Array(width * height)
for (let i = 0; i < width * height; i++) {
  const r = data[i * STRIDE],
    g = data[i * STRIDE + 1],
    b = data[i * STRIDE + 2],
    a = data[i * STRIDE + 3]
  const brightness = (r + g + b) / 3
  if (a < 128 || brightness < THRESHOLD) visited[i] = 1
}

// ---------------------------------------------------------------------------
// Flood fill
// ---------------------------------------------------------------------------
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
    if (x > 0 && !visited[idx - 1]) stack.push(idx - 1)
    if (x < width - 1 && !visited[idx + 1]) stack.push(idx + 1)
    if (y > 0 && !visited[idx - width]) stack.push(idx - width)
    if (y < height - 1 && !visited[idx + width]) stack.push(idx + width)
  }
  return region
}

type Region = { n: number; cx: number; cy: number; pixels: number[] }
const regions: Region[] = []

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = y * width + x
    if (!visited[idx]) {
      const px = flood(x, y)
      if (px.length < MIN_PIXELS) continue
      let cxs = 0,
        cys = 0
      for (const i of px) {
        cxs += i % width
        cys += (i / width) | 0
      }
      const n = px.length
      regions.push({ n, cx: (cxs / n) | 0, cy: (cys / n) | 0, pixels: px })
    }
  }
}
regions.sort((a, b) => b.n - a.n)
console.error(`Regions found: ${regions.length}`)

// ---------------------------------------------------------------------------
// Boundary tracing: angular sampling from centroid (non-convex, tiles well)
// ---------------------------------------------------------------------------
function convexHull(pts: number[][]): number[][] {
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: number[][] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: number[][] = []
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

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

function angularBoundary(pixels: number[], cx: number, cy: number, nBuckets = 240): number[][] {
  const set = new Set(pixels)
  const buckets = new Array<number[] | null>(nBuckets).fill(null)
  const bucketDist = new Array<number>(nBuckets).fill(0)

  for (const idx of pixels) {
    const x = idx % width,
      y = (idx / width) | 0
    // Only consider boundary pixels
    let isBoundary = false
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      if (!set.has((y + dy) * width + (x + dx))) {
        isBoundary = true
        break
      }
    }
    if (!isBoundary) continue

    const angle = Math.atan2(y - cy, x - cx)
    const b = ((Math.floor(((angle + Math.PI) / (2 * Math.PI)) * nBuckets) % nBuckets) + nBuckets) % nBuckets
    const dist = Math.hypot(x - cx, y - cy)
    if (dist > bucketDist[b]) {
      buckets[b] = [x, y]
      bucketDist[b] = dist
    }
  }

  // Fill empty buckets from nearest neighbour
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
  const allXs = region.pixels.map(i => i % width)
  const allYs = region.pixels.map(i => (i / width) | 0)
  const spanX = Math.max(...allXs) - Math.min(...allXs)
  const spanY = Math.max(...allYs) - Math.min(...allYs)

  // Check convexity: if convex hull area ≈ region pixel count, the shape is convex → hull is better
  const allPts = region.pixels.map(i => [i % width, (i / width) | 0])
  const hull = convexHull(allPts)
  // Compute hull area (shoelace)
  let hullArea = 0
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i],
      [x2, y2] = hull[(i + 1) % hull.length]
    hullArea += x1 * y2 - x2 * y1
  }
  hullArea = Math.abs(hullArea) / 2

  let pts: number[][]
  // Use convex hull when: region is thin, or fill ratio ≥ 80% (shape is roughly convex)
  if (spanX < 6 || spanY < 6 || region.n / hullArea >= 0.8) {
    pts = douglasPeucker(hull, 2)
  } else {
    pts = douglasPeucker(angularBoundary(region.pixels, region.cx, region.cy), 4)
  }

  const vbPts = pts.map(([px, py]) => toVB(px, py))
  const xs = vbPts.map(p => p[0]),
    ys = vbPts.map(p => p[1])
  if (Math.max(...xs) - Math.min(...xs) < 0.2 || Math.max(...ys) - Math.min(...ys) < 0.2) return null
  return vbPts.map(p => p.join(",")).join(" ")
}

// ---------------------------------------------------------------------------
// Journey assignment: 5 equal-count pie slices from Anubis's head center.
// Within each slice, 4 journeys by distance: outer → inner (toward the head).
// ---------------------------------------------------------------------------
// levelCount * 2 from journeys.ts — each game level reveals 2 mosaic pieces
const JOURNEY_LEVELS: Record<string, number> = {
  starter_1: 6,
  starter_2: 8,
  starter_3: 10,
  starter_4: 10,
  starter_treasure_tomb: 4,
  junior_1: 6,
  junior_2: 12,
  junior_3: 16,
  junior_4: 10,
  junior_treasure_tomb: 6,
  expert_1: 8,
  expert_2: 12,
  expert_3: 18,
  expert_4: 14,
  expert_treasure_tomb: 8,
  master_1: 8,
  master_2: 18,
  master_3: 16,
  master_4: 10,
  master_treasure_tomb: 10,
  wizard_1: 18,
  wizard_2: 22,
  wizard_3: 20,
  wizard_4: 16,
  wizard_treasure_tomb: 12,
}

const TIER_JOURNEYS = [
  ["starter_1", "starter_2", "starter_3", "starter_4", "starter_treasure_tomb"],
  ["junior_1", "junior_2", "junior_3", "junior_4", "junior_treasure_tomb"],
  ["expert_1", "expert_2", "expert_3", "expert_4", "expert_treasure_tomb"],
  ["master_1", "master_2", "master_3", "master_4", "master_treasure_tomb"],
  ["wizard_1", "wizard_2", "wizard_3", "wizard_4", "wizard_treasure_tomb"],
]

// Pie center = Anubis's head (roughly 22% down, horizontal center)
const PIE_CX = Math.round(width * 0.5)
const PIE_CY = Math.round(height * 0.22)
console.error(`Pie center: ${PIE_CX},${PIE_CY}  (${(PIE_CX / width).toFixed(2)}, ${(PIE_CY / height).toFixed(2)})`)

// Sort by angle → 5 equal-count sectors
const sortedByAngle = [...regions].sort(
  (a, b) => Math.atan2(a.cy - PIE_CY, a.cx - PIE_CX) - Math.atan2(b.cy - PIE_CY, b.cx - PIE_CX)
)
const sectorSize = Math.floor(sortedByAngle.length / 5)
const sectorRegions: Region[][] = [[], [], [], [], []]
sortedByAngle.forEach((r, i) => sectorRegions[Math.min(Math.floor(i / sectorSize), 4)].push(r))

// Within each sector sort by distance descending (outer first → inner last)
for (const sr of sectorRegions) {
  sr.sort((a, b) => Math.hypot(b.cx - PIE_CX, b.cy - PIE_CY) - Math.hypot(a.cx - PIE_CX, a.cy - PIE_CY))
}

// Build a lookup: region → {tier index, rank within sector}
const regionInfo = new Map<Region, { ti: number; rank: number }>()
sectorRegions.forEach((sr, ti) => sr.forEach((r, rank) => regionInfo.set(r, { ti, rank })))

function assignSlice(region: Region): { zoneId: string; journeyId: string } {
  const { ti, rank } = regionInfo.get(region)!
  const xi = Math.min(Math.floor((rank / sectorRegions[ti].length) * 5), 4)
  return { zoneId: `slice_${ti}_${xi}`, journeyId: TIER_JOURNEYS[ti][xi] }
}

// Log coverage
const tierNames = ["starter", "junior", "expert", "master", "wizard"]
const sliceCounts: Record<string, number> = {}
for (const r of regions) {
  const { journeyId } = assignSlice(r)
  sliceCounts[journeyId] = (sliceCounts[journeyId] ?? 0) + 1
}
for (let ti = 0; ti < 5; ti++) {
  const total = TIER_JOURNEYS[ti].reduce((s, j) => s + (sliceCounts[j] ?? 0), 0)
  const lvls = TIER_JOURNEYS[ti].reduce((s, j) => s + JOURNEY_LEVELS[j], 0)
  console.error(`  ${tierNames[ti].padEnd(8)} ${total} pieces / ${lvls} levels = ${(total / lvls).toFixed(1)}/level`)
}

// ---------------------------------------------------------------------------
// Generate pieces
// ---------------------------------------------------------------------------
type PieceDef = {
  id: string
  journeyId: string
  levelIndex: number
  zoneId: string
  points: string
}

const journeyRegions = new Map<string, Region[]>()
for (const r of regions) {
  const { journeyId } = assignSlice(r)
  if (!journeyRegions.has(journeyId)) journeyRegions.set(journeyId, [])
  journeyRegions.get(journeyId)!.push(r)
}

const pieces: PieceDef[] = []
for (const [journeyId, jRegions] of journeyRegions) {
  const numLevels = JOURNEY_LEVELS[journeyId] ?? 1
  // Sort outer→inner for level ordering (outer pieces revealed first = lower levelIndex)
  jRegions.sort((a, b) => Math.hypot(b.cx - PIE_CX, b.cy - PIE_CY) - Math.hypot(a.cx - PIE_CX, a.cy - PIE_CY))
  jRegions.forEach((region, i) => {
    const pts = regionToPoints(region)
    if (!pts) return
    const { zoneId } = assignSlice(region)
    const levelIndex = Math.min(Math.floor((i / jRegions.length) * numLevels), numLevels - 1)
    pieces.push({ id: `${journeyId}_${i}`, journeyId, levelIndex, zoneId, points: pts })
  })
}

console.error(`\nTotal pieces: ${pieces.length}`)

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const output = `// AUTO-GENERATED by scripts/traceMask.ts — do not edit manually
// Run: node node_modules/tsx/dist/cli.mjs scripts/traceMask.ts
// ViewBox: 0 0 ${VB_W} ${VB_H}  (stained-glass.png ${width}×${height})

export type MosaicPieceDef = {
  id: string
  journeyId: string
  levelIndex: number
  zoneId: string
  points: string
}

export const MOSAIC_PIECES: MosaicPieceDef[] = ${JSON.stringify(pieces, null, 2)}
`

writeFileSync(join(__dirname, "../src/ui/mosaicPieces.generated.ts"), output)
console.error("Written → src/ui/mosaicPieces.generated.ts")
