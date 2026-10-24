import { describe, expect, it } from "vitest"
import type { FloorConfig, SideSection } from "./siteTypes"
import { findEncounterRoom } from "./encounterRoom"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig =>
  ({
    pathPuzzles: 3,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    ...overrides,
  }) as FloorConfig

const side = (overrides: Partial<SideSection> = {}): SideSection =>
  ({ pathPuzzles: 2, difficulty: "starter", end: "treasure", ...overrides }) as SideSection

describe("findEncounterRoom", () => {
  it("names a main-path room by its chain position", () => {
    const sites = [[floor({ encountersByIndex: { 2: "talk" } })]]

    expect(findEncounterRoom(sites, "talk")).toEqual({ levelNr: 1, floor: 0, address: "main#0/p2" })
  })

  it("names a side room by its section's positional address, or its label", () => {
    const sites = [
      [
        floor({
          sideSections: [
            side(),
            side({ sideSections: [side({ encountersByIndex: { 1: "talk" } })] }),
            side({ label: "vault", encountersByIndex: { 0: "wall" } }),
          ],
        }),
      ],
    ]

    expect(findEncounterRoom(sites, "talk")?.address).toBe("s1.0#0/p1")
    expect(findEncounterRoom(sites, "wall")?.address).toBe("vault#0/p0")
  })

  it("searches later floors and sites, and only the ones asked for", () => {
    const sites = [
      [floor(), floor({ encountersByIndex: { 0: "talk" } })],
      [floor({ encountersByIndex: { 1: "talk" } })],
    ]

    expect(findEncounterRoom(sites, "talk")).toEqual({ levelNr: 1, floor: 1, address: "main#1/p0" })
    expect(findEncounterRoom(sites, "talk", { levelNr: 2 })).toEqual({ levelNr: 2, floor: 0, address: "main#0/p1" })
    expect(findEncounterRoom(sites, "talk", { levelNr: 1, floor: 0 })).toBeUndefined()
  })

  it("does not take a room whose encounter is a pool the family only belongs to", () => {
    expect(findEncounterRoom([[floor({ encountersByIndex: { 0: ["talk", "puzzle"] } })]], "talk")).toBeUndefined()
  })
})
