import { describe, expect, it } from "vitest"
import { allocateEncounterFamily, ALL_FAMILY_META } from "./allFamilyMeta"

/** How often each family comes back over a long run of slots, which is what a player actually feels. */
const draw = (role: string | string[], count = 3000) => {
  const tally: Record<string, number> = {}
  for (let seed = 1; seed <= count; seed++) {
    const id = allocateEncounterFamily(role, "wizard", seed) as string
    tally[id] = (tally[id] ?? 0) + 1
  }
  return tally
}

const dresses = (id: string, role: string) =>
  (ALL_FAMILY_META.find(meta => meta.id === id)?.faces?.[role] ?? []).some(face => face !== "default")

describe("allocating a family for a role", () => {
  /**
   * **Prefer mode weights the bag toward the families that dress the role** (`journeys.md` §10). Without it
   * a themed pool inside the whole catalogue dressed about a third of the rooms it was asked for, which
   * reads as scattered rather than as a place: the journey was authored and almost nothing looked it.
   */
  it("draws a dressing family about twice as often as a plain one, in prefer mode", () => {
    const tally = draw(["funerary", "puzzle"])
    const dressed = Object.entries(tally).filter(([id]) => dresses(id, "funerary"))
    const plain = Object.entries(tally).filter(([id]) => !dresses(id, "funerary"))
    expect(dressed.length, "no funerary face to weight toward").toBeGreaterThan(0)
    expect(plain.length, "prefer mode must still admit everyone").toBeGreaterThan(0)

    const share = (rows: [string, number][]) => rows.reduce((sum, [, n]) => sum + n, 0) / rows.length
    // Two entries against one, so roughly double — loose bounds, since this is a ratio of random draws.
    expect(share(dressed) / share(plain)).toBeGreaterThan(1.6)
    expect(share(dressed) / share(plain)).toBeLessThan(2.4)
  })

  /**
   * **Restricting is untouched.** There the pool IS the dress, so every entry already dresses; doubling
   * them all would change nothing but the arithmetic, and a family that happens to answer the role with
   * its default face must not be pushed down for it.
   */
  it("draws every family of a restricted role evenly", () => {
    const tally = draw("water")
    const counts = Object.values(tally)
    expect(counts.length).toBeGreaterThan(3)
    expect(Math.max(...counts) / Math.min(...counts)).toBeLessThan(1.3)
  })

  /**
   * **A role list of two THEMED tags is a union, not a preference** — `["light", "sky"]` is one pool drawn
   * from both, which is how junior_4 is authored. Nothing there is weighted, because nothing in it is the
   * catalogue-wide re-admission the thumb exists to counterbalance.
   */
  it("treats a two-themed-tag list as one flat union", () => {
    const tally = draw(["light", "sky"])
    const counts = Object.values(tally)
    expect(counts.length).toBeGreaterThan(3)
    expect(Math.max(...counts) / Math.min(...counts)).toBeLessThan(1.3)
  })

  it("hands the role back when its pool is empty", () => {
    expect(allocateEncounterFamily("no-such-role", "starter", 1)).toBe("no-such-role")
  })

  it("keeps a family out of a tier below its debut", () => {
    const starter = draw("trade", 400)
    expect(Object.keys(starter)).toContain("canisters")
    const tally: Record<string, number> = {}
    for (let seed = 1; seed <= 400; seed++) {
      const id = allocateEncounterFamily("trade", "starter", seed) as string
      tally[id] = (tally[id] ?? 0) + 1
    }
    expect(Object.keys(tally)).not.toContain("canisters")
  })
})
