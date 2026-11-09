import { describe, expect, it } from "vitest"
import { ACTIVITIES, FILLER, HOUSE_KINDS, WALL_FILLER, activitiesFor, housesOf } from "./activities"
import { PROP_ROLES, ROLE_ONLY, WALL_ITEM_ROLES } from "./dressingTags"
import type { DecorationKind, Difficulty } from "./siteTypes"

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

describe("a rank's house", () => {
  const houses = Object.entries(HOUSE_KINDS) as [Difficulty, readonly DecorationKind[]][]
  const everyProp = [...new Set(ACTIVITIES.flatMap(activity => activity.props))]
  const houseKinds = new Set(houses.flatMap(([, kinds]) => kinds))

  it("brings kinds only its own activities list", () => {
    for (const [rank, kinds] of houses)
      for (const kind of kinds) {
        const listing = ACTIVITIES.filter(activity => activity.props.includes(kind))
        expect(listing.length, kind).toBeGreaterThan(0)
        expect(
          listing.every(activity => activity.rank === rank),
          kind
        ).toBe(true)
      }
  })

  it("furnishes a pool holding one of its kinds with that rank's activities only", () => {
    for (const [rank, kinds] of houses) {
      const pool = [...everyProp.filter(kind => !houseKinds.has(kind)), kinds[0]]
      expect(housesOf(pool)).toEqual([rank])
      expect(activitiesFor(pool).length, rank).toBeGreaterThan(0)
      expect(
        activitiesFor(pool).every(activity => activity.rank === rank),
        rank
      ).toBe(true)
    }
  })

  it("leaves a pool holding no house kind to the shared activities, though it holds props a house lists", () => {
    const pool = everyProp.filter(kind => !houseKinds.has(kind))
    expect(activitiesFor(pool).length).toBeGreaterThan(0)
    expect(activitiesFor(pool).every(activity => activity.rank === undefined)).toBe(true)
  })
})
