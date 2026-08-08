import { describe, expect, it } from "vitest"
import type { FloorConfig, SiteConfig } from "@/game/siteTypes"
import { floorOfPosition, stairPeerPosition } from "./stairTravel"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 3,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

// Two floors linked the way buildSite links them: floor 0 ends on the staircase, floor 1 enters on it.
const twoFloors: SiteConfig = [floor({ exitOrStaircase: { stairId: "s1" } }), floor({ entrance: { stairId: "s1" } })]

describe(floorOfPosition, () => {
  it("puts the player on floor 0 while no position is stored yet", () => {
    expect(floorOfPosition(null, 2)).toBe(0)
    expect(floorOfPosition(undefined, 2)).toBe(0)
  })

  it("reads the floor out of the stored position, so floor and position can never disagree", () => {
    expect(floorOfPosition("1:4,2", 2)).toBe(1)
  })

  it("clamps a position pointing past the site's last floor", () => {
    expect(floorOfPosition("7:4,2", 2)).toBe(1)
  })
})

describe(stairPeerPosition, () => {
  it("finds the same staircase on the other floor", () => {
    const peer = stairPeerPosition("test-journey", twoFloors, 42, "s1", 0)
    expect(peer?.floor).toBe(1)

    // The peer is the cell the other floor's assembly actually put that stairhead on.
    const back = stairPeerPosition("test-journey", twoFloors, 42, "s1", 1)
    expect(back?.floor).toBe(0)
    expect(back?.pos).not.toEqual(peer?.pos)
  })

  it("returns null for a staircase no other floor carries", () => {
    expect(stairPeerPosition("test-journey", twoFloors, 42, "nope", 0)).toBeNull()
  })
})
