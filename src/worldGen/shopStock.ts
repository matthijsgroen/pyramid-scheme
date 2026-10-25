import type { SiteConfig, SubSection } from "./types"
import { CARVE_FAMILY_QUERIES } from "../game/encounterFallback"
import type { ResolveEncounter } from "../game/siteAssembler"

// A mod's request to sell one of its currency pieces at a specific shop: place a fragmentSlot
// sentinel (tagged with the mod's own `prefers` bucket) into that shop's stock. The existing
// capped/gating currency pass then fills it exactly as it fills any other loot slot — so the
// shop's stock is a real, counted, detectable currency instance (moved out of the free-world
// spread, not added on top). Core places the sentinel but names no currency: `prefers` is
// mod-supplied data. `nth` disambiguates when a journey has more than one shop (default 0). A `required` piece has no
// home but that shop (a key sold only there), so a missing or full shop refuses the build, naming the piece and the shop.
export type ShopStockAssignment = { journeyId: string; prefers: string; nth?: number; required?: boolean }

// A shop section is a node whose gen-time-resolved encounter is fez-shop; assignEncounters seeded
// its `rewards[]` to the shop's capacity. Collect them in walk order so `nth` is stable.
// `levels` is a journey's SiteConfig[] (each SiteConfig is one level's FloorConfig[]).
const shopSectionsOf = (
  levels: SiteConfig[],
  isShop: (section: SubSection) => boolean = section => section.encounter === "fez-shop"
): SubSection[] => {
  const shops: SubSection[] = []
  const walk = (section: SubSection & { sideSections?: SubSection[] }) => {
    if (isShop(section)) shops.push(section)
    section.sideSections?.forEach(walk)
  }
  for (const level of levels) for (const floor of level) for (const section of floor.sideSections) walk(section)
  return shops
}

// Places every mod's shop-stock sentinels into the next free slot of the addressed shop's stock
// array. Runs after assignEncounters (shops resolved + stock seeded) and before slot collection
// (so the sentinel is collected as a currency-fillable end slot). A missing shop (mod off / no
// shop authored at that address) or a full one drops the assignment silently — the piece stays in the free-world
// capped spread instead (the fallback the design calls for). A required piece has no such fallback, so it is refused.
export const placeShopStock = (
  allConfigs: Record<string, SiteConfig[]>,
  assignments: readonly ShopStockAssignment[]
): void => {
  for (const { journeyId, prefers, nth = 0, required } of assignments) {
    const shops = shopSectionsOf(allConfigs[journeyId] ?? [])
    const shop = shops[nth]
    const where = `shop ${nth} of ${journeyId}`
    if (!shop?.rewards) {
      if (required) throw new Error(`shop stock: ${prefers} is sold at ${where}, which does not exist`)
      continue
    }
    const free = shop.rewards.findIndex(r => r === undefined)
    if (free < 0) {
      if (required) throw new Error(`shop stock: ${prefers} is sold at ${where}, which is full`)
      continue // shop full — over-subscribed; drop (design: author more capacity)
    }
    shop.rewards[free] = { type: "fragmentSlot", prefers }
  }
}

// Whether a section ends in a shop room, by the family its encounter resolves to.
export const endsInShopBy = (resolveEncounter: ResolveEncounter) => {
  const shopFamily = resolveEncounter(CARVE_FAMILY_QUERIES.fezShop, CARVE_FAMILY_QUERIES.fezShop).familyId
  return (section: SubSection): boolean =>
    section.encounter !== undefined && resolveEncounter(section.encounter, "treasure").familyId === shopFamily
}

// A shop has no empty stock slot: what no mod assigned is not for sale, so the stock is what was
// assigned and nothing else. A shop is told by the family its encounter resolves to, as clearShopEnds
// tells it. A structural pass, run before the layout is picked, so the floor the layout is picked on is
// the floor that ships.
export const trimEmptyStock = (allConfigs: Record<string, SiteConfig[]>, resolveEncounter: ResolveEncounter): void => {
  const endsInShop = endsInShopBy(resolveEncounter)
  for (const levels of Object.values(allConfigs))
    for (const shop of shopSectionsOf(levels, endsInShop))
      if (shop.rewards) shop.rewards = shop.rewards.filter(r => r !== undefined)
}

// A section ending in a shop room shows its stock and never its endReward (carve/roomSpecs.ts asks the
// same question), so its end placeholder is cleared, and an authored reward there, which would vanish
// in play, is refused by name. A structural pass: whether an end holds a reward decides which ends are
// free to host a floor key (carve/sections.ts), so it is settled before the layout is picked, and loot
// placed afterwards never changes it.
export const clearShopEnds = (allConfigs: Record<string, SiteConfig[]>, resolveEncounter: ResolveEncounter): void => {
  const endsInShop = endsInShopBy(resolveEncounter)
  const clear = (section: SubSection, address: string) => {
    if (!endsInShop(section)) return
    if (section.endReward !== undefined && section.endReward.type !== "fragmentSlot")
      throw new Error(`authored endReward on a shop end: ${address}`)
    section.endReward = undefined
  }
  for (const [journeyId, levels] of Object.entries(allConfigs))
    levels.forEach((floors, levelIndex) =>
      floors.forEach((floor, floorIndex) =>
        floor.sideSections.forEach((section, si) => {
          const at = `${journeyId}:${levelIndex} floor ${floorIndex}`
          clear(section, `${at} ${section.label ?? `s${si}`}`)
          section.sideSections?.forEach((sub, ui) => clear(sub, `${at} ${sub.label ?? `s${si}.${ui}`}`))
        })
      )
    )
}
