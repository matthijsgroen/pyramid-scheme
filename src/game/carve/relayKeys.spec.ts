import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf, firstPyramid } from "./carveFixtures"
import { nid } from "./ids"
import { relayKeys } from "./relayKeys"
import { assembleFloor } from "./assembleFloor"
import { validateSite } from "../siteValidator"
import { floorKeyRing } from "../floorKeys"
import type { SideSection, FloorConfig, FloorGrid, RoomCell } from "../siteTypes"
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

describe("carved through assembleFloor", () => {
  it("key is reachable before the gate (validates keyBeforeGate)", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(validateSite(result.grid)).toEqual({ valid: true })
  })

  it("a floor-key gated section's own authored endReward survives — never overwritten by a chain-internal relay key", () => {
    // Real bug found via reachability-aware fragment placement: when several floor-key
    // gated treasure-end sections share a floor, the chain-relay mechanism (each section's
    // end room grants the NEXT gate's key) picked chain[ci-1] as a host with zero regard for
    // whether that section already carried its own authored endReward — silently replacing
    // a real reward (e.g. a hieroglyph fragment) with a synthetic tombKey. Two free
    // (rewardless) gated sections plus one rewarded one, swept across seeds so the random
    // chain-shuffle can't dodge the bug by luck: the rewarded section's own reward must
    // always survive, regardless of where the shuffle places it in the chain.
    const config = (): FloorConfig => ({
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key", color: "blue" } },
        { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key", color: "red" } },
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          gate: { type: "floor-key", color: "green" },
          endReward: { type: "mapPiece", tombId: "starter_treasure_tomb" },
        },
      ],
    })

    let sawRewardedGate = false
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("chain-reward-safety", config(), seed)
      if (!result.success) continue
      const rewardedGateRoom = result.grid.cells
        .flat()
        .find((c): c is RoomCell => c.type === "room" && c.gateVariant === "floor-key" && c.keyColor === "green")
      if (!rewardedGateRoom) continue // this attempt's layout didn't place it reachably; skip
      sawRewardedGate = true
      const mapPieceRoom = result.grid.cells
        .flat()
        .find((c): c is RoomCell => c.type === "room" && c.reward?.type === "mapPiece")
      expect(mapPieceRoom).toBeDefined()
    }
    expect(sawRewardedGate).toBe(true) // otherwise this test never actually exercised the gate
  })
})

describe("an authored floor-key id", () => {
  const config = (): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "junior",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      {
        pathPuzzles: 1,
        difficulty: "junior",
        end: "treasure",
        endReward: { type: "mosaic", tier: "junior" },
        gate: { type: "floor-key", keyId: "authored:east" },
      },
    ],
  })

  it("is used verbatim as the gate's requiredKeyId", () => {
    const result = assembleFloor("site-authored-key", config(), 1234)
    if (!result.success) throw new Error("assembly failed")
    const gates = result.grid.cells.flat().filter(c => c.type === "room" && c.requiredKeyId)
    expect(gates.map(g => (g as { requiredKeyId?: string }).requiredKeyId)).toContain("authored:east")
  })

  it("grows no key-host section for that gate", () => {
    const result = assembleFloor("site-authored-key", config(), 1234)
    if (!result.success) throw new Error("assembly failed")
    const hostedKeys = result.grid.cells.flat().filter(c => c.type === "room" && c.reward?.type === "tombKey")
    expect(hostedKeys).toHaveLength(0)
  })

  // Colour is the sign pointing at the chest that holds the key, and there is no chest — a colour here
  // would show in the floor's key ring (src/game/floorKeys.ts) as a key to go and find.
  it("leaves the gate without a rotation colour", () => {
    const result = assembleFloor("site-authored-key", config(), 1234)
    if (!result.success) throw new Error("assembly failed")
    const authored = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.requiredKeyId === "authored:east")
    expect(authored).toHaveLength(1)
    expect(authored[0].keyColor).toBeUndefined()
    // The ring reads doors the player has SEEN, so the gate has to be out of the fog to count at all.
    const seen: FloorGrid = {
      ...result.grid,
      cells: result.grid.cells.map(row => row.map(c => (c === authored[0] ? { ...c, state: "visible" as const } : c))),
    }
    expect(floorKeyRing(seen, new Set()).needed).toEqual([])
  })

  it("still wears a colour the author named on it", () => {
    const spec = config()
    spec.sideSections![0].gate = { type: "floor-key", keyId: "authored:east", color: "green" }
    const result = assembleFloor("site-authored-key", spec, 1234)
    if (!result.success) throw new Error("assembly failed")
    const authored = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.requiredKeyId === "authored:east")
    expect(authored[0].keyColor).toBe("green")
  })
})

describe("a floor-key gate with no authored keyId", () => {
  it("stamps keyIsAuthored on none of its gate rooms", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    if (!result.success) throw new Error("assembly failed")
    const floorKeyGates = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.gateVariant === "floor-key")
    expect(floorKeyGates.length).toBeGreaterThan(0)
    expect(floorKeyGates.every(c => c.keyIsAuthored === undefined)).toBe(true)
  })
})
