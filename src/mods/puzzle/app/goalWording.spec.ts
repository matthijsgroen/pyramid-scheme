import { describe, expect, it } from "vitest"
import en from "../../../../public/locales/en/common.json"
import nl from "../../../../public/locales/nl/common.json"
import { skinFor } from "./constellation/skins"

/**
 * Every family says what a finished board looks like, in both languages.
 *
 * The goal is the one line above the rules (`puzzle-screens.md` §1) and it is the first thing a player reads,
 * so a family that reaches the screen without one shows a raw translation key where its point should be.
 * Listing the families here rather than testing them one by one is deliberate: a per-family spec cannot
 * notice the family somebody adds next.
 */
const FAMILIES = ["balance", "constellation", "eclipse", "futoshiki", "lightbeam", "starBattle", "sumplete"]

/** The places constellation's mechanic wears, and the role a room is allocated for to reach each of them. */
const PLACES = [
  { role: "sky", skin: "default" },
  { role: "trade", skin: "causeway" },
  { role: "water", skin: "irrigation" },
]

describe("the goal above the rules", () => {
  it.each(FAMILIES)("%s says what a finished board looks like, in both languages", family => {
    for (const locale of [en, nl]) {
      const { goal } = (locale as Record<string, { goal?: unknown }>)[family]
      // A family with one identity words it once; one that wears several words it per place, and that block
      // is checked below.
      expect(typeof goal === "string" || typeof goal === "object").toBe(true)
    }
  })

  /**
   * **The goal is tied to the identity, not to the mechanic.** Constellation is the family this matters for:
   * the same rules are a star map, a haul-road network and a waterworks, and "give every star its lines of
   * light" is wrong on two of the three. The skin already knows which place a room is, so the wording asks it.
   */
  it.each(PLACES)("constellation drawn for $role words its goal as its own place", ({ role, skin }) => {
    expect(skinFor(role, undefined).name).toBe(skin)
    for (const locale of [en, nl])
      expect(typeof (locale.constellation.goal as Record<string, string>)[skin]).toBe("string")
  })

  it("keeps a place's wording after dark, because the hour is not the place", () => {
    // A causeway at night is still a causeway: the ambience layers onto the identity rather than replacing it.
    expect(skinFor("trade", "night").name).toBe("causeway")
  })

  it("words all three places differently, or one of them is wearing another's clothes", () => {
    const wordings = PLACES.map(place => (en.constellation.goal as Record<string, string>)[place.skin])
    expect(new Set(wordings).size).toBe(PLACES.length)
  })

  /**
   * The RULES are worded per place too, and for the same reason (`puzzle-screens.md` §1.1): a causeway board
   * telling the player that lines run from one star to the next is describing something absent from the
   * screen.
   */
  it.each(PLACES)("constellation drawn for $role words its rules as its own place", ({ skin }) => {
    for (const locale of [en, nl])
      for (const rule of ["straight", "pair", "cross", "enter"]) {
        const wording = (locale.constellation.rules as Record<string, Record<string, string>>)[skin][rule]
        expect(typeof wording).toBe("string")
      }
  })

  it("never says star on a board that has no stars on it", () => {
    for (const [locale, forbidden] of [
      [en, /\bstars?\b/i],
      [nl, /\bsterren?\b/i],
    ] as const)
      for (const skin of ["causeway", "irrigation"]) {
        const place = (locale.constellation.rules as Record<string, Record<string, string>>)[skin]
        for (const [rule, wording] of Object.entries(place))
          expect(forbidden.test(wording), `${skin}.${rule}: ${wording}`).toBe(false)
        expect(forbidden.test((locale.constellation.goal as Record<string, string>)[skin])).toBe(false)
      }
  })
})
