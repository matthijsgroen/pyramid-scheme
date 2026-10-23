import { difficulties, difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type {
  CampCatalogue,
  CampFixedId,
  CampFound,
  CampPiece,
  CampPlace,
  CampSpot,
  CampSpotId,
  CampStep,
} from "./campTypes"

export type CampLayoutInput = {
  width: number
  height: number
  insets: { top: number; bottom: number }
  chapter: Difficulty
  found: CampFound
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
  /** Drawn from the spot's layer art, over the spot, rather than as a whole-spot picture. */
  layer: boolean
  x: number
  y: number
  scale: number
  width: number
  height: number
  /**
   * False for a found piece that does not show: replaced by a later step, or a layer whose host is missing.
   * Still placed, so the scene can fade it out, and in again once it shows.
   */
  visible: boolean
  /** None for a hidden piece and for a piece that burns: its own fire lights the ground it would fall on. */
  shadow?: PlacedShadow
}

export type PlacedGlow = {
  key: string
  x: number
  y: number
  /** The foot of the piece carrying the light: where its light lands on the sand. */
  floor: number
  radius: number
  color: string
  mode: "flicker" | "breathe"
  strength: number
}

/** Anchored bottom-centre on the horizon. */
export type PlacedPyramid = { x: number; width: number; height: number; golden: boolean }

export type CampLayout = {
  unit: number
  /** Multiplies every impression offset, per axis, to use the room the container gives. */
  stretch: { x: number; y: number }
  horizon: number
  frame: { x: number; y: number; width: number; height: number }
  /** Back to front, so later entries draw on top. */
  pieces: PlacedPiece[]
  glows: PlacedGlow[]
  pyramids: PlacedPyramid[]
}

/**
 * All lengths in object units `u` (the chest is 0.83u wide), except the shares of height. A spot's place
 * is its impression offset from the fire times a stretch, one per axis, each elastic within its range.
 */
export const CAMP_LAYOUT_PARAMS = {
  stretchX: [0.85, 1.6] as readonly [number, number],
  stretchY: [0.85, 1.6] as readonly [number, number],
  /** Two spots at the same depth stand at least their mean footprint times this apart, centre to centre. */
  gapFactor: 1,
  /** Anchors this close in y stand at the same depth; farther apart they may overlap, the nearer in front. */
  sameDepth: 0.35,
  /** Drawing scale at the farthest and at the nearest anchor of the catalogue. */
  depth: [0.9, 1] as readonly [number, number],
  skyMin: 1.7,
  farSandMin: 0.5,
  bottomPad: 0.35,
  /** Spot art carries its own transparent margin, so the frame needs only a little more at the sides. */
  sideMargin: 0.15,
  cameraHeight: { starter: 4.2, junior: 4.8, expert: 5.4, master: 6.0, wizard: 6.6 } as Readonly<
    Record<Difficulty, number>
  >,
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

/** A spot belongs to the chapter of its first step; the camera frames it from then on. */
const spotOpen = (spot: CampSpot, chapter: Difficulty) => spot.steps.some(s => reached(s, chapter))

const idsOf = (steps: CampStep[]) => steps.flatMap(s => s.pieces.map(p => p.id))

/** Every piece of every step the chapter has reached: the camp complete up to it. */
export const fullFound = (catalogue: CampCatalogue, chapter: Difficulty): CampFound =>
  Object.fromEntries(catalogue.spots.map(spot => [spot.id, idsOf(spot.steps.filter(s => reached(s, chapter)))]))

/** For each spot given a count, the pieces of its first n steps: the order its art was painted in. */
export const foundUpTo = (catalogue: CampCatalogue, counts: Partial<Record<CampSpotId, number>>): CampFound =>
  Object.fromEntries(
    catalogue.spots.flatMap(spot => {
      const count = counts[spot.id]
      return count === undefined ? [] : [[spot.id, idsOf(spot.steps.slice(0, Math.max(0, count)))]]
    })
  )

const isBase = (step: CampStep) => !step.layer

const lastWhere = <T>(items: readonly T[], test: (item: T) => boolean) => [...items].reverse().find(test)

/**
 * The steps of a spot that are there in the chapter, in step order, each with whether it shows: a base step
 * while no later base step is there, a growth stage while no further stage of its object is, a layer step
 * while its hosts all show.
 */
export const spotSteps = (spot: CampSpot, chapter: Difficulty, found: readonly string[]) => {
  const have = new Set(found)
  const finds = spot.steps.filter(s => !s.given && reached(s, chapter) && s.pieces.every(p => have.has(p.id)))
  const present = spot.steps.filter(s => finds.includes(s) || (s.given && finds.length > 0 && reached(s, chapter)))
  const base = lastWhere(present, isBase)
  const hostsOf = (step: CampStep) => {
    const on = step.layer?.on
    if (on === undefined)
      return [lastWhere(spot.steps.slice(0, spot.steps.indexOf(step)), isBase)].flatMap(s => s ?? [])
    const ids = typeof on === "string" ? [on] : on
    return spot.steps.filter(s => s.pieces.some(p => ids.includes(p.id)))
  }
  const furthest = (step: CampStep) => {
    const growth = step.layer?.growth
    return !growth || lastWhere(present, s => s.layer?.growth === growth) === step
  }
  const shows = (step: CampStep, seen: ReadonlySet<CampStep>): boolean => {
    if (!present.includes(step) || seen.has(step)) return false
    if (isBase(step)) return step === base
    const next = new Set(seen).add(step)
    return furthest(step) && hostsOf(step).every(host => shows(host, next))
  }
  const drawOrder = present.filter(s => !s.layer?.behind)
  for (const step of present.filter(s => s.layer?.behind)) {
    const front = drawOrder.findIndex(s => s.pieces.some(p => p.id === step.layer?.behind))
    drawOrder.splice(front < 0 ? drawOrder.length : front, 0, step)
  }
  return drawOrder.map(step => ({ step, shown: shows(step, new Set()) }))
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** A piece's own light never shadows it, so a fire stands in the light of other fires and the moon. */
const castShadow = (p: Omit<PlacedPiece, "shadow">, glows: PlacedGlow[]): PlacedShadow | undefined => {
  if (p.piece.lights?.some(l => l.mode === "flicker")) return undefined
  // Fully firelit inside a glow itself, fading to moonlight at its reach; the fire lighting it most wins, so a
  // small oven beside a piece does not turn its shadow away from the big fire that lights it.
  const lit = (g: PlacedGlow) => {
    const distance = Math.hypot(p.x - g.x, p.y - g.y)
    const reach = g.radius * S.reachFactor
    const fire = distance > 0 ? clamp((reach - distance) / Math.max(reach - g.radius, 1e-9), 0, 1) : 0
    return { g, distance, fire }
  }
  const nearest = glows
    .filter(g => g.mode === "flicker" && !g.key.startsWith(`${p.key}:`))
    .map(lit)
    .sort((a, b) => b.fire - a.fire || a.distance - b.distance)[0]
  const fire = nearest?.fire ?? 0
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

type Placed = { spot: CampSpotId | CampFixedId; place: CampPlace; piece: CampPiece; layer: boolean; shown: boolean }

/** A piece's box around its anchor, in object units, at its depth. */
type Extent = { x: number; y: number; left: number; right: number; top: number; bottom: number }

/** The largest stretch in [min, max] at which `size` stays within `limit`; `min` when even that does not fit. */
const largestFit = (size: (s: number) => number, min: number, max: number, limit: number) => {
  if (size(max) <= limit) return max
  if (size(min) > limit) return min
  let [lo, hi] = [min, max]
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2
    if (size(mid) <= limit) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * The smallest sideways stretch at which no two footprints at the same depth overlap. A pair on the same
 * x is skipped: that is one spot growing over another (a fire pit over the campfire).
 */
const sameDepthStretch = (places: (CampPlace & { depth: number })[]) =>
  Math.max(
    0,
    ...places.flatMap((a, i) =>
      places
        .slice(i + 1)
        .filter(b => Math.abs(a.y - b.y) <= P.sameDepth && a.x !== b.x)
        .map(b => (((a.footprint * a.depth + b.footprint * b.depth) / 2) * P.gapFactor) / Math.abs(a.x - b.x))
    )
  )

export const layoutCamp = ({
  width,
  height,
  insets,
  chapter,
  found,
  catalogue,
}: CampLayoutInput): CampLayout | null => {
  if (!(width > 0) || !(height > 0)) return null

  const insetFree = Math.max(height - insets.top - insets.bottom, height * P.minInsetFreeShare)
  const top = clamp(insets.top, 0, height - insetFree)
  const bottom = top + insetFree

  // Over the whole catalogue, so a spot is drawn at the same size in every chapter.
  const ys = [...catalogue.spots, ...catalogue.fixed].map(o => o.y)
  const [yFar, yNear] = [Math.min(...ys), Math.max(...ys)]
  const depthAt = (y: number) =>
    yNear > yFar ? P.depth[0] + ((y - yFar) / (yNear - yFar)) * (P.depth[1] - P.depth[0]) : P.depth[1]

  const framed = [
    ...catalogue.spots
      .filter(s => spotOpen(s, chapter))
      .map(s => ({ ...s, pieces: s.steps.filter(step => reached(step, chapter)).flatMap(step => step.pieces) })),
    ...catalogue.fixed.map(f => ({ ...f, pieces: [f.piece] })),
  ].map(o => ({ ...o, depth: depthAt(o.y) }))

  // The fire's anchor always counts, so a chapter with nothing yet still has a frame.
  const extents: Extent[] = [
    { x: 0, y: 0, left: 0, right: 0, top: 0, bottom: 0 },
    ...framed.flatMap(o =>
      o.pieces.map(p => {
        const size = o.frame * o.depth
        const bleed = (o.bleed ?? 0) * size
        return {
          x: o.x,
          y: o.y,
          left: (p.dx - p.width / 2) * size + bleed,
          right: (p.dx + p.width / 2) * size - bleed,
          top: (p.dy - p.height) * size + bleed,
          bottom: p.dy * size,
        }
      })
    ),
  ]
  const leftAt = (sx: number) => Math.min(...extents.map(e => e.x * sx + e.left))
  const rightAt = (sx: number) => Math.max(...extents.map(e => e.x * sx + e.right))
  const topAt = (sy: number) => Math.min(...extents.map(e => e.y * sy + e.top))
  const bottomAt = (sy: number) => Math.max(...extents.map(e => e.y * sy + e.bottom))
  const spanX = (sx: number) => rightAt(sx) - leftAt(sx)
  const spanY = (sy: number) => bottomAt(sy) - topAt(sy)

  const sxMin = Math.max(P.stretchX[0], sameDepthStretch(framed))
  const sxMax = Math.max(P.stretchX[1], sxMin)
  const [syMin, syMax] = P.stretchY

  // The chapter's frame at the minimum stretch fits the inset-free container: sky, far sand, camp, padding.
  const frameHeight = P.skyMin + P.farSandMin + spanY(syMin) + P.bottomPad
  const unit = Math.min(
    insetFree / P.cameraHeight[chapter],
    insetFree / frameHeight,
    width / (spanX(sxMin) + 2 * P.sideMargin)
  )

  // Spare width spreads the camp sideways; spare height spreads it down the ground below the lowest horizon.
  const sx = largestFit(spanX, sxMin, sxMax, width / unit - 2 * P.sideMargin)
  const lowestHorizon = top + Math.max(insetFree * P.horizonShare, P.skyMin * unit)
  const groundBottom = bottom - P.bottomPad * unit
  const sy = largestFit(spanY, syMin, syMax, (groundBottom - lowestHorizon) / unit - P.farSandMin)

  const fireY = groundBottom - bottomAt(sy) * unit
  // Spare height becomes far sand, not sky: the horizon only rises when the farthest frame and its far sand reach it.
  const horizon = Math.min(fireY + topAt(sy) * unit - P.farSandMin * unit, lowestHorizon)

  const frameWidth = (spanX(sx) + 2 * P.sideMargin) * unit
  const frameX = (width - frameWidth) / 2
  const frameY = horizon - P.skyMin * unit
  const frame = { x: frameX, y: frameY, width: frameWidth, height: bottom - frameY }
  const fireX = frameX + (P.sideMargin - leftAt(sx)) * unit

  const drawn: Placed[] = []
  for (const spot of catalogue.spots) {
    if (!spotOpen(spot, chapter)) continue
    for (const { step, shown } of spotSteps(spot, chapter, found[spot.id] ?? []))
      for (const piece of step.pieces) drawn.push({ spot: spot.id, place: spot, piece, layer: !isBase(step), shown })
  }
  // Fixed pieces follow spot pieces so that, on a shared anchor, they draw on top.
  for (const fixed of catalogue.fixed)
    drawn.push({ spot: fixed.id, place: fixed, piece: fixed.piece, layer: false, shown: true })

  const hidden = new Set(
    drawn.filter(d => d.shown).flatMap(d => (d.piece.replaces ?? []).filter(id => id !== d.piece.id))
  )

  // Sorted by anchor, not by each piece's own y, so a piece raised onto another (a flag on a tent) stays in front.
  const standing = drawn
    .map((d, order) => ({
      d,
      order,
      x: fireX + d.place.x * sx * unit,
      y: fireY + d.place.y * sy * unit,
      scale: unit * depthAt(d.place.y),
    }))
    .sort((a, b) => a.y - b.y || a.order - b.order)
    .map(({ d, x, y, scale }) => {
      const px = scale * d.place.frame
      return {
        key: `${d.spot}:${d.piece.id}`,
        spot: d.spot,
        piece: d.piece,
        layer: d.layer,
        x: x + d.piece.dx * px,
        y: y + d.piece.dy * px,
        scale,
        width: d.piece.width * px,
        height: d.piece.height * px,
        visible: d.shown && !hidden.has(d.piece.id),
        frame: px,
      }
    })

  const lit = standing.filter(p => p.visible)
  // A spot's pieces share its anchor, so they stand in step order: the last carrying a light id is the latest.
  const sourceOf = (spot: string, id: string) => `${spot}:${id}`
  const latest = new Map(
    lit.flatMap(p => (p.piece.lights ?? []).flatMap(l => (l.id ? [[sourceOf(p.spot, l.id), p] as const] : [])))
  )
  const glows: PlacedGlow[] = lit.flatMap(p =>
    (p.piece.lights ?? []).flatMap((light, i) =>
      light.id && latest.get(sourceOf(p.spot, light.id)) !== p
        ? []
        : [
            {
              key: `${p.key}:${i}`,
              x: p.x + light.dx * p.frame,
              y: p.y + light.dy * p.frame,
              floor: p.y,
              radius: light.radius * p.scale,
              color: light.color,
              mode: light.mode,
              strength: light.strength,
            },
          ]
    )
  )

  const pieces: PlacedPiece[] = standing.map(({ frame: _, ...p }) => ({
    ...p,
    shadow: p.visible ? castShadow(p, glows) : undefined,
  }))

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

  return { unit, stretch: { x: sx, y: sy }, horizon, frame, pieces, glows, pyramids }
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
 * Hit areas for the given spots, in that order, each covering every visible piece its spot draws and at least
 * ENTRANCE_MIN square. Two that collide first shrink toward their own centre along the axis that overlaps
 * least, never below ENTRANCE_MIN; when that is not enough, they move apart horizontally. A spot that
 * draws nothing has no area.
 */
export const entranceAreas = (pieces: PlacedPiece[], spots: readonly (CampSpotId | CampFixedId)[]): EntranceArea[] => {
  const areas = spots.flatMap(spot => {
    const own = pieces.filter(p => p.spot === spot && p.visible)
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
