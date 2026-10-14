import { describe, expect, it } from "vitest"
import type { SideSection } from "../siteTypes"
import { freshState, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { labelCells } from "./labelCells"
import type { Chain } from "./state"

const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  ...overrides,
})

describe("labelCells", () => {
  const prep = prepOf(plainFloor({ sideSections: [section({ hidden: true, label: "crypt" })] }))
  const chain: Chain = {
    section: prep.sections.sideSections[0],
    cells: [
      [1, 2],
      [2, 2],
    ],
    attachedAt: [0, 2],
    positional: "s0",
    idx: 0,
    doors: [],
    hidden: true,
    keyHostColors: [],
  }
  const labelled = () => {
    const state = {
      ...freshState(prep),
      lay: null,
      maze: straightWalk(3),
      regions: { stepRegion: ["hall", "mid", "mid"], seams: new Set<number>() },
      keys: { chains: [chain], hostColors: new Map() },
    }
    labelCells(prep, state)
    return state.labels!
  }

  it("files the main path under `main`, numbered along the walk, in each step's region", () => {
    const { address, ordinal, region } = labelled()
    expect(["0,0", "0,2", "0,4"].map(key => address.get(key))).toEqual(["main", "main", "main"])
    expect(["0,0", "0,2", "0,4"].map(key => ordinal.get(key))).toEqual(["0", "1", "2"])
    expect(["0,0", "0,2", "0,4"].map(key => region.get(key))).toEqual(["hall", "mid", "mid"])
  })

  it("files a side path under its label, at its own tier, in the region it grows from, hidden where authored so", () => {
    const { address, ordinal, region, difficulty, hidden } = labelled()
    expect(["1,2", "2,2"].map(key => address.get(key))).toEqual(["crypt", "crypt"])
    expect(["1,2", "2,2"].map(key => ordinal.get(key))).toEqual(["0", "1"])
    expect(["1,2", "2,2"].map(key => region.get(key))).toEqual(["mid", "mid"])
    expect(difficulty.get("1,2")).toBe("expert")
    expect(difficulty.get("0,2")).toBe("starter")
    expect([...hidden]).toEqual(["1,2", "2,2"])
  })
})
