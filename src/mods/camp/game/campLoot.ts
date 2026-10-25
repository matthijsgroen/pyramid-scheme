import type { Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { Difficulty } from "@/data/difficultyLevels"
import { difficulties } from "@/data/difficultyLevels"
import type { CampStepTable, CampUnit } from "./campSteps"
import { CAMP_STEPS, campDemand, campStepProblems, campUnits } from "./campSteps"

// The camp's finds and structure parts lie on loot-bearing PUZZLE slots only: chests carry the economy and
// the capped currencies, and puzzle rooms are where camp loot lies. Each unit lies on a
// slot of exactly its step's tier (a slot's tier is its section's), so a tier's camp fills by playing that
// tier. Main, ungated slots are taken first, then ward-gated ones, then hidden ones: every player's camp
// must fill, and a hidden pocket is only found by some. A tier with fewer slots than its demand is an
// authoring problem and fails the bake (docs/mods/TARGET.md rule 2).

const interleave = <T>(groups: readonly (readonly T[])[]): T[] => {
  const ordered: T[] = []
  const deepest = Math.max(0, ...groups.map(g => g.length))
  for (let pass = 0; pass < deepest; pass++)
    for (const group of groups) if (pass < group.length) ordered.push(group[pass])
  return ordered
}

const groupBy = <K, V>(items: readonly V[], key: (item: V) => K): Map<K, V[]> => {
  const groups = new Map<K, V[]>()
  for (const item of items) {
    const k = key(item)
    const group = groups.get(k) ?? []
    group.push(item)
    groups.set(k, group)
  }
  return groups
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Round-robin over sites in id order, each site's slots in path (puzzleSeq) order.
const roundRobinOverSites = (slots: readonly Slot[]): Slot[] =>
  interleave(
    [...groupBy(slots, s => s.siteId ?? "").entries()]
      .sort(([a], [b]) => byId(a, b))
      .map(([, site]) => [...site].sort((a, b) => (a.puzzleSeq ?? 0) - (b.puzzleSeq ?? 0)))
  )

const reachClass = (slot: Slot): number => (slot.hidden ? 2 : slot.wardKeys.length > 0 ? 1 : 0)

const tierDemand = (table: CampStepTable): Record<Difficulty, number> => {
  const demand = campDemand(table)
  return Object.fromEntries(difficulties.map(tier => [tier, demand[tier].finds + demand[tier].parts])) as Record<
    Difficulty,
    number
  >
}

// First part of every structure, then the finds, then every structure's second part, and so on: one
// structure's parts sit far apart in the deal, so they fall on different sites.
const dealOrder = (units: readonly CampUnit[]): CampUnit[] => {
  const finds = units.filter(u => u.kind === "find")
  const partsByStructure = [
    ...groupBy(
      units.filter(u => u.kind === "part"),
      u => u.structure.id
    ).values(),
  ]
  const rounds = interleave(partsByStructure)
  const firstParts = partsByStructure.length
  return [...rounds.slice(0, firstParts), ...finds, ...rounds.slice(firstParts)]
}

const siteOf = (slot: Slot) => slot.siteId ?? ""

export const makeCampLoot = (table: CampStepTable): Distribution => {
  const units = campUnits(table)
  const demand = tierDemand(table)
  return {
    id: "camp-loot",
    footprint: () => {
      const problems = campStepProblems(table)
      if (problems.length > 0) throw new Error(`camp-loot: the camp step table is unsound — ${problems.join("; ")}`)
      return { min: units.length, max: units.length }
    },
    eligible: slot => slot.kind === "puzzle" && slot.rewardPriority > 0 && demand[slot.tier] > 0,
    // Returns exactly each tier's demand, tiers in difficulty order: the list is shorter than the candidates
    // on purpose, since that is how the per-tier quota is kept (the allocator takes the list's first N).
    rank: candidates => {
      const byTier = groupBy(candidates, s => s.tier)
      return difficulties.flatMap(tier => {
        const needed = demand[tier]
        if (needed === 0) return []
        const tierSlots = byTier.get(tier) ?? []
        if (tierSlots.length < needed)
          throw new Error(
            `camp-loot: tier ${tier} needs ${needed} puzzle slots for camp loot, only ${tierSlots.length} available. ` +
              `Author more loot-bearing capacity in the DSL.`
          )
        const classes = groupBy(tierSlots, reachClass)
        return [0, 1, 2].flatMap(c => roundRobinOverSites(classes.get(c) ?? [])).slice(0, needed)
      })
    },
    // Deals each tier's units to its slots in rank order. A part takes the first slot on a site its structure
    // does not use yet, when one is left, so a structure's parts are spread over the tier's sites.
    fill: slots => {
      const slotsByTier = groupBy(slots, s => s.tier)
      for (const tier of difficulties) {
        const open = [...(slotsByTier.get(tier) ?? [])]
        const usedSites = new Map<string, Set<string>>()
        for (const unit of dealOrder(units.filter(u => u.tier === tier))) {
          if (unit.kind === "find") {
            open.shift()!.assign({ type: "campFind", step: unit.step.id })
            continue
          }
          const used = usedSites.get(unit.structure.id) ?? new Set<string>()
          const fresh = open.findIndex(s => !used.has(siteOf(s)))
          const [slot] = open.splice(fresh === -1 ? 0 : fresh, 1)
          used.add(siteOf(slot))
          usedSites.set(unit.structure.id, used)
          slot.assign({ type: "campPart", structure: unit.structure.id, part: unit.part })
        }
      }
    },
  }
}

export const campLoot: Distribution = makeCampLoot(CAMP_STEPS)
