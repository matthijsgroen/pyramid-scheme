import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { ACTIVITIES, FILLER, WALL_FILLER, activitiesFor, themeOf } from "./activities"
import { PROP_ROLES, ROLE_ONLY, WALL_ITEM_ROLES } from "./dressingTags"
import type { DecorationKind } from "./siteTypes"

describe("PROP_ROLES derived from ACTIVITIES", () => {
  it("gives every non-filler activity prop every role of every activity that lists it", () => {
    for (const activity of ACTIVITIES) {
      for (const prop of activity.props) {
        if (FILLER.has(prop)) continue
        expect(PROP_ROLES[prop], `${prop} in ${activity.id}`).toEqual(expect.arrayContaining([...activity.roles]))
      }
    }
  })

  it("gives a shelf the roles of both storage and ledger", () => {
    expect(PROP_ROLES.shelf).toEqual(expect.arrayContaining(["trade", "logistics", "agriculture", "scribe"]))
  })

  it("has no entry for a filler kind", () => {
    for (const kind of FILLER) expect(PROP_ROLES[kind], kind).toBeUndefined()
  })

  it("keeps every ROLE_ONLY role (union, not replacement)", () => {
    for (const [kind, roles] of Object.entries(ROLE_ONLY)) {
      expect(PROP_ROLES[kind as DecorationKind], kind).toEqual(expect.arrayContaining([...roles]))
    }
  })
})

describe("activitiesFor", () => {
  it("returns every activity of the theme with a prop in the pool, in table order", () => {
    expect(activitiesFor(["shelf", "rubblePile"], "starter").map(a => a.id)).toEqual(["storage", "ledger"])
  })

  it("returns nothing for a pool of filler only", () => {
    expect(activitiesFor(["rubblePile"], "starter")).toEqual([])
  })

  it("returns only the theme's activities, though the pool holds other themes' props", () => {
    const pool = [...new Set(ACTIVITIES.flatMap(activity => activity.props))]
    for (const theme of new Set(ACTIVITIES.map(activity => activity.theme))) {
      expect(activitiesFor(pool, theme).length, theme).toBeGreaterThan(0)
      expect(activitiesFor(pool, theme).every(activity => activity.theme === theme)).toBe(true)
    }
  })
})

describe("WALL_ITEM_ROLES derived from ACTIVITIES", () => {
  it("leaves a wall filler untagged, whichever activity hangs it", () => {
    for (const kind of WALL_FILLER) expect(WALL_ITEM_ROLES[kind], kind).toBeUndefined()
  })

  it("gives every other activity wall item every role of every activity that lists it", () => {
    for (const activity of ACTIVITIES) {
      for (const kind of activity.wall) {
        if (WALL_FILLER.has(kind)) continue
        expect(WALL_ITEM_ROLES[kind], `${kind} in ${activity.id}`).toEqual(expect.arrayContaining([...activity.roles]))
      }
    }
  })
})

describe("themeOf", () => {
  const themed = difficulties.filter(tier => ACTIVITIES.some(activity => activity.theme === tier))

  it("dresses a tier with activities of its own in its own theme", () => {
    for (const tier of themed) expect(themeOf(tier)).toBe(tier)
  })

  it("dresses a tier with none of its own yet, or a site of no tier, in the first themed tier's", () => {
    for (const tier of [...difficulties.filter(tier => !themed.includes(tier)), undefined])
      expect(themeOf(tier), tier).toBe(themed[0])
  })
})
