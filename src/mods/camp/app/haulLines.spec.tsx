import { describe, expect, it } from "vitest"
import type { TreasureReward } from "@/game/siteTypes"
import { summariseFinds, summariseParts } from "./haulLines"

const t = (key: string, opts?: { name?: string; count?: number }) =>
  opts?.count === undefined ? key : `${key}:${opts.name}:${opts.count}`

const find = (step: string): TreasureReward => ({ type: "campFind", step })
const part = (structure: string, name: string): TreasureReward => ({ type: "campPart", structure, part: name })

describe("camp haul lines", () => {
  it("gives each find one new line named after the find", () => {
    const lines = summariseFinds([find("made-up-pot"), find("made-up-rug")], t)
    expect(lines.map(l => l.title)).toEqual(["finds.made-up-pot", "finds.made-up-rug"])
    expect(lines.every(l => l.isNew && l.note === "haul.new")).toBe(true)
    expect(new Set(lines.map(l => l.key)).size).toBe(2)
  })

  it("gives one line per structure counting its parts", () => {
    const lines = summariseParts([part("made-up-hut", "a"), part("made-up-hut", "b"), part("made-up-hut", "c")], t)
    expect(lines).toHaveLength(1)
    expect(lines[0].title).toBe("haul.parts:structures.made-up-hut:3")
  })

  it("keeps two structures apart", () => {
    const lines = summariseParts([part("made-up-hut", "a"), part("made-up-well", "a"), part("made-up-hut", "b")], t)
    expect(lines.map(l => l.title)).toEqual([
      "haul.parts:structures.made-up-hut:2",
      "haul.parts:structures.made-up-well:1",
    ])
  })
})
