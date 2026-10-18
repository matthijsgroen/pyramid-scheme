import { describe, expect, it } from "vitest"
import type { SiteConfig } from "@/game/siteTypes"
import { buriedLevels } from "./buriedLevels"

// Made-up floors: only the doors matter here.
const floor = (webDoors?: NonNullable<SiteConfig[number]["webDoors"]>) => ({ webDoors }) as SiteConfig[number]
const site = (...doors: Parameters<typeof floor>[0][]): SiteConfig => doors.map(floor)

describe("buriedLevels", () => {
  const sites = [
    site(undefined),
    site([{ key: "web:moon#2", at: { seam: 1 } }]),
    site([{ key: "web:moon#1", at: { section: "a", seam: 0 } }]),
    site([{ key: "web:sun", at: { mouth: "b" } }]),
  ]

  it("buries the pyramid whose main path waits for a key not held, and no other", () => {
    expect([...buriedLevels(sites, new Set())]).toEqual([2])
  })

  it("opens it once the key is held", () => {
    expect(buriedLevels(sites, new Set(["web:moon#2"])).size).toBe(0)
  })
})
