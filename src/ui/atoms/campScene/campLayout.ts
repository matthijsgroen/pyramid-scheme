import { difficulties, difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { CampCatalogue, CampFixedId, CampPiece, CampRow, CampSpot, CampSpotId } from "./campTypes"

export type CampLayoutInput = {
  width: number
  height: number
  insets: { top: number; bottom: number }
  chapter: Difficulty
  steps: Partial<Record<CampSpotId, number>>
  catalogue: CampCatalogue
}

/** Pixels, anchored bottom-centre; `scale` is the px size of one object unit at the piece's depth. */
export type PlacedPiece = {
  key: string
  spot: CampSpotId | CampFixedId
  piece: CampPiece
  x: number
  y: number
  scale: number
}

export type PlacedGlow = {
  key: string
  x: number
  y: number
  radius: number
  color: string
  mode: "flicker" | "breathe"
  strength: number
}

/** Anchored bottom-centre on the horizon. */
export type PlacedPyramid = { x: number; width: number; height: number; golden: boolean }

export type CampLayout = {
  unit: number
  spacing: number
  rowGap: number
  horizon: number
  frame: { x: number; y: number; width: number; height: number }
  /** Back to front, so later entries draw on top. */
  pieces: PlacedPiece[]
  glows: PlacedGlow[]
  pyramids: PlacedPyramid[]
}

/** All lengths in object units `u` (a front-row object is 1u wide), except the shares of height. */
export const CAMP_LAYOUT_PARAMS = {
  spacingMin: 1.15,
  spacingMax: 2.3,
  rowGapMin: 0.75,
  rowGapMax: 5,
  /** The back gap is a little shorter than the front one: farther ground looks flatter. */
  backGapFactor: 0.85,
  depth: [0.78, 0.89, 1] as readonly [number, number, number],
  spread: [0.88, 0.95, 1] as readonly [number, number, number],
  skyMin: 1.7,
  farSandMin: 0.5,
  bottomPad: 0.35,
  /** Room a back-row object needs above its baseline beyond its depth-scaled size. */
  backHeadroom: 0.25,
  cameraHeight: { starter: 4.2, junior: 4.8, expert: 5.4, master: 6.0, wizard: 6.6 } as Readonly<
    Record<Difficulty, number>
  >,
  frameMargin: 0.65,
  horizonShare: 0.27,
  /** Insets never squeeze the camp into less than this share of the height. */
  minInsetFreeShare: 0.25,
  /** A horizon pyramid's width over its height. */
  pyramidAspect: 1.5,
}

const P = CAMP_LAYOUT_PARAMS

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const reached = (step: { chapter: Difficulty }, chapter: Difficulty) => difficultyCompare(step.chapter, chapter) <= 0

const stepsAvailable = (spot: CampSpot, chapter: Difficulty) => spot.steps.filter(s => reached(s, chapter)).length

/** A spot belongs to the chapter of its first step; the camera frames it from then on. */
const spotOpen = (spot: CampSpot, chapter: Difficulty) => spot.steps.some(s => reached(s, chapter))

export const fullSteps = (catalogue: CampCatalogue, chapter: Difficulty): Record<CampSpotId, number> =>
  Object.fromEntries(catalogue.spots.map(spot => [spot.id, stepsAvailable(spot, chapter)])) as Record<
    CampSpotId,
    number
  >

type Placed = { spot: CampSpotId | CampFixedId; row: CampRow; piece: CampPiece }

export const layoutCamp = ({
  width,
  height,
  insets,
  chapter,
  steps,
  catalogue,
}: CampLayoutInput): CampLayout | null => {
  if (!(width > 0) || !(height > 0)) return null

  const insetFree = Math.max(height - insets.top - insets.bottom, height * P.minInsetFreeShare)
  const top = clamp(insets.top, 0, height - insetFree)
  const bottom = top + insetFree

  const framed = [
    ...catalogue.spots
      .filter(s => spotOpen(s, chapter))
      .map(s => ({ ...s, pieces: s.steps.filter(step => reached(step, chapter)).flatMap(step => step.pieces) })),
    ...catalogue.fixed.map(f => ({ ...f, pieces: [f.piece] })),
  ]
  const xs = framed.map(o => o.slot * P.spread[o.row])
  const xMin = Math.min(...xs, 0)
  const xMax = Math.max(...xs, 0)
  const span = Math.max(xMax - xMin, 1)

  // A side margin grows past frameMargin when a piece reaches further out than it, measured at minimum
  // spacing where inner spots stand closest to the edge, so no piece the chapter can hold is ever cropped.
  const reach = (side: -1 | 1) =>
    Math.max(
      P.frameMargin,
      ...framed.flatMap((o, i) =>
        o.pieces.map(
          p => (side * p.dx + p.width / 2) * P.depth[o.row] - (side > 0 ? xMax - xs[i] : xs[i] - xMin) * P.spacingMin
        )
      )
    )
  const marginLeft = reach(-1)
  const marginRight = reach(1)
  const margins = marginLeft + marginRight

  const backReach = P.depth[0] + P.backHeadroom
  const minHeight = P.bottomPad + backReach + P.farSandMin + P.skyMin + (1 + P.backGapFactor) * P.rowGapMin
  const unit = Math.min(
    insetFree / Math.max(P.cameraHeight[chapter], minHeight),
    width / (span * P.spacingMin + margins)
  )
  const spacing = clamp((width / unit - margins) / span, P.spacingMin, P.spacingMax)

  // Rows spread over the ground between the lowest horizon (plus far sand) and the bottom.
  const lowestHorizon = top + Math.max(insetFree * P.horizonShare, P.skyMin * unit)
  const rowGap = clamp(
    ((bottom - lowestHorizon) / unit - P.bottomPad - backReach - P.farSandMin) / (1 + P.backGapFactor),
    P.rowGapMin,
    P.rowGapMax
  )
  const baseline: [number, number, number] = [0, 0, bottom - P.bottomPad * unit]
  baseline[1] = baseline[2] - rowGap * unit
  baseline[0] = baseline[1] - rowGap * P.backGapFactor * unit
  // Spare height becomes far sand, not sky: the horizon only rises when the back row and its far sand reach it.
  const horizon = Math.min(baseline[0] - (backReach + P.farSandMin) * unit, lowestHorizon)

  const frameWidth = (span * spacing + margins) * unit
  const frameX = (width - frameWidth) / 2
  const frameY = horizon - P.skyMin * unit
  const frame = { x: frameX, y: frameY, width: frameWidth, height: baseline[2] + P.bottomPad * unit - frameY }

  const originX = frameX + (marginLeft - xMin * spacing) * unit
  const anchor = (o: { row: CampRow; slot: number }) => ({
    x: originX + o.slot * P.spread[o.row] * spacing * unit,
    y: baseline[o.row],
    scale: unit * P.depth[o.row],
  })

  const drawn: Placed[] = []
  for (const spot of catalogue.spots) {
    if (!spotOpen(spot, chapter)) continue
    const count = clamp(Math.floor(steps[spot.id] ?? 0), 0, stepsAvailable(spot, chapter))
    for (const step of spot.steps.slice(0, count))
      for (const piece of step.pieces) drawn.push({ spot: spot.id, row: spot.row, piece })
  }
  // Fixed pieces follow spot pieces so that, on a shared baseline, they draw on top.
  for (const fixed of catalogue.fixed) drawn.push({ spot: fixed.id, row: fixed.row, piece: fixed.piece })

  const hidden = new Set(drawn.flatMap(d => (d.piece.replaces ?? []).filter(id => id !== d.piece.id)))
  const visible = drawn.filter(d => !hidden.has(d.piece.id))

  const slotOf = new Map<string, number>([
    ...catalogue.spots.map(s => [s.id, s.slot] as const),
    ...catalogue.fixed.map(f => [f.id, f.slot] as const),
  ])

  // Sorted by row, not by each piece's own y, so a piece raised onto another (a flag on a tent) stays in front.
  const pieces: PlacedPiece[] = visible
    .map((d, order) => ({ d, order, at: anchor({ row: d.row, slot: slotOf.get(d.spot) ?? 0 }) }))
    .sort((a, b) => a.at.y - b.at.y || a.order - b.order)
    .map(({ d, at }) => ({
      key: `${d.spot}:${d.piece.id}`,
      spot: d.spot,
      piece: d.piece,
      x: at.x + d.piece.dx * at.scale,
      y: at.y + d.piece.dy * at.scale,
      scale: at.scale,
    }))

  const glows: PlacedGlow[] = pieces.flatMap(p => {
    return (p.piece.lights ?? []).map((light, i) => ({
      key: `${p.key}:${i}`,
      x: p.x + light.dx * p.scale,
      y: p.y + light.dy * p.scale,
      radius: light.radius * p.scale,
      color: light.color,
      mode: light.mode,
      strength: light.strength,
    }))
  })

  // Clamped by its half-width so a pyramid stands whole even where the frame runs to the container's edge.
  const pyramids: PlacedPyramid[] = difficulties.slice(0, difficulties.indexOf(chapter) + 1).map((_, i) => {
    const pyramidHeight = (0.55 + 0.22 * i) * unit
    const pyramidWidth = pyramidHeight * P.pyramidAspect
    const half = pyramidWidth / 2
    return {
      x: clamp(frame.x + frame.width * (0.1 + 0.2 * i), half, width - half),
      width: pyramidWidth,
      height: pyramidHeight,
      golden: i === 4,
    }
  })

  return { unit, spacing, rowGap, horizon, frame, pieces, glows, pyramids }
}
