#!/usr/bin/env node
/**
 * Traces piece polygons straight from stained-glass.png: the leadwork is neutral black ink and
 * every glass cell carries colour, so the artwork is its own mask and there is nothing to keep
 * in sync.
 *
 * The component renders the same PNG as background and uses the traced polygons as a dark
 * overlay — revealing a piece makes its polygon transparent.
 *
 * Run: yarn tsx scripts/traceMask.ts
 */

import sharp from "sharp"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { journeys } from "../src/data/journeys"
const __dirname = dirname(fileURLToPath(import.meta.url))

// The artwork is its own mask: leadwork is black ink, every cell carries either colour or charcoal.
const ARTWORK_PATH = "src/assets/stained-glass.png"
// Ink versus paint. The artwork uses two different blacks: leading, dividers and the border sit at
// brightness 0-12, while shapes PAINTED black — Anubis's head, the balance scale, the snake — sit
// around 60. The histogram between them is empty at 40-49, so 45 splits ink from paint. Set this at
// the old midpoint of 128 and every painted black shape is read as leading: permanently on screen,
// never collectible, and still black when its panel lights up.
const THRESHOLD = 45
// A dark pixel that still carries colour is a deep fill (lapis, deep red), not a lead line.
// Without this, saturated darks are read as leading and stay permanently visible — never collectible.
const LEAD_SATURATION = 40
const MIN_PIXELS = 40
// Largest a single piece may be. Roughly 3× the average cell, so ordinary glass is untouched and
// only painted shapes and the biggest background fields get cut down.
const MAX_PIXELS = 4000

// ViewBox: width 200, height derived from actual image dimensions after load
const VB_W = 200
let VB_H = 358 // updated after image is loaded

// Keep alpha channel — transparent pixels (stone surround) are treated as lead
const { data, info } = await sharp(ARTWORK_PATH).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = info
const STRIDE = 4 // RGBA
VB_H = Math.round((VB_W * height) / width)
console.error(`Artwork: ${width}×${height}  ViewBox: ${VB_W}×${VB_H}`)

function toVB(px: number, py: number): [number, number] {
  return [Math.round((px / width) * VB_W * 10) / 10, Math.round((py / height) * VB_H * 10) / 10]
}

// ---------------------------------------------------------------------------
// Build visited map: lead lines (neutral dark ink) + transparent pixels are pre-visited
// ---------------------------------------------------------------------------
const visited = new Uint8Array(width * height)
for (let i = 0; i < width * height; i++) {
  const r = data[i * STRIDE],
    g = data[i * STRIDE + 1],
    b = data[i * STRIDE + 2],
    a = data[i * STRIDE + 3]
  const brightness = (r + g + b) / 3
  const saturation = Math.max(r, g, b) - Math.min(r, g, b)
  if (a < 128 || (brightness < THRESHOLD && saturation < LEAD_SATURATION)) visited[i] = 1
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

const toRegion = (px: number[]): Region => {
  let cxs = 0,
    cys = 0
  for (const i of px) {
    cxs += i % width
    cys += (i / width) | 0
  }
  return { n: px.length, cx: (cxs / px.length) | 0, cy: (cys / px.length) | 0, pixels: px }
}

// A painted shape has no leadwork inside it, so it floods as one enormous cell — Anubis's head
// came out as a single piece. Cut anything oversized in half across its long axis until the parts
// are cell-sized; the component strokes every polygon, so each cut reads as another lead line.
const addRegion = (px: number[]) => {
  if (px.length <= MAX_PIXELS) {
    regions.push(toRegion(px))
    return
  }
  const xs = px.map(i => i % width)
  const ys = px.map(i => (i / width) | 0)
  const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys)
  const keys = alongX ? xs : ys
  const mid = [...keys].sort((a, b) => a - b)[keys.length >> 1]
  const lower = px.filter((_, k) => keys[k] < mid)
  const upper = px.filter((_, k) => keys[k] >= mid)
  // A degenerate split (every pixel on one side) would recurse forever — keep the cell whole.
  if (!lower.length || !upper.length) {
    regions.push(toRegion(px))
    return
  }
  addRegion(lower)
  addRegion(upper)
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = y * width + x
    if (!visited[idx]) {
      const px = flood(x, y)
      if (px.length < MIN_PIXELS) continue
      addRegion(px)
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
  // Use convex hull when: region is thin, or fill ratio ≥ 80% (shape is roughly convex).
  // Simplification tolerance is in source pixels: the looser it is, the further a polygon cuts
  // the corners of its cell, and the fatter the leading looks where two polygons fail to meet.
  if (spanX < 6 || spanY < 6 || region.n / hullArea >= 0.8) {
    pts = douglasPeucker(hull, 1)
  } else {
    pts = douglasPeucker(angularBoundary(region.pixels, region.cx, region.cy), 1.5)
  }

  const vbPts = pts.map(([px, py]) => toVB(px, py))
  const xs = vbPts.map(p => p[0]),
    ys = vbPts.map(p => p[1])
  if (Math.max(...xs) - Math.min(...xs) < 0.2 || Math.max(...ys) - Math.min(...ys) < 0.2) return null
  return vbPts.map(p => p.join(",")).join(" ")
}

// ---------------------------------------------------------------------------
// Register assignment: five horizontal registers stacked top → bottom, one per
// difficulty tier, the way an Egyptian tomb wall is read. A register is read left
// to right, so its pieces are handed to that tier's levels in that order.
// ---------------------------------------------------------------------------
// Each game level reveals 2 mosaic pieces, so a journey's step count is levelCount * 2.
const JOURNEY_LEVELS: Record<string, number> = Object.fromEntries(journeys.map(j => [j.id, j.levelCount * 2]))

const TIER_NAMES = ["starter", "junior", "expert", "master", "wizard"]
const TIER_JOURNEYS = TIER_NAMES.map(tier => journeys.map(j => j.id).filter(id => id.startsWith(`${tier}_`)))

// Every reveal step of one register, in play order: journey by journey, level by level.
const tierSteps = (ti: number) =>
  TIER_JOURNEYS[ti].flatMap(journeyId =>
    Array.from({ length: JOURNEY_LEVELS[journeyId] }, (_, levelIndex) => ({ journeyId, levelIndex }))
  )

const REGISTER_H = height / TIER_NAMES.length

type Step = { journeyId: string; levelIndex: number; zoneId: string }
const regionStep = new Map<Region, Step>()

for (let ti = 0; ti < TIER_NAMES.length; ti++) {
  const inRegister = regions
    .filter(r => Math.min(Math.floor(r.cy / REGISTER_H), TIER_NAMES.length - 1) === ti)
    .sort((a, b) => a.cx - b.cx)
  const steps = tierSteps(ti)
  const perStep = inRegister.length / steps.length
  console.error(
    `  ${TIER_NAMES[ti].padEnd(8)} ${String(inRegister.length).padStart(4)} regions / ${steps.length} steps = ${perStep.toFixed(1)}/step` +
      (inRegister.length < steps.length ? "   ⚠ BELOW FLOOR — some levels reveal nothing" : "")
  )
  inRegister.forEach((region, i) => {
    const step = steps[Math.min(Math.floor((i * steps.length) / inRegister.length), steps.length - 1)]
    regionStep.set(region, { ...step, zoneId: `register_${ti}` })
  })
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

const pieces: PieceDef[] = []
const perJourneyCount: Record<string, number> = {}
for (const region of regions) {
  const step = regionStep.get(region)
  if (!step) continue
  const pts = regionToPoints(region)
  if (!pts) continue
  const n = (perJourneyCount[step.journeyId] ?? 0) + 1
  perJourneyCount[step.journeyId] = n
  pieces.push({
    id: `${step.journeyId}_${n - 1}`,
    journeyId: step.journeyId,
    levelIndex: step.levelIndex,
    zoneId: step.zoneId,
    points: pts,
  })
}

console.error(`\nTotal pieces: ${pieces.length}`)

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const output = `// AUTO-GENERATED by scripts/traceMask.ts — do not edit manually
// Run: yarn generate-mosaic  (traces, then prettier-formats — raw JSON.stringify output fails lint)
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

writeFileSync(join(__dirname, "../src/ui/atoms/mosaicPieces.generated.ts"), output)
console.error("Written → src/ui/atoms/mosaicPieces.generated.ts")
