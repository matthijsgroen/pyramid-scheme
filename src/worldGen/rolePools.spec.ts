import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"
import type { SiteConfig, SubSection } from "@/game/siteTypes"

/**
 * A role is a POOL, and authoring one costs variety in proportion to how thin that pool is. A
 * journey authored to a role draws every one of its rooms from the families carrying that tag, so a
 * two-member pool serves one family every other room for the whole journey — which reads as the same
 * puzzle over and over, however varied the catalogue as a whole is.
 *
 * Nothing else notices: the world builds, every gate passes, and the tier table looks healthy. It
 * only shows up by counting what shipped, which is what this does.
 *
 * The floor is on the POOL rather than on the realised draw, deliberately. What a given seed happened
 * to pick varies; how many faces a role has to offer does not, and it is the fact an author can check
 * before authoring rather than after regenerating.
 */
const MIN_POOL = 4

/** Roles every board can serve — not a themed pool, so a thin one is not a variety problem. */
const STRUCTURAL_ROLES = new Set(["puzzle", "trap", "treasure", "gate", "shop", "capstone", "tomb-puzzle"])

const sectionsOf = (section: SubSection & { sideSections?: SubSection[] }): SubSection[] => [
  section,
  ...(section.sideSections ?? []).flatMap(sectionsOf),
]

const allSections = (world: Record<string, SiteConfig[]>) =>
  Object.values(world)
    .flat()
    .flatMap(site => site)
    .flatMap(floor => [floor, ...floor.sideSections.flatMap(sectionsOf)])

const poolFor = (tag: string) => ALL_FAMILY_META.filter(family => family.tags.includes(tag)).map(family => family.id)

/** Every themed role the baked world actually asks for, with the rooms authored to it. */
const authoredRoles = () => {
  const rooms = new Map<string, number>()
  for (const section of allSections(generatedWorldConfigs)) {
    const roles = section.role === undefined ? [] : Array.isArray(section.role) ? section.role : [section.role]
    for (const role of roles) {
      if (STRUCTURAL_ROLES.has(role)) continue
      rooms.set(role, (rooms.get(role) ?? 0) + section.pathPuzzles)
    }
  }
  return rooms
}

describe("a themed role is only worth authoring if its pool can dress it", () => {
  it("has roles to check at all (a silent empty sweep would prove nothing)", () => {
    expect([...authoredRoles().keys()].length).toBeGreaterThan(0)
  })

  it(`draws every authored role from at least ${MIN_POOL} families`, () => {
    const thin = [...authoredRoles().entries()]
      .filter(([role]) => poolFor(role).length < MIN_POOL)
      .map(
        ([role, rooms]) =>
          `${role}: ${poolFor(role).length} families (${poolFor(role).join(", ") || "none"}) for ${rooms} authored rooms`
      )

    expect(
      thin,
      `A journey authored to a thin role serves the same puzzle over and over. Either give the pool a ${MIN_POOL}th family (a role is a tag, so an existing family can carry it) or drop the role from the authoring and let the room draw from "puzzle".`
    ).toEqual([])
  })

  it("never authors a role no family carries at all", () => {
    const empty = [...authoredRoles().keys()].filter(role => poolFor(role).length === 0)
    expect(empty).toEqual([])
  })
})
