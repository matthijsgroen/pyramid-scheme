import { describe, expect, it } from "vitest"
import type { DecorationKind } from "@/game/siteTypes"
import { companionFor, companionsFor } from "./companionProps"

const all = () => true
// Distinct cells per room, because the result is KEYED by cell: rooms sharing a fixture's cell keys
// collide in the map and read as "nothing was placed", which is how the distribution test first failed.
const room = (ownerKey: string, leader: DecorationKind, free?: string[]) => ({
  ownerKey,
  leader,
  free: free ?? [`${ownerKey}:a`, `${ownerKey}:b`, `${ownerKey}:c`],
})
const first = (free: readonly string[]) => free[0]

describe("companionsFor", () => {
  it("offers only kinds that share a purpose with the leader", () => {
    // offeringTable is trade/funerary/judgement; shelf is trade; basin is water/agriculture.
    const options = companionsFor("offeringTable", all)
    expect(options).toContain("shelf")
    expect(options).not.toContain("basin")
  })

  it("never offers the leader again", () => {
    expect(companionsFor("shelf", all)).not.toContain("shelf")
  })

  it("offers nothing for an untagged leader, which fits anywhere and so agrees with nothing", () => {
    expect(companionsFor("pillar", all)).toEqual([])
    expect(companionsFor("mat", all)).toEqual([])
  })

  it("drops kinds that are not drawn at this rank, so a placeholder cannot be multiplied by rule", () => {
    expect(companionsFor("offeringTable", kind => kind !== "shelf")).not.toContain("shelf")
  })
})

describe("companionFor", () => {
  it("places nothing in a room too small to hold a second prop", () => {
    expect(companionFor("s", [room("2,2", "offeringTable", ["1,1"])], all, first).size).toBe(0)
  })

  it("places nothing when the leader is untagged", () => {
    const rooms = Array.from({ length: 40 }, (_, i) => room(`${i},0`, "pillar"))
    expect(companionFor("s", rooms, all, first).size).toBe(0)
  })

  it("dresses some rooms and leaves most alone", () => {
    const rooms = Array.from({ length: 200 }, (_, i) => room(`${i},0`, "offeringTable"))
    const placed = companionFor("site", rooms, all, first).size
    expect(placed).toBeGreaterThan(20)
    expect(placed).toBeLessThan(120)
  })

  it("is deterministic in the site id, so a floor draws the same thing every time it is opened", () => {
    const rooms = Array.from({ length: 30 }, (_, i) => room(`${i},0`, "offeringTable"))
    expect([...companionFor("a", rooms, all, first)]).toEqual([...companionFor("a", rooms, all, first)])
  })

  it("differs between sites", () => {
    const rooms = Array.from({ length: 60 }, (_, i) => room(`${i},0`, "offeringTable"))
    expect([...companionFor("a", rooms, all, first)]).not.toEqual([...companionFor("b", rooms, all, first)])
  })

  it("does not depend on the order the rooms arrive in", () => {
    const rooms = Array.from({ length: 30 }, (_, i) => room(`${i},0`, "offeringTable"))
    const forward = [...companionFor("s", rooms, all, first)].sort()
    const backward = [...companionFor("s", [...rooms].reverse(), all, first)].sort()
    expect(backward).toEqual(forward)
  })

  it("uses the caller's own choice of cell, so the wall-behind preference is kept", () => {
    const rooms = Array.from({ length: 60 }, (_, i) => room(`${i},0`, "offeringTable"))
    const keys = [...companionFor("s", rooms, all, free => free[2]).keys()]
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(key.endsWith(":c")).toBe(true)
  })
})
