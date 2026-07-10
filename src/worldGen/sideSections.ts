import type { Difficulty, SideSection, TreasureReward } from "./types"
import { mulberry32 } from "../game/random"
import { TIER_UNLOCK_PERK_ID } from "../data/treasurePerks"
import { hashStr, pathEndToReward, specToGate } from "./rewards"
import type { KeyColor, PathEntry, RewardSpec, SideIntensity, SideSectionConstraint } from "./dsl"

const ALL_KEY_COLORS: KeyColor[] = ["blue", "red", "green", "yellow", "purple"]
const DENSITY_FRACTION: Record<SideIntensity, number> = { none: 0, low: 0.33, medium: 0.5, dense: 1.0 }

// Returns the seeded path count for a density level (medium=2-3, dense=4-5, others fixed)
export const pathCountForDensity = (density: SideIntensity, journeyId: string, pyramidIndex: number): number => {
  if (density === "none") return 0
  if (density === "low") return 1
  const rand = mulberry32(hashStr(`${journeyId}:${pyramidIndex}`))
  if (density === "medium") return 2 + Math.floor(rand() * 2) // 2 or 3
  return 4 + Math.floor(rand() * 2) // 4 or 5
}

// Resolves a site's own reward vocabulary — pyramid passes specToReward (+ fragmentSlot
// sentinel), tomb passes the perk-stream allocator (which may run out and return undefined).
export type ResolveReward<TExtra extends string = never> = (spec: RewardSpec | TExtra) => TreasureReward | undefined

// Recursively translates one DSL-authored side section (and any nested sideSections) into
// a runtime SideSection. `stairIndex` numbers this section's stairhead among its siblings —
// only meaningful when `cs.end === "staircase"`.
const buildDslSection = <TExtra extends string>(
  cs: SideSectionConstraint<TExtra>,
  difficulty: Difficulty,
  resolveReward: ResolveReward<TExtra>,
  journeyId: string,
  stairIndex: number
): SideSection => {
  const gate = specToGate(cs.gate)
  const endReward = cs.endReward !== undefined ? resolveReward(cs.endReward) : undefined
  const sectionDifficulty = cs.difficulty ?? difficulty
  const subSections = buildDslSections(cs.sideSections, sectionDifficulty, resolveReward, journeyId)
  const end = cs.end === "staircase" ? { stairId: `${journeyId}:side${stairIndex}` } : ("treasure" as const)
  return {
    pathPuzzles: typeof cs.pathPuzzles === "number" ? cs.pathPuzzles : 0,
    difficulty: sectionDifficulty,
    end,
    ...(gate ? { gate } : {}),
    ...(endReward ? { endReward } : {}),
    ...(cs.shopPrice !== undefined ? { shopPrice: cs.shopPrice } : {}),
    ...(subSections.length > 0 ? { sideSections: subSections } : {}),
    ...(cs.decorations?.length ? { decorations: cs.decorations } : {}),
    ...(cs.hidden ? { hidden: true } : {}),
    ...(cs.trapped ? { trapped: true } : {}),
    ...(cs.sealed ? { sealed: true } : {}),
    // Array form exists on the constraint type but is never authored/resolved anywhere —
    // only forward a plain single family.
    ...(cs.puzzleFamily && !Array.isArray(cs.puzzleFamily) ? { puzzleFamily: cs.puzzleFamily } : {}),
  }
}

const buildDslSections = <TExtra extends string>(
  constraintSections: SideSectionConstraint<TExtra>[] | undefined,
  difficulty: Difficulty,
  resolveReward: ResolveReward<TExtra>,
  journeyId: string,
  startIndex = 0
): SideSection[] =>
  (constraintSections ?? []).map((cs, i) => buildDslSection(cs, difficulty, resolveReward, journeyId, startIndex + i))

export type BuildSideSectionsOptions<TExtra extends string = never> = {
  tier: string
  difficulty: Difficulty
  resolveReward: ResolveReward<TExtra>
  journeyId: string
  constraintSections?: SideSectionConstraint<TExtra>[]
  /** Pyramid-only: prepends a hardcoded mapPiece branch pointing at this tier's tomb. */
  hasMapPieceBranch?: boolean
  /** Pyramid-only: prepends a hardcoded tier-unlock ward-key gate. */
  hasWardGate?: boolean
  nextTier?: string | null
  /** Pyramid-only: appends this many auto-distributed mosaic side paths, key-gated by density. */
  mosaicPathCount?: number
  mainPathPuzzles?: number
  keyDensity?: SideIntensity
  keyColors?: number
  pyramidIndex?: number
  /** Pyramid-only: DSL-declared visible/hidden side paths (density-driven, auto-counted). */
  declaredSidePaths?: PathEntry[]
  declaredHiddenPaths?: PathEntry[]
}

export const buildSideSections = <TExtra extends string = never>(
  opts: BuildSideSectionsOptions<TExtra>
): SideSection[] => {
  const {
    tier,
    difficulty,
    resolveReward,
    journeyId,
    constraintSections,
    hasMapPieceBranch,
    hasWardGate,
    nextTier,
    mosaicPathCount = 0,
    mainPathPuzzles = 0,
    keyDensity,
    keyColors,
    pyramidIndex = 0,
    declaredSidePaths,
    declaredHiddenPaths,
  } = opts

  const sections: SideSection[] = []

  if (hasMapPieceBranch) {
    const tombId = `${tier}_treasure_tomb`
    sections.push({ pathPuzzles: 0, difficulty, end: "treasure", endReward: { type: "mapPiece", tombId } })
  }

  if (hasWardGate && nextTier) {
    const wardKeyId = TIER_UNLOCK_PERK_ID[tier]
    if (wardKeyId) {
      sections.push({ pathPuzzles: 0, difficulty, end: "treasure", gate: { type: "tomb-key", wardKeyId } })
    }
  }

  sections.push(...buildDslSections(constraintSections, difficulty, resolveReward, journeyId, sections.length))

  // Auto/density mosaic side paths — apply key gating by density + color count
  const gatedCount = keyDensity ? Math.round(mosaicPathCount * DENSITY_FRACTION[keyDensity]) : 0
  const colorCount = Math.min(keyColors ?? 1, 5)
  const mosaicPP = Math.max(0, Math.round(mainPathPuzzles / 3))
  for (let j = 0; j < mosaicPathCount; j++) {
    const gate = j < gatedCount ? { type: "floor-key" as const, color: ALL_KEY_COLORS[j % colorCount] } : undefined
    sections.push({
      pathPuzzles: mosaicPP,
      difficulty,
      end: "treasure",
      endReward: { type: "mosaicPiece" },
      ...(gate ? { gate } : {}),
    })
  }

  // Per-pyramid emit count for a declared entry — its density count, or 0 if it declares a
  // `chance` and this pyramid's roll misses (scatters e.g. trapped paths across some pyramids).
  const emitCount = (entry: PathEntry, tag: string): number => {
    const count = pathCountForDensity(entry.density, journeyId, pyramidIndex)
    if (entry.chance === undefined) return count
    return mulberry32(hashStr(`${journeyId}:${pyramidIndex}:${tag}`))() < entry.chance ? count : 0
  }

  // Declared sidePaths / hiddenPaths from DSL. Visible sidePaths may opt into a floor-key
  // gate; colors rotate through the floor's keyColors count, continuing the auto-mosaic run.
  let gatedColorIdx = gatedCount
  ;(declaredSidePaths ?? []).forEach((entry, ei) => {
    const count = emitCount(entry, `sidepath:${ei}`)
    for (let j = 0; j < count; j++) {
      const endReward = pathEndToReward(entry.end, tier, `${journeyId}:${pyramidIndex}:sidepath:${ei}:${j}`)
      const gate =
        entry.gate === "floor-key"
          ? { type: "floor-key" as const, color: ALL_KEY_COLORS[gatedColorIdx++ % colorCount] }
          : undefined
      sections.push({
        pathPuzzles: entry.pathPuzzles,
        difficulty,
        end: "treasure",
        ...(endReward ? { endReward } : {}),
        ...(gate ? { gate } : {}),
        ...(entry.trapped ? { trapped: true } : {}),
      })
    }
  })
  ;(declaredHiddenPaths ?? []).forEach((entry, ei) => {
    const count = emitCount(entry, `hiddenpath:${ei}`)
    for (let j = 0; j < count; j++) {
      const endReward = pathEndToReward(entry.end, tier, `${journeyId}:${pyramidIndex}:hiddenpath:${ei}:${j}`)
      sections.push({
        pathPuzzles: entry.pathPuzzles,
        difficulty,
        end: "treasure",
        hidden: true,
        ...(endReward ? { endReward } : {}),
        ...(entry.trapped ? { trapped: true } : {}),
      })
    }
  })

  return sections
}
