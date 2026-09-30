import { describe, expect, it } from "vitest"
import type { FamilyMeta } from "@/game/families/familyMeta"
import { allocateEncounterFamily, allocateEncounterSpread, ALL_FAMILY_META } from "./allFamilyMeta"

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

describe("dealing a chain of rooms", () => {
  /**
   * **The whole point of dealing.** A corridor of five rooms drawn one at a time hands the same family
   * out twice often enough for players to meet it — junior_2 once served hidato five rooms running.
   */
  it("gives every room of a chain a different family, at every seed", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const hand = allocateEncounterSpread("puzzle", "wizard", seed, 5) as string[]
      expect(new Set(hand).size, `seed ${seed} dealt ${hand.join(", ")}`).toBe(5)
    }
  })

  /** Past the size of the pool the bag is refilled, and the seam must not repeat what just played. */
  it("never repeats back to back, even across a refill", () => {
    const pool = new Set(Object.keys(draw("water")))
    for (let seed = 1; seed <= 500; seed++) {
      const hand = allocateEncounterSpread("water", "wizard", seed, pool.size * 3) as string[]
      const seam = hand.findIndex((id, i) => i > 0 && id === hand[i - 1])
      expect(seam, `seed ${seed} repeated at ${seam}: ${hand.join(", ")}`).toBe(-1)
    }
  })

  it("hands the role back for every room when the pool is empty", () => {
    expect(allocateEncounterSpread("no-such-role", "starter", 1, 3)).toEqual([
      "no-such-role",
      "no-such-role",
      "no-such-role",
    ])
  })
})

// A family is dealt into a room from the pool of every family carrying the role's tag, and which one
// lands where is free to move. Its reward priority, reward capacity and trap-ness are not: priority
// decides which slots are loot-eligible and in what order, capacity sets how long `rewards[]` is, and
// a trap makes its section `sealed`. So within one pool (all families sharing a tag) those three must
// be identical, which makes every member interchangeable as far as loot and shape go. A family that
// breaks this is refused when it is registered, not discovered in a regenerated world.
// A pool of one, or a whole new pool, is never refused: nothing in it can be displaced.
const lootSignature = (meta: FamilyMeta): string =>
  `priority ${meta.rewardPriority}, capacity ${meta.rewardCapacity ?? 1}, ${meta.tags.includes("trap") ? "trap" : "not a trap"}`

const poolViolations = (metas: readonly FamilyMeta[]): string[] => {
  const tags = [...new Set(metas.flatMap(meta => meta.tags))].sort()
  return tags.flatMap(tag => {
    const pool = metas.filter(meta => meta.tags.includes(tag))
    const signatures = new Set(pool.map(lootSignature))
    const groups = [...signatures].map(
      signature =>
        `[${signature}]: ${pool
          .filter(meta => lootSignature(meta) === signature)
          .map(meta => meta.id)
          .join(", ")}`
    )
    return signatures.size > 1 ? [`pool "${tag}" mixes loot signatures, ${groups.join(" | ")}`] : []
  })
}

describe("a family joining a pool must not displace its loot or shape", () => {
  const fake = (over: Partial<FamilyMeta>): FamilyMeta => ({
    id: "fake",
    ownerMod: "puzzle",
    tags: ["puzzle", "water"],
    icon: "?",
    color: "amber",
    rewardPriority: 60,
    ...over,
  })

  it("holds for every pool the registered families form", () => {
    expect(poolViolations(ALL_FAMILY_META)).toEqual([])
  })

  it("accepts a family identical in priority, capacity and trap-ness to the pool it joins", () => {
    expect(poolViolations([...ALL_FAMILY_META, fake({})])).toEqual([])
  })

  it("accepts a family alone in a new pool, whatever its meta", () => {
    expect(
      poolViolations([...ALL_FAMILY_META, fake({ tags: ["brand-new"], rewardPriority: 0, rewardCapacity: 4 })])
    ).toEqual([])
  })

  it.each([
    ["a priority of 0", { rewardPriority: 0 }],
    ["a different non-zero priority", { rewardPriority: 50 }],
    ["a capacity above 1", { rewardCapacity: 2 }],
    ["a trap tag", { tags: ["puzzle", "water", "trap"] }],
  ] as [string, Partial<FamilyMeta>][])("refuses a puzzle family with %s", (_, over) => {
    const violations = poolViolations([...ALL_FAMILY_META, fake(over)])
    expect(violations.length).toBeGreaterThan(0)
    for (const violation of violations) expect(violation).toContain("fake")
  })
})
