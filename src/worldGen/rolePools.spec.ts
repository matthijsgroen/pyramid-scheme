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
 *
 * **A role LIST is one pool, and the pool is the union.** `["light", "sky"]` draws from every family
 * carrying either tag, so measuring its members separately reports a pool that is never used — the same
 * mistake reading a list as "all of these" makes in the allocator. The floor applies to what a journey
 * actually draws from, which is why a list is tallied whole.
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

const poolForTag = (tag: string) => ALL_FAMILY_META.filter(family => family.tags.includes(tag)).map(family => family.id)

/** The pool a whole authored role draws from: the union of its tags' pools. */
const poolFor = (roles: string[]) => [...new Set(roles.flatMap(poolForTag))].sort()

const rolesOf = (role: string | string[] | undefined) => (role === undefined ? [] : Array.isArray(role) ? role : [role])

/**
 * Every themed role the baked world asks for, keyed by the whole authored role, with the rooms authored
 * to it. A role carrying a structural tag is skipped: `["cosmos", "puzzle"]` re-admits every family on
 * purpose (a preferred role rather than a restricting one), so it is not a thin-pool risk.
 */
const authoredRoles = () => {
  const rooms = new Map<string, { roles: string[]; rooms: number }>()
  for (const section of allSections(generatedWorldConfigs)) {
    const roles = rolesOf(section.role)
    if (roles.length === 0 || roles.some(role => STRUCTURAL_ROLES.has(role))) continue
    const key = [...roles].sort().join("+")
    const entry = rooms.get(key) ?? { roles, rooms: 0 }
    entry.rooms += section.pathPuzzles
    rooms.set(key, entry)
  }
  return rooms
}

/** Individual tags, for the check that each one is carried by somebody — a typo is per tag, not per pool. */
const authoredTags = () =>
  new Set(
    allSections(generatedWorldConfigs)
      .flatMap(section => rolesOf(section.role))
      .filter(role => !STRUCTURAL_ROLES.has(role))
  )

describe("a themed role is only worth authoring if its pool can dress it", () => {
  it("has roles to check at all (a silent empty sweep would prove nothing)", () => {
    expect([...authoredRoles().keys()].length).toBeGreaterThan(0)
  })

  it(`draws every authored role from at least ${MIN_POOL} families`, () => {
    const thin = [...authoredRoles().values()]
      .filter(({ roles }) => poolFor(roles).length < MIN_POOL)
      .map(
        ({ roles, rooms }) =>
          `${roles.join("+")}: ${poolFor(roles).length} families (${poolFor(roles).join(", ") || "none"}) for ${rooms} authored rooms`
      )

    expect(
      thin,
      `A journey authored to a thin role serves the same puzzle over and over. Either give the pool a ${MIN_POOL}th family (a role is a tag, so an existing family can carry it) or drop the role from the authoring and let the room draw from "puzzle".`
    ).toEqual([])
  })

  it("never authors a tag no family carries at all", () => {
    const empty = [...authoredTags()].filter(tag => poolForTag(tag).length === 0)
    expect(empty).toEqual([])
  })
})
