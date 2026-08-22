import { describe, expect, it } from "vitest"
import en from "../../../../public/locales/en/common.json"
import nl from "../../../../public/locales/nl/common.json"
import { skinFor } from "./constellation/skins"
import { skinFor as starBattleSkinFor } from "./starBattle/skins"

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
      const block = (locale as unknown as Record<string, Record<string, unknown>>)[family]
      const { goal } = block
      // A family with one identity words it once; one that wears several words it per place, and that block
      // is checked below. A family whose RULE comes at more than one strength — star battle's one star a
      // group and twin stars' two, off the same screen — words it per count instead, and i18next picks the
      // form from the board's own quota.
      const perCount = typeof block.goal_one === "string" && typeof block.goal_other === "string"
      expect(typeof goal === "string" || typeof goal === "object" || perCount, family).toBe(true)
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

  /**
   * The HINTS are worded per place as well (`puzzle-screens.md` §4.3) — every rung of the ladder, and the
   * move each one asks for. A rung with no phrasing for the place a room is reaches the player as a raw
   * translation key, which is worse than no hint at all.
   */
  const RUNGS = [
    "mistake",
    "capacity",
    "settled",
    "soleWayOut",
    "crossed",
    "atLeastOne",
    "twinBlock.single",
    "twinBlock.double",
    "isolation",
  ]
  const MOVES = ["draw_one", "draw_other", "refuse_one", "refuse_other", "refuseDouble"]

  it.each(PLACES)("constellation drawn for $role phrases every rung as its own place", ({ skin }) => {
    for (const locale of [en, nl]) {
      const place = (locale.constellation.hint as unknown as Record<string, Record<string, unknown>>)[skin]
      for (const rung of RUNGS) expect(typeof place[rung], `${skin}.${rung}`).toBe("string")
      const moves = place.action as Record<string, string>
      for (const move of MOVES) expect(typeof moves[move], `${skin}.action.${move}`).toBe("string")
    }
  })

  /**
   * Nothing on a road or a waterworks board is a star, so nothing said over one may call it that. This is the
   * check that would have caught the bug: the goal and the rules were fixed a commit before the hints, which
   * went on describing a sky over both other places.
   */
  it("never says star on a board that has no stars on it", () => {
    for (const [locale, forbidden] of [
      [en, /\bstars?\b/i],
      [nl, /\bsterren?\b/i],
    ] as const)
      for (const skin of ["causeway", "irrigation"]) {
        const said: [string, string][] = [
          ["goal", (locale.constellation.goal as Record<string, string>)[skin]],
          ...Object.entries((locale.constellation.rules as Record<string, Record<string, string>>)[skin]).map(
            ([key, text]): [string, string] => [`rules.${key}`, text]
          ),
          ...Object.entries(
            (locale.constellation.hint as unknown as Record<string, Record<string, unknown>>)[skin]
          ).flatMap(([key, text]): [string, string][] =>
            typeof text === "string"
              ? [[`hint.${key}`, text]]
              : Object.entries(text as Record<string, string>).map(([inner, deep]): [string, string] => [
                  `hint.${key}.${inner}`,
                  deep,
                ])
          ),
        ]
        for (const [where, wording] of said) expect(forbidden.test(wording), `${skin}.${where}: ${wording}`).toBe(false)
      }
  })

  /**
   * **The same rule over the star battle mechanic's second face.** Twin stars drawn for `agriculture` is a
   * flood plain with farmsteads standing on it — there is no star anywhere on the screen, so nothing said
   * over it may call one that. It is the guard that matters most here, because the sky wording is the
   * family's own name and the easiest thing in the world to leave behind.
   */
  const STAR_BATTLE_PLACES = [
    { role: "sky", skin: "default" },
    { role: "agriculture", skin: "fields" },
    { role: "water", skin: "fields" },
  ]

  it.each(STAR_BATTLE_PLACES)("twin stars drawn for $role wears its own face", ({ role, skin }) => {
    expect(starBattleSkinFor(role, undefined).name).toBe(skin)
  })

  it("never says star on a farm", () => {
    for (const [locale, forbidden] of [
      [en, /\bstars?\b/i],
      [nl, /\bsterren?\b/i],
    ] as const) {
      const block = locale.starBattle as unknown as Record<string, Record<string, unknown>>
      const goals = block.goal as Record<string, string>
      const said: [string, string][] = [
        ["goal_one", goals.fields_one],
        ["goal_other", goals.fields_other],
        ...Object.entries((block.rules as Record<string, Record<string, string>>).fields).map(
          ([key, text]): [string, string] => [`rules.${key}`, text]
        ),
        ...Object.entries((block.hint as Record<string, Record<string, unknown>>).fields).flatMap(
          ([key, text]): [string, string][] =>
            typeof text === "string"
              ? [[`hint.${key}`, text]]
              : Object.entries(text as Record<string, string>).map(([inner, deep]): [string, string] => [
                  `hint.${key}.${inner}`,
                  deep,
                ])
        ),
      ]
      for (const [where, wording] of said) expect(forbidden.test(wording), `fields.${where}: ${wording}`).toBe(false)
    }
  })
})
