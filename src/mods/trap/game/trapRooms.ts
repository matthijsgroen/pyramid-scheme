import type { SiteConfig } from "@/worldGen/types"
import { forEachConfigSection } from "@/worldGen/configRewards"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { ARITHMETIC_REFLEX_META } from "./arithmeticReflex/meta"
import { CLOCK_REFLEX_META } from "./clockReflex/meta"

const TRAP_ENCOUNTERS: ReadonlySet<string | undefined> = new Set([
  "trap",
  ARITHMETIC_REFLEX_META.id,
  CLOCK_REFLEX_META.id,
])

// The trap rooms a world holds, per tier (a section's own difficulty): a trapped section holds one per puzzle.
export const trapsByTier = (configs: Record<string, SiteConfig[]>): Record<Difficulty, number> => {
  const traps = Object.fromEntries(difficulties.map(tier => [tier, 0])) as Record<Difficulty, number>
  forEachConfigSection(configs, section => {
    const first = Array.isArray(section.encounter) ? section.encounter[0] : section.encounter
    if (TRAP_ENCOUNTERS.has(first)) traps[section.difficulty] += section.pathPuzzles
  })
  return traps
}
