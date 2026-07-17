import { describe, expect, it } from "vitest"
import { filterBy, pipe, preferThenRelax, rankBy, uniqueBy } from "./distribution"

type Item = { id: string; journeyId: string; tier: string }
const item = (id: string, journeyId: string, tier = "starter"): Item => ({ id, journeyId, tier })

describe(pipe, () => {
  it("applies each function in order", () => {
    const items = [item("a", "j1"), item("b", "j1"), item("c", "j2")]
    const rule = pipe(
      filterBy((i: Item) => i.journeyId === "j1"),
      rankBy((i: Item) => (i.id === "b" ? 1 : 0))
    )
    expect(rule(items).map(i => i.id)).toEqual(["b", "a"])
  })
})

describe(filterBy, () => {
  it("keeps only matching candidates", () => {
    const items = [item("a", "j1", "starter"), item("b", "j1", "junior")]
    expect(filterBy((i: Item) => i.tier === "starter")(items)).toEqual([items[0]])
  })
})

describe(uniqueBy, () => {
  it("keeps the first candidate per key, dropping later duplicates", () => {
    const items = [item("a", "j1"), item("b", "j1"), item("c", "j2")]
    expect(uniqueBy((i: Item) => i.journeyId)(items).map(i => i.id)).toEqual(["a", "c"])
  })
})

describe(rankBy, () => {
  it("orders higher score first, stable for ties", () => {
    const items = [item("a", "j1"), item("b", "j2"), item("c", "j3")]
    const scored = rankBy((i: Item) => (i.id === "b" ? 1 : 0))(items)
    expect(scored.map(i => i.id)).toEqual(["b", "a", "c"])
  })
})

describe(preferThenRelax, () => {
  it("prefers strict-filter-passing candidates, falling back to the rest as a tail", () => {
    const items = [item("a", "j1"), item("b", "j1"), item("c", "j2")]
    const rule = preferThenRelax<Item>(
      uniqueBy(i => i.journeyId),
      cs => [...cs]
    )
    // strict: one per journey → a (first of j1), c (first of j2). relaxed tail: b (dropped by strict).
    expect(rule(items).map(i => i.id)).toEqual(["a", "c", "b"])
  })

  it("relaxed tail still applies the ranker", () => {
    const items = [item("a", "j1"), item("b", "j1")]
    const rule = preferThenRelax<Item>(
      filterBy(() => false), // nothing passes strict
      rankBy(i => (i.id === "b" ? 1 : 0))
    )
    expect(rule(items).map(i => i.id)).toEqual(["b", "a"])
  })
})
