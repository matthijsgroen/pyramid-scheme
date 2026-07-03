// Ordered reveal sequence for the stained-glass mosaic.
// Pattern: sparse outer ring → sparse second ring → … → sparse center,
//          then dense outer ring → dense second ring → … → dense center.
// Within each ring, "sparse" takes every other step (even-indexed) and
// "dense" fills the gaps (odd-indexed), producing the dotted-then-solid effect.

import { journeys } from "@/data/journeys"
import { MOSAIC_PIECES } from "./mosaicPieces.generated"

// Center of the 200×343 SVG viewBox
const CENTER_X = 100
const CENTER_Y = 171.5
// Number of concentric bands (rings)
const N_BANDS = 5

// Pre-index pieces by step key and by piece id
export const PIECES_BY_STEP = new Map<string, string[]>()
const PIECE_BY_ID = new Map(MOSAIC_PIECES.map(p => [p.id, p]))
for (const p of MOSAIC_PIECES) {
  const key = `${p.journeyId}:${p.levelIndex}`
  const arr = PIECES_BY_STEP.get(key) ?? []
  arr.push(p.id)
  PIECES_BY_STEP.set(key, arr)
}

const parseCentroid = (points: string): { x: number; y: number } => {
  const pairs = points
    .trim()
    .split(" ")
    .map(p => p.split(",").map(Number) as [number, number])
  return {
    x: pairs.reduce((s, [x]) => s + x, 0) / pairs.length,
    y: pairs.reduce((s, [, y]) => s + y, 0) / pairs.length,
  }
}

// Journey order derived from canonical game sequence, filtered to journeys that have mosaic pieces
const pieceJourneyIds = new Set(MOSAIC_PIECES.map(p => p.journeyId))
const JOURNEY_ORDER = journeys.map(j => j.id).filter(id => pieceJourneyIds.has(id))

// Build the flat step list
const baseSteps: Array<{ journeyId: string; levelIndex: number }> = []
for (const jId of JOURNEY_ORDER) {
  const max = MOSAIC_PIECES.filter(p => p.journeyId === jId).reduce((m, p) => Math.max(m, p.levelIndex), -1)
  for (let l = 0; l <= max; l++) baseSteps.push({ journeyId: jId, levelIndex: l })
}

// Compute step centroid distance from SVG center
type StepWithDist = { journeyId: string; levelIndex: number; dist: number }

const stepsWithDist: StepWithDist[] = baseSteps.map(step => {
  const ids = PIECES_BY_STEP.get(`${step.journeyId}:${step.levelIndex}`) ?? []
  let cx = 0,
    cy = 0,
    count = 0
  for (const id of ids) {
    const piece = PIECE_BY_ID.get(id)
    if (!piece) continue
    const c = parseCentroid(piece.points)
    cx += c.x
    cy += c.y
    count++
  }
  const ax = count > 0 ? cx / count : CENTER_X
  const ay = count > 0 ? cy / count : CENTER_Y
  return {
    ...step,
    dist: Math.sqrt((ax - CENTER_X) ** 2 + (ay - CENTER_Y) ** 2),
  }
})

// Sort outermost first
stepsWithDist.sort((a, b) => b.dist - a.dist)

// Build reveal order: for each band, even-indexed steps first (sparse), then odd (dense)
const bandSize = Math.ceil(stepsWithDist.length / N_BANDS)
const sparse: Array<{ journeyId: string; levelIndex: number }> = []
const dense: Array<{ journeyId: string; levelIndex: number }> = []
for (let b = 0; b < N_BANDS; b++) {
  const band = stepsWithDist.slice(b * bandSize, (b + 1) * bandSize)
  band.forEach(({ journeyId, levelIndex }, i) => {
    ;(i % 2 === 0 ? sparse : dense).push({ journeyId, levelIndex })
  })
}

// Sparse passes first (outer → inner), then dense fills (outer → inner)
export const LEVEL_STEPS: Array<{ journeyId: string; levelIndex: number }> = [...sparse, ...dense]
