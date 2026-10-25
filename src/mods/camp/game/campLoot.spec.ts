import { describe, expect, it } from "vitest"
import { allocateDistributions, type Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { Tier, TreasureReward } from "@/worldGen/types"
import type { CampStepTable } from "./campSteps"
import { campDemand, campUnits } from "./campSteps"
import { makeCampLoot } from "./campLoot"

type TestSlot = Slot & { label: string; filled: (TreasureReward | undefined)[] }

const slot = (label: string, over: Partial<Slot>): TestSlot => {
  const filled: (TreasureReward | undefined)[] = []
  return {
    ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
    journeyId: "j",
    tier: "starter",
    wardKeys: [],
    isPlaceholder: false,
    kind: "puzzle",
    rewardPriority: 60,
    assign: r => filled.push(r),
    ...over,
    label,
    filled,
  }
}

// Two tiers with camp demand (starter, master) and one without (expert).
const table: CampStepTable = [
  { id: "cup", spot: "fire", tier: "starter", source: "found" },
  { id: "ring", spot: "fire", tier: "starter", source: "structure", parts: ["stones", "sand"] },
  { id: "hut", spot: "fire", tier: "starter", source: "structure", parts: ["poles", "cloth", "pegs"] },
  { id: "lamp", spot: "tower", tier: "master", source: "found" },
  { id: "gong", spot: "tower", tier: "master", source: "found" },
  { id: "tower", spot: "tower", tier: "master", source: "structure", parts: ["base", "beams", "planks", "rail"] },
  { id: "flag", spot: "tower", tier: "master", source: "bought" },
  { id: "moss", spot: "tower", tier: "master", source: "grows", growsFrom: ["tower"] },
]
const N = campUnits(table).length

// A made-up world: per tier, `sites` sites with `main` loot puzzle slots, plus one ward-gated and one hidden
// puzzle slot, and slots camp may never take — a chest, a path end, a fez-shop stock slot and a priority-0 room.
const world = (sitesPerTier: Partial<Record<Tier, number>>, main: number): TestSlot[] => {
  const slots: TestSlot[] = []
  for (const [tier, sites] of Object.entries(sitesPerTier) as [Tier, number][]) {
    for (let s = 0; s < sites; s++) {
      const siteId = `${tier}_${s}:0`
      for (let p = 0; p < main; p++) slots.push(slot(`${siteId}#${p}`, { tier, siteId, puzzleSeq: p }))
      slots.push(slot(`${siteId}:ward`, { tier, siteId, puzzleSeq: main, wardKeys: ["k"] }))
      slots.push(slot(`${siteId}:hidden`, { tier, siteId, puzzleSeq: main + 1, hidden: true }))
      slots.push(slot(`${siteId}:chest`, { tier, kind: "end", rewardPriority: 100 }))
      slots.push(slot(`${siteId}:end`, { tier, kind: "end", rewardPriority: 60 }))
      slots.push(slot(`${siteId}:shop`, { tier, kind: "end", rewardPriority: 60, encounter: "fez-shop" }))
      slots.push(slot(`${siteId}:trap`, { tier, siteId, puzzleSeq: main + 2, rewardPriority: 0 }))
    }
  }
  return slots
}

const isCamp = (r: TreasureReward | undefined) => r?.type === "campFind" || r?.type === "campPart"
const campSlots = (slots: TestSlot[]) => slots.filter(s => s.filled.some(isCamp))
const rewardOf = (s: TestSlot) => s.filled.find(isCamp)!

const place = (slots: TestSlot[], distributions: Distribution[] = [makeCampLoot(table)]): TestSlot[] => {
  allocateDistributions(new Set<Slot>(slots), distributions, {})
  return campSlots(slots)
}

const full = { starter: 3, expert: 2, master: 3 }

describe("makeCampLoot", () => {
  it("places every find and every part exactly once, on a loot-bearing puzzle slot of its step's tier", () => {
    const placed = place(world(full, 4))
    expect(placed).toHaveLength(N)
    const tierOf = new Map(table.map(e => [e.id, e.tier]))
    const keys = placed.map(s => {
      const r = rewardOf(s)
      const stepId = (r.type === "campFind" ? r.step : r.structure) as string
      expect(s.tier).toBe(tierOf.get(stepId))
      expect(s.kind).toBe("puzzle")
      expect(s.rewardPriority).toBeGreaterThan(0)
      return r.type === "campFind" ? `find:${r.step}` : `part:${r.structure}/${r.part}`
    })
    const expected = campUnits(table).map(u =>
      u.kind === "find" ? `find:${u.step.id}` : `part:${u.structure.id}/${u.part}`
    )
    expect([...keys].sort()).toEqual([...expected].sort())
  })

  it("never takes a chest, a path end, shop stock or a priority-0 slot", () => {
    for (const s of place(world(full, 4))) expect(s.label).toMatch(/#\d+$|:ward$|:hidden$/)
  })

  it("takes main slots before ward-gated ones, and those before hidden ones", () => {
    // starter needs 6: three sites with one main slot each leave three for ward (three) and none for hidden.
    const starter = place(world({ starter: 3, master: 3 }, 1)).filter(s => s.tier === "starter")
    expect(starter.filter(s => s.label.endsWith(":ward"))).toHaveLength(3)
    expect(starter.filter(s => s.label.endsWith(":hidden"))).toHaveLength(0)
    // master needs 6 with two sites of one main slot: both ward slots go, then two hidden ones.
    const master = place(world({ starter: 3, master: 2 }, 1)).filter(s => s.tier === "master")
    expect(master.filter(s => s.label.endsWith(":ward"))).toHaveLength(2)
    expect(master.filter(s => s.label.endsWith(":hidden"))).toHaveLength(2)
  })

  it("uses no ward-gated or hidden slot while main slots suffice", () => {
    for (const s of place(world(full, 4))) expect(s.label).toMatch(/#\d+$/)
  })

  it("spreads one structure's parts over the tier's sites", () => {
    const sitesPerTier = { starter: 3, master: 3 }
    const placed = place(world(sitesPerTier, 4))
    for (const entry of table.filter(e => e.source === "structure")) {
      const sites = placed.filter(s => rewardOf(s).structure === entry.id).map(s => s.siteId)
      const tierSites = sitesPerTier[entry.tier as "starter" | "master"]
      expect(new Set(sites).size).toBe(Math.min(entry.parts!.length, tierSites))
    }
  })

  it("fails a tier short of slots, naming the tier, needed and available", () => {
    // master needs 6; one site with two main, one ward and one hidden slot offers 4.
    expect(() => place(world({ starter: 3, master: 1 }, 2))).toThrow(/master.*6.*4 available/)
  })

  it("fails an unsound table before any slot is taken", () => {
    const unsound: CampStepTable = [...table, { id: "cup", spot: "fire", tier: "starter", source: "found" }]
    const slots = world(full, 4)
    expect(() => place(slots, [makeCampLoot(unsound)])).toThrow(/cup/)
    expect(slots.every(s => s.filled.length === 0)).toBe(true)
  })

  it("keeps an earlier distribution's slots and leaves the rest to a later one", () => {
    const first: Distribution = {
      id: "first",
      eligible: s => s.kind === "puzzle" && s.rewardPriority > 0 && s.tier === "master",
      footprint: () => ({ min: 0, max: 3 }),
      fill: slots => slots.forEach(s => s.assign({ type: "first" })),
    }
    const rest: Distribution = {
      id: "rest",
      eligible: s => s.rewardPriority > 0,
      footprint: () => ({ min: 0, max: Infinity }),
      fill: slots => slots.forEach(s => s.assign({ type: "rest" })),
    }
    const slots = world(full, 4)
    const placed = place(slots, [first, makeCampLoot(table), rest])
    const firsts = slots.filter(s => s.filled.some(r => r?.type === "first"))
    expect(firsts).toHaveLength(3)
    expect(placed).toHaveLength(N)
    for (const s of slots) expect(s.filled.length).toBeLessThanOrEqual(1)
    const loot = slots.filter(s => s.rewardPriority > 0)
    expect(slots.filter(s => s.filled.some(r => r?.type === "rest"))).toHaveLength(loot.length - 3 - N)
  })

  it("places the same input the same way twice", () => {
    const run = () => place(world(full, 4)).map(s => `${s.label}=${JSON.stringify(rewardOf(s))}`)
    expect(run()).toEqual(run())
  })

  it("ranks by tier, class, site and path order, not by the order slots arrive in", () => {
    const loot = makeCampLoot(table)
    const eligible = world(full, 4).filter(s => loot.eligible!(s))
    const label = (slots: Slot[]) => slots.map(s => (s as TestSlot).label)
    expect(label(loot.rank!([...eligible].reverse()))).toEqual(label(loot.rank!(eligible)))
  })

  it("claims no slot on a tier without camp demand", () => {
    const demand = campDemand(table)
    expect(demand.expert).toEqual({ finds: 0, parts: 0 })
    expect(place(world(full, 4)).some(s => s.tier === "expert")).toBe(false)
  })
})
