import { describe, expect, it } from "vitest"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { SiteConfig, SubSection } from "@/game/siteTypes"

/**
 * The two invariants that keep §2's contract holding by construction
 * (`docs/game-design/journeys.md` §10, §12).
 *
 * Nothing else notices when one breaks. The world builds, every other gate passes, and a room quietly
 * draws its default in a pyramid that was authored to look like somewhere — which is the failure the whole
 * role/theme split exists to prevent, arriving silently.
 */

/** Roles every board can serve, so a family need not answer for them. */
const STRUCTURAL = new Set(["puzzle", "trap", "treasure", "gate", "shop", "capstone", "tomb-puzzle"])

/** The one ambience that exists. A theme is an hour, never a place (§2). */
const AMBIENCES = new Set(["night"])

const dressing = ALL_FAMILY_META.filter(family => family.faces !== undefined)

describe("what a family declares it can be", () => {
  it("has families to check at all (a silent empty sweep would prove nothing)", () => {
    expect(dressing.length).toBeGreaterThan(5)
  })

  it("answers for every role it claims, and claims every role it answers for", () => {
    // A tag with no entry is a family sitting in a pool it has never been asked to justify; an entry with
    // no tag is a face nothing can ever reach — which is exactly how `logistics -> causeway` survived.
    for (const family of dressing) {
      const claimed = family.tags.filter(tag => !STRUCTURAL.has(tag)).sort()
      const answered = Object.keys(family.faces ?? {}).sort()
      expect(answered, `${family.id} answers for roles it does not claim, or misses ones it does`).toEqual(claimed)
    }
  })

  it("never names an ambience where a place belongs", () => {
    // `night` is an hour. It layers onto whichever place the role picked (`app/faceFor.ts`) and has no
    // business in a role map.
    for (const family of dressing)
      for (const [role, faces] of Object.entries(family.faces ?? {})) {
        expect(AMBIENCES.has(role), `${family.id} maps the ambience ${role} as a role`).toBe(false)
        for (const face of faces)
          expect(AMBIENCES.has(face), `${family.id} gives ${role} the ambience ${face} as a face`).toBe(false)
      }
  })

  it("offers at least one face for every role it answers", () => {
    for (const family of dressing)
      for (const [role, faces] of Object.entries(family.faces ?? {}))
        expect(faces.length, `${family.id} answers ${role} with nothing`).toBeGreaterThan(0)
  })
})

const sectionsOf = (section: SubSection & { sideSections?: SubSection[] }): SubSection[] => [
  section,
  ...(section.sideSections ?? []).flatMap(sectionsOf),
]

const allSections = (world: Record<string, SiteConfig[]>) =>
  Object.values(world)
    .flat()
    .flatMap(site => site)
    .flatMap(floor => [floor, ...floor.sideSections.flatMap(sectionsOf)])

describe("what the world asks rooms to be", () => {
  it("authors a theme only where it names an hour", () => {
    // A place name in the `theme` field is accepted silently and half-works: it dresses whichever family
    // happens to use that word and leaves its neighbours on their defaults (journeys.md §2).
    const themes = new Set(
      allSections(generatedWorldConfigs)
        .map(section => (section as { theme?: string }).theme)
        .filter((theme): theme is string => theme !== undefined)
    )
    const places = [...themes].filter(theme => !AMBIENCES.has(theme))
    expect(places, "a theme naming a place rather than an hour — author the role instead").toEqual([])
  })

  it("authors a role at least one family can dress", () => {
    // Not every room in a pool needs a face, but a role NO family answers for is a pyramid authored to
    // look like somewhere that cannot be drawn.
    const answered = new Set(dressing.flatMap(family => Object.keys(family.faces ?? {})))
    const authored = new Set(
      allSections(generatedWorldConfigs)
        .flatMap(section => {
          const role = section.role
          return role === undefined ? [] : Array.isArray(role) ? role : [role]
        })
        .filter(role => !STRUCTURAL.has(role))
    )
    const undressable = [...authored].filter(role => !answered.has(role))
    expect(undressable, "authored roles no family has a face for").toEqual([])
  })
})
