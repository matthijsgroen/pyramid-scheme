import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"

/**
 * Which hieroglyphs this game can put on a screen, read out of the source itself.
 *
 * Shared by the generator that builds the shipped font subset and by the spec that guards it
 * (`src/ui/tokens/hieroglyphFont.spec.ts`), so the two cannot disagree about what "used" means. A
 * second copy of this rule is the whole failure it exists to prevent: the subset would be built from
 * one definition and checked against another, and the glyph that fell between them would ship as an
 * empty box.
 */

/**
 * Egyptian Hieroglyphs, plus the format controls that follow it.
 *
 * The controls (U+13430…) are the quadrat-layout marks — nothing here writes them today, but they are
 * in the range so a cartouche authored later is covered by the same sweep rather than by a second one.
 */
export const HIEROGLYPH_RANGE = { first: 0x13000, last: 0x1343f } as const

export const isHieroglyph = (codePoint: number): boolean =>
  codePoint >= HIEROGLYPH_RANGE.first && codePoint <= HIEROGLYPH_RANGE.last

/**
 * Specs and stories are fixtures rather than screens: a glyph that only ever appears in one is a
 * stand-in for a real one, and subsetting for it would pad the shipped font with signs no player can
 * reach. Everything else under `src/` counts — a literal typed straight into a component (a chest, a
 * map button, the compass) is as real as an entry in the data tables.
 */
const isFixture = (name: string): boolean => name.includes(".spec.") || name.includes(".stories.")

const SOURCE = new Set([".ts", ".tsx"])

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    if (!SOURCE.has(extname(entry.name)) || isFixture(entry.name)) return []
    return [path]
  })

/** Every hieroglyph code point the shipped source can render, ascending. */
export const usedHieroglyphs = (root: string): number[] => {
  const used = new Set<number>()
  for (const file of filesUnder(root))
    for (const character of readFileSync(file, "utf8")) {
      const codePoint = character.codePointAt(0)
      if (codePoint !== undefined && isHieroglyph(codePoint)) used.add(codePoint)
    }
  return [...used].sort((left, right) => left - right)
}
