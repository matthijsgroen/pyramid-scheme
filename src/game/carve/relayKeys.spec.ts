import { describe, expect, it } from "vitest"
import type { SideSection } from "../siteTypes"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { nid } from "./ids"
import { relayKeys } from "./relayKeys"
import type { Cell, SectionGroup } from "./state"

const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

const floorKey = { type: "floor-key" } as const

describe("relayKeys", () => {
  const prep = prepOf(
    plainFloor({
      sideSections: [
        section(),
        section({ gate: floorKey }),
        section({ gate: floorKey }),
        section({ gate: { type: "floor-key", keyId: "authored" } }),
      ],
    })
  )
  // Section i hangs two cells off the route, ending at [2, 2i].
  const groups: SectionGroup[] = [0, 1, 2, 3].map(i => ({
    sectionIdx: i,
    cells: [[1, 2 * i] as Cell, [2, 2 * i] as Cell],
    attachedAt: [0, 2 * i],
  }))
  const endOf = (i: number) => nid("site", 2, 2 * i)
  const relayed = () => {
    const state = {
      ...freshState(prep),
      lay: null,
      branches: { used: new Set<string>(), groups, subChains: [], seamDrops: [], carved: new Set<string>() },
    }
    relayKeys(prep, state)
    return state.keys!
  }

  it("hands the first gated section's key to the ungated section, and each next one's to the last it opened", () => {
    const { chains } = relayed()
    const keyOf = (idx: number) => chains.find(chain => chain.idx === idx)!.keyNodeId
    const first = keyOf(1) === endOf(0) ? 1 : 2
    const second = first === 1 ? 2 : 1
    expect(keyOf(first)).toBe(endOf(0))
    expect(keyOf(second)).toBe(endOf(first))
    expect(chains.find(chain => chain.idx === 0)!.keyHostColors).toEqual(["blue"])
  })

  it("keeps an authored key id and hosts no key for it", () => {
    const { chains, hostColors } = relayed()
    expect(chains.find(chain => chain.idx === 3)!.keyNodeId).toBe("authored")
    expect([...hostColors.values()].flat()).toHaveLength(2)
  })
})
