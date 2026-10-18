import type { SiteConfig, SubSection } from "./siteTypes"
import { childSectionsOf, MAIN_SECTION_ADDRESS, sectionAddresses } from "./carve/sections"

/** A room as a save names it: which site of the journey, and the cell address (`cellAddress.ts`) inside it. */
export type RoomPlace = { levelNr: number; floor: number; address: string }

/**
 * The first room authored to hold `encounter`, read off the authoring rather than a carve: an
 * `encountersByIndex` entry at index k is the chain's k-th room, which a save files as `p${k}`
 * (`cellSlot.ts`), in the section `sectionAddresses` names. `levelNr` and `floor` narrow the search.
 */
export const findEncounterRoom = (
  sites: readonly SiteConfig[],
  encounter: string,
  within: { levelNr?: number; floor?: number } = {}
): RoomPlace | undefined => {
  for (const [levelIndex, floors] of sites.entries()) {
    const levelNr = levelIndex + 1
    if (within.levelNr !== undefined && within.levelNr !== levelNr) continue
    for (const [floor, config] of floors.entries()) {
      if (within.floor !== undefined && within.floor !== floor) continue
      const named = sectionAddresses(config)
      const chains: [address: string, section: Pick<SubSection, "encountersByIndex">][] = [
        [MAIN_SECTION_ADDRESS, config],
      ]
      const walk = (sections: readonly SubSection[], prefix: string) =>
        sections.forEach((section, idx) => {
          const positional = `${prefix}${idx}`
          chains.push([named.ok ? (named.of.get(positional) ?? positional) : positional, section])
          walk(childSectionsOf(section), `${positional}.`)
        })
      walk(config.sideSections, "s")
      for (const [section, { encountersByIndex }] of chains)
        for (const [index, at] of Object.entries(encountersByIndex ?? {}))
          if (at === encounter) return { levelNr, floor, address: `${section}#${floor}/p${index}` }
    }
  }
  return undefined
}
