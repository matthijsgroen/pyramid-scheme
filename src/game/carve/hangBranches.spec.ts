import { describe, expect, it } from "vitest"
import type { SideSection } from "../siteTypes"
import { firstCarved, plainFloor, prepOf } from "./carveFixtures"
import { makePkey } from "./grid"
import { chainRooms, paddedChainLength } from "./ids"
import type { Chain, SectionGroup } from "./state"

const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

describe("hangBranches", () => {
  const prep = prepOf(
    plainFloor({
      pathPuzzles: 2,
      packing: 1,
      sideSections: [section(), section({ sideSections: [section(), section({ pathPuzzles: 0 })] }), section()],
    })
  )
  const state = firstCarved(prep)
  const { groups, subChains, used, carved } = state.branches!
  const { n, passages } = state.maze!
  const pkey = makePkey(n)
  const joined = ([r1, c1]: [number, number], [r2, c2]: [number, number]) =>
    passages.has(pkey(r1, c1, r2, c2)) || carved.has(pkey(r1, c1, r2, c2))
  const walks = (chain: SectionGroup | Chain) =>
    [chain.attachedAt, ...chain.cells].every((cell, i, all) => i === 0 || joined(all[i - 1], cell))

  it("hangs every authored section a chain as long as its packing asks, walkable from where it attaches", () => {
    expect(groups.map(g => g.sectionIdx).sort()).toEqual([0, 1, 2])
    for (const group of groups) {
      const positional = `s${group.sectionIdx}`
      const rooms = chainRooms(
        prep.mechanisms.leverAtPositional,
        prep.sections.sideSections[group.sectionIdx],
        positional
      )
      expect(group.cells).toHaveLength(paddedChainLength(state.rung.chainPacking, rooms))
      expect(walks(group)).toBe(true)
    }
  })

  it("hangs each sub-section off a cell of its parent's chain", () => {
    const parent = groups.find(g => g.sectionIdx === 1)!
    expect(subChains.map(c => c.positional)).toEqual(["s1.0", "s1.1"])
    for (const sub of subChains) {
      expect(parent.cells.slice(0, -1)).toContainEqual(sub.attachedAt)
      expect(walks(sub)).toBe(true)
    }
  })

  it("never lets two chains share a cell, and claims every cell it hung", () => {
    const cells = [...groups, ...subChains].flatMap(chain => chain.cells.map(([r, c]) => `${r},${c}`))
    expect(new Set(cells).size).toBe(cells.length)
    for (const cell of cells) expect(used.has(cell)).toBe(true)
  })
})
