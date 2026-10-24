import { describe, expect, it } from "vitest"
import { assignEncounters, type EncounterAllocator } from "./placeEncounters"
import type { FloorConfig, SideSection } from "./types"
import type { Difficulty } from "../data/difficultyLevels"

const floorOf = (over: Partial<FloorConfig>): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...over,
})

// An allocator that names each room after the tier it was asked for, and records every ask.
const recording = () => {
  const asks: { tier: Difficulty; count: number }[] = []
  const allocate: EncounterAllocator = (_role, tier, _seed, count) => {
    asks.push({ tier, count })
    return Array.from({ length: count }, () => `fam-${tier}`)
  }
  return { allocate, asks }
}

const deal = (floor: FloorConfig) => {
  const { allocate, asks } = recording()
  assignEncounters({ made_up: [[floor]] }, allocate)
  return { floor, asks }
}

const tiersOf = (chain: { pathPuzzles: number; encountersByIndex?: Record<number, string | string[]> }) =>
  Array.from({ length: chain.pathPuzzles }, (_unused, i) => chain.encountersByIndex?.[i])

describe("assignEncounters per-node difficulty", () => {
  it("deals a node that names only a difficulty from that difficulty's pool", () => {
    const { floor } = deal(floorOf({ pathPuzzles: 3, difficultiesByIndex: { 1: "junior" } }))
    expect(tiersOf(floor)).toEqual(["fam-starter", "fam-junior", "fam-starter"])
  })

  it("deals a section's node the same way", () => {
    const section: SideSection = {
      pathPuzzles: 3,
      difficulty: "expert",
      end: "treasure",
      difficultiesByIndex: { 0: "wizard" },
    }
    const { floor } = deal(floorOf({ sideSections: [section] }))
    expect(tiersOf(floor.sideSections[0])).toEqual(["fam-wizard", "fam-expert", "fam-expert"])
  })

  it("bakes a node that names an encounter at the node's own difficulty", () => {
    const { asks } = deal(
      floorOf({ pathPuzzles: 1, encountersByIndex: { 0: "capstone" }, difficultiesByIndex: { 0: "master" } })
    )
    expect(asks[0].tier).toBe("master")
  })

  it("asks once for a chain no node retiers", () => {
    const { asks } = deal(floorOf({ pathPuzzles: 3 }))
    expect(asks).toEqual([{ tier: "starter", count: 3 }])
  })
})
