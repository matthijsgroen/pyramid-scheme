// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { HIEROGLYPHS_IN_FONT } from "@/ui/tokens/hieroglyphFont.generated"
import { keyColorHex } from "@/ui/tokens/keyColors"
import { NodeShape } from "./nodeShapes"
import { MARK_GLYPHS, MarkBadge, markFor } from "./mark"

afterEach(cleanup)

const name = (glyph: number) => `U+${glyph.toString(16).toUpperCase()} ${String.fromCodePoint(glyph)}`

describe("a mark", () => {
  /**
   * The one that matters. The shipped subset carries 248 of the block's code points, so a sign picked
   * by eye off the Unicode chart draws as an empty box on every device with no hieroglyph font of its
   * own — green and passing on a range check, which is why the assertion is against the generated list.
   */
  it("draws every mark glyph from a code point the shipped font actually carries", () => {
    const inFont = new Set(HIEROGLYPHS_IN_FONT)
    expect(
      MARK_GLYPHS.filter(glyph => !inFont.has(glyph)).map(name),
      "A mark glyph is not in src/assets/hieroglyphs.subset.woff2, so it renders as an empty box. Pick another sign from HIEROGLYPHS_IN_FONT."
    ).toEqual([])
  })

  it("gives two mechanisms on one floor marks a player can tell apart", () => {
    const [a, b] = [markFor(0), markFor(1)]
    expect(`${a.color}/${a.glyph}`).not.toBe(`${b.color}/${b.glyph}`)
  })

  it("hands out thirty pairs before it repeats one", () => {
    const pairs = Array.from({ length: 30 }, (_, n) => markFor(n)).map(mark => `${mark.color}/${mark.glyph}`)
    expect(new Set(pairs).size).toBe(30)
  })

  it("draws the glyph on its own key colour, lit when the node is reachable", () => {
    const mark = markFor(0)
    const { container } = render(
      <svg>
        <MarkBadge mark={mark} r={20} state="reachable" />
      </svg>
    )
    expect(container.querySelector("text")?.textContent).toBe(String.fromCodePoint(mark.glyph))
    expect(container.querySelector("circle")?.getAttribute("fill")).toBe(keyColorHex[mark.color].reachable)
  })

  // The pairing is only readable if BOTH ends of it are drawn: a mark on the lever alone says nothing
  // about which door answers to it.
  it.each(["handle", "gate"] as const)("is worn by a %s node on the map", kind => {
    const mark = markFor(2)
    const { container } = render(
      <svg>
        <NodeShape type={kind} state="reachable" mark={mark} />
      </svg>
    )
    expect(container.textContent).toContain(String.fromCodePoint(mark.glyph))
  })

  it("stays off a node the player has not seen yet", () => {
    const { container } = render(
      <svg>
        <MarkBadge mark={markFor(0)} r={20} state="fogged" />
      </svg>
    )
    expect(container.querySelector("text")).toBeNull()
  })
})
