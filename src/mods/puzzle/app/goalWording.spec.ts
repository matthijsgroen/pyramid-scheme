import { describe, expect, it } from "vitest"
import en from "../../../../public/locales/en/common.json"
import nl from "../../../../public/locales/nl/common.json"
import { skinFor } from "./constellation/skins"
import { skinFor as starBattleSkinFor } from "./starBattle/skins"
import { skinFor as hidatoSkinFor } from "./hidato/skins"
import { skinFor as sudokuSkinFor } from "./sudoku/skins"

/**
 * Every family says what a finished board looks like, in both languages.
 *
 * The goal is the one line above the rules (`puzzle-screens.md` §1) and it is the first thing a player reads,
 * so a family that reaches the screen without one shows a raw translation key where its point should be.
 * Listing the families here rather than testing them one by one is deliberate: a per-family spec cannot
 * notice the family somebody adds next.
 */
// `crocodile` is trap-owned (it spends health) but reaches the same screen through PuzzleFamilyShell,
// so it is held to the same wording bar as the rest.
const FAMILIES = [
  "balance",
  "canisters",
  "constellation",
  "crocodile",
  "eclipse",
  "futoshiki",
  "hidato",
  "lightbeam",
  "starBattle",
  "sudoku",
  "sumplete",
]

/** The places constellation's mechanic wears, and the role a room is allocated for to reach each of them. */
const PLACES = [
  { role: "sky", skin: "default" },
  { role: "trade", skin: "causeway" },
  { role: "water", skin: "irrigation" },
  { role: "funerary", skin: "ceiling" },
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
   * **Every board says what it is called**, in both languages.
   *
   * A room is recognisable by its board once it is open and not at all before that, so the name is what a
   * player says to themselves about it (`puzzle-screens.md` §1.2). Listed here rather than tested per
   * family for the same reason the goal is: a per-family spec cannot notice the family somebody adds next.
   */
  it.each(FAMILIES)("%s says what it is called, in both languages", family => {
    for (const locale of [en, nl]) {
      const { name } = (locale as unknown as Record<string, Record<string, unknown>>)[family]
      expect(typeof name === "string" || typeof name === "object", family).toBe(true)
    }
  })

  it("names each of a mechanic's faces, and names them differently", () => {
    // A name is worded per identity like everything else over the board: a haul-road network called a
    // star map is the drift this file exists to catch, one line higher up the screen.
    const faces: Record<string, string[]> = {
      constellation: ["default", "causeway", "irrigation", "ceiling"],
      hidato: ["default", "channel", "scribe", "chambers"],
      starBattle: ["default", "fields", "twinDefault", "twinFields"],
      sudoku: ["default", "papyrus"],
      balance: ["default", "weighing"],
    }
    for (const locale of [en, nl])
      for (const [family, skins] of Object.entries(faces)) {
        const names = (locale as unknown as Record<string, Record<string, Record<string, string>>>)[family].name
        for (const skin of skins) expect(typeof names[skin], `${family}.${skin}`).toBe("string")
        expect(new Set(skins.map(skin => names[skin])).size, family).toBe(skins.length)
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

  /**
   * **And over hidato's two faces.** The same run of numbers is a kept hive and a channel dug across a flood
   * plain, and the words are the whole difference: nothing on the plain is a cell of wax, and a comb has no
   * water in it. Both directions are checked, because this family's default dress is the one its own name
   * suggests and therefore the easiest to leave standing over the other place.
   */
  const HIDATO_PLACES = [
    { role: "puzzle", skin: "default" },
    { role: "water", skin: "channel" },
    { role: "agriculture", skin: "channel" },
    { role: "scribe", skin: "scribe" },
  ]

  it.each(HIDATO_PLACES)("hidato drawn for $role wears its own face", ({ role, skin }) => {
    expect(hidatoSkinFor(role, undefined).name).toBe(skin)
    for (const locale of [en, nl]) {
      expect(typeof (locale.hidato.goal as Record<string, string>)[skin]).toBe("string")
      for (const rule of ["given", "enter", "back"])
        expect(typeof (locale.hidato.rules as Record<string, Record<string, string>>)[skin][rule]).toBe("string")
      const hint = (locale.hidato.hint as unknown as Record<string, Record<string, Record<string, string>>>)[skin]
      for (const rung of ["mistake", "sandwich", "neighbourForced", "onlyCell", "onlyValue"])
        expect(typeof hint.reason[rung], `${skin}.${rung}`).toBe("string")
      expect(typeof hint.action.place).toBe("string")
    }
  })

  it("words hidato's three places differently, or one is wearing another's clothes", () => {
    const wordings = ["default", "channel", "scribe"].map(skin => (en.hidato.goal as Record<string, string>)[skin])
    expect(new Set(wordings).size).toBe(3)
  })

  it("keeps each of hidato's places out of the others' vocabulary", () => {
    const said = (locale: unknown, skin: string): [string, string][] => {
      const block = (locale as Record<string, Record<string, Record<string, unknown>>>).hidato
      const hint = (block.hint as Record<string, Record<string, Record<string, string>>>)[skin]
      return [
        ["goal", (block.goal as Record<string, string>)[skin]],
        ...Object.entries((block.rules as Record<string, Record<string, string>>)[skin]).map(
          ([key, text]): [string, string] => [`rules.${key}`, text]
        ),
        ...Object.entries(hint.reason).map(([key, text]): [string, string] => [`hint.reason.${key}`, text]),
        ["hint.action.place", hint.action.place],
      ]
    }
    // The three vocabularies, each of which belongs to exactly one place. A board that borrows another's
    // is describing something that is not on the screen — the fault this guard caught in constellation.
    const WORDS = {
      en: {
        default: /\b(comb|hive|cells?)\b/i,
        channel: /\b(fields?|plain|channel|water|dug|dig)\b/i,
        scribe: /\b(sheet|papyrus|ink|inked|reed|figures?)\b/i,
      },
      nl: {
        default: /\b(raat|vakjes?)\b/i,
        channel: /\b(akkers?|vlakte|kanaal|water|graven|graaf)\b/i,
        scribe: /\b(vel|papyrus|inkt|rietpen|tekens?)\b/i,
      },
    }
    for (const [tongue, locale] of [
      ["en", en],
      ["nl", nl],
    ] as const)
      for (const place of ["default", "channel", "scribe"] as const)
        for (const other of ["default", "channel", "scribe"] as const) {
          if (other === place) continue
          for (const [where, wording] of said(locale, place))
            expect(WORDS[tongue][other].test(wording), `${place}.${where} says ${other}: ${wording}`).toBe(false)
        }
  })

  /**
   * **And over sudoku's two faces.** The same grid is a wall of chambers with figures cut into it and a
   * scribe's register of signs inked across papyrus, and the words are the whole difference: nothing on
   * the sheet is a number, and nothing carved in stone is a sign. This is the family the guard matters
   * most for, because what a value LOOKS like is itself skinned here — a sentence that says "number"
   * over a board showing 𓁹 is describing something that is not on the screen.
   */
  const SUDOKU_PLACES = [
    { role: "puzzle", skin: "default" },
    { role: "scribe", skin: "papyrus" },
  ]

  it.each(SUDOKU_PLACES)("sudoku drawn for $role wears its own face", ({ role, skin }) => {
    expect(sudokuSkinFor(role, undefined).name).toBe(skin)
    for (const locale of [en, nl]) {
      expect(typeof (locale.sudoku.goal as Record<string, string>)[skin]).toBe("string")
      for (const rule of ["chambers", "given", "enter", "notes"])
        expect(typeof (locale.sudoku.rules as Record<string, Record<string, string>>)[skin][rule]).toBe("string")
      const hint = (locale.sudoku.hint as unknown as Record<string, Record<string, Record<string, unknown>>>)[skin]
      for (const rung of ["nakedSingle"]) expect(typeof hint.reason[rung], `${skin}.${rung}`).toBe("string")
      for (const [rung, variants] of [
        ["mistake", ["value", "note"]],
        ["hiddenSingle", ["row", "col", "box"]],
        ["pointing", ["row", "col"]],
        ["claiming", ["row", "col"]],
      ] as const)
        for (const variant of variants)
          expect(typeof (hint.reason[rung] as Record<string, string>)[variant], `${skin}.${rung}.${variant}`).toBe(
            "string"
          )
      const moves = hint.action as Record<string, string>
      for (const move of ["place", "ruleOut_one", "ruleOut_other"])
        expect(typeof moves[move], `${skin}.action.${move}`).toBe("string")
    }
  })

  it("keeps sudoku's two places out of each other's vocabulary", () => {
    const said = (locale: unknown, skin: string): [string, string][] => {
      const block = (locale as Record<string, Record<string, Record<string, unknown>>>).sudoku
      const hint = (block.hint as Record<string, Record<string, Record<string, unknown>>>)[skin]
      const reasons = Object.entries(hint.reason).flatMap(([key, text]): [string, string][] =>
        typeof text === "string"
          ? [[`hint.reason.${key}`, text]]
          : Object.entries(text as Record<string, string>).map(([inner, deep]): [string, string] => [
              `hint.reason.${key}.${inner}`,
              deep,
            ])
      )
      return [
        ["goal", (block.goal as unknown as Record<string, string>)[skin]],
        ["name", (block.name as unknown as Record<string, string>)[skin]],
        ...Object.entries((block.rules as Record<string, Record<string, string>>)[skin]).map(
          ([key, text]): [string, string] => [`rules.${key}`, text]
        ),
        ...reasons,
        ...Object.entries(hint.action as Record<string, string>).map(([key, text]): [string, string] => [
          `hint.action.${key}`,
          text,
        ]),
      ]
    }
    const WORDS = {
      en: {
        default: /\b(numbers?|chambers?|squares?|carved)\b/i,
        papyrus: /\b(signs?|panels?|sheet|papyrus|inked?|reed|spaces?)\b/i,
      },
      nl: {
        default: /\b(getal|getallen|kamers?|vakjes?|potlood)\b/i,
        papyrus: /\b(tekens?|paneel|panelen|vel|inkt|rietpen|plek|plekken)\b/i,
      },
    }
    for (const [tongue, locale] of [
      ["en", en],
      ["nl", nl],
    ] as const)
      for (const place of ["default", "papyrus"] as const) {
        const other = place === "default" ? "papyrus" : "default"
        for (const [where, wording] of said(locale, place))
          expect(WORDS[tongue][other].test(wording), `${place}.${where} says ${other}: ${wording}`).toBe(false)
      }
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
