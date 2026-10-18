import { describe, expect, it } from "vitest"
import { ACTIVITIES, FILLER, activitiesFor } from "./activities"
import { PROP_ROLES, ROLE_ONLY } from "./dressingTags"
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
  it("returns every activity with a prop in the pool, in table order", () => {
    expect(activitiesFor(["shelf", "rubblePile"]).map(a => a.id)).toEqual(["storage", "ledger"])
  })

  it("returns nothing for a pool of filler only", () => {
    expect(activitiesFor(["rubblePile"])).toEqual([])
  })
})
