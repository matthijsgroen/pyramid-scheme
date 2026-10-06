import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { SiteConfig, SubSection } from "@/game/siteTypes"
import { AMBIENCES, STRUCTURAL, dressing } from "./faces.testing"

/**
 * The two invariants that keep the role/theme contract (a room's role dresses it, a theme is only the
 * hour) holding by construction (`docs/game-design/journeys.md`).
 *
 * Nothing else notices when one breaks. The world builds, every other gate passes, and a room quietly
 * draws its default in a pyramid that was authored to look like somewhere — which is the failure the whole
 * role/theme split exists to prevent, arriving silently.
 */

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
    // happens to use that word and leaves its neighbours on their defaults (docs/game-design/journeys.md: a theme is an hour).
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
