import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { HIEROGLYPHS_IN_FONT, HIEROGLYPH_FONT_RANGE } from "./hieroglyphFont.generated"
import { HIEROGLYPH_RANGE, usedHieroglyphs } from "../../../scripts/hieroglyphUsage"

/**
 * The guard on the shipped hieroglyph subset (`scripts/generateFont.ts`).
 *
 * Nothing else notices a stale subset. The build is green, every other test passes, and the sign a
 * treasure was given last week is an empty box on the one device that has no font of its own — which
 * is the failure the font exists to remove, reintroduced by forgetting to re-run a script. So this
 * reads the source the way the generator does and holds the artifact to it.
 *
 * It is the one spec here that touches the filesystem, and it has to: what it is checking is whether a
 * generated file still matches the tree it was generated from, and no amount of importing modules can
 * see a glyph typed straight into a component.
 */
const root = join(import.meta.dirname, "../../..")

const name = (code: number) => `U+${code.toString(16).toUpperCase()} ${String.fromCodePoint(code)}`

describe("the shipped hieroglyph subset", () => {
  const used = usedHieroglyphs(join(root, "src"))
  const shipped = new Set(HIEROGLYPHS_IN_FONT)

  it("has signs to check at all (a silent empty sweep would prove nothing)", () => {
    expect(used.length).toBeGreaterThan(100)
  })

  it("carries every hieroglyph the source draws", () => {
    const missing = used.filter(code => !shipped.has(code))
    expect(
      missing.map(name),
      "A sign the source draws is not in the shipped font, so it renders as an empty box wherever the device has no hieroglyph font of its own. Run `yarn generate-font`."
    ).toEqual([])
  })

  /**
   * And the other direction, which is not tidiness: this asset is precached for offline play, so a
   * sign nobody can reach is bytes every player downloads at install for nothing.
   */
  it("carries nothing the source no longer draws", () => {
    const orphaned = [...shipped].filter(code => !used.includes(code))
    expect(
      orphaned.map(name),
      "Signs left in the font after the source stopped using them. Run `yarn generate-font`."
    ).toEqual([])
  })

  /**
   * The `@font-face` is hand-written, so the range it claims can drift from the range the generator
   * swept. Narrow it and the font quietly stops applying to the signs outside it — the box comes back
   * with every generated file still perfectly in order.
   */
  it("is declared over the range the sweep covers", () => {
    const css = readFileSync(join(root, "src/index.css"), "utf8")
    const declared = css.match(/unicode-range:\s*U\+([0-9A-Fa-f]+)-([0-9A-Fa-f]+)/)
    expect(declared, "no unicode-range on the hieroglyph @font-face in src/index.css").not.toBeNull()
    const [first, last] = [parseInt(declared![1], 16), parseInt(declared![2], 16)]
    expect({ first, last }).toEqual({ first: HIEROGLYPH_RANGE.first, last: HIEROGLYPH_RANGE.last })
    expect(HIEROGLYPH_FONT_RANGE).toBe(
      `U+${HIEROGLYPH_RANGE.first.toString(16).toUpperCase()}-${HIEROGLYPH_RANGE.last.toString(16).toUpperCase()}`
    )
  })
})
