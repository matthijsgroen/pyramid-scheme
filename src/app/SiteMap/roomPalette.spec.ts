import { describe, expect, it } from "vitest"
import { DECORATION_KINDS, WALL_DECORATION_KINDS } from "@/game/siteTypes"
import { addLegendLine, roomPalette } from "./roomPalette"

describe("the room palette", () => {
  const starter = roomPalette("starter")
  const of = (kind: string) => starter.find(entry => entry.kind === kind)

  it("lists every floor kind and every wall kind once", () => {
    expect(starter.map(entry => entry.kind)).toEqual([...DECORATION_KINDS, ...WALL_DECORATION_KINDS])
  })

  it("marks a kind the tier has painted, drawn by its own art", () => {
    expect(of("pillar")).toMatchObject({ layer: "prop", cols: 1, rows: 1, painted: true })
    expect(of("pillar")?.url).not.toBe("")
  })

  it("marks a kind the tier has not painted, drawn by the placeholder", () => {
    expect(of("crystal")).toMatchObject({ painted: false })
    expect(of("crystal")?.url).not.toBe("")
  })

  it("carries the footprint of a kind bigger than one cell", () => {
    expect(of("bones")).toMatchObject({ cols: 2, rows: 1 })
  })

  it("puts the wall kinds on the wallItem layer", () => {
    expect(of("niche")).toMatchObject({ layer: "wallItem", cols: 1, rows: 1 })
  })
})

describe("the legend line of a palette entry", () => {
  const entry = (kind: string, layer: "prop" | "wallItem" | "ground") => ({
    kind,
    layer,
    cols: 1,
    rows: 1,
    painted: true,
    url: "",
  })

  it("skips a letter already declared or drawn, and the door letter", () => {
    expect(addLegendLine("a stop\n", entry("niche", "wallItem"))).toBe("a stop\nb wallItem niche\n")
    expect(addLegendLine("# a b c\nd", entry("mat", "ground"))).toBe("# a b c\nd\ne ground mat\n")
  })

  it("starts a new line after text that does not end in one", () => {
    expect(addLegendLine("x stop", entry("pillar", "prop"))).toBe("x stop\na floor pillar\n")
  })
})
