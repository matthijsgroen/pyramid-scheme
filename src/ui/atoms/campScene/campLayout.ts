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

/**
 * A contact shadow under the piece's base. `angle` is the screen direction away from the light, in degrees
 * (0 is right, 90 is down); `offset` is how far, in px, the shadow shifts that way; `strength` is its
 * opacity. `light` is the key of the fire glow casting it, absent for the moon.
 */
export type PlacedShadow = { angle: number; offset: number; strength: number; light?: string }

/**
 * Pixels, anchored bottom-centre; `scale` is the px size of one object unit at the piece's depth, and
 * `width` and `height` are the px size the piece's image is drawn at.
 */
export type PlacedPiece = {
  key: string
  spot: CampSpotId | CampFixedId
  piece: CampPiece
  x: number
  y: number
  scale: number
  width: number
  height: number
  /** None for a piece that burns: its own fire lights the ground it would fall on. */
  shadow?: PlacedShadow
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

/**
 * All lengths in object units `u` (the chest is 1u wide), except the shares of height. The minimum slot
 * spacing is not a parameter: it is what keeps the widest pair of neighbouring footprints apart.
 */
export const CAMP_LAYOUT_PARAMS = {
  spacingMax: 2.3,
  /** Two neighbours stand at least their mean footprint times this apart, centre to centre. */
  gapFactor: 1,
  rowGapMin: 0.75,
  rowGapMax: 5,
  /** The back gap is a little shorter than the front one: farther ground looks flatter. */
  backGapFactor: 0.85,
  depth: [0.9, 0.95, 1] as readonly [number, number, number],
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

/**
 * A fire casts the shadows inside its glow; past three times its radius the moon takes over, and between
 * the two the direction blends. Near the fire a shadow is dark and pushed further from its base, under the
 * moon faint and close. Offsets are object units at the piece's depth.
 */
export const CAMP_SHADOW_PARAMS = {
  /** Lower right, away from the moon in the upper left of the sky. */
  moonAngle: 30,
  reachFactor: 3,
  offsetMoon: 0.03,
  offsetFire: 0.06,
  strengthMin: 0.18,
  strengthMax: 0.6,
}

const S = CAMP_SHADOW_PARAMS

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

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** A piece's own light never shadows it, so a fire stands in the light of other fires and the moon. */
const castShadow = (p: Omit<PlacedPiece, "shadow">, glows: PlacedGlow[]): PlacedShadow | undefined => {
  if (p.piece.lights?.some(l => l.mode === "flicker")) return undefined
  const nearest = glows
    .filter(g => g.mode === "flicker" && !g.key.startsWith(`${p.key}:`))
    .map(g => ({ g, distance: Math.hypot(p.x - g.x, p.y - g.y) }))
    .sort((a, b) => a.distance - b.distance)[0]
  const reach = nearest ? nearest.g.radius * S.reachFactor : 0
  // Fully firelit inside the glow itself, fading to moonlight at its reach.
  const fire =
    nearest && nearest.distance > 0
      ? clamp((reach - nearest.distance) / Math.max(reach - nearest.g.radius, 1e-9), 0, 1)
      : 0
  if (fire === 0) return { angle: S.moonAngle, offset: S.offsetMoon * p.scale, strength: S.strengthMin }
  const moon = toRadians(S.moonAngle)
  const vx = (fire * (p.x - nearest.g.x)) / nearest.distance + (1 - fire) * Math.cos(moon)
  const vy = (fire * (p.y - nearest.g.y)) / nearest.distance + (1 - fire) * Math.sin(moon)
  return {
    angle: (Math.atan2(vy, vx) * 180) / Math.PI,
    offset: (S.offsetMoon + fire * (S.offsetFire - S.offsetMoon)) * p.scale,
    strength: S.strengthMin + fire * (S.strengthMax - S.strengthMin),
    light: nearest.g.key,
  }
}

type Placed = { spot: CampSpotId | CampFixedId; row: CampRow; frame: number; piece: CampPiece }

type Standing = { row: CampRow; slot: number; footprint: number }

/**
 * The smallest slot spacing at which no two footprints in a row overlap. Every pair counts, not only
 * neighbours, because two spots can share a slot (a fire pit over the campfire) with different footprints.
 */
const footprintSpacing = (standing: Standing[]) =>
  Math.max(
    0,
    ...standing.flatMap((a, i) =>
      standing
        .slice(i + 1)
        .filter(b => b.row === a.row && b.slot !== a.slot)
        .map(
          b =>
            (((a.footprint + b.footprint) / 2) * P.gapFactor * P.depth[a.row]) /
            (Math.abs(a.slot - b.slot) * P.spread[a.row])
        )
    )
  )

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
    ...catalogue.fixed.map(f => ({ ...f, frame: 1, pieces: [f.piece] })),
  ]
  const spacingMin = footprintSpacing(framed)
  const spacingMax = Math.max(P.spacingMax, spacingMin)
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
          p =>
            (side * p.dx + p.width / 2) * o.frame * P.depth[o.row] -
            (side > 0 ? xMax - xs[i] : xs[i] - xMin) * spacingMin
        )
      )
    )
  const marginLeft = reach(-1)
  const marginRight = reach(1)
  const margins = marginLeft + marginRight

  const backReach = P.depth[0] + P.backHeadroom
  const minHeight = P.bottomPad + backReach + P.farSandMin + P.skyMin + (1 + P.backGapFactor) * P.rowGapMin
  const unit = Math.min(insetFree / Math.max(P.cameraHeight[chapter], minHeight), width / (span * spacingMin + margins))
  const spacing = clamp((width / unit - margins) / span, spacingMin, spacingMax)

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
      for (const piece of step.pieces) drawn.push({ spot: spot.id, row: spot.row, frame: spot.frame, piece })
  }
  // Fixed pieces follow spot pieces so that, on a shared baseline, they draw on top.
  for (const fixed of catalogue.fixed) drawn.push({ spot: fixed.id, row: fixed.row, frame: 1, piece: fixed.piece })

  const hidden = new Set(drawn.flatMap(d => (d.piece.replaces ?? []).filter(id => id !== d.piece.id)))
  const visible = drawn.filter(d => !hidden.has(d.piece.id))

  const slotOf = new Map<string, number>([
    ...catalogue.spots.map(s => [s.id, s.slot] as const),
    ...catalogue.fixed.map(f => [f.id, f.slot] as const),
  ])

  // Sorted by row, not by each piece's own y, so a piece raised onto another (a flag on a tent) stays in front.
  const standing = visible
    .map((d, order) => ({ d, order, at: anchor({ row: d.row, slot: slotOf.get(d.spot) ?? 0 }) }))
    .sort((a, b) => a.at.y - b.at.y || a.order - b.order)
    .map(({ d, at }) => {
      const px = at.scale * d.frame
      return {
        key: `${d.spot}:${d.piece.id}`,
        spot: d.spot,
        piece: d.piece,
        x: at.x + d.piece.dx * px,
        y: at.y + d.piece.dy * px,
        scale: at.scale,
        width: d.piece.width * px,
        height: d.piece.height * px,
        frame: px,
      }
    })

  const glows: PlacedGlow[] = standing.flatMap(p => {
    return (p.piece.lights ?? []).map((light, i) => ({
      key: `${p.key}:${i}`,
      x: p.x + light.dx * p.frame,
      y: p.y + light.dy * p.frame,
      radius: light.radius * p.scale,
      color: light.color,
      mode: light.mode,
      strength: light.strength,
    }))
  })

  const pieces: PlacedPiece[] = standing.map(({ frame: _, ...p }) => ({ ...p, shadow: castShadow(p, glows) }))

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

/** The smallest hit area of an entrance, in CSS px, however small its art is drawn. */
export const ENTRANCE_MIN = 44

/** Centred on (x, y), in px. */
export type EntranceArea = { spot: CampSpotId | CampFixedId; x: number; y: number; width: number; height: number }

const overlapOf = (a: EntranceArea, b: EntranceArea) => ({
  x: (a.width + b.width) / 2 - Math.abs(a.x - b.x),
  y: (a.height + b.height) / 2 - Math.abs(a.y - b.y),
})

/**
 * Hit areas for the given spots, in that order, each covering every piece its spot draws and at least
 * ENTRANCE_MIN square. Two that collide first shrink toward their own centre along the axis that overlaps
 * least, never below ENTRANCE_MIN; when that is not enough, they move apart horizontally. A spot that
 * draws nothing has no area.
 */
export const entranceAreas = (pieces: PlacedPiece[], spots: readonly (CampSpotId | CampFixedId)[]): EntranceArea[] => {
  const areas = spots.flatMap(spot => {
    const own = pieces.filter(p => p.spot === spot)
    if (own.length === 0) return []
    const left = Math.min(...own.map(p => p.x - p.width / 2))
    const right = Math.max(...own.map(p => p.x + p.width / 2))
    const top = Math.min(...own.map(p => p.y - p.height))
    const bottom = Math.max(...own.map(p => p.y))
    return [
      {
        spot,
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        width: Math.max(ENTRANCE_MIN, right - left),
        height: Math.max(ENTRANCE_MIN, bottom - top),
      },
    ]
  })
  // A push can make a new collision with a third area, so the pairs are settled again until none collide.
  for (let pass = 0; pass <= areas.length; pass++) {
    let collided = false
    for (let i = 0; i < areas.length; i++)
      for (let k = i + 1; k < areas.length; k++) {
        const [a, b] = [areas[i], areas[k]]
        const before = overlapOf(a, b)
        if (before.x <= 1e-9 || before.y <= 1e-9) continue
        collided = true
        const axis = before.x <= before.y ? "width" : "height"
        const cut = before[axis === "width" ? "x" : "y"]
        for (const area of [a, b]) area[axis] = Math.max(ENTRANCE_MIN, area[axis] - cut)
        const after = overlapOf(a, b)
        if (after.x <= 1e-9 || after.y <= 1e-9) continue
        const away = a.x <= b.x ? -1 : 1
        a.x += (away * after.x) / 2
        b.x -= (away * after.x) / 2
      }
    if (!collided) break
  }
  return areas
}
