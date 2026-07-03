#!/usr/bin/env node
/**
 * Extracts zone polygon outlines from the reference stained-glass PNG.
 * Prints a ZONES array you can paste into generateMosaicPieces.ts.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/extractZones.ts
 */

import sharp from "sharp"

const IMAGE_PATH = "/Users/matthijsgroen/.claude/image-cache/b3a9d7f1-7362-4685-a96b-582aec8a06c1/16.png"

const VB_W = 200
const VB_H = 250

const { data, info } = await sharp(IMAGE_PATH).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = info

// Art extent (trim 10px border top/sides, 60px browser chrome at bottom)
const ART_X0 = 10,
  ART_Y0 = 8,
  ART_X1 = width - 10,
  ART_Y1 = height - 40
function toVB(px: number, py: number): [number, number] {
  return [
    Math.round(((px - ART_X0) / (ART_X1 - ART_X0)) * VB_W * 10) / 10,
    Math.round(((py - ART_Y0) / (ART_Y1 - ART_Y0)) * VB_H * 10) / 10,
  ]
}

function isLead(r: number, g: number, b: number) {
  return r < 40 && g < 40 && b < 40
}

// Flood fill
const visited = new Uint8Array(width * height)
for (let i = 0; i < width * height; i++) {
  if (isLead(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])) visited[i] = 1
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
      const ni = ny * width + nx
      if (!visited[ni]) stack.push(ni)
    }
  }
  return region
}

type Region = { n: number; r: number; g: number; b: number; cx: number; cy: number; pixels: number[] }
const regions: Region[] = []
for (let y = ART_Y0; y < ART_Y1; y++)
  for (let x = ART_X0; x < ART_X1; x++) {
    const idx = y * width + x
    if (!visited[idx]) {
      const px = flood(x, y)
      if (px.length < 50) continue
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

regions.sort((a, b) => b.n - a.n)

// Convex hull
function cross(o: number[], a: number[], b: number[]) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}
function convexHull(pts: number[][]): number[][] {
  pts = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower: number[][] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: number[][] = []
  for (const p of [...pts].reverse()) {
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

function regionToPoints(region: Region): string {
  // Sample boundary pixels
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
  const sampled =
    boundary.length > 1000 ? boundary.filter((_, i) => i % Math.ceil(boundary.length / 400) === 0) : boundary
  const hull = convexHull(sampled)
  const simplified = douglasPeucker(hull, 3)
  return simplified.map(([px, py]) => toVB(px, py).join(",")).join(" ")
}

// Identify each region
console.log("// Detected regions:")
for (const r of regions) {
  const pts = regionToPoints(r)
  console.log(`//  rgb(${r.r},${r.g},${r.b}) n=${r.n} cx=${r.cx} cy=${r.cy}`)
  console.log(`//  points: "${pts}"`)
}
