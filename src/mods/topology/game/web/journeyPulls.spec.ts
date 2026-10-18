import { describe, expect, it } from "vitest"
import type { SiteConfig } from "@/game/siteTypes"
import { journeyPulls } from "./journeyPulls"

const sites = [[{ webDoors: [{ key: "web:moon#2", at: { seam: 1 } }] }]] as unknown as SiteConfig[]
const activators = [
  { name: "a", pots: ["moon"] },
  { name: "b", pots: ["moon"] },
  { name: "c", pots: ["moon", "sun"] },
  { name: "d", pots: ["sun"] },
]

describe("journeyPulls", () => {
  it("counts the levers of the pots its doors wait on, pulled and all", () => {
    expect(journeyPulls(sites, activators, { a: true, d: true })).toEqual({ pulled: 1, total: 3 })
  })

  it("counts a pot whose stop landed inside a lock", () => {
    const inLock = [[{ locks: [{ web: { inputs: { W1: "web:sun#1" } } }] }]] as unknown as SiteConfig[]
    expect(journeyPulls(inLock, activators, { c: true })).toEqual({ pulled: 1, total: 2 })
  })

  it("says nothing for a journey whose doors count in no pot", () => {
    const named = [[{ webDoors: [{ key: "web:moon", at: { seam: 1 } }] }]] as unknown as SiteConfig[]
    expect(journeyPulls(named, activators, {})).toBeUndefined()
  })
})
