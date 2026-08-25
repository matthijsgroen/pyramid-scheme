#!/usr/bin/env tsx
/**
 * Builds the hieroglyph font this game ships — the signs it actually draws, and nothing else.
 *
 * Run: yarn generate-font
 *
 * **Why a font at all.** Every hieroglyph in this game used to ride on the device having one: nothing
 * was bundled, so a phone whose system fonts skip the Egyptian Hieroglyphs block drew empty boxes.
 * `HieroglyphTile` still carries a workaround for how its shadow doubled on a glyph that "renders as a
 * simple box", so the failure is one this project has already met. On a collection tile that is a
 * decoration that failed; on a Scribe's Register board, where telling one sign from another IS the
 * mechanic, it is an unsolvable puzzle.
 *
 * **Why a subset.** The source face covers the whole block — 1072 code points, 390 KB as woff2 — and
 * the game draws 333 of them. Subsetting comes to ~197 KB, and the ~190 KB saved matters more than it
 * looks: the service worker precaches this asset so the game stays playable offline, so it is paid at
 * install rather than lazily by whoever first opens a screen with a sign on it.
 *
 * **Hinting is kept**, which is most of the gap between this and the ~130 KB `pyftsubset --no-hinting`
 * reaches on the same glyphs. Two reasons, and the second is the real one: harfbuzz-through-node has no
 * switch for it here, and these signs are drawn small — a note pencilled into a 6x6 square is about
 * 20px — which is exactly where TrueType instructions still do something. 67 KB is not worth a Python
 * dependency in this repo's toolchain, nor worse rasterising.
 *
 * **Source and licence.** `@fontsource/noto-sans-egyptian-hieroglyphs`, which is Noto Sans Egyptian
 * Hieroglyphs under the SIL Open Font License 1.1 — a licence that permits subsetting and
 * redistribution provided the notice travels with the file — which is why
 * `src/assets/hieroglyphs.subset.LICENSE.txt` is written out beside the font.
 *
 * Taken from the pinned package rather than from whatever face a build machine happens to have
 * installed, for two reasons that hold whatever that face is: a system copy may have been re-hinted or
 * otherwise modified by its vendor, and an OS-bundled font is generally not redistributable at all. The
 * package is the thing this repo can point at.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import subsetFont from "subset-font"
import { HIEROGLYPH_RANGE, usedHieroglyphs } from "./hieroglyphUsage"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..")
const SRC = join(root, "src")

const SOURCE_PACKAGE = "@fontsource/noto-sans-egyptian-hieroglyphs"
const SOURCE_FONT = join(
  root,
  "node_modules",
  SOURCE_PACKAGE,
  "files/noto-sans-egyptian-hieroglyphs-egyptian-hieroglyphs-400-normal.woff2"
)
const SOURCE_LICENCE = join(root, "node_modules", SOURCE_PACKAGE, "LICENSE")

const FONT_OUT = join(SRC, "assets/hieroglyphs.subset.woff2")
const LICENCE_OUT = join(SRC, "assets/hieroglyphs.subset.LICENSE.txt")
const COVERAGE_OUT = join(SRC, "ui/tokens/hieroglyphFont.generated.ts")

const version = (): string =>
  JSON.parse(readFileSync(join(root, "node_modules", SOURCE_PACKAGE, "package.json"), "utf8")).version

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`

const used = usedHieroglyphs(SRC)
if (!used.length) throw new Error("generateFont: found no hieroglyphs under src/, which cannot be right")

const source = readFileSync(SOURCE_FONT)
const subset = await subsetFont(source, used.map(code => String.fromCodePoint(code)).join(""), {
  targetFormat: "woff2",
})

writeFileSync(FONT_OUT, subset)
// The notice travels with the file, which is what the OFL asks of a subset.
writeFileSync(LICENCE_OUT, readFileSync(SOURCE_LICENCE))

/**
 * The coverage list, so a spec can hold the shipped font to the source without parsing a woff2 at test
 * time — and so a reviewer can see in a diff which signs were added.
 */
writeFileSync(
  COVERAGE_OUT,
  `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
// Run: yarn generate-font
//
// The code points src/assets/hieroglyphs.subset.woff2 carries, which is every hieroglyph the source
// draws. Shipped as a list rather than read back out of the font, so the guard spec next door needs no
// woff2 decoder. scripts/generateFont.ts holds the why: the source face, its licence, and the trade
// the subset makes.
//
// Subset of Noto Sans Egyptian Hieroglyphs (${SOURCE_PACKAGE}@${version()}), SIL Open Font License 1.1
// — the notice ships beside the font at src/assets/hieroglyphs.subset.LICENSE.txt.
export const HIEROGLYPH_FONT_RANGE = "U+${HIEROGLYPH_RANGE.first.toString(16).toUpperCase()}-${HIEROGLYPH_RANGE.last.toString(16).toUpperCase()}"

export const HIEROGLYPHS_IN_FONT: readonly number[] = [
${used.map(code => `  0x${code.toString(16)},`).join("\n")}
]
`
)

console.log(`✓ ${relative(root, FONT_OUT)}`)
console.log(`  ${used.length} of the block's 1072 signs — ${kb(source.byteLength)} source → ${kb(subset.byteLength)}`)
console.log(`✓ ${relative(root, COVERAGE_OUT)}`)
console.log(`✓ ${relative(root, LICENCE_OUT)} (OFL-1.1, from ${SOURCE_PACKAGE}@${version()})`)
