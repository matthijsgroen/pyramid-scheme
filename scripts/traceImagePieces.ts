#!/usr/bin/env tsx
/**
 * Traces stained-glass pieces from a reference PNG image.
 *
 * Algorithm:
 *  1. Read pixel data via sharp
 *  2. Mark "lead line" pixels (dark / near-black) and border pixels
 *  3. Flood-fill each remaining colored region to identify pieces
 *  4. For each piece: compute axis-aligned bounding hull as simplified polygon
 *  5. Map pieces to zones by dominant color + centroid position
 *  6. Output mosaicPieces.generated.ts
 *
 * Run: npx tsx scripts/traceImagePieces.ts
 */

import sharp from "sharp"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
const __dirname = dirname(fileURLToPath(import.meta.url))

const IMAGE_PATH = "/Users/matthijsgroen/.claude/image-cache/b3a9d7f1-7362-4685-a96b-582aec8a06c1/16.png"

// Viewbox we're mapping into
const VB_W = 200
const VB_H = 250

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
type RGB = [number, number, number]

function isLeadLine(r: number, g: number, b: number): boolean {
  // Black / very dark lead lines + border
  return r < 40 && g < 40 && b < 40
}

function colorKey(r: number, g: number, b: number): string {
  // Quantise to nearest 16 to merge slight anti-aliasing variants
  const q = (v: number) => Math.round(v / 16) * 16
  return `${q(r)},${q(g)},${q(b)}`
}

function colorDist(a: RGB, b: RGB): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

// Known zone colors (from the reference image) → zone id
// We'll map each extracted region to its closest zone color.
const ZONE_COLOR_MAP: Array<{ color: RGB; zoneId: string; journeyId: string }> = [
  // Backgrounds – dark navy blues
  { color: [27, 47, 110], zoneId: "bg_tl", journeyId: "starter_2" },
  { color: [22, 37, 85], zoneId: "bg_tr", journeyId: "starter_3" },
  { color: [8, 18, 46], zoneId: "bg_bl", journeyId: "starter_4" },
  { color: [10, 21, 53], zoneId: "bg_br", journeyId: "starter_1" },
  // Head (very dark blue-black)
  { color: [13, 13, 30], zoneId: "skull", journeyId: "junior_3" },
  { color: [10, 10, 28], zoneId: "face", journeyId: "expert_3" },
  { color: [19, 19, 42], zoneId: "jaw", journeyId: "expert_2" },
  { color: [13, 13, 31], zoneId: "ear_l", journeyId: "junior_4" },
  { color: [13, 13, 31], zoneId: "ear_r", journeyId: "junior_2" },
  // Eyes – amber
  { color: [245, 158, 11], zoneId: "eye_l", journeyId: "expert_1" },
  { color: [245, 158, 11], zoneId: "eye_r", journeyId: "expert_4" },
  // Neck
  { color: [30, 30, 56], zoneId: "neck", journeyId: "wizard_1" },
  // Collar – teal
  { color: [13, 148, 136], zoneId: "collar", journeyId: "master_2" },
  // Torso – blues
  { color: [29, 78, 216], zoneId: "torso_top", journeyId: "wizard_4" },
  { color: [37, 99, 235], zoneId: "torso", journeyId: "master_1" },
  // Arms
  { color: [30, 64, 175], zoneId: "arm_l", journeyId: "wizard_2" },
  { color: [30, 64, 175], zoneId: "arm_r", journeyId: "wizard_3" },
  // Belt – gold
  { color: [212, 175, 55], zoneId: "belt", journeyId: "master_4" },
  // Kilt – cream
  { color: [254, 243, 199], zoneId: "kilt", journeyId: "master_3" },
  // Legs – brown
  { color: [120, 53, 15], zoneId: "legs", journeyId: "junior_1" },
]

// ---------------------------------------------------------------------------
// Flood fill
// ---------------------------------------------------------------------------
function floodFill(
  labels: Int32Array,
  visited: Uint8Array,
  pixels: Buffer,
  width: number,
  height: number,
  startX: number,
  startY: number,
  label: number
): number[] {
  // Returns list of pixel indices belonging to this region
  const stack = [startY * width + startX]
  const region: number[] = []
  while (stack.length) {
    const idx = stack.pop()!
    if (visited[idx]) continue
    visited[idx] = 1
    labels[idx] = label
    region.push(idx)
    const x = idx % width
    const y = (idx / width) | 0
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nx = x + dx,
        ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const nIdx = ny * width + nx
      if (!visited[nIdx]) {
        const r = pixels[nIdx * 3],
          g = pixels[nIdx * 3 + 1],
          b = pixels[nIdx * 3 + 2]
        if (!isLeadLine(r, g, b)) stack.push(nIdx)
      }
    }
  }
  return region
}

// ---------------------------------------------------------------------------
// Concave hull via gift-wrapping on boundary pixels
// Then simplify with Douglas-Peucker
// ---------------------------------------------------------------------------
function getBoundaryPixels(
  region: number[],
  labels: Int32Array,
  width: number,
  height: number
): Array<[number, number]> {
  const set = new Set(region)
  const boundary: Array<[number, number]> = []
  for (const idx of region) {
    const x = idx % width,
      y = (idx / width) | 0
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nIdx = (y + dy) * width + (x + dx)
      if (!set.has(nIdx)) {
        boundary.push([x, y])
        break
      }
    }
  }
  return boundary
}

function convexHull(pts: Array<[number, number]>): Array<[number, number]> {
  if (pts.length < 3) return pts
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Array<[number, number]> = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Array<[number, number]> = []
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

function douglasPeucker(pts: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (pts.length <= 2) return pts
  let maxDist = 0,
    maxIdx = 0
  const [x1, y1] = pts[0],
    [x2, y2] = pts[pts.length - 1]
  const lineLen = Math.hypot(x2 - x1, y2 - y1)
  for (let i = 1; i < pts.length - 1; i++) {
    const dist =
      lineLen === 0
        ? Math.hypot(pts[i][0] - x1, pts[i][1] - y1)
        : Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / lineLen
    if (dist > maxDist) {
      maxDist = dist
      maxIdx = i
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(pts.slice(0, maxIdx + 1), epsilon)
    const right = douglasPeucker(pts.slice(maxIdx), epsilon)
    return left.slice(0, -1).concat(right)
  }
  return [pts[0], pts[pts.length - 1]]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const { data, info } = await sharp(IMAGE_PATH).ensureAlpha(0).removeAlpha().raw().toBuffer({ resolveWithObject: true })

const { width, height } = info
console.log(`Image: ${width}×${height}`)

const pixels = data
const labels = new Int32Array(width * height).fill(-1)
const visited = new Uint8Array(width * height)

// Mark all lead-line pixels as visited (skip them)
for (let i = 0; i < width * height; i++) {
  const r = pixels[i * 3],
    g = pixels[i * 3 + 1],
    b = pixels[i * 3 + 2]
  if (isLeadLine(r, g, b)) visited[i] = 1
}

// Flood fill all colored regions
let labelCount = 0
const regionData: Array<{ label: number; pixels: number[]; avgColor: RGB; cx: number; cy: number }> = []

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = y * width + x
    if (!visited[idx]) {
      const region = floodFill(labels, visited, pixels, width, height, x, y, labelCount)
      if (region.length < 20) continue // skip tiny noise regions
      // Compute average color
      let rSum = 0,
        gSum = 0,
        bSum = 0
      for (const pidx of region) {
        rSum += pixels[pidx * 3]
        gSum += pixels[pidx * 3 + 1]
        bSum += pixels[pidx * 3 + 2]
      }
      const n = region.length
      const avgColor: RGB = [rSum / n, gSum / n, bSum / n]
      // Centroid
      let cx = 0,
        cy = 0
      for (const pidx of region) {
        cx += pidx % width
        cy += (pidx / width) | 0
      }
      cx /= n
      cy /= n
      regionData.push({ label: labelCount, pixels: region, avgColor, cx, cy })
      labelCount++
    }
  }
}

console.log(`Found ${regionData.length} colored regions`)

// Scale factor: image pixels → viewbox units
const scaleX = VB_W / width
const scaleY = VB_H / height

// ---------------------------------------------------------------------------
// For each region: extract convex hull boundary → simplify → scale to viewbox
// ---------------------------------------------------------------------------
type PieceDef = {
  id: string
  journeyId: string
  levelIndex: number
  zoneId: string
  color: string
  points: string
}

// We need to assign each region to a zone by matching color + spatial position.
// The background quadrants split at roughly center of image.
const cx_img = width / 2
const cy_img = height / 2

// Determine zone for a region
function assignZone(
  avgColor: RGB,
  cx: number,
  cy: number
): { zoneId: string; journeyId: string; cssColor: string } | null {
  // Special handling: background vs head area is tricky (similar dark colors)
  // Use spatial position to disambiguate.

  // Amber eyes
  if (avgColor[0] > 180 && avgColor[1] > 120 && avgColor[2] < 80) {
    const zoneId = cx < cx_img ? "eye_l" : "eye_r"
    const z = ZONE_COLOR_MAP.find(z => z.zoneId === zoneId)!
    return { zoneId, journeyId: z.journeyId, cssColor: `rgb(${avgColor.map(Math.round).join(",")})` }
  }

  // Teal collar
  if (avgColor[1] > 100 && avgColor[2] > 100 && avgColor[0] < 50 && avgColor[1] > avgColor[0] + 60) {
    return { zoneId: "collar", journeyId: "master_2", cssColor: "#0d9488" }
  }

  // Cream kilt
  if (avgColor[0] > 180 && avgColor[1] > 180 && avgColor[2] > 120) {
    return { zoneId: "kilt", journeyId: "master_3", cssColor: "#fef3c7" }
  }

  // Gold belt
  if (avgColor[0] > 150 && avgColor[1] > 130 && avgColor[2] < 80 && avgColor[0] > avgColor[2] + 100) {
    return { zoneId: "belt", journeyId: "master_4", cssColor: "#d4af37" }
  }

  // Brown legs
  if (avgColor[0] > 80 && avgColor[1] < 70 && avgColor[2] < 30 && avgColor[0] > avgColor[1] * 1.5) {
    return { zoneId: "legs", journeyId: "junior_1", cssColor: "#78350f" }
  }

  // Blue torso / arms
  if (avgColor[2] > 150 && avgColor[2] > avgColor[0] * 1.5 && avgColor[1] < avgColor[2] * 0.6) {
    // Distinguish torso_top vs torso vs arm_l/arm_r by position and brightness
    const brightness = (avgColor[0] + avgColor[1] + avgColor[2]) / 3
    if (cx < cx_img * 0.55) return { zoneId: "arm_l", journeyId: "wizard_2", cssColor: "#1d4ed8" }
    if (cx > cx_img * 1.45) return { zoneId: "arm_r", journeyId: "wizard_3", cssColor: "#1d4ed8" }
    // Torso top vs torso: vertical split
    const torso_split_y = cy_img + height * 0.12
    if (cy < torso_split_y) return { zoneId: "torso_top", journeyId: "wizard_4", cssColor: "#1e40af" }
    return { zoneId: "torso", journeyId: "master_1", cssColor: "#2563eb" }
  }

  // Dark zones: background vs head by position
  const isDark = avgColor[0] < 80 && avgColor[1] < 80 && avgColor[2] < 120
  if (isDark) {
    // Background check: is this near the edges away from figure center?
    const HEAD_X_L = width * 0.27
    const HEAD_X_R = width * 0.73
    const HEAD_Y_B = height * 0.52
    const isInFigureArea = cx > HEAD_X_L && cx < HEAD_X_R && cy < HEAD_Y_B

    if (!isInFigureArea) {
      // Background quadrant
      if (cx < cx_img && cy < cy_img) return { zoneId: "bg_tl", journeyId: "starter_2", cssColor: "#1b2f6e" }
      if (cx >= cx_img && cy < cy_img) return { zoneId: "bg_tr", journeyId: "starter_3", cssColor: "#162555" }
      if (cx < cx_img && cy >= cy_img) return { zoneId: "bg_bl", journeyId: "starter_4", cssColor: "#08122e" }
      return { zoneId: "bg_br", journeyId: "starter_1", cssColor: "#0a1535" }
    }

    // Head zones by vertical position
    const HEAD_TOP = height * 0.04
    const HEAD_EAR_B = height * 0.22
    const HEAD_FACE_B = height * 0.42
    const HEAD_JAW_B = height * 0.5

    if (cy < HEAD_EAR_B) {
      // Ear vs face (forehead): ear = left/right sides, face = center
      if (cx < cx_img * 0.62) return { zoneId: "ear_l", journeyId: "junior_4", cssColor: "#0d0d1e" }
      if (cx > cx_img * 1.38) return { zoneId: "ear_r", journeyId: "junior_2", cssColor: "#0d0d1e" }
      return { zoneId: "face", journeyId: "expert_3", cssColor: "#0a0a1c" }
    }
    if (cy < HEAD_FACE_B) return { zoneId: "skull", journeyId: "junior_3", cssColor: "#0d0d20" }
    if (cy < HEAD_JAW_B) {
      if (cx > cx_img * 0.82 && cx < cx_img * 1.18)
        return { zoneId: "neck", journeyId: "wizard_1", cssColor: "#1e1e38" }
      return { zoneId: "jaw", journeyId: "expert_2", cssColor: "#13132a" }
    }
    return { zoneId: "skull", journeyId: "junior_3", cssColor: "#0d0d20" }
  }

  return null
}

// Group regions by zone, tracking level index within each zone
const zoneGroups: Record<string, Array<{ pixels: number[]; cx: number; cy: number }>> = {}

for (const region of regionData) {
  const assignment = assignZone(region.avgColor, region.cx, region.cy)
  if (!assignment) {
    console.warn(
      `  Unassigned region: avg=${region.avgColor.map(Math.round)} cx=${Math.round(region.cx)} cy=${Math.round(region.cy)} pixels=${region.pixels.length}`
    )
    continue
  }
  if (!zoneGroups[assignment.zoneId]) zoneGroups[assignment.zoneId] = []
  zoneGroups[assignment.zoneId].push({ pixels: region.pixels, cx: region.cx, cy: region.cy })
}

// Print zone piece counts
console.log("\nZone piece counts:")
for (const [zoneId, regions] of Object.entries(zoneGroups).sort()) {
  console.log(`  ${zoneId.padEnd(12)} ${regions.length} pieces`)
}

// ---------------------------------------------------------------------------
// Build final pieces with polygon outlines
// ---------------------------------------------------------------------------
const ZONE_INFO: Record<string, { journeyId: string; color: string }> = {}
for (const z of ZONE_COLOR_MAP) {
  if (!ZONE_INFO[z.zoneId]) {
    ZONE_INFO[z.zoneId] = { journeyId: z.journeyId, color: "#000" }
  }
}
// Override with actual intended colors
const ZONE_COLORS: Record<string, string> = {
  bg_tl: "#1b2f6e",
  bg_tr: "#162555",
  bg_bl: "#08122e",
  bg_br: "#0a1535",
  ear_l: "#0d0d1e",
  ear_r: "#0d0d1e",
  skull: "#0d0d20",
  face: "#0a0a1c",
  jaw: "#13132a",
  neck: "#1e1e38",
  eye_l: "#f59e0b",
  eye_r: "#f59e0b",
  collar: "#0d9488",
  torso_top: "#1e40af",
  torso: "#2563eb",
  arm_l: "#1d4ed8",
  arm_r: "#1d4ed8",
  belt: "#d4af37",
  kilt: "#fef3c7",
  legs: "#78350f",
}

const JOURNEY_IDS: Record<string, string> = Object.fromEntries(ZONE_COLOR_MAP.map(z => [z.zoneId, z.journeyId]))

const pieces: PieceDef[] = []

for (const [zoneId, regions] of Object.entries(zoneGroups)) {
  const journeyId = JOURNEY_IDS[zoneId] ?? "unknown"
  const color = ZONE_COLORS[zoneId] ?? "#888"

  regions.forEach((region, levelIndex) => {
    // Extract boundary pixels → convex hull → simplify → scale to viewbox
    const boundary = getBoundaryPixels(region.pixels, labels, width, height)
    if (boundary.length < 3) return

    // Sample boundary (too many points → slow hull)
    const sampled =
      boundary.length > 2000 ? boundary.filter((_, i) => i % Math.ceil(boundary.length / 500) === 0) : boundary

    const hull = convexHull(sampled)
    const simplified = douglasPeucker(hull, 2) // 2px tolerance

    const pointsStr = simplified
      .map(([px, py]) => {
        const vx = Math.round((px / width) * VB_W * 10) / 10
        const vy = Math.round((py / height) * VB_H * 10) / 10
        return `${vx},${vy}`
      })
      .join(" ")

    pieces.push({
      id: `${journeyId}_${levelIndex}`,
      journeyId,
      levelIndex,
      zoneId,
      color,
      points: pointsStr,
    })
  })
}

console.log(`\nTotal pieces: ${pieces.length}`)

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const output = `// AUTO-GENERATED by scripts/traceImagePieces.ts — do not edit manually
// Run: npx tsx scripts/traceImagePieces.ts

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
