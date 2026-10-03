import { describe, expect, it } from "vitest"
import en from "../../../../../public/locales/en/common.json"
import nl from "../../../../../public/locales/nl/common.json"
import { LIGHTBEAM_SWITCH_META } from "../../game/lightbeamSwitch/meta"

/**
 * The room says the same things in both languages, and one of those things is that walking back in and
 * routing the light elsewhere costs nothing.
 *
 * A player who reads "the others are shut" as "the rest is lost" plays the junction as a trap and never
 * returns for the branch they did not take — the whole reason the room stays re-enterable. A rules line
 * that reached only one locale would leave half the players believing it.
 */
const ROOM_COPY = ["name", "goal", "rules.shrines", "rules.doors", "rules.returning", "rules.tap"]

/** Every bearing a fork can have a way out at, because a board is turned onto whichever ones it has. */
const WAYS = ["n", "e", "s", "w"]

const read = (locale: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (at, key) => (at as Record<string, unknown>)?.[key],
      (locale as Record<string, unknown>)[LIGHTBEAM_SWITCH_META.id]
    )

describe("the lightbeam switch's copy", () => {
  it.each(ROOM_COPY)("says %s in both languages", path => {
    for (const locale of [en, nl]) expect(read(locale, path)).toBeTypeOf("string")
  })

  it("names every bearing a door can stand at, in both languages", () => {
    for (const locale of [en, nl]) for (const way of WAYS) expect(read(locale, `way.${way}`)).toBeTypeOf("string")
  })

  // Both carry the way out's own name, so a door never reads as "open" with nothing saying which one.
  it("says open and shut with the way out named, in both languages", () => {
    for (const locale of [en, nl])
      for (const key of ["doorOpen", "doorShut"]) expect(read(locale, key)).toContain("{{way}}")
  })
})
