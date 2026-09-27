import type { KeyColor } from "./siteTypes"
import { KEY_COLORS } from "./siteTypes"

/**
 * A MARK IS A GLYPH ON A COLOURED GROUND: the ground groups, the glyph says which one. A mechanism and
 * every gate it owns wear the same pair, so two levers on one floor may both be green and still be
 * told apart (docs/mods/floor-topology-design.md, "A gate says what opens it").
 *
 * Nothing is painted for it — the grounds are the five floor-key hues the map already tints gates and
 * treasure badges with, and the glyphs come from the hieroglyph subset already shipped as a webfont and
 * led with in every stack (src/index.css), so a text node anywhere already renders them.
 *
 * The pair itself is plain data, written onto cells by the assembler, so it lives here rather than
 * beside the drawings that wear it (src/app/SiteMap/mark.tsx): the domain layer holds no React.
 */
export type Mark = { color: KeyColor; glyph: number }

/**
 * Picked out of HIEROGLYPHS_IN_FONT for reading as six different SHAPES at marker size — 𓅃 falcon,
 * 𓋹 ankh, 𓆗 cobra, 𓂀 eye, 𓆣 scarab, 𓈖 water — rather than for meaning anything: a bird and a
 * standing man are one blob at 20px, which is the size this is worn at.
 *
 * Guarded by mark.spec.tsx against the generated list, because a code point the subset does not carry
 * draws as an empty box on every device with no hieroglyph font of its own.
 *
 * THE LITERALS ABOVE ARE LOAD-BEARING, not decoration. The subset sweep (scripts/hieroglyphUsage.ts)
 * reads raw file text and matches CHARACTERS, so the code points below are invisible to it — without
 * the literals these six signs stay in the font only as long as some other file happens to draw them,
 * and two of those files are mod-owned. Emptying the hieroglyph mod would drop the cobra at the next
 * `yarn generate-font` and take a core map feature to boxes.
 */
export const MARK_GLYPHS: readonly number[] = [0x13143, 0x132f9, 0x13197, 0x13080, 0x131a3, 0x13216]

/** Five grounds against six glyphs, which are coprime: thirty pairs before any floor sees one twice. */
export const markFor = (index: number): Mark => ({
  color: KEY_COLORS[index % KEY_COLORS.length],
  glyph: MARK_GLYPHS[index % MARK_GLYPHS.length],
})
