import { describe, expect, it } from "vitest"
import { isChamber } from "./roomFootprint"
import type { Direction } from "./siteTypes"

const portal = (...dirs: Direction[]) => ({ roomType: "portal" as const, dirs: new Set(dirs) })

describe("isChamber", () => {
  it("makes a portal with more than one way out a chamber, whatever kind of portal it is", () => {
    for (const kind of ["stairhead", "entrance", "exit"]) {
      expect(isChamber(portal("n", "s"), kind)).toBe(true)
      expect(isChamber(portal("n", "e", "s"), kind)).toBe(true)
    }
  })

  it("leaves a portal with one way out as it was: a stairhead or exit is a chamber, a door in is not", () => {
    expect(isChamber(portal("n"), "stairhead")).toBe(true)
    expect(isChamber(portal("n"), "exit")).toBe(true)
    expect(isChamber(portal("n"), "entrance")).toBe(false)
  })

  it("leaves a puzzle standing where a branch hangs off it a stop in the corridor", () => {
    expect(isChamber({ roomType: "encounter", dirs: new Set<Direction>(["n", "e", "s"]) }, "puzzle")).toBe(false)
  })
})
