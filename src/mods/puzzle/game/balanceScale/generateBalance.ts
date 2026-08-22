import type { Grade } from "@/game/families/familyMeta"
import { mulberry32 } from "@/game/random"
import {
  solveByTechniques,
  type BalancePuzzleData,
  type Glyph,
  type PanItem,
  type Scale,
  type TechniqueId,
} from "./techniques"

export type BalancePuzzle = BalancePuzzleData & {
  solution: Record<Glyph, number>
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: TechniqueId
}

export type BalanceOptions = {
  /** The strongest deduction a board may demand — and, per gate 4, the one it does demand. */
  techniqueCap?: TechniqueId
  glyphCount?: number
  scaleCount?: number
  /** Heaviest weight a glyph may have; the number palette runs 1..maxValue. */
  maxValue?: number
  /** Most items one pan may hold before the pan stops being readable. */
  maxItemsPerPan?: number
  /**
   * Whether a glyph may stand on both pans of one scale — the shape that forces the cancel move.
   * Numbers on both pans are left alone either way: a row like `🪲 7 = 15` is read, not cancelled,
   * because reading ranks above tidying (§4.1).
   */
  cancelling?: boolean
  /** Fewest cancels a board must demand — the tier where taking things off both pans arrives. */
  minCancels?: number
  /**
   * Fewest swaps a board must demand. Above 1 this asks for a chain: trade a glyph, and the row that
   * comes out is what makes the next trade possible.
   */
  minSwaps?: number
}

// Weights whose value is not written on them. Any distinguishable set works — the solver never reads
// a glyph, it only cares that the same one weighs the same everywhere.
const GLYPH_POOL: Glyph[] = ["🪲", "🏺", "🐍", "🦅", "🐈", "🪶"]

const MAX_ATTEMPTS = 2500
const MAX_SCALE_DRAWS = 60

// Generation is draw-and-reject, per docs/game-design/puzzles/balance-scale.md §3. The gate that
// matters is the last one: the technique solver must settle every glyph AND need exactly the tier's
// cap to do it, so an "expert" board cannot be a junior board wearing a label. Settling also settles
// uniqueness — every step was forced, so no second set of weights works.

const sumItems = (items: PanItem[], values: Record<Glyph, number>): number =>
  items.reduce((sum, item) => sum + (item.kind === "weight" ? item.value : values[item.glyph]), 0)

// A scale's identity for the duplicate gate: the equation it reduces to, with the pans and the
// stones folded together. Two differently-drawn scales saying the same thing are one clue.
const equationKey = ({ left, right }: Scale): string => {
  const net = new Map<Glyph, number>()
  let constant = 0
  for (const [items, sign] of [
    [left, 1],
    [right, -1],
  ] as const)
    for (const item of items) {
      if (item.kind === "weight") constant += sign * item.value
      else net.set(item.glyph, (net.get(item.glyph) ?? 0) + sign)
    }
  const glyphs = [...net].filter(([, coeff]) => coeff !== 0).sort(([a], [b]) => a.localeCompare(b))
  return glyphs.length ? `${glyphs.map(([glyph, coeff]) => `${coeff}${glyph}`).join()}|${constant}` : ""
}

const pickGlyphs = (random: () => number, count: number): Glyph[] => {
  const pool = [...GLYPH_POOL]
  return Array.from({ length: count }, () => pool.splice(Math.floor(random() * pool.length), 1)[0])
}

// Distinct weights: two glyphs of equal weight are interchangeable to look at, so the board reads as
// if the player got one of them wrong (gate 1).
const pickValues = (random: () => number, glyphs: Glyph[], maxValue: number): Record<Glyph, number> | undefined => {
  const values: Record<Glyph, number> = {}
  const used = new Set<number>()
  for (const glyph of glyphs) {
    for (let draw = 0; draw < 20 && values[glyph] === undefined; draw++) {
      const value = Math.floor(random() * maxValue) + 1
      if (!used.has(value)) {
        used.add(value)
        values[glyph] = value
      }
    }
    if (values[glyph] === undefined) return undefined
  }
  return values
}

// One scale: glyphs on the left (plus sometimes a stone), fewer glyphs on the right, and a stone that
// makes up whatever difference is left. Built to balance by construction — the gates below decide
// whether it is worth showing.
const drawScale = (
  random: () => number,
  glyphs: Glyph[],
  values: Record<Glyph, number>,
  { maxItemsPerPan = 3, maxValue = 10, cancelling = true }: BalanceOptions
): Scale | undefined => {
  const glyphItems = (count: number): PanItem[] =>
    Array.from({ length: count }, () => ({ kind: "glyph", glyph: glyphs[Math.floor(random() * glyphs.length)] }))

  const left: PanItem[] = glyphItems(1 + Math.floor(random() * maxItemsPerPan))
  if (random() < 0.4 && left.length < maxItemsPerPan)
    left.push({ kind: "weight", value: Math.floor(random() * maxValue) + 1 })
  const right: PanItem[] = glyphItems(Math.floor(random() * maxItemsPerPan))

  if (
    !cancelling &&
    right.some(
      item => item.kind === "glyph" && left.some(other => other.kind === "glyph" && other.glyph === item.glyph)
    )
  )
    return undefined

  const remainder = sumItems(left, values) - sumItems(right, values)
  if (remainder < 0 || remainder > 2 * maxValue) return undefined
  if (remainder === 0 && !right.length) return undefined
  if (remainder > 0) {
    if (right.length >= maxItemsPerPan) return undefined
    right.push({ kind: "weight", value: remainder })
  }
  // One glyph against one stone is not a puzzle, it is the answer written down.
  if (left.length === 1 && right.length === 1) return undefined
  // A scale that cancels to a plain numeric identity carries no information (gate 2).
  return equationKey({ left, right }) ? { left, right } : undefined
}

const drawScales = (
  random: () => number,
  glyphs: Glyph[],
  values: Record<Glyph, number>,
  count: number,
  options: BalanceOptions
): Scale[] | undefined => {
  const scales: Scale[] = []
  const seen = new Set<string>()
  for (let draw = 0; draw < MAX_SCALE_DRAWS && scales.length < count; draw++) {
    const scale = drawScale(random, glyphs, values, options)
    const key = scale && equationKey(scale)
    if (!scale || !key || seen.has(key)) continue
    seen.add(key)
    scales.push(scale)
  }
  return scales.length === count ? scales : undefined
}

// What is on screen is what is needed (gate 5): a scale whose removal leaves the board just as
// solvable, at the same cap, was never a clue.
const withoutRedundantScales = (puzzle: BalancePuzzleData, cap: TechniqueId): BalancePuzzleData => {
  let scales = puzzle.scales
  for (let index = scales.length - 1; index >= 0; index--) {
    const fewer = scales.filter((_, i) => i !== index)
    const result = solveByTechniques({ ...puzzle, scales: fewer }, cap)
    if (result.settled && result.deepest === cap) scales = fewer
  }
  return { ...puzzle, scales }
}

/**
 * Whether this board is one the loop below would have kept, and what the ladder needed to settle it
 * (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * The loop calls it on each candidate, so it is the gate rather than a second opinion about it. The
 * board that ships has had its redundant scales trimmed afterwards, and trimming only ever removes a
 * scale the same cap still settles without — so grading the trimmed board can reject a seed the loop
 * would have kept, never admit one it would not.
 */
export const gradeBalance = (board: BalancePuzzle, options: BalanceOptions = {}): Grade | null => {
  const { techniqueCap = "difference", minSwaps = 0, minCancels = 0 } = options
  const result = solveByTechniques(board, techniqueCap)
  if (!result.settled || result.deepest !== techniqueCap) return null
  if (result.steps.filter(step => step.technique === "swap").length < minSwaps) return null
  if (result.steps.filter(step => step.technique.startsWith("cancel")).length < minCancels) return null
  return { steps: result.steps.length, deepest: result.deepest }
}

export const generateBalance = (
  seed: number,
  options: BalanceOptions = {},
  // Kept out of `options` deliberately: the options are what a seed list keys on, so asking for a
  // single attempt instead of the full search must not file the board under a different bucket.
  attempts: number = MAX_ATTEMPTS
): BalancePuzzle => {
  const { techniqueCap = "difference", glyphCount = 2, scaleCount = 2, maxValue = 10 } = options
  for (let attempt = 0; attempt < attempts; attempt++) {
    const random = mulberry32(seed * 7919 + attempt)
    const glyphs = pickGlyphs(random, glyphCount)
    const solution = pickValues(random, glyphs, maxValue)
    if (!solution) continue
    const scales = drawScales(random, glyphs, solution, scaleCount, { maxValue, ...options })
    if (!scales) continue
    const puzzle: BalancePuzzleData = { glyphs, scales, maxValue, cancelling: options.cancelling ?? true }
    if (!gradeBalance({ ...puzzle, solution, techniqueCap }, options)) continue
    return { ...withoutRedundantScales(puzzle, techniqueCap), solution, techniqueCap }
  }
  throw new Error(`generateBalance: no logically solvable board (cap=${techniqueCap}, seed=${seed})`)
}
