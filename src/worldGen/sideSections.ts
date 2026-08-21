import type { Difficulty, SideSection, TreasureReward } from "./types"
import { mulberry32 } from "../game/random"
import { TIER_UNLOCK_PERK_IDS } from "../data/treasurePerks"
import { hashStr, pathEndToReward, specToGate } from "./rewards"
import type { KeyColor, PathEntry, RewardSpec, SideIntensity, SideSectionConstraint } from "./dsl"
import { resolveNodeSelectors } from "./dsl"

const ALL_KEY_COLORS: KeyColor[] = ["blue", "red", "green", "yellow", "purple"]

// Every journey of a tier gets its OWN one of that tier's unlock keys, seeded-randomly picked per
// journey, rather than every ward gate across the whole tier sharing a single key — so finding
// more of a tier's keys progressively opens more journeys' worth of ward-gated content, instead of
// one key instantly unlocking every ward gate of its kind at once. Which specific key pairs with
// which journey doesn't matter mechanically — isTierUnlocked treats a tier's keys as any-of-N.
const wardGateKeyForJourney = (tier: string, journeyId: string): string | undefined => {
  const keys = TIER_UNLOCK_PERK_IDS[tier]
  if (!keys?.length) return undefined
  const rand = mulberry32(hashStr(`${journeyId}:wardGateKey`))
  return keys[Math.floor(rand() * keys.length)]
}

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
  const sectionDifficulty = cs.difficulty ?? difficulty
  const subSections = buildDslSections(cs.sideSections, sectionDifficulty, resolveReward, journeyId)
  const end = cs.end === "staircase" ? { stairId: `${journeyId}:side${stairIndex}` } : ("treasure" as const)
  // A treasure end with no authored reward and no gate is a plain loot slot — default it to the
  // untagged `treasure` slot (filled by whatever's spare). A gated end already becomes a slot via
  // its open gate (collectSlots); a staircase end bears no reward.
  const endReward =
    cs.endReward !== undefined
      ? resolveReward(cs.endReward)
      : end === "treasure" && !gate
        ? pathEndToReward("treasure")
        : undefined
  const pathPuzzles = typeof cs.pathPuzzles === "number" ? cs.pathPuzzles : 0
  // This section's own per-node encounter overrides (authored `nodes` selectors) — selectors work
  // on any path, not just the main path (§G).
  const encountersByIndex = resolveNodeSelectors(cs.nodes, pathPuzzles)
  return {
    pathPuzzles,
    difficulty: sectionDifficulty,
    end,
    ...(gate ? { gate } : {}),
    ...(endReward ? { endReward } : {}),
    ...(subSections.length > 0 ? { sideSections: subSections } : {}),
    ...(cs.decorations?.length ? { decorations: cs.decorations } : {}),
    ...(cs.hidden ? { hidden: true } : {}),
    ...(cs.sealed ? { sealed: true } : {}),
    ...(cs.encounter !== undefined ? { encounter: cs.encounter } : {}),
    ...(Object.keys(encountersByIndex).length ? { encountersByIndex } : {}),
    ...(cs.encounterArgs !== undefined ? { encounterArgs: cs.encounterArgs } : {}),
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
  /**
   * A role for sections that do not author one — the site's theme, handed down.
   *
   * Passed in by the caller rather than read off the constraint, and that is the whole safety of it: a
   * tomb's role is `tomb-puzzle`, whose family reads `encounterArgs.runNr`, and a side section has no
   * reason to carry one. Only the pyramid branch hands anything down.
   */
  sideEncounter?: string | string[]
  /** Args for sections that carry none, handed down by the same caller under the same rule. */
  sideEncounterArgs?: unknown
  /** Pyramid-only: prepends a hardcoded mapPiece branch pointing at this tier's tomb. */
  hasMapPieceBranch?: boolean
  /** Pyramid-only: prepends a hardcoded tier-unlock ward-key gate. */
  hasWardGate?: boolean
  nextTier?: string | null
  keyColors?: number
  pyramidIndex?: number
  /** Pyramid-only: DSL-declared visible/hidden side paths (density-driven, auto-counted). */
  declaredSidePaths?: PathEntry[]
  declaredHiddenPaths?: PathEntry[]
}

// A themed pyramid themes its side paths too, but only where the section is silent: a trapped path authors
// `encounter: "trap"` and keeps it, and so does any section naming its own family.
//
// **Handed down by the caller, never read off the constraint here.** A tomb's role is `tomb-puzzle`, whose
// family reads `encounterArgs.runNr`; reading the constraint directly gave that to tomb side paths and world
// generation crashed on the first tableau. A role can require args, so only a caller that knows its rooms are
// plain puzzle rooms may hand one down.
const wearSiteRole = (
  sections: SideSection[],
  sideEncounter: string | string[] | undefined,
  sideEncounterArgs: unknown
): SideSection[] =>
  sections.map(section => ({
    ...section,
    ...(sideEncounter !== undefined && section.encounter === undefined ? { encounter: sideEncounter } : {}),
    ...(sideEncounterArgs !== undefined && section.encounterArgs === undefined
      ? { encounterArgs: sideEncounterArgs }
      : {}),
  }))

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
    keyColors,
    pyramidIndex = 0,
    declaredSidePaths,
    declaredHiddenPaths,
    sideEncounter,
    sideEncounterArgs,
  } = opts

  const sections: SideSection[] = []

  if (hasMapPieceBranch) {
    // A generic fragmentSlot sentinel tagged for this tier's tomb — the tomb-treasure mod's
    // map-piece currency (MAP_PIECE_CURRENCY) prefers this `prefers` tag and fills it, so core
    // world-gen never names the `mapPiece` reward type. `hasMapPieceBranch` stays a structural
    // flag (where the branch lives), not a reward-type name. See docs/mods/ARCHITECTURE.md (tombTreasure mod).
    const tombId = `${tier}_treasure_tomb`
    sections.push({
      pathPuzzles: 0,
      difficulty,
      end: "treasure",
      endReward: { type: "fragmentSlot", prefers: `mapPiece:${tombId}` },
    })
  }

  if (hasWardGate && nextTier) {
    const wardKeyId = wardGateKeyForJourney(tier, journeyId)
    if (wardKeyId) {
      sections.push({ pathPuzzles: 0, difficulty, end: "treasure", gate: { type: "tomb-key", wardKeyId } })
    }
  }

  sections.push(...buildDslSections(constraintSections, difficulty, resolveReward, journeyId, sections.length))

  const colorCount = Math.min(keyColors ?? 1, 5)

  // Per-pyramid emit count for a declared entry — its density count, or 0 if it declares a
  // `chance` and this pyramid's roll misses (scatters e.g. trapped paths across some pyramids).
  const emitCount = (entry: PathEntry, tag: string): number => {
    const count = pathCountForDensity(entry.density, journeyId, pyramidIndex)
    if (entry.chance === undefined) return count
    return mulberry32(hashStr(`${journeyId}:${pyramidIndex}:${tag}`))() < entry.chance ? count : 0
  }

  // Declared sidePaths / hiddenPaths from DSL. Visible sidePaths may opt into a floor-key
  // gate; colors rotate through the floor's keyColors count, continuing the auto-mosaic run.
  let gatedColorIdx = 0
  ;(declaredSidePaths ?? []).forEach((entry, ei) => {
    const count = emitCount(entry, `sidepath:${ei}`)
    for (let j = 0; j < count; j++) {
      const endReward = pathEndToReward(entry.end)
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
        ...(entry.encounter !== undefined ? { encounter: entry.encounter } : {}),
      })
    }
  })
  ;(declaredHiddenPaths ?? []).forEach((entry, ei) => {
    const count = emitCount(entry, `hiddenpath:${ei}`)
    for (let j = 0; j < count; j++) {
      const endReward = pathEndToReward(entry.end)
      sections.push({
        pathPuzzles: entry.pathPuzzles,
        difficulty,
        end: "treasure",
        hidden: true,
        ...(endReward ? { endReward } : {}),
        ...(entry.encounter !== undefined ? { encounter: entry.encounter } : {}),
      })
    }
  })

  return wearSiteRole(sections, sideEncounter, sideEncounterArgs)
}
